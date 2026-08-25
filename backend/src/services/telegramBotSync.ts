import { db } from '../db';
import { extractMoneyAndNote, matchCategory } from '../parser/telegramParser';
import { getGoogleSheetsUrl } from './googleSheetsService';

interface TelegramSettings {
  botToken: string;
  botUsername?: string;
  autoSync: boolean;
  replyEnabled: boolean;
  lastUpdateId: number;
  lastSyncTime?: string;
}

// Read settings from SQLite
export function getTelegramConfig(): TelegramSettings {
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key LIKE 'telegram_%'`).all() as Array<{ key: string; value: string }>;
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    botToken: map.get('telegram_bot_token') || '',
    botUsername: map.get('telegram_bot_username') || '',
    autoSync: map.get('telegram_auto_sync') === '1',
    replyEnabled: map.get('telegram_reply_enabled') === '1',
    lastUpdateId: parseInt(map.get('telegram_last_update_id') || '0', 10),
    lastSyncTime: map.get('telegram_last_sync_time') || '',
  };
}

// Save settings to SQLite
export function saveTelegramConfig(config: {
  botToken?: string;
  botUsername?: string;
  autoSync?: boolean;
  replyEnabled?: boolean;
  lastUpdateId?: number;
  lastSyncTime?: string;
}) {
  const insertOrReplace = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const tx = db.transaction(() => {
    if (config.botToken !== undefined) insertOrReplace.run('telegram_bot_token', config.botToken.trim());
    if (config.botUsername !== undefined) insertOrReplace.run('telegram_bot_username', config.botUsername.trim());
    if (config.autoSync !== undefined) insertOrReplace.run('telegram_auto_sync', config.autoSync ? '1' : '0');
    if (config.replyEnabled !== undefined) insertOrReplace.run('telegram_reply_enabled', config.replyEnabled ? '1' : '0');
    if (config.lastUpdateId !== undefined) insertOrReplace.run('telegram_last_update_id', config.lastUpdateId.toString());
    if (config.lastSyncTime !== undefined) insertOrReplace.run('telegram_last_sync_time', config.lastSyncTime);
  });

  tx();
}

// Test bot connection using getMe
export async function testTelegramBot(botToken: string): Promise<{ success: boolean; botName?: string; username?: string; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken.trim()}/getMe`);
    const data = await res.json();

    if (!data.ok) {
      return { success: false, error: data.description || 'Token không hợp lệ' };
    }

    return {
      success: true,
      botName: data.result.first_name,
      username: data.result.username,
    };
  } catch (err: any) {
    return { success: false, error: 'Không thể kết nối tới Telegram API: ' + err.message };
  }
}

// Helper to send message back to chat
async function sendTelegramMessage(botToken: string, chatId: number | string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (e) {
    // Non-critical, ignore reply errors
  }
}

