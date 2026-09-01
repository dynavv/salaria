/**
 * ==============================================================================
 * 💎 SALARIA — 100% SERVERLESS CLOUDFLARE EDGE WORKER & D1 REST API SERVER
 * ==============================================================================
 * Native Cloudflare Full-Stack Architecture:
 * - Database: Cloudflare D1 (salarini-db)
 * - AI Engine: Cloudflare Workers AI (Llama 3.2 3B + Multi-Model Fallback Chain)
 * - Web App REST API: Full CRUD for Transactions, Accounts, Categories, Analytics & AI
 * - Ingestion: MacroDroid Webhook + Telegram Bot Webhook 24/7
 */

// Helper: Normalize Vietnamese text
function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
}

// Check system noise / promotions
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

  const type = explicitType || 'expense';
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

// Layer 1: Fast-Path Word-Boundary Keyword Matching
function matchCategoryFast(note, categories) {
  const normNote = ` ${normalizeText(note)} `;
  for (const cat of categories) {
    if (!cat.keywords) continue;
    const kwList = cat.keywords.split(',').map(k => normalizeText(k)).filter(Boolean);
    for (const kw of kwList) {
      if (!kw) continue;
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
  const candidateModels = [
    preferredModel,
    '@cf/meta/llama-3.2-3b-instruct',
    '@cf/meta/llama-3.2-1b-instruct',
    '@cf/mistralai/mistral-small-24b-instruct-2501'
  ].filter((v, i, a) => a.indexOf(v) === i);

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

      if (response?.response && typeof response.response === 'object' && response.response.category_id !== undefined) {
        return { ...response.response, model_used: model };
      }

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
      console.warn(`[Workers AI Fallback] Model ${model} failed:`, err.message);
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-telegram-bot-api-secret-token',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

    const jsonResponse = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    };

    // =========================================================================
    // 0. FRONTEND SPA & STATIC ASSETS ROUTING (WITH MIME TYPE INFERENCE)
    // =========================================================================
    if (!url.pathname.startsWith('/api/') && url.pathname !== '/health' && url.pathname !== '/status' && !url.searchParams.has('text') && request.method === 'GET') {
      if (env.ASSETS) {
        const assetRes = await env.ASSETS.fetch(request);
        const pathname = url.pathname.toLowerCase();
        let mime = null;

        if (pathname.endsWith('.js') || pathname.endsWith('.mjs')) {
          mime = 'application/javascript; charset=UTF-8';
        } else if (pathname.endsWith('.css')) {
          mime = 'text/css; charset=UTF-8';
        } else if (pathname.endsWith('.svg')) {
          mime = 'image/svg+xml';
        } else if (pathname.endsWith('.html') || pathname === '/' || !pathname.includes('.')) {
          mime = 'text/html; charset=UTF-8';
        } else if (pathname.endsWith('.json')) {
          mime = 'application/json; charset=UTF-8';
        } else if (pathname.endsWith('.png')) {
          mime = 'image/png';
        } else if (pathname.endsWith('.ico')) {
          mime = 'image/x-icon';
        } else if (pathname.endsWith('.woff2')) {
          mime = 'font/woff2';
        }

        if (mime) {
          const newHeaders = new Headers(assetRes.headers);
          newHeaders.set('Content-Type', mime);
          return new Response(assetRes.body, {
            status: assetRes.status,
            statusText: assetRes.statusText,
            headers: newHeaders
          });
        }
        return assetRes;
      }
    }

    // =========================================================================
    // 1. HEALTH / STATUS CHECK
    // =========================================================================
    if ((url.pathname === '/health' || url.pathname === '/api/status') && request.method === 'GET' && !url.searchParams.has('text')) {
      let dbStatus = 'Disconnected';
      let totalTransactions = 0;

      if (env.DB) {
        try {
          const countRes = await env.DB.prepare('SELECT COUNT(*) as count FROM transactions').first();
          totalTransactions = countRes?.count || 0;
          dbStatus = 'Connected (Cloudflare D1)';
        } catch (e) {
          dbStatus = `Error: ${e.message}`;
        }
      }

      return jsonResponse({
        success: true,
        service: 'Salaria Cloudflare D1 Full-Stack REST API & Edge Worker',
        database: dbStatus,
        ai_engine: env.AI ? `Active (Workers AI: ${AI_MODEL})` : 'Disabled',
        stats: { total_transactions: totalTransactions },
        timestamp: new Date().toISOString()
      });
    }

    // =========================================================================
    // 2. ACCOUNTS API (CRUD)
    // =========================================================================
    if (url.pathname === '/api/accounts' && request.method === 'GET') {
      if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
      const accounts = await env.DB.prepare('SELECT * FROM accounts ORDER BY is_default DESC, name ASC').all();
      return jsonResponse({ success: true, data: accounts.results || [] });
    }

    if (url.pathname === '/api/accounts' && request.method === 'POST') {
      const body = await request.json();
      const id = body.id || `acc_${Date.now()}`;
      const name = body.name || 'Tài khoản mới';
      const type = body.type || 'cash';
      const balance = Number(body.balance) || 0;
      const initial_balance = Number(body.initial_balance) || balance;
      const currency = body.currency || 'VND';
      const icon = body.icon || 'Wallet';
      const color = body.color || '#3b82f6';
      const is_default = body.is_default ? 1 : 0;

      await env.DB.prepare(`
        INSERT INTO accounts (id, name, type, balance, initial_balance, currency, icon, color, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, name, type, balance, initial_balance, currency, icon, color, is_default).run();

      return jsonResponse({ success: true, data: { id, name, type, balance, initial_balance, currency, icon, color, is_default } }, 201);
    }

    if (url.pathname.startsWith('/api/accounts/') && request.method === 'PUT') {
      const id = url.pathname.replace('/api/accounts/', '');
      const body = await request.json();
      await env.DB.prepare(`
        UPDATE accounts SET
          name = COALESCE(?, name),
          type = COALESCE(?, type),
          balance = COALESCE(?, balance),
          initial_balance = COALESCE(?, initial_balance),
          icon = COALESCE(?, icon),
          color = COALESCE(?, color),
          is_default = COALESCE(?, is_default)
        WHERE id = ?
      `).bind(body.name, body.type, body.balance, body.initial_balance, body.icon, body.color, body.is_default, id).run();

      return jsonResponse({ success: true, message: 'Account updated' });
    }

    if (url.pathname.startsWith('/api/accounts/') && request.method === 'DELETE') {
      const id = url.pathname.replace('/api/accounts/', '');
      await env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(id).run();
      return jsonResponse({ success: true, message: 'Account deleted' });
    }

    // =========================================================================
    // 3. CATEGORIES API (CRUD)
    // =========================================================================
    if (url.pathname === '/api/categories' && request.method === 'GET') {
      if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
      const type = url.searchParams.get('type');
      let query = 'SELECT * FROM categories';
      let params = [];
      if (type) {
        query += ' WHERE type = ?';
        params.push(type);
      }
      query += ' ORDER BY group_type ASC, name ASC';
      const res = await env.DB.prepare(query).bind(...params).all();
      return jsonResponse({ success: true, data: res.results || [] });
    }

    if (url.pathname === '/api/categories' && request.method === 'POST') {
      const body = await request.json();
      const id = body.id || `cat_${Date.now()}`;
      const name = body.name || 'Danh mục mới';
      const type = body.type || 'expense';
      const group_type = body.group_type || 'needs';
      const icon = body.icon || 'Tag';
      const color = body.color || '#64748b';
      const keywords = body.keywords || '';
      const budget_monthly = Number(body.budget_monthly) || 0;

      await env.DB.prepare(`
        INSERT INTO categories (id, name, type, group_type, icon, color, keywords, budget_monthly)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, name, type, group_type, icon, color, keywords, budget_monthly).run();

      return jsonResponse({ success: true, data: { id, name, type, group_type, icon, color, keywords, budget_monthly } }, 201);
    }

    if (url.pathname.startsWith('/api/categories/') && request.method === 'PUT') {
      const id = url.pathname.replace('/api/categories/', '');
      const body = await request.json();
      await env.DB.prepare(`
        UPDATE categories SET
          name = COALESCE(?, name),
          type = COALESCE(?, type),
          group_type = COALESCE(?, group_type),
          icon = COALESCE(?, icon),
          color = COALESCE(?, color),
          keywords = COALESCE(?, keywords),
          budget_monthly = COALESCE(?, budget_monthly)
        WHERE id = ?
      `).bind(body.name, body.type, body.group_type, body.icon, body.color, body.keywords, body.budget_monthly, id).run();

      return jsonResponse({ success: true, message: 'Category updated' });
    }

    if (url.pathname.startsWith('/api/categories/') && request.method === 'DELETE') {
      const id = url.pathname.replace('/api/categories/', '');
      await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
      return jsonResponse({ success: true, message: 'Category deleted' });
    }

    // =========================================================================
    // 4. TRANSACTIONS API (CRUD & Filtering)
    // =========================================================================
    if (url.pathname === '/api/transactions' && request.method === 'GET') {
      if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);

      const month = url.searchParams.get('month');
      const date = url.searchParams.get('date');
      const category_id = url.searchParams.get('category_id');
      const account_id = url.searchParams.get('account_id');
      const type = url.searchParams.get('type');
      const group_type = url.searchParams.get('group_type');
      const max_amount = url.searchParams.get('max_amount');
      const search = url.searchParams.get('search');
      const limit = parseInt(url.searchParams.get('limit') || '500', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);

      let conditions = [];
      let params = [];

      if (month) {
        conditions.push("substr(t.date, 1, 7) = ?");
        params.push(month);
      }
      if (date) {
        conditions.push("t.date = ?");
        params.push(date);
      }
      if (category_id) {
        conditions.push("t.category_id = ?");
        params.push(category_id);
      }
      if (account_id) {
        conditions.push("t.account_id = ?");
        params.push(account_id);
      }
      if (type) {
        conditions.push("t.type = ?");
        params.push(type);
      }
      if (group_type) {
        conditions.push("c.group_type = ?");
        params.push(group_type);
      }
      if (max_amount) {
        conditions.push("t.amount <= ?");
        params.push(Number(max_amount));
      }
      if (search) {
        conditions.push("(t.note LIKE ? OR c.name LIKE ? OR a.name LIKE ?)");
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT 
          t.*,
          c.name as category_name,
          c.icon as category_icon,
          c.color as category_color,
          c.group_type as category_group_type,
          a.name as account_name,
          a.icon as account_icon,
          a.color as account_color,
          da.name as destination_account_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN accounts da ON t.destination_account_id = da.id
        ${whereClause}
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const rows = await env.DB.prepare(query).bind(...params).all();

      // Available months
      const monthsRes = await env.DB.prepare("SELECT DISTINCT substr(date, 1, 7) as month FROM transactions ORDER BY month DESC").all();
      const availableMonths = (monthsRes.results || []).map(r => r.month).filter(Boolean);

      return jsonResponse({
        success: true,
        data: rows.results || [],
        availableMonths: availableMonths.length > 0 ? availableMonths : [new Date().toISOString().substring(0, 7)]
      });
    }

    if (url.pathname === '/api/transactions' && request.method === 'POST') {
      const body = await request.json();
      const id = body.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const date = body.date || new Date().toISOString().split('T')[0];
      const amount = Number(body.amount) || 0;
      const type = body.type || 'expense';
      const category_id = body.category_id || null;
      const account_id = body.account_id || 'acc_cash';
      const destination_account_id = body.destination_account_id || null;
      const note = body.note || '';
      const source = body.source || 'manual';

      await env.DB.prepare(`
        INSERT INTO transactions (id, date, amount, type, category_id, account_id, destination_account_id, note, source, is_synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).bind(id, date, amount, type, category_id, account_id, destination_account_id, note, source).run();

      // Update account balance
      if (type === 'expense') {
        await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(amount, account_id).run();
      } else if (type === 'income') {
        await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(amount, account_id).run();
      } else if (type === 'transfer' && destination_account_id) {
        await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(amount, account_id).run();
        await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(amount, destination_account_id).run();
      }

      return jsonResponse({ success: true, data: { id, date, amount, type, category_id, account_id, note } }, 201);
    }

    if (url.pathname.startsWith('/api/transactions/') && request.method === 'PUT') {
      const id = url.pathname.replace('/api/transactions/', '');
      const body = await request.json();

      // Fetch old transaction to revert balance
      const oldTx = await env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
      if (oldTx) {
        if (oldTx.type === 'expense') {
          await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(oldTx.amount, oldTx.account_id).run();
        } else if (oldTx.type === 'income') {
          await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(oldTx.amount, oldTx.account_id).run();
        }
      }

      const newDate = body.date || oldTx?.date;
      const newAmount = Number(body.amount) !== undefined ? Number(body.amount) : oldTx?.amount;
      const newType = body.type || oldTx?.type;
      const newCategoryId = body.category_id !== undefined ? body.category_id : oldTx?.category_id;
      const newAccountId = body.account_id || oldTx?.account_id;
      const newNote = body.note !== undefined ? body.note : oldTx?.note;

      await env.DB.prepare(`
        UPDATE transactions SET
          date = ?,
          amount = ?,
          type = ?,
          category_id = ?,
          account_id = ?,
          note = ?
        WHERE id = ?
      `).bind(newDate, newAmount, newType, newCategoryId, newAccountId, newNote, id).run();

      // Apply new balance
      if (newType === 'expense') {
        await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(newAmount, newAccountId).run();
      } else if (newType === 'income') {
        await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(newAmount, newAccountId).run();
      }

      return jsonResponse({ success: true, message: 'Transaction updated' });
    }

    if (url.pathname.startsWith('/api/transactions/') && request.method === 'DELETE') {
      const id = url.pathname.replace('/api/transactions/', '');
      if (id === 'clear-all') {
        await env.DB.prepare('DELETE FROM transactions').run();
        // Reset balances to initial_balance
        await env.DB.prepare('UPDATE accounts SET balance = initial_balance').run();
        return jsonResponse({ success: true, message: 'All transactions cleared and accounts reset' });
      }

      const oldTx = await env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
      if (oldTx) {
        if (oldTx.type === 'expense') {
          await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(oldTx.amount, oldTx.account_id).run();
        } else if (oldTx.type === 'income') {
          await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(oldTx.amount, oldTx.account_id).run();
        }
        await env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run();
      }
      return jsonResponse({ success: true, message: 'Transaction deleted' });
    }

    // =========================================================================
    // 5. ANALYTICS & FINANCIAL HEALTH API
    // =========================================================================
    if (url.pathname === '/api/analytics/available-months' && request.method === 'GET') {
      const monthsRes = await env.DB.prepare("SELECT DISTINCT substr(date, 1, 7) as month FROM transactions ORDER BY month DESC").all();
      const months = (monthsRes.results || []).map(r => r.month).filter(Boolean);
      return jsonResponse({ success: true, data: months.length > 0 ? months : [new Date().toISOString().substring(0, 7)] });
    }

    if (url.pathname === '/api/analytics/monthly' && request.method === 'GET') {
      const month = url.searchParams.get('month') || new Date().toISOString().substring(0, 7);

      const txsRes = await env.DB.prepare(`
        SELECT t.*, c.name as category_name, c.group_type as category_group_type, c.color as category_color, c.icon as category_icon, c.budget_monthly
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE substr(t.date, 1, 7) = ?
        ORDER BY t.date ASC
      `).bind(month).all();

      const txs = txsRes.results || [];

      let totalIncome = 0;
      let totalExpense = 0;
      let needsExpense = 0;
      let wantsExpense = 0;

      const categoryMap = new Map();
      const dailyMap = new Map();

      for (const t of txs) {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') {
          totalIncome += amt;
        } else if (t.type === 'expense') {
          totalExpense += amt;
          const grp = t.category_group_type || 'needs';
          if (grp === 'needs') needsExpense += amt;
          else if (grp === 'wants') wantsExpense += amt;

          // Category stats
          const catId = t.category_id || 'uncategorized';
          const catName = t.category_name || 'Chưa phân loại';
          const catColor = t.category_color || '#94a3b8';
          const catIcon = t.category_icon || 'Tag';
          const catBudget = Number(t.budget_monthly) || 0;

          if (!categoryMap.has(catId)) {
            categoryMap.set(catId, {
              categoryId: catId,
              categoryName: catName,
              color: catColor,
              icon: catIcon,
              amount: 0,
              budget: catBudget
            });
          }
          categoryMap.get(catId).amount += amt;

          // Daily stats
          const d = t.date;
          if (!dailyMap.has(d)) dailyMap.set(d, 0);
          dailyMap.set(d, dailyMap.get(d) + amt);
        }
      }

      const netSavings = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

      // Category breakdown
      const categories = Array.from(categoryMap.values()).map(c => ({
        ...c,
        percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0
      })).sort((a, b) => b.amount - a.amount);

      // Daily spending array
      const daysInMonth = new Date(parseInt(month.split('-')[0], 10), parseInt(month.split('-')[1], 10), 0).getDate();
      const dailySpending = [];
      const dailyAvg = daysInMonth > 0 ? Math.round(totalExpense / daysInMonth) : 0;

      for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = `${month}-${String(i).padStart(2, '0')}`;
        const amt = dailyMap.get(dayStr) || 0;
        let status = 'normal';
        if (amt > dailyAvg * 2 && amt > 100000) status = 'spike';
        else if (amt > dailyAvg * 1.3 && amt > 50000) status = 'high';

        dailySpending.push({
          date: dayStr,
          day: i,
          amount: amt,
          status
        });
      }

      // Safe daily spending
      const now = new Date();
      const currentDay = now.toISOString().substring(0, 7) === month ? now.getDate() : daysInMonth;
      const remainingDays = Math.max(1, daysInMonth - currentDay + 1);
      const targetSavings = totalIncome * 0.2;
      const maxAllowedExpense = Math.max(0, totalIncome - targetSavings);
      const safeDailySpendingRemaining = Math.max(0, Math.round((maxAllowedExpense - totalExpense) / remainingDays));

      return jsonResponse({
        success: true,
        data: {
          month,
          totalIncome,
          totalExpense,
          netSavings,
          savingsRate,
          rule503020: {
            needs: { amount: needsExpense, targetPercentage: 50, actualPercentage: totalIncome > 0 ? Math.round((needsExpense / totalIncome) * 100) : 0 },
            wants: { amount: wantsExpense, targetPercentage: 30, actualPercentage: totalIncome > 0 ? Math.round((wantsExpense / totalIncome) * 100) : 0 },
            savings: { amount: netSavings, targetPercentage: 20, actualPercentage: savingsRate }
          },
          burnRate: {
            dailyAverage: dailyAvg,
            projectedMonthlyExpense: dailyAvg * daysInMonth,
            safeDailySpendingRemaining
          },
          categories,
          dailySpending
        }
      });
    }

    if (url.pathname === '/api/analytics/advisor' && request.method === 'GET') {
      const month = url.searchParams.get('month') || new Date().toISOString().substring(0, 7);

      const txsRes = await env.DB.prepare(`
        SELECT t.*, c.name as category_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE substr(t.date, 1, 7) = ? AND t.type = 'expense'
      `).bind(month).all();

      const txs = txsRes.results || [];
      const smallExpenses = txs.filter(t => (Number(t.amount) || 0) <= 60000);
      const totalSmall = smallExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const totalExpense = txs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      // Financial health score
      let score = 70;
      if (totalExpense > 0) {
        if (totalSmall / totalExpense > 0.25) score -= 15;
        else if (totalSmall / totalExpense < 0.1) score += 10;
      }
      score = Math.max(20, Math.min(98, score));

      return jsonResponse({
        success: true,
        data: {
          month,
          healthScore: score,
          latteFactor: {
            threshold: 60000,
            count: smallExpenses.length,
            totalSmallExpenses: totalSmall,
            percentageOfTotalExpense: totalExpense > 0 ? Math.round((totalSmall / totalExpense) * 100) : 0,
            items: smallExpenses.slice(0, 10).map(t => ({ note: t.note, amount: t.amount, date: t.date }))
          }
        }
      });
    }

    if (url.pathname === '/api/analytics/ai-ask' && request.method === 'POST') {
      const body = await request.json();
      const question = body.question || 'Làm sao để tối ưu chi tiêu tháng này?';
      const month = body.month || new Date().toISOString().substring(0, 7);

      const txsRes = await env.DB.prepare(`
        SELECT t.date, t.amount, t.type, t.note, c.name as category_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE substr(t.date, 1, 7) = ?
        ORDER BY t.date DESC
        LIMIT 50
      `).bind(month).all();

      const summaryList = (txsRes.results || []).map(t => `- ${t.date}: ${t.type === 'income' ? '+' : '-'}${t.amount} (${t.category_name || 'Khác'}) - ${t.note}`).join('\n');

      let answer = 'Bạn nên theo dõi sát quy tắc 50/30/20 và hạn chế các khoản chi lặt vặt dưới 60.000₫ hàng ngày.';
      let modelUsed = 'Workers AI Heuristic';

      if (env.AI) {
        try {
          const sysPrompt = `Bạn là Cố Vấn Tài Chính Cá Nhân AI (AI Financial Advisor) chuyên nghiệp của Salaria.
Dữ liệu chi tiêu tháng ${month}:
${summaryList}

Nhiệm vụ: Trả lời câu hỏi người dùng sắc bén, thực tế, bằng tiếng Việt định dạng Markdown gọn gàng.`;

          const aiRes = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
            messages: [
              { role: 'system', content: sysPrompt },
              { role: 'user', content: question }
            ],
            temperature: 0.7,
            max_tokens: 600
          });

          const rawText = typeof aiRes?.response === 'string' ? aiRes.response : (aiRes?.choices?.[0]?.message?.content || '');
          if (rawText) {
            answer = rawText;
            modelUsed = 'Workers AI (Llama 3.2 3B)';
          }
        } catch (e) {
          console.warn('AI Advisor error:', e.message);
        }
      }

      return jsonResponse({
        success: true,
        data: { answer, modelUsed }
      });
    }

    // =========================================================================
    // 6. BACKUP & EXPORT/IMPORT API
    // =========================================================================
    if (url.pathname === '/api/backup/export-json' && request.method === 'GET') {
      const accounts = await env.DB.prepare('SELECT * FROM accounts').all();
      const categories = await env.DB.prepare('SELECT * FROM categories').all();
      const transactions = await env.DB.prepare('SELECT * FROM transactions').all();
      const budgets = await env.DB.prepare('SELECT * FROM budgets').all();

      return jsonResponse({
        version: '2026.1',
        exported_at: new Date().toISOString(),
        data: {
          accounts: accounts.results || [],
          categories: categories.results || [],
          transactions: transactions.results || [],
          budgets: budgets.results || []
        }
      });
    }

    if (url.pathname === '/api/backup/import-json' && request.method === 'POST') {
      const body = await request.json();
      const backupData = body.data?.data || body.data || body;
      const txs = backupData.transactions || [];

      if (Array.isArray(txs) && txs.length > 0) {
        for (const t of txs) {
          await env.DB.prepare(`
            INSERT OR REPLACE INTO transactions (id, date, amount, type, category_id, account_id, destination_account_id, note, source, is_synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `).bind(t.id, t.date, t.amount, t.type, t.category_id, t.account_id, t.destination_account_id || null, t.note, t.source || 'backup_import').run();
        }
      }

      return jsonResponse({ success: true, message: `Imported ${txs.length} transactions successfully` });
    }

    // =========================================================================
    // 7. INGESTION: MACRODROID & TELEGRAM WEBHOOK (24/7)
    // =========================================================================
    const reqApiKey = request.headers.get('x-api-key') ||
      request.headers.get('x-telegram-bot-api-secret-token') ||
      url.searchParams.get('token') ||
      url.searchParams.get('key');

    // MacroDroid Query params
    const title = url.searchParams.get('title') || url.searchParams.get('not_title') || '';
    const rawParamText = url.searchParams.get('text') || url.searchParams.get('msg') || url.searchParams.get('body') || url.searchParams.get('not_text') || '';
    const queryText = (title && rawParamText) ? `${title} ${rawParamText}` : (rawParamText || title);

    if (reqApiKey && !checkApiKey(reqApiKey) && !queryText) {
      return jsonResponse({ success: false, error: 'Unauthorized: Invalid API Key' }, 401);
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
      return new Response('Salaria Cloudflare D1 Full-Stack REST API & Edge Worker Active.', { status: 200 });
    }

    if (env.DB) {
      const parsed = parseMoneyAndNote(rawText);
      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const today = new Date().toISOString().split('T')[0];

      if (parsed) {
        let categories = [];
        try {
          const catsRes = await env.DB.prepare('SELECT id, name, type, group_type, keywords FROM categories').all();
          categories = catsRes.results || [];
        } catch (e) {
          console.error('Failed to load categories:', e);
        }

        // TẦNG 1: Fast-Path Regex
        let catId = matchCategoryFast(parsed.note, categories);
        let categorizationMethod = catId ? 'fast_regex' : 'unassigned';
        let finalNote = parsed.note;

        // TẦNG 2: Cloudflare Workers AI Llama-3.2 Fallback
        if (!catId && env.AI) {
          try {
            const aiResult = await categorizeWithWorkersAI(env.AI, rawText, categories, AI_MODEL);
            if (aiResult) {
              const shortModelName = (aiResult.model_used || AI_MODEL).replace('@cf/meta/', '').replace('@cf/mistralai/', '');
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
          } catch (aiErr) {
            console.warn('Workers AI engine error:', aiErr.message);
          }
        }

        const accountId = isBankNoti ? 'acc_bank' : 'acc_cash';

        // Ghi trực tiếp vào D1 Database
        await env.DB.prepare(`
          INSERT INTO transactions (
            id, date, amount, type, category_id, account_id, note, source, raw_telegram_text, telegram_message_id, telegram_chat_id, is_synced
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
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

        // Cập nhật số dư tài khoản
        if (parsed.type === 'expense') {
          await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(parsed.amount, accountId).run();
        } else if (parsed.type === 'income') {
          await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(parsed.amount, accountId).run();
        }

        // Gửi Telegram phản hồi
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

        return jsonResponse({
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
        });
      } else {
        return jsonResponse({ success: false, error: 'Could not parse amount from text', raw: rawText }, 400);
      }
    }

    return jsonResponse({ success: true, message: 'Processed' });
  }
};
