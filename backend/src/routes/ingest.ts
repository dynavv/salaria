/**
 * 💎 SALARIA BACKEND — INGESTION ROUTE HANDLER (BANK NOTI, CHAT & SMART ATM RECOGNITION)
 */

import { Env, Category, FinancialHealth } from '../types';
import { jsonResponse } from '../utils/response';
import {
  normalizeText,
  isNoiseMessage,
  parseMoneyAndNote,
  matchCategoryFast,
  findCategoryByFuzzyName
} from '../services/parser';
import { getPaycheckCycle, calculateThreeBucketSafeToSpend } from '../services/paycheck';
import { categorizeWithWorkersAI, generateDailyInsightWithAI } from '../ai/workers_ai';
import { logToD1 } from '../db';
import { getVietnamDateString } from '../utils/date';

export async function handleIngest(
  request: Request,
  env: Env,
  url: URL,
  ctx: any
): Promise<Response> {
  const ALLOWED_KEYS = new Set(
    [env?.API_KEY, env?.SECRET_TOKEN, env?.MASTER_PIN].filter(Boolean)
  );

  const checkApiKey = (token: string | null) => {
    return Boolean(token && ALLOWED_KEYS.has(token));
  };

  const AI_MODEL = env?.AI_MODEL || '@cf/google/gemma-4-26b-a4b-it';

  const reqApiKey =
    request.headers.get('x-api-key') ||
    url.searchParams.get('token') ||
    url.searchParams.get('key');

  // Query parameters (for HTTP GET integration or manual testing)
  const title = url.searchParams.get('title') || url.searchParams.get('not_title') || '';
  const rawParamText =
    url.searchParams.get('text') ||
    url.searchParams.get('msg') ||
    url.searchParams.get('body') ||
    url.searchParams.get('not_text') ||
    '';
  const queryText = title && rawParamText ? `${title} ${rawParamText}` : rawParamText || title;

  if (reqApiKey && !checkApiKey(reqApiKey) && !queryText) {
    return jsonResponse({ success: false, error: 'Unauthorized: Invalid API Key' }, 401);
  }

  let rawText = '';
  let notTitle = title;
  let notBody = rawParamText;
  let isBankNoti = false;
  let targetTxId: string | null = null;
  let reqSource: string | null = null;

  if (title || rawParamText) {
    isBankNoti = true;
    notTitle = title;
    notBody = rawParamText;
    rawText = queryText;
    reqSource = 'bank_notification';
  } else if (request.method === 'POST') {
    try {
      const body: any = await request.json();
      targetTxId = body.target_tx_id || body.quote_tx_id || null;
      if (body.source) {
        reqSource = String(body.source);
      }
      if (body.text || body.title) {
        notTitle = body.title || '';
        notBody = body.text || '';
        rawText = notTitle && notBody ? `${notTitle} ${notBody}` : notBody || notTitle;
        isBankNoti = Boolean(body.is_notification || body.title);
        if (!reqSource) {
          reqSource = isBankNoti ? 'bank_notification' : 'in_app_chat';
        }
      }
    } catch (e) {
      rawText = await request.text();
    }
  }

  if (!rawText || !rawText.trim()) {
    return new Response('Salaria Cloudflare D1 Full-Stack REST API & Edge Worker Active.', { status: 200 });
  }

  if (env.DB) {
    let parsed: any = null;
    let contextText = rawText;

    // =========================================================================
    // COMMAND INTERCEPTOR 1: /undo, /xoa, /xóa, hoàn tác (Hỗ trợ target_tx_id / quote)
    // =========================================================================
    const cleanCmd = rawText.trim().toLowerCase();
    if (['/undo', '/xoa', '/xóa', 'xoa', 'xóa', 'hoàn tác', 'hoan tac'].includes(cleanCmd)) {
      let lastTxRes: any = null;
      if (targetTxId) {
        lastTxRes = await env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(targetTxId).first();
      }
      if (!lastTxRes) {
        lastTxRes = await env.DB.prepare('SELECT * FROM transactions ORDER BY rowid DESC LIMIT 1').first();
      }
      if (!lastTxRes) {
        return jsonResponse({ success: false, error: 'Chưa có giao dịch nào để hoàn tác.' }, 400);
      }

      const amt = Number(lastTxRes.amount) || 0;
      const accId = lastTxRes.account_id || 'acc_cash';

      // Phục hồi số dư
      if (lastTxRes.type === 'expense') {
        await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(amt, accId).run();
      } else if (lastTxRes.type === 'income') {
        await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(amt, accId).run();
      } else if (lastTxRes.type === 'transfer' && lastTxRes.destination_account_id) {
        await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(amt, accId).run();
        await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(amt, lastTxRes.destination_account_id).run();
      }

      // Xóa giao dịch khỏi D1
      await env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(lastTxRes.id).run();

      const formattedAmt = new Intl.NumberFormat('vi-VN').format(amt) + ' ₫';
      const sign = lastTxRes.type === 'income' ? '+' : '-';
      const replyMsg = `🗑️ Đã hoàn tác & xóa giao dịch: ${sign}${formattedAmt} (${lastTxRes.note || 'Giao dịch'}). Số dư đã được phục hồi!`;

      return jsonResponse({
        success: true,
        message: replyMsg,
        data: {
          id: lastTxRes.id,
          amount: amt,
          type: lastTxRes.type,
          note: `[ĐÃ XÓA] ${lastTxRes.note || ''}`,
          category_name: 'Đã hoàn tác'
        }
      });
    }

    // =========================================================================
    // COMMAND INTERCEPTOR 2: DẠY QUY TẮC MỚI (coffee = ăn uống / /train ...)
    // =========================================================================
    if (!isBankNoti) {
      const trainMatch = rawText
        .trim()
        .match(/^(?:\/train\s+)?(.+?)\s*(?:=|=>|->|\blà\b|\bthuộc\b|\bthuoc\b)\s*(.+)$/i);
      if (trainMatch) {
        const rawKw = trainMatch[1].trim();
        const rawCatTarget = trainMatch[2].trim();
        const kwMoney = parseMoneyAndNote(rawKw);

        if (rawKw.length >= 2 && (!kwMoney || !kwMoney.amount)) {
          const allCats: Category[] =
            (await env.DB.prepare('SELECT id, name, type, group_type, keywords FROM categories').all()).results || [];
          const targetCat = findCategoryByFuzzyName(rawCatTarget, allCats);

          if (targetCat) {
            const existingKws = (targetCat.keywords || '').split(',').map(k => k.trim()).filter(Boolean);
            const normKw = normalizeText(rawKw);
            if (!existingKws.some(k => normalizeText(k) === normKw)) {
              existingKws.push(rawKw);
              await env.DB.prepare('UPDATE categories SET keywords = ? WHERE id = ?').bind(existingKws.join(','), targetCat.id).run();
            }

            const replyMsg = `🎯 Đã học xong quy tắc mới!\n• Từ khóa: "${rawKw}"\n• Danh mục: "${targetCat.name}"\nTừ nay các giao dịch có từ khóa này sẽ tự động phân loại chuẩn xác.`;

            return jsonResponse({
              success: true,
              message: replyMsg,
              data: {
                keyword: rawKw,
                category_id: targetCat.id,
                category_name: targetCat.name
              }
            });
          }
        }
      }

      // =========================================================================
      // COMMAND INTERCEPTOR 3: SỬA DANH MỤC HOẶC SỐ TIỀN (Hỗ trợ Quote / target_tx_id)
      // =========================================================================
      let targetTx: any = null;
      if (targetTxId) {
        targetTx = await env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(targetTxId).first();
      }

      // Nhánh A: Sửa số tiền & nội dung khi có targetTx (vd: "sửa thành 35k", "35k", "50k bún chả")
      if (targetTx) {
        const cleanMoneyText = rawText.replace(/^(?:sửa\s+thành|sửa|sua\s+thanh|đổi\s+thành|doi\s+thanh)\s+/i, '');
        const parsedNewMoney = parseMoneyAndNote(cleanMoneyText);
        if (parsedNewMoney && parsedNewMoney.amount && parsedNewMoney.amount > 0) {
          const oldAmt = Number(targetTx.amount) || 0;
          const newAmt = parsedNewMoney.amount;
          const diff = newAmt - oldAmt;
          const newNote = parsedNewMoney.note || targetTx.note;

          // Cập nhật số dư tài khoản tương ứng
          if (diff !== 0) {
            if (targetTx.type === 'expense') {
              await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(diff, targetTx.account_id).run();
            } else if (targetTx.type === 'income') {
              await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(diff, targetTx.account_id).run();
            } else if (targetTx.type === 'transfer' && targetTx.destination_account_id) {
              await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(diff, targetTx.account_id).run();
              await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(diff, targetTx.destination_account_id).run();
            }
          }

          await env.DB.prepare('UPDATE transactions SET amount = ?, note = ? WHERE id = ?').bind(newAmt, newNote, targetTx.id).run();

          const oldFormatted = new Intl.NumberFormat('vi-VN').format(oldAmt) + ' ₫';
          const newFormatted = new Intl.NumberFormat('vi-VN').format(newAmt) + ' ₫';
          const replyMsg = `✅ Đã sửa giao dịch "${newNote}": số tiền từ ${oldFormatted} ➔ ${newFormatted}. Số dư tài khoản đã được điều chỉnh tương ứng!`;

          return jsonResponse({
            success: true,
            message: replyMsg,
            data: {
              id: targetTx.id,
              amount: newAmt,
              type: targetTx.type,
              note: newNote,
              category_id: targetTx.category_id,
              category_name: 'Đã sửa số tiền'
            }
          });
        }
      }

      // Nhánh B: Sửa danh mục giao dịch (cho targetTx hoặc giao dịch gần nhất lastTx)
      const cleanCatText = rawText.trim().replace(/^(?:sửa\s+thành|chuyển\s+sang|đổi\s+sang|đổi\s+thành|doi\s+sang|sua\s+thanh|danh\s+mục|danh\s+muc)\s+/i, '');
      const allCats: Category[] =
        (await env.DB.prepare('SELECT id, name, type, group_type, keywords FROM categories').all()).results || [];
      const targetCat = findCategoryByFuzzyName(cleanCatText, allCats) || findCategoryByFuzzyName(rawText, allCats);

      if (targetCat) {
        const txToUpdate = targetTx || (await env.DB.prepare('SELECT * FROM transactions ORDER BY rowid DESC LIMIT 1').first());
        if (txToUpdate) {
          // 1. Cập nhật category_id
          await env.DB.prepare('UPDATE transactions SET category_id = ? WHERE id = ?').bind(targetCat.id, txToUpdate.id).run();

          // 2. Tự động học (Auto-learn)
          let learnedNote = '';
          if (
            txToUpdate.note &&
            txToUpdate.note.length >= 2 &&
            txToUpdate.note !== 'Giao dịch' &&
            txToUpdate.note !== 'Chi tiêu' &&
            txToUpdate.note !== 'Thu nhập'
          ) {
            const existingKws = (targetCat.keywords || '').split(',').map(k => k.trim()).filter(Boolean);
            const normTxNote = normalizeText(txToUpdate.note);
            if (!existingKws.some(k => normalizeText(k) === normTxNote)) {
              existingKws.push(txToUpdate.note);
              await env.DB.prepare('UPDATE categories SET keywords = ? WHERE id = ?').bind(existingKws.join(','), targetCat.id).run();
              learnedNote = txToUpdate.note;
            }
          }

          const formattedAmt = new Intl.NumberFormat('vi-VN').format(txToUpdate.amount) + ' ₫';
          const sign = txToUpdate.type === 'income' ? '+' : '-';
          let replyMsg = `✅ Đã chuyển giao dịch "${txToUpdate.note || 'Giao dịch'}" (${sign}${formattedAmt}) sang danh mục "${targetCat.name}".`;
          if (learnedNote) {
            replyMsg += `\n🧠 AI cũng đã tự động ghi nhớ từ khóa "${learnedNote}"!`;
          }

          return jsonResponse({
            success: true,
            message: replyMsg,
            data: {
              id: txToUpdate.id,
              amount: txToUpdate.amount,
              type: txToUpdate.type,
              note: txToUpdate.note,
              category_id: targetCat.id,
              category_name: targetCat.name,
              learned_keyword: learnedNote || null
            }
          });
        }
      }
    }

    if (isBankNoti) {
      if (isNoiseMessage(notTitle) || isNoiseMessage(notBody) || isNoiseMessage(rawText)) {
        return jsonResponse({ success: false, message: 'Ignored: Marketing or noise notification' }, 200);
      }

      // QUY TẮC TITLE VÀNG DUY NHẤT: Tiêu đề BẮT BUỘC THUẦN TÚY chỉ là [+/-] [Số tiền] [Đơn vị]
      // Bất kỳ tiêu đề nào có chứa text (như "Nhận 60K", "Cộng thêm 100k", "Google Wallet", tên quán...) -> AUTO LOẠI 100%!
      const trimmedTitle = (notTitle || '').trim();
      const pureSignedAmountRegex = /^([+-])\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)\s*(?:VND|vnd|VNĐ|vnđ|đ|₫)?$/i;
      const titleMatch = trimmedTitle.match(pureSignedAmountRegex);

      if (!titleMatch) {
        return jsonResponse(
          {
            success: false,
            action: 'ignored',
            reason: 'title_not_pure_signed_amount',
            message: 'Bỏ qua: Tiêu đề thông báo không phải là biến động số dư thuần túy (+/- số tiền)',
            title: notTitle,
            text: notBody || rawText
          },
          200
        );
      }

      const sign = titleMatch[1];
      const rawDigits = titleMatch[2].replace(/[^\d]/g, '');
      const amount = parseInt(rawDigits, 10);
      const type: 'income' | 'expense' = sign === '+' ? 'income' : 'expense';

      if (!amount || amount <= 0) {
        return jsonResponse({ success: false, action: 'ignored', reason: 'invalid_amount' }, 200);
      }

      // Bóc tách nội dung chi tiêu từ Body
      let note = '';
      const bodyText = notBody && notBody.trim() ? notBody : rawText || '';

      // Ưu tiên trích xuất phần sau "ND:" hoặc "Nội dung:"
      const ndMatch = bodyText.match(/(?:\bND\b|Nội dung|Noi dung)\s*[:\s]*(.+)$/i);
      if (ndMatch) {
        note = ndMatch[1].trim();
      } else {
        note = bodyText;
      }

      // Làm sạch các trường kỹ thuật, số dư, số thẻ, mã giao dịch
      note = note
        .replace(/^[+-]?\s*[\d.,]+\s*(?:VND|vnd|đ|₫|\$)?\s*[:\s]*/i, '')
        .replace(
          /(?:Số dư khả dụng|So du kha dung|Số dư|So du|Hạn mức khả dụng|Han muc kha dung|HM khả dụng|HM kha dung|\bHM\b|Hạn mức|Han muc|\bSD\b)\s*[:\s]*[+-]?\s*[\d.,]+\s*(?:VND|vnd|đ|d|₫|\$|USD)?/gi,
          ' '
        )
        .replace(/(?:Số tiền|So tien|\bGD\b|Giao dịch|Giao dich|\bND\b|Nội dung|Noi dung|tai|tại)\s*[:\s]*/gi, ' ')
        .replace(/(?:Số thẻ|So the|Tài khoản|Tai khoan|TK)\s*:?\s*[\w\d*]+\s*/gi, ' ')
        .replace(/rrn\s*[\d]+/gi, ' ')
        .replace(/ma\s*(?:giao\s*dich)?\s*ZP[\w\d]+/gi, ' ')
        .replace(/^[:\s\-]+/, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!note || note.length < 2) {
        note = type === 'income' ? 'Thu nhập ngân hàng' : 'Giao dịch ngân hàng';
      }

      parsed = {
        amount,
        type,
        note
      };
      contextText = `${note} ${bodyText}`.trim();
    } else {
      if (isNoiseMessage(rawText)) {
        return jsonResponse({ success: false, message: 'Ignored: Noise message' }, 200);
      }
      parsed = parseMoneyAndNote(rawText);
      contextText = rawText;
    }

    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const today = getVietnamDateString();

    if (parsed) {
      let categories: Category[] = [];
      try {
        const catsRes = await env.DB.prepare('SELECT id, name, type, group_type, keywords FROM categories').all();
        categories = catsRes.results || [];
      } catch (e) {
        console.error('Failed to load categories:', e);
      }

      // TẦNG 1: Fast-Path Regex (Chỉ tìm trong danh mục cùng loại thu/chi)
      const matchingCats = categories.filter(c => c.type === parsed.type);
      let catId = matchCategoryFast(parsed.note, matchingCats) || matchCategoryFast(contextText, matchingCats);
      let categorizationMethod = catId ? 'fast_regex' : 'unassigned';
      let finalNote = parsed.note;

      // TẦNG 2: Cloudflare Workers AI Universal Adapter Fallback
      if (!catId && env.AI) {
        try {
          const aiResult = await categorizeWithWorkersAI(env.AI, contextText, matchingCats.length > 0 ? matchingCats : categories, AI_MODEL, env.DB);
          if (aiResult) {
            let shortModelName = (aiResult.model_used || AI_MODEL)
              .replace('@cf/google/', '')
              .replace('@cf/meta/', '')
              .replace('@cf/mistralai/', '')
              .replace('@cf/', '');
            if (shortModelName.includes('gemma-4-26b')) shortModelName = 'Gemma 4 26B';
            else if (shortModelName.includes('llama-3.2-3b')) shortModelName = 'Llama 3.2 3B';
            if (aiResult.category_id && Number(aiResult.confidence) >= 0.75) {
              const validCat = categories.find(c => c.id === aiResult.category_id);
              if (validCat) {
                catId = aiResult.category_id;
                categorizationMethod = `workers_ai (${shortModelName}) (${Math.round(aiResult.confidence * 100)}%)`;
              }
            }
            if (aiResult.clean_note && aiResult.clean_note.length > 0 && aiResult.clean_note !== 'Ăn uống') {
              finalNote = aiResult.clean_note;
            }
          }
        } catch (aiErr: any) {
          console.warn('Workers AI engine error:', aiErr.message);
          if (env.DB) {
            logToD1(env.DB, 'ERROR', 'WORKERS_AI_INGEST', aiErr.message);
          }
        }
      }

      // Tự động nhận diện Rút tiền ATM: Chuyển tiền nội bộ từ Ngân hàng (acc_bank) sang Tiền mặt (acc_cash)
      const normRaw = normalizeText(rawText);
      const normNote = normalizeText(finalNote);
      const isAtmWithdrawal =
        /(?:\brut\s+(?:\d+[kmtrcủcu\s.,]*\s+)?(?:tien\s+)?(?:tai\s+|o\s+)?(?:cay\s+)?atm\b|\brut\s+tien\s+mat\b|\batm\s+withdrawal\b|\brut\s+atm\b|\brut\s+(?:tien\s+)?sml\b|\brut\s+(?:tien\s+)?napas\b|\bwithdrawal\s+sml\b)/i.test(normRaw) ||
        /(?:\brut\s+(?:\d+[kmtrcủcu\s.,]*\s+)?(?:tien\s+)?(?:tai\s+|o\s+)?(?:cay\s+)?atm\b|\brut\s+tien\s+mat\b|\batm\s+withdrawal\b|\brut\s+atm\b|\brut\s+(?:tien\s+)?sml\b|\brut\s+(?:tien\s+)?napas\b|\bwithdrawal\s+sml\b)/i.test(normNote);
      let destinationAccountId: string | null = null;
      let accountId = isBankNoti ? 'acc_bank' : 'acc_cash';

      if (isAtmWithdrawal) {
        parsed.type = 'transfer';
        catId = null;
        categorizationMethod = 'atm_transfer_detector';
        accountId = 'acc_bank'; // Luôn rút từ Ngân hàng
        destinationAccountId = 'acc_cash'; // Chuyển vào Ví tiền mặt
      }

      // =========================================================================
      // DEDUPLICATION / IDEMPOTENCY CHECK (Chống trùng lặp giao dịch trong 120s)
      // =========================================================================
      // 1. Kiểm tra theo mã tham chiếu duy nhất của ngân hàng (RRN, ZaloPay code...)
      let refCode: string | null = null;
      const rrnMatch = rawText.match(/\b(?:rrn|trace)\s*[:\s]*(\d+)/i);
      if (rrnMatch) {
        refCode = rrnMatch[1];
      } else {
        const zpMatch = rawText.match(/\bZP[A-Z0-9]{6,}\b/i);
        if (zpMatch) refCode = zpMatch[0];
      }

      let existingTx: any = null;
      if (refCode) {
        existingTx = await env.DB.prepare(`
          SELECT t.*, c.name as category_name
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          WHERE t.raw_telegram_text LIKE ? AND t.created_at >= datetime('now', '-24 hours')
          ORDER BY t.created_at DESC LIMIT 1
        `).bind(`%${refCode}%`).first();
      }

      // 2. Kiểm tra theo Amount + Type + Account + Thời gian 120 giây
      if (!existingTx) {
        existingTx = await env.DB.prepare(`
          SELECT t.*, c.name as category_name
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          WHERE t.amount = ? AND t.account_id = ? AND t.type = ?
            AND (t.raw_telegram_text = ? OR t.note = ?)
            AND t.created_at >= datetime('now', '-120 seconds')
          ORDER BY t.created_at DESC LIMIT 1
        `).bind(parsed.amount, accountId, parsed.type, rawText, finalNote).first();
      }

      if (existingTx) {
        console.log(`[Deduplication] Bỏ qua thông báo trùng lặp cho giao dịch ID ${existingTx.id} (refCode: ${refCode})`);
        return jsonResponse({
          success: true,
          message: 'Giao dịch đã được ghi nhận trước đó (bỏ qua trùng lặp)',
          data: {
            id: existingTx.id,
            amount: existingTx.amount,
            type: existingTx.type,
            category_id: existingTx.category_id,
            category_name: existingTx.type === 'transfer' ? 'Chuyển tiền nội bộ (Rút ATM)' : existingTx.category_name,
            destination_account_id: existingTx.destination_account_id,
            note: existingTx.note,
            categorized_by: 'deduplication_cache',
            is_duplicate: true
          }
        });
      }

      // Ghi trực tiếp vào D1 Database
      await env.DB.prepare(`
        INSERT INTO transactions (
          id, date, amount, type, category_id, account_id, destination_account_id, note, source, raw_telegram_text, telegram_message_id, telegram_chat_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
      `).bind(
        txId,
        today,
        parsed.amount,
        parsed.type,
        catId,
        accountId,
        destinationAccountId,
        finalNote,
        reqSource || (isBankNoti ? 'bank_notification' : 'in_app_chat'),
        rawText,
        null,
        null
      ).run();

      // Cập nhật số dư tài khoản
      if (parsed.type === 'expense') {
        await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(parsed.amount, accountId).run();
      } else if (parsed.type === 'income') {
        await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(parsed.amount, accountId).run();
      } else if (parsed.type === 'transfer' && destinationAccountId) {
        await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(parsed.amount, accountId).run();
        await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(parsed.amount, destinationAccountId).run();
      }

      // Tính toán nhanh tình hình chu kỳ lương để phản hồi giàu ngữ cảnh (3-Bucket Financial Health)
      let financialHealth: FinancialHealth | null = null;
      try {
        const cycle = getPaycheckCycle(new Date());
        const cycleStats = await env.DB.prepare(`
          SELECT 
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
            COALESCE(SUM(CASE WHEN type = 'expense' AND category_id = 'cat_housing' THEN amount ELSE 0 END), 0) as paidHousing
          FROM transactions
          WHERE date BETWEEN ? AND ?
        `).bind(cycle.startDate, cycle.endDate).first();

        // Đọc cấu hình ngân sách từ bảng settings
        let savingsGoal = 0;
        let housingBudget = 4000000;
        let customBudget = 0;
        try {
          const settingsRows = await env.DB.prepare('SELECT key, value FROM settings').all();
          const settingsMap = new Map((settingsRows.results || []).map((r: any) => [r.key, r.value]));
          if (settingsMap.has('savings_goal')) savingsGoal = Number(settingsMap.get('savings_goal')) || 0;
          if (settingsMap.has('housing_budget')) housingBudget = Number(settingsMap.get('housing_budget')) || 0;
          if (settingsMap.has('custom_budget')) customBudget = Number(settingsMap.get('custom_budget')) || 0;
        } catch (sErr) {
          console.warn('Could not read settings from D1:', sErr);
        }

        const cycleExpense = Number(cycleStats?.totalExpense) || 0;
        const cycleIncome = Number(cycleStats?.totalIncome) || 0;
        const paidHousing = Number(cycleStats?.paidHousing) || 0;
        const baseBudget = customBudget > 0 ? customBudget : (cycleIncome > 0 ? cycleIncome : 15000000);

        const threeBucket = calculateThreeBucketSafeToSpend({
          baseBudget,
          savingsGoal,
          housingBudget,
          paidHousing,
          totalExpense: cycleExpense,
          daysRemaining: cycle.daysRemaining
        });

        const usedPercentage = baseBudget > 0 ? Math.round((cycleExpense / baseBudget) * 100) : 0;

        financialHealth = {
          cycleDisplay: cycle.shortDisplay,
          cycleExpense,
          cycleIncome,
          safeToSpendPerDay: threeBucket.safeToSpendPerDay,
          daysRemaining: cycle.daysRemaining,
          usedPercentage,
          savingsGoal,
          reservedHousing: threeBucket.reservedHousing
        };
      } catch (fhErr: any) {
        console.warn('Could not calculate financial health:', fhErr.message);
      }

      const categoryName =
        parsed.type === 'transfer'
          ? 'Chuyển tiền nội bộ (Rút ATM)'
          : categories.find(c => c.id === catId)?.name || null;

      return jsonResponse({
        success: true,
        data: {
          id: txId,
          amount: parsed.amount,
          type: parsed.type,
          category_id: catId,
          category_name: categoryName,
          destination_account_id: destinationAccountId,
          note: finalNote,
          categorized_by: categorizationMethod,
          financial_health: financialHealth
        }
      });
    } else {
      return jsonResponse({ success: false, error: 'Could not parse amount from text', raw: rawText }, 400);
    }
  }

  return jsonResponse({ success: true, message: 'Processed' });
}