// Pull updates from Telegram and parse into transactions
export async function syncTelegramUpdates(): Promise<{
  success: boolean;
  syncedCount: number;
  transactions: any[];
  error?: string;
}> {
  const config = getTelegramConfig();
  if (!config.botToken) {
    return { success: false, syncedCount: 0, transactions: [], error: 'Chưa cấu hình Telegram Bot Token' };
  }

  try {
    // 1. If Google Sheet is configured, sync directly from Google Sheet
    const googleSheetUrl = getGoogleSheetsUrl();
    if (googleSheetUrl) {
      try {
        const gsRes = await fetch(googleSheetUrl, { redirect: 'follow' });
        const gsJson = await gsRes.json();
        if (gsJson && gsJson.success && Array.isArray(gsJson.data?.transactions)) {
          const gsTxs = gsJson.data.transactions;
          let addedFromSheet = 0;
          const newSheetTxs: any[] = [];
          
          const insertStmt = db.prepare(`
            INSERT INTO transactions (id, date, amount, type, category_id, account_id, note, source, raw_telegram_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              date = excluded.date,
              amount = excluded.amount,
              type = excluded.type,
              note = excluded.note
          `);

          // Match categories by name
          const catMap = new Map<string, string>();
          const allCats = db.prepare('SELECT id, name FROM categories').all() as any[];
          allCats.forEach(c => {
            catMap.set(c.name.toLowerCase(), c.id);
            // also normalize without accents
            catMap.set(c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), c.id);
          });

          for (const tx of gsTxs) {
            // If this transaction was deleted by user on Web, skip it so it is never restored!
            const isDeleted = db.prepare('SELECT id FROM deleted_transactions WHERE id = ?').get(tx.id);
            if (isDeleted) continue;

            const normCatName = (tx.category_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const catId = catMap.get(normCatName) || catMap.get((tx.category_name || '').toLowerCase()) || null;
            const exists = db.prepare('SELECT id FROM transactions WHERE id = ?').get(tx.id);
            
            insertStmt.run(
              tx.id,
              tx.date,
              tx.amount,
              tx.type,
              catId,
              'acc_cash',
              tx.note,
              tx.source || 'telegram_bot',
              tx.raw_telegram_text || null
            );
            
            if (!exists) {
              addedFromSheet++;
              newSheetTxs.push(tx);
            }
          }
          
          saveTelegramConfig({ lastSyncTime: new Date().toISOString() });
          return {
            success: true,
            syncedCount: addedFromSheet,
            transactions: newSheetTxs
          };
        }
      } catch (e: any) {
        console.error('Error syncing from Google Sheet:', e.message);
        return {
          success: false,
          syncedCount: 0,
          transactions: [],
          error: 'Lỗi khi đồng bộ từ Google Sheet: ' + e.message
        };
      }
    }

    const offset = config.lastUpdateId > 0 ? config.lastUpdateId + 1 : 0;
    const url = `https://api.telegram.org/bot${config.botToken}/getUpdates?offset=${offset}&limit=100&timeout=5`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) {
      return { success: false, syncedCount: 0, transactions: [], error: data.description || 'Lỗi khi gọi getUpdates' };
    }

    const updates = data.result || [];
    if (updates.length === 0) {
      saveTelegramConfig({ lastSyncTime: new Date().toISOString() });
      return { success: true, syncedCount: 0, transactions: [] };
    }

    // Load active categories and default account
    const categoriesRows = db.prepare('SELECT id, name, type, icon, color, keywords FROM categories').all() as any[];
    const categories = categoriesRows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      icon: r.icon,
      color: r.color,
      keywords: r.keywords ? r.keywords.split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean) : [],
    }));

    const defaultAcc = db.prepare('SELECT id FROM accounts WHERE is_default = 1').get() as { id: string } | undefined;
    const defaultAccountId = defaultAcc?.id || 'acc_cash';

    const insertTx = db.prepare(`
      INSERT INTO transactions (id, date, amount, type, category_id, account_id, note, source, raw_telegram_text, telegram_message_id, telegram_chat_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertLog = db.prepare(`
      INSERT INTO telegram_sync_logs (id, update_id, message_id, chat_id, raw_text, parsed_amount, parsed_type, parsed_note, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const newTransactions: any[] = [];
    let highestUpdateId = config.lastUpdateId;

    for (const update of updates) {
      if (update.update_id > highestUpdateId) {
        highestUpdateId = update.update_id;
      }

      const isEdit = Boolean(update.edited_message || update.edited_channel_post);
      const msg = update.message || update.channel_post || update.edited_message || update.edited_channel_post;
      if (!msg || !msg.text) continue;

      const rawText = msg.text.trim();
      const chatIdStr = msg.chat?.id ? msg.chat.id.toString() : '';

      // Check undo / delete commands: /xoa, /undo, /delete, xóa, xoa, huy
      const isUndoCommand = ['/xoa', '/undo', '/delete', 'xoa', 'xóa', 'huy', 'hủy'].includes(rawText.toLowerCase());
      if (isUndoCommand) {
        const lastTx = db.prepare(`
          SELECT t.*, c.name as category_name
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          WHERE t.source = 'telegram_bot'
          ORDER BY t.created_at DESC LIMIT 1
        `).get() as any;

        if (lastTx) {
          db.prepare('DELETE FROM transactions WHERE id = ?').run(lastTx.id);
          insertLog.run(`log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, update.update_id, msg.message_id, chatIdStr, rawText, Number(lastTx.amount), lastTx.type, lastTx.note, 'undo_deleted');
          if (config.replyEnabled && msg.chat?.id) {
            await sendTelegramMessage(
              config.botToken,
              msg.chat.id,
              `🗑️ **Đã xóa khoản ghi chép gần nhất:**\n• ${lastTx.type === 'income' ? '🟢 Thu' : '🔴 Chi'}: **${Number(lastTx.amount).toLocaleString('vi-VN')}₫** [${lastTx.category_name || 'Khác'}] - _${lastTx.note}_\n\n📊 Sổ đã được cập nhật lại!`
            );
          }
        } else {
          insertLog.run(`log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, update.update_id, msg.message_id, chatIdStr, rawText, null, null, null, 'undo_failed_empty');
          if (config.replyEnabled && msg.chat?.id) {
            await sendTelegramMessage(config.botToken, msg.chat.id, 'ℹ️ Không tìm thấy giao dịch nào gần đây để xóa.');
          }
        }
        continue;
      }

      // Check commands like /start, /status, /thangnay
      if (rawText.startsWith('/') || rawText.toLowerCase() === 'tong chi' || rawText.toLowerCase() === 'tổng chi') {
        insertLog.run(`log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, update.update_id, msg.message_id, chatIdStr, rawText, null, null, null, 'ignored_command');
        const cmd = rawText.toLowerCase();
        if (cmd === '/start') {
          if (config.replyEnabled && msg.chat?.id) {
            await sendTelegramMessage(
              config.botToken,
              msg.chat.id,
              `👋 **Chào bạn! Tôi là Bot Ghi Chép Tài Chính Cá Nhân.**\n\nBạn chỉ cần nhắn bất kỳ chi tiêu nào hàng ngày, ví dụ:\n- \`Grab 35k\`\n- \`Cơm trưa 45.000\`\n- \`Cafe Highland 55k\`\n- \`+18.5tr lương cty\`\n\n💡 **Mẹo:**\n• Nếu gõ nhầm, bạn chỉ cần **Edit trực tiếp tin nhắn trên Telegram** (app sẽ tự sửa lại)\n• Hoặc gõ \`/undo\` hay \`xóa\` để hủy ngay khoản chi vừa gõ!`
            );
          }
        } else if (cmd === '/status' || cmd === '/thangnay' || cmd.includes('tong chi') || cmd.includes('tổng chi')) {
          if (config.replyEnabled && msg.chat?.id) {
            const nowMonth = new Date().toISOString().substring(0, 7);
            const stats = db.prepare(`
              SELECT 
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
                COUNT(*) as total_count
              FROM transactions
              WHERE strftime('%Y-%m', date) = ?
            `).get(nowMonth) as { total_expense: number; total_income: number; total_count: number };

            const net = stats.total_income - stats.total_expense;
            const [y, m] = nowMonth.split('-');

            const statusMsg = `📊 **BÁO CÁO CHI TIÊU THÁNG ${m}/${y} ĐẾN NAY:**\n━━━━━━━━━━━━━━━━━━━━\n• 🔴 **Tổng đã chi:** \`${stats.total_expense.toLocaleString('vi-VN')}₫\`\n• 🟢 **Tổng thu nhập:** \`${stats.total_income.toLocaleString('vi-VN')}₫\`\n• 💰 **Thặng dư tích lũy:** \`${net >= 0 ? '+' : ''}${net.toLocaleString('vi-VN')}₫\`\n• 📝 **Tổng giao dịch:** \`${stats.total_count} giao dịch\`\n━━━━━━━━━━━━━━━━━━━━\n🌐 Mở web xem chi tiết: http://localhost:3001`;
            await sendTelegramMessage(config.botToken, msg.chat.id, statusMsg);
          }
        }
        continue;
      }

      // Convert message unix date to Vietnam Date (UTC+7)
      const msgDate = new Date(msg.date * 1000);
      // Format as YYYY-MM-DD in local time
      const year = msgDate.getFullYear();
      const month = String(msgDate.getMonth() + 1).padStart(2, '0');
      const day = String(msgDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const monthPrefix = `${year}-${month}`;

      // If this is an edited message, remove previous transaction(s) associated with this message_id
      if (isEdit && msg.message_id) {
        db.prepare(`
          DELETE FROM transactions 
          WHERE telegram_message_id = ? AND (telegram_chat_id = ? OR telegram_chat_id IS NULL)
        `).run(msg.message_id, chatIdStr);
      }

      // Handle multiline messages (e.g. multiple expenses in one message)
      const lines = rawText.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const createdInMsg: any[] = [];

      for (const line of lines) {
        const extracted = extractMoneyAndNote(line);
        if (!extracted || extracted.amount <= 0) {
          insertLog.run(`log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, update.update_id, msg.message_id, chatIdStr, line, null, null, null, 'parse_failed');
          continue;
        }

        const cat = matchCategory(line, extracted.type, categories);
        const txId = `tx_tg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        insertTx.run(
          txId,
          dateStr,
          extracted.amount,
          extracted.type,
          cat?.id || null,
          defaultAccountId,
          extracted.note,
          'telegram_bot',
          line,
          msg.message_id || null,
          chatIdStr || null
        );

        insertLog.run(
          `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          update.update_id,
          msg.message_id,
          chatIdStr,
          line,
          extracted.amount,
          extracted.type,
          extracted.note,
          isEdit ? 'edited' : 'success'
        );

        const txObj = {
          id: txId,
          date: dateStr,
          amount: extracted.amount,
          type: extracted.type,
          categoryName: cat?.name || 'Chi tiêu',
          note: extracted.note,
          rawText: line,
        };

        newTransactions.push(txObj);
        createdInMsg.push(txObj);
      }

      // If reply is enabled, calculate cumulative month spending and confirm back to user
      if (config.replyEnabled && createdInMsg.length > 0 && msg.chat?.id) {
        const monthStats = db.prepare(`
          SELECT 
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COUNT(*) as total_count
          FROM transactions
          WHERE strftime('%Y-%m', date) = ?
        `).get(monthPrefix) as { total_expense: number; total_income: number; total_count: number };

        const replyLines = createdInMsg.map(
          (t) => `• ${t.type === 'income' ? '🟢 Thu' : '🔴 Chi'}: **${t.amount.toLocaleString('vi-VN')}₫** [${t.categoryName}] - _${t.note}_`
        );

        const titleText = isEdit ? `✏️ **Đã cập nhật lại giao dịch:**` : `✅ **Đã ghi nhận giao dịch:**`;
        const replyText = `${titleText}\n${replyLines.join('\n')}\n\n━━━━━━━━━━━━━━━━━━━━\n📊 **Tổng chi Tháng ${month}/${year} đến nay:** \`${monthStats.total_expense.toLocaleString('vi-VN')}₫\`\n💰 **Tổng thu nhập:** \`${monthStats.total_income.toLocaleString('vi-VN')}₫\` (${monthStats.total_count} giao dịch)`;

        await sendTelegramMessage(config.botToken, msg.chat.id, replyText);
      }
    }

    // Save highest update ID so we don't process again
    saveTelegramConfig({
      lastUpdateId: highestUpdateId,
      lastSyncTime: new Date().toISOString(),
    });

    return {
      success: true,
      syncedCount: newTransactions.length,
      transactions: newTransactions,
    };
  } catch (err: any) {
    return {
      success: false,
      syncedCount: 0,
      transactions: [],
      error: 'Lỗi khi đồng bộ Telegram: ' + err.message,
    };
  }
}
