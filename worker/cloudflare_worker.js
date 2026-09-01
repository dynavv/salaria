/**
 * ==============================================================================
 * 💎 SALARIA CLOUDFLARE EDGE WORKER WITH D1 DATABASE & WORKERS AI ENGINE
 * ==============================================================================
 * 100% Native Cloudflare Ecosystem (Zero External Dependency, Zero Latency)
 *
 * Hybrid Categorization Architecture:
 * - Layer 1: Fast-Path Regex (0ms, 0đ - Word-Boundary & D1 Keyword Matching)
 * - Layer 2: Native Workers AI Engine with Multi-Model Fallback Chain:
 *            1. @cf/meta/llama-3.2-3b-instruct (Primary)
 *            2. @cf/meta/llama-3.2-1b-instruct (Secondary Fallback)
 *            3. @cf/mistralai/mistral-small-24b-instruct-2501 (Tertiary Fallback)
 * - Layer 3: Data Safety Fallback (Confidence < 0.75 or ambiguous -> category_id = NULL)
 */

// Helper: Normalize Vietnamese text (remove accents and special chars)
function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
}

// Check system noise / promotions to filter out spam notifications
function isNoiseMessage(text) {
  const norm = (text || '').toLowerCase();
  const noise = [
    'preparing your receipt', 'adding the location', 'your receipt is ready',
    'dang nhap thanh cong', 'đăng nhập thành công', 'ma xac thuc', 'mã xác thực',
    'ma otp', 'mã otp', 'dac quyen', 'đặc quyền', 'han muc len den', 'hạn mức lên đến',
    'chung minh thu nhap', 'chứng minh thu nhập', 'dang ky vay', 'đăng ký vay',
    'khoan vay', 'khoản vay', 'vay tieu dung', 'vay tiêu dùng', 'mo the tin dung',
    'mở thẻ tín dụng', 'uu dai danh rieng', 'ưu đãi dành riêng', 'qua tang', 'quà tặng',
    'trung thuong', 'trúng thưởng'
  ];
  return noise.some(k => norm.includes(k));
}