// Handler: Quản lý bản tin tổng kết cuối ngày (Lưu D1 và truy vấn)
export async function handleDailySummary(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/daily-summary' && request.method === 'POST') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);

    try {
      const body: any = await request.json();
      const date = String(body.date || '').trim() || getVietnamDateString();
      const id = body.id || `sum_${date.replace(/-/g, '')}`;
      const todayExpense = Number(body.today_expense ?? body.todayExpense) || 0;
      const safeToSpend = Number(body.safe_to_spend ?? body.safeToSpend) || 0;
      const daysRemaining = Number(body.days_remaining ?? body.daysRemaining) || 0;
      let statusNote = body.status_note || body.statusNote || null;
      const summaryTime = `${date} 22:30:00`;
      const shouldGenerateAi = body.generate_ai === true || body.generateAi === true || !statusNote;

      if (shouldGenerateAi && env.DB) {
        let topExpenses: string[] = [];
        try {
          const txRows = await env.DB.prepare(`
            SELECT t.amount, t.note, c.name as category_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.date = ? AND t.type = 'expense'
            ORDER BY t.amount DESC
            LIMIT 5
          `).bind(date).all();

          topExpenses = (txRows.results || []).map((r: any) => {
            const amt = new Intl.NumberFormat('vi-VN').format(Math.round(r.amount));
            const cat = r.category_name || 'Chi tiêu';
            const note = (r.note || '').trim();
            return note ? `${amt} ₫ [${cat}] - ${note}` : `${amt} ₫ [${cat}]`;
          });
        } catch (txErr) {
          console.warn('Could not query top expenses for daily summary:', txErr);
        }

        if (env.AI) {
          try {
            const aiInsight = await generateDailyInsightWithAI(
              env.AI,
              {
                date,
                todayExpense,
                safeToSpend,
                daysRemaining,
                topExpenses
              },
              env.AI_MODEL || '@cf/google/gemma-4-26b-a4b-it',
              env.DB
            );
            if (aiInsight) {
              statusNote = aiInsight;
            }
          } catch (aiErr) {
            console.warn('AI insight generation failed, fallback to template:', aiErr);
          }
        }
      }

      // Fallback an toàn nếu AI không khả dụng hoặc chưa có lời nhắc
      if (!statusNote) {
        statusNote = todayExpense <= safeToSpend
          ? 'Chi tiêu an toàn, bạn đang kiểm soát ngân sách rất tốt! ✨'
          : 'Chi tiêu hôm nay hơi cao so với hạn mức, ngày mai cân đối nhé! ⚠️';
      }

      await env.DB.prepare(`
        INSERT INTO daily_summaries (id, date, today_expense, safe_to_spend, days_remaining, status_note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
          today_expense = excluded.today_expense,
          safe_to_spend = excluded.safe_to_spend,
          days_remaining = excluded.days_remaining,
          status_note = excluded.status_note,
          created_at = excluded.created_at
      `).bind(id, date, todayExpense, safeToSpend, daysRemaining, statusNote, summaryTime).run();

      return jsonResponse({
        success: true,
        data: {
          id,
          date,
          todayExpense,
          safeToSpend,
          daysRemaining,
          statusNote
        }
      }, 201);
    } catch (e: any) {
      console.error('Failed to upsert daily summary:', e);
      return jsonResponse({ success: false, error: e.message }, 400);
    }
  }

  if (url.pathname === '/api/daily-summary' && request.method === 'GET') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const date = url.searchParams.get('date');
    if (date) {
      const row = await env.DB.prepare('SELECT * FROM daily_summaries WHERE date = ?').bind(date).first();
      return jsonResponse({ success: true, data: row || null });
    }
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10', 10), 1), 30);
    const rows = await env.DB.prepare('SELECT * FROM daily_summaries ORDER BY date DESC LIMIT ?').bind(limit).all();
    return jsonResponse({ success: true, data: rows.results || [] });
  }

  return null;
}