// Lightweight Regex Parser for Vietnamese Bank & Chat text
function parseMoneyAndNote(rawText) {
  const line = (rawText || '').trim();
  if (!line || isNoiseMessage(line)) return null;

  // Clean balance/limit info to avoid confusing balance with transaction amount
  const cleanAmtLine = line.replace(/(?:Số dư khả dụng|So du kha dung|Số dư|So du|Hạn mức khả dụng|Han muc kha dung|HM khả dụng|HM kha dung|\bHM\b|Hạn mức|Han muc|\bSD\b)\s*[:\s]*[+-]?\s*[\d.,]+\s*(?:VND|vnd|đ|d|₫|\$|USD)?.*?(?=(?:\bND\b|Nội dung|Noi dung|\bGD\b|tại|tai)|$)/gis, ' ');

  let explicitType = null;
  if (line.startsWith('+') || /^thu\s*[:\-\s]/i.test(line)) {
    explicitType = 'income';
  } else if (line.startsWith('-') || /^chi\s*[:\-\s]/i.test(line)) {
    explicitType = 'expense';
  }

  let amount = 0;
  let matchedStr = '';

  // 1. Explicit keyword prefix: "Số tiền: -32,000 VND", "GD: +500,000"
  const explicitKwPattern = /(?:Số tiền|So tien|\bGD\b|Giao dịch|Giao dich)\s*[:\s]*([+-]?\s*[đ₫$]?\s*[\d.,]+(?:\s*(?:VND|vnd|đ|₫|\$|USD|\bđ\b))?)/i;
  let match = cleanAmtLine.match(explicitKwPattern);
  if (match) {
    const rawAmt = match[1];
    if (rawAmt.includes('-')) explicitType = 'expense';
    else if (rawAmt.includes('+')) explicitType = 'income';
    const digits = rawAmt.replace(/[^\d]/g, '');
    if (digits) {
      amount = parseInt(digits, 10);
      matchedStr = match[0];
    }
  }

  // 2. Currency symbol prefix: "₫32,649", "đ32.649", "$50.00", "+₫50,000"
  if (!amount) {
    const prefixCurrencyPattern = /(?:^|[\s|:(-])([+-]?\s*[đ₫$]\s*[\d.,]+)/i;
    match = cleanAmtLine.match(prefixCurrencyPattern);
    if (match) {
      const rawAmt = match[1];
      if (rawAmt.includes('-')) explicitType = 'expense';
      else if (rawAmt.includes('+')) explicitType = 'income';
      const digits = rawAmt.replace(/[^\d]/g, '');
      if (digits && parseInt(digits, 10) >= 1000) {
        amount = parseInt(digits, 10);
        matchedStr = match[0];
      }
    }
  }

  // 3. Currency symbol suffix: "32,649 VND", "32.649đ", "50000 VNĐ"
  if (!amount) {
    const suffixCurrencyPattern = /(?:^|[\s|:(-])([+-]?\s*\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:VND|vnd|VNĐ|vnđ|đ|₫|\$|USD|\bđ\b)(?!\w)/i;
    match = cleanAmtLine.match(suffixCurrencyPattern);
    if (match) {
      const rawFull = match[0];
      const rawNum = match[1];
      if (rawFull.includes('-')) explicitType = 'expense';
      else if (rawFull.includes('+')) explicitType = 'income';
      const digits = rawNum.replace(/[^\d]/g, '');
      if (digits && parseInt(digits, 10) >= 1000) {
        amount = parseInt(digits, 10);
        matchedStr = match[0];
      }
    }
  }

  // 4. Split million: "2tr5", "2củ5", "1m2", "3trieu5"
  if (!amount) {
    const splitMillionPattern = /(?:^|\s)([-+]?\s*\d+)\s*(?:tr|triệu|trieu|củ|cu|m)\s*(\d+)(?:\s|$|[^\w\d])/i;
    match = line.match(splitMillionPattern);
    if (match) {
      const whole = parseInt(match[1].replace(/[^\d]/g, ''), 10);
      const fracStr = match[2];
      const frac = parseInt(fracStr, 10) * Math.pow(10, 6 - fracStr.length);
      amount = whole * 1000000 + frac;
      matchedStr = match[0];
      if (match[1].includes('-')) explicitType = 'expense';
      if (match[1].includes('+')) explicitType = 'income';
    }
  }

  // 5. Shorthand "k" / "tr" / "củ": "35k", "15tr", "500k", "-45k", "+15tr"
  if (!amount) {
    const shorthandPattern = /(?:^|\s)([-+]?\s*\d+(?:[.,]\d+)?)\s*(k|nghìn|nghin|ng|tr|triệu|trieu|củ|cu|m)(?:\s|$|[^\w\d])/i;
    match = line.match(shorthandPattern);
    if (match) {
      const num = parseFloat(match[1].replace(',', '.').replace(/[^\d.]/g, ''));
      const unit = match[2].toLowerCase();
      if (['k', 'nghìn', 'nghin', 'ng'].includes(unit)) {
        amount = Math.round(num * 1000);
      } else {
        amount = Math.round(num * 1000000);
      }
      matchedStr = match[0];
      if (match[1].includes('-')) explicitType = 'expense';
      if (match[1].includes('+')) explicitType = 'income';
    }
  }

  if (!amount || amount <= 0) return null;

  // Derive final transaction type
  const type = explicitType || 'expense';

  // Extract clean note
  let note = line;
  if (matchedStr) {
    note = note.replace(matchedStr, ' ');
  }
  note = note
    .replace(/^[-+]\s*/, '')
    .replace(/(?:Số tiền|So tien|\bGD\b|Giao dịch|Giao dich|\bND\b|Nội dung|Noi dung|tai|tại)\s*[:\s]*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!note) {
    note = type === 'income' ? 'Thu nhập' : 'Chi tiêu';
  }

  return { amount, type, note };
}

// Layer 1: Match Category from keywords in D1 (Fast-Path with strict word boundary for single & multi-word)
function matchCategoryFast(note, categories) {
  const normNote = ` ${normalizeText(note)} `;
  for (const cat of categories) {
    if (!cat.keywords) continue;
    const kwList = cat.keywords.split(',').map(k => normalizeText(k)).filter(Boolean);
    for (const kw of kwList) {
      if (!kw) continue;
      // Convert keyword to strict word-boundary regex (handles multi-word without partial collision)
      const escaped = kw.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      const regex = new RegExp(`(?:^|\\s|[.,;!?:/-])${escaped}(?:$|\\s|[.,;!?:/-])`, 'i');
      if (regex.test(normNote)) {
        return cat.id;
      }
    }
  }
  return null;
}

// Build Prompt for AI
function buildAIPrompt(text, categories) {
  const catListStr = categories.map(c => `- ID: "${c.id}", Tên: "${c.name}", Loại: "${c.type}"`).join('\n');
  return `Bạn là trợ lý AI phân loại chi tiêu tài chính cá nhân tiếng Việt cho ứng dụng Salaria.
Nhiệm vụ: Phân tích nội dung giao dịch ngân hàng/tin nhắn và chọn category_id phù hợp nhất.

DANH SÁCH DANH MỤC HỢP LỆ:
${catListStr}
- ID: "cat_other_expense", Tên: "Chi tiêu khác" (Chỉ dùng cho các khoản chi lặt vặt có chủ đích rõ ràng: đám cưới, ma chay, phạt giao thông, từ thiện, đóng quỹ, phí ngân hàng...)

QUY TẮC PHÂN LOẠI:
1. Đồ ăn, thức uống, nhà hàng, quán ăn, cafe, lẩu, nướng, trà sữa, siêu thị thực phẩm (Highlands, Starbucks, Phở, Cơm, Haidilao, Manwah, KFM, WinMart, KingFoodMart, Kichi...) -> cat_food
2. Xăng xe, gửi xe, Grab, Be, bảo dưỡng xe, taxi, rửa xe, cầu đường -> cat_transport
3. Điện, nước, internet, tiền nhà, phí dịch vụ chung cư, rác -> cat_housing
4. Shopee, Lazada, Tiki, Tiktok Shop, quần áo, mỹ phẩm, phụ kiện, đồ điện tử, đồ gia dụng -> cat_shopping
5. Xem phim, CGV, Netflix, Spotify, game, du lịch, khách sạn -> cat_entertainment
6. Học tập, sách, khóa học, học phí, ứng dụng học ngoại ngữ (ELSA, Duolingo, Coursera, Udemy, IELTS, TOEIC...) -> cat_education
7. Khám bệnh, thuốc, y tế, nha khoa, kính mắt -> cat_health
8. Cắt tóc, gym, spa, yoga, thể thao -> cat_personal_care
9. Lương -> cat_salary, Thưởng/Tip -> cat_bonus
10. ĐẶC BIỆT: Nếu text quá mơ hồ, chỉ có mã giao dịch vô nghĩa hoặc không có bất kỳ dấu hiệu nào về mục đích chi tiêu (ví dụ: "chuyen khoan", "ck", "anh nam", "01283921") -> category_id phải là null, confidence < 0.5.

HÃY TRẢ VỀ DUY NHẤT MỘT JSON OBJECT theo cấu trúc:
{
  "category_id": "ID danh mục (ví dụ cat_education, cat_food...) hoặc null",
  "confidence": 0.95,
  "clean_note": "Tên món/dịch vụ ngắn gọn (ví dụ: ELSA Speak, Haidilao, Cơm tấm... TUYỆT ĐỐI KHÔNG điền tên danh mục vào đây)",
  "reason": "Giải thích ngắn gọn"
}`;
}

// Layer 2: Cloudflare Workers AI with Multi-Model Fallback Chain
async function categorizeWithWorkersAI(aiBinding, text, categories, preferredModel = '@cf/meta/llama-3.2-3b-instruct') {
  if (!aiBinding || !text || !categories || categories.length === 0) return null;

  const systemPrompt = buildAIPrompt(text, categories);

  // Fallback Chain: Llama 3.2 3B -> Llama 3.2 1B -> Mistral Small
  const candidateModels = [
    preferredModel,
    '@cf/meta/llama-3.2-3b-instruct',
    '@cf/meta/llama-3.2-1b-instruct',
    '@cf/mistralai/mistral-small-24b-instruct-2501'
  ].filter((v, i, a) => a.indexOf(v) === i); // remove duplicates

  for (const model of candidateModels) {
    try {
      const response = await aiBinding.run(model, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Nội dung: "${text}"` }
        ],
        temperature: 0.1,
        max_tokens: 256
      });

      // 1. Direct object response
      if (response?.response && typeof response.response === 'object' && response.response.category_id !== undefined) {
        return { ...response.response, model_used: model };
      }

      // 2. Text response in response.response
      const rawText = typeof response?.response === 'string'
        ? response.response
        : (response?.choices?.[0]?.message?.content || '');

      if (rawText) {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return { ...parsed, model_used: model };
        }
      }
    } catch (err) {
      console.warn(`[Workers AI Fallback] Model ${model} failed, switching to next candidate:`, err.message);
    }
  }

  return null;
}

// Send Telegram Notification Helper
async function sendTelegram(botToken, chatId, text) {
  if (!botToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.error('Telegram notification error:', e);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ALLOWED_KEYS = new Set([
      env?.API_KEY,
      env?.SECRET_TOKEN,
      'salaria_secret_2026',
      'salarini_secret_2026'
    ].filter(Boolean));

    const AI_MODEL = env?.AI_MODEL || '@cf/meta/llama-3.2-3b-instruct';
    const TELEGRAM_BOT_TOKEN = env?.TELEGRAM_BOT_TOKEN || env?.BOT_TOKEN || '';
    const ALLOWED_CHAT_ID = env?.ALLOWED_CHAT_ID ? String(env.ALLOWED_CHAT_ID) : '';

    const checkApiKey = (token) => {
      return Boolean(token && ALLOWED_KEYS.has(token));
    };

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-telegram-bot-api-secret-token',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

    // Check MacroDroid Query params (?text=, ?title=&text=)
    const title = url.searchParams.get('title') || url.searchParams.get('not_title') || '';
    const rawParamText = url.searchParams.get('text') || url.searchParams.get('msg') || url.searchParams.get('body') || url.searchParams.get('not_text') || '';
    const queryText = (title && rawParamText) ? `${title} ${rawParamText}` : (rawParamText || title);

    // =========================================================================
    // 1. HEALTH / STATUS CHECK
    // =========================================================================
    if ((url.pathname === '/' || url.pathname === '/health' || url.pathname === '/api/status') && !queryText && request.method === 'GET') {
      let dbStatus = 'Disconnected';
      let totalTransactions = 0;
      let pendingSync = 0;

      if (env.DB) {
        try {
          const countRes = await env.DB.prepare('SELECT COUNT(*) as count FROM transactions').first();
          const pendingRes = await env.DB.prepare('SELECT COUNT(*) as count FROM transactions WHERE is_synced = 0').first();
          totalTransactions = countRes?.count || 0;
          pendingSync = pendingRes?.count || 0;
          dbStatus = 'Connected (Cloudflare D1)';
        } catch (e) {
          dbStatus = `Error: ${e.message}`;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        service: 'Salaria Cloudflare D1 Edge Worker',
        database: dbStatus,
        ai_engine: env.AI ? `Active (Workers AI: ${AI_MODEL})` : 'Disabled',
        stats: {
          total_transactions: totalTransactions,
          pending_sync_to_local: pendingSync
        },
        timestamp: new Date().toISOString()
      }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // =========================================================================
    // 2. LOCAL SYNC ENDPOINTS (For Local Node.js Server to pull & ack)
    // =========================================================================
    if (url.pathname === '/api/sync/pull') {
      const clientKey = request.headers.get('x-api-key') || url.searchParams.get('token') || url.searchParams.get('key');
      if (!checkApiKey(clientKey)) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Invalid API Key' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!env.DB) {
        return new Response(JSON.stringify({ success: false, error: 'D1 Database not bound' }), { status: 500 });
      }

      // Fetch pending transactions
      const txs = await env.DB.prepare(`
        SELECT t.*, c.name as category_name, a.name as account_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.is_synced = 0
        ORDER BY t.created_at ASC
      `).all();

      const categories = await env.DB.prepare('SELECT * FROM categories').all();
      const accounts = await env.DB.prepare('SELECT * FROM accounts').all();

      return new Response(JSON.stringify({
        success: true,
        data: {
          transactions: txs.results || [],
          categories: categories.results || [],
          accounts: accounts.results || []
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/sync/ack' && request.method === 'POST') {
      const clientKey = request.headers.get('x-api-key') || url.searchParams.get('token') || url.searchParams.get('key');
      if (!checkApiKey(clientKey)) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Invalid API Key' }), { status: 401 });
      }

      try {
        const body = await request.json();
        const ids = body.ids || [];
        if (Array.isArray(ids) && ids.length > 0 && env.DB) {
          const placeholders = ids.map(() => '?').join(',');
          await env.DB.prepare(`UPDATE transactions SET is_synced = 1 WHERE id IN (${placeholders})`).bind(...ids).run();
        }
        return new Response(JSON.stringify({ success: true, acknowledgedCount: ids.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
      }
    }

    // =========================================================================
    // 3. INGESTION: MACRODROID & TELEGRAM WEBHOOK
    // =========================================================================
    const reqApiKey = request.headers.get('x-api-key') ||
      request.headers.get('x-telegram-bot-api-secret-token') ||
      url.searchParams.get('token') ||
      url.searchParams.get('key');
    if (reqApiKey && !checkApiKey(reqApiKey)) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Invalid API Key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let rawText = '';
    let isBankNoti = false;
    let chatId = ALLOWED_CHAT_ID;
    let messageId = null;

    if (queryText) {
      rawText = queryText;
      isBankNoti = true;
    } else if (request.method === 'POST') {
      try {
        const body = await request.json();
        if (body.message || body.edited_message) {
          // Telegram Webhook format
          const msg = body.message || body.edited_message;
          rawText = msg.text || '';
          chatId = String(msg.chat?.id || ALLOWED_CHAT_ID);
          messageId = msg.message_id;
        } else if (body.text) {
          rawText = body.text;
          isBankNoti = Boolean(body.is_notification);
        }
      } catch (e) {
        rawText = await request.text();
      }
    }

    if (!rawText || !rawText.trim()) {
      return new Response('Salaria Edge Worker Active. No transaction text provided.', { status: 200 });
    }

    // Process Transaction & Store in D1
    if (env.DB) {
      const parsed = parseMoneyAndNote(rawText);
      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const today = new Date().toISOString().split('T')[0];

      if (parsed) {
        // Fetch categories from D1
        let categories = [];
        try {
          const catsRes = await env.DB.prepare('SELECT id, name, type, group_type, keywords FROM categories').all();
          categories = catsRes.results || [];
        } catch (e) {
          console.error('Failed to load categories:', e);
        }

        // TẦNG 1: Khớp từ khóa nhanh (Fast Path - 0ms)
        let catId = matchCategoryFast(parsed.note, categories);
        let categorizationMethod = catId ? 'fast_regex' : 'unassigned';
        let finalNote = parsed.note;

        // TẦNG 2: Cloudflare Workers AI với Multi-Model Fallback
        if (!catId && env.AI) {
          try {
            const aiResult = await categorizeWithWorkersAI(env.AI, rawText, categories, AI_MODEL);
            if (aiResult) {
              const shortModelName = (aiResult.model_used || AI_MODEL).replace('@cf/meta/', '').replace('@cf/mistralai/', '');
              // Chỉ nhận category nếu độ tin cậy >= 0.75
              if (aiResult.category_id && Number(aiResult.confidence) >= 0.75) {
                const validCat = categories.find(c => c.id === aiResult.category_id);
                if (validCat) {
                  catId = aiResult.category_id;
                  categorizationMethod = `workers_ai (${shortModelName}) (${Math.round(aiResult.confidence * 100)}%)`;
                }
              } else {
                categorizationMethod = `unassigned (ai_confidence: ${Math.round((aiResult.confidence || 0) * 100)}%)`;
              }
              if (aiResult.clean_note && aiResult.clean_note.length > 0) {
                finalNote = aiResult.clean_note;
              }
            }
          } catch (aiErr) {
            console.warn('Workers AI engine error:', aiErr.message);
          }
        }

        const accountId = isBankNoti ? 'acc_bank' : 'acc_cash';

        // Ghi trực tiếp vào D1 Database (category_id có thể là NULL nếu chưa phân loại)
        await env.DB.prepare(`
          INSERT INTO transactions (
            id, date, amount, type, category_id, account_id, note, source, raw_telegram_text, telegram_message_id, telegram_chat_id, is_synced
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).bind(
          txId,
          today,
          parsed.amount,
          parsed.type,
          catId,
          accountId,
          finalNote,
          isBankNoti ? 'bank_notification' : 'telegram_bot',
          rawText,
          messageId,
          chatId
        ).run();

        // Gửi tin nhắn xác nhận qua Telegram
        if (TELEGRAM_BOT_TOKEN && chatId) {
          const sign = parsed.type === 'income' ? '🟢 +' : '🔴 -';
          const formattedAmt = new Intl.NumberFormat('vi-VN').format(parsed.amount) + ' ₫';
          const catName = categories.find(c => c.id === catId)?.name || '⚠️ Chưa phân loại';
          ctx.waitUntil(
            sendTelegram(
              TELEGRAM_BOT_TOKEN,
              chatId,
              `✨ <b>Ghi chép giao dịch thành công!</b>\n` +
              `• <b>Số tiền:</b> ${sign}${formattedAmt}\n` +
              `• <b>Nội dung:</b> ${finalNote}\n` +
              `• <b>Danh mục:</b> ${catName}\n` +
              `• <b>Phân loại:</b> <code>${categorizationMethod}</code>\n` +
              `• <b>Nguồn:</b> ${isBankNoti ? '🔔 Thông báo Ngân hàng' : '💬 Tin nhắn Telegram'}`
            )
          );
        }

        return new Response(JSON.stringify({
          success: true,
          data: {
            id: txId,
            amount: parsed.amount,
            type: parsed.type,
            category_id: catId,
            category_name: categories.find(c => c.id === catId)?.name || null,
            note: finalNote,
            categorized_by: categorizationMethod
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        // Fallback Alert: Parsing failed
        if (TELEGRAM_BOT_TOKEN && chatId && !isNoiseMessage(rawText)) {
          ctx.waitUntil(
            sendTelegram(
              TELEGRAM_BOT_TOKEN,
              chatId,
              `⚠️ <b>Không thể bóc tách giao dịch tự động:</b>\n` +
              `<i>"${rawText}"</i>\n\n` +
              `💡 <i>Vui lòng nhập lại đúng cú pháp (VD: <code>35k cafe</code> hoặc <code>+15tr luong</code>)</i>`
            )
          );
        }
        return new Response(JSON.stringify({ success: false, error: 'Could not parse amount from text', raw: rawText }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Processed & Saved to D1' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