// Handler: Lấy lịch sử 5-10 thông báo ngân hàng, chat và bản tin tổng kết ngày gần nhất từ D1 Database
export async function handleChatHistory(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/chat/history' && request.method === 'GET') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10', 10), 1), 50);

    // 1. Lấy giao dịch gần nhất
    const txRes = await env.DB.prepare(`
      SELECT 
        t.id,
        t.date,
        t.amount,
        t.type,
        t.category_id,
        t.account_id,
        t.destination_account_id,
        t.note,
        t.source,
        t.raw_telegram_text,
        t.created_at,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.source IN ('bank_notification', 'in_app_chat')
      ORDER BY t.created_at DESC
      LIMIT ?
    `).bind(limit).all();

    // Tính toán nhanh tình hình chu kỳ lương hiện tại để đính kèm vào lịch sử chat (3-Bucket Model)
    let currentFinancialHealth: FinancialHealth | null = null;
    try {
      const cycle = getPaycheckCycle(new Date());
      const cycleStats = await env.DB.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
          COALESCE(SUM(CASE WHEN type = 'expense' AND category_id = 'cat_housing' THEN amount ELSE 0 END), 0) as paidHousing
        FROM transactions
        WHERE date BETWEEN ? AND ?
      `).bind(cycle.startDate, cycle.endDate).first();

      // Đọc cấu hình ngân sách từ bảng settings
      let savingsGoal = 0;
      let housingBudget = 4000000;
      let customBudget = 0;
      try {
        const settingsRows = await env.DB.prepare('SELECT key, value FROM settings').all();
        const settingsMap = new Map((settingsRows.results || []).map((r: any) => [r.key, r.value]));
        if (settingsMap.has('savings_goal')) savingsGoal = Number(settingsMap.get('savings_goal')) || 0;
        if (settingsMap.has('housing_budget')) housingBudget = Number(settingsMap.get('housing_budget')) || 0;
        if (settingsMap.has('custom_budget')) customBudget = Number(settingsMap.get('custom_budget')) || 0;
      } catch (sErr) {
        console.warn('Could not read settings from D1 for history:', sErr);
      }

      const cycleExpense = Number(cycleStats?.totalExpense) || 0;
      const cycleIncome = Number(cycleStats?.totalIncome) || 0;
      const paidHousing = Number(cycleStats?.paidHousing) || 0;
      const baseBudget = customBudget > 0 ? customBudget : (cycleIncome > 0 ? cycleIncome : 15000000);

      const threeBucket = calculateThreeBucketSafeToSpend({
        baseBudget,
        savingsGoal,
        housingBudget,
        paidHousing,
        totalExpense: cycleExpense,
        daysRemaining: cycle.daysRemaining
      });

      const usedPercentage = baseBudget > 0 ? Math.round((cycleExpense / baseBudget) * 100) : 0;

      currentFinancialHealth = {
        cycleDisplay: cycle.shortDisplay,
        cycleExpense,
        cycleIncome,
        safeToSpendPerDay: threeBucket.safeToSpendPerDay,
        daysRemaining: cycle.daysRemaining,
        usedPercentage,
        savingsGoal,
        reservedHousing: threeBucket.reservedHousing
      };
    } catch (fhErr) {
      console.warn('Could not calculate current financial health for history:', fhErr);
    }

    const txItems = (txRes.results || []).map((t: any) => ({
      id: t.id,
      rawText: t.raw_telegram_text || t.note,
      source: t.source || 'bank_notification',
      createdAt: t.created_at,
      created_at: t.created_at,
      result: {
        id: t.id,
        amount: t.amount,
        type: t.type,
        category_id: t.category_id,
        category_name: t.type === 'transfer' ? 'Chuyển tiền nội bộ (Rút ATM)' : (t.category_name || 'Chưa phân loại'),
        destination_account_id: t.destination_account_id,
        note: t.note,
        source: t.source,
        categorized_by: t.type === 'transfer' ? 'atm_transfer_detector' : (t.source === 'bank_notification' ? 'fast_regex' : 'Copilot AI'),
        financial_health: t.type === 'expense' ? currentFinancialHealth : null
      },
      dailySummary: null
    }));

    // 2. Lấy các bản tin tổng kết ngày gần nhất (tối đa 5 bản tin gần nhất)
    let summaryItems: any[] = [];
    try {
      const sumRes = await env.DB.prepare(`
        SELECT id, date, today_expense, safe_to_spend, days_remaining, status_note, created_at
        FROM daily_summaries
        ORDER BY date DESC
        LIMIT 5
      `).all();

      summaryItems = (sumRes.results || []).map((s: any) => ({
        id: s.id || `sum_${s.date}`,
        rawText: `🌙 Tổng kết chi tiêu ngày ${s.date}`,
        source: 'daily_summary',
        createdAt: `${s.date} 22:30:00`,
        created_at: `${s.date} 22:30:00`,
        result: null,
        dailySummary: {
          id: s.id,
          date: s.date,
          todayExpense: Number(s.today_expense) || 0,
          safeToSpend: Number(s.safe_to_spend) || 0,
          daysRemaining: Number(s.days_remaining) || 0,
          statusNote: s.status_note || null,
          createdAt: `${s.date} 22:30:00`,
          created_at: `${s.date} 22:30:00`
        }
      }));
    } catch (e) {
      console.warn('Could not query daily_summaries table (migration might not have run yet):', e);
    }

    // 3. Hợp nhất (Merge) và sắp xếp theo thời gian tăng dần để hiển thị thành luồng chat tự nhiên
    const combined = [...txItems, ...summaryItems].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    // Giữ số lượng phần tử gần nhất theo limit
    const items = combined.slice(-Math.max(limit, 10));

    return jsonResponse({ success: true, count: items.length, data: items });
  }
  return null;
}


