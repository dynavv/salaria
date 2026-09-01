/**
 * CLOUDFLARE WORKER FOR TELEGRAM & MACRODROID 24/7 INSTANT SYNC
 * Hỗ trợ cả Telegram Webhook, MacroDroid JSON, và MacroDroid URL Query/Text
 * 
 * Cấu hình: Đặt các biến môi trường trong Cloudflare Worker Dashboard (Settings > Variables) hoặc sửa mặc định bên dưới:
 * - GOOGLE_SCRIPT_URL: URL Web App Google Apps Script (/exec)
 * - SECRET_TOKEN: Mã bảo mật xác thực
 * - ALLOWED_CHAT_ID: Telegram Chat ID của bạn
 */
const DEFAULT_GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_APPS_SCRIPT_ID_HERE/exec';
const DEFAULT_SECRET_TOKEN = 'YOUR_SECRET_TOKEN_HERE';
const DEFAULT_ALLOWED_CHAT_ID = 0;

export default {
  async fetch(request, env, ctx) {
    const GOOGLE_SCRIPT_URL = env?.GOOGLE_SCRIPT_URL || DEFAULT_GOOGLE_SCRIPT_URL;
    const SECRET_TOKEN = env?.SECRET_TOKEN || DEFAULT_SECRET_TOKEN;
    const ALLOWED_CHAT_ID = env?.ALLOWED_CHAT_ID ? (Number(env.ALLOWED_CHAT_ID) || env.ALLOWED_CHAT_ID) : DEFAULT_ALLOWED_CHAT_ID;

    const url = new URL(request.url);

    // 1. Nhận request có query params từ MacroDroid (hỗ trợ ?text=, ?title=&text=, ?msg=, ?body=)
    const title = url.searchParams.get('title') || url.searchParams.get('not_title') || '';
    const rawParamText = url.searchParams.get('text') || url.searchParams.get('msg') || url.searchParams.get('body') || url.searchParams.get('not_text') || url.searchParams.get('not_ticker') || '';
    const queryText = (title && rawParamText) ? `${title} ${rawParamText}` : (rawParamText || title);

    if (queryText && queryText.length > 0) {
      const payload = {
        secret_token: SECRET_TOKEN,
        message: {
          chat: { id: ALLOWED_CHAT_ID },
          date: Math.floor(Date.now() / 1000),
          text: queryText,
          is_notification: true
        }
      };

      ctx.waitUntil(
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          redirect: 'follow',
        })
      );
      return new Response('OK: Processed', { status: 200 });
    }

    // 2. Nếu nhận POST (từ Telegram Webhook hoặc MacroDroid JSON)
    if (request.method === 'POST') {
      try {
        let rawBody = await request.text();
        let body = {};
        try {
          body = JSON.parse(rawBody);
        } catch (e) {
          // Nếu gửi raw text thay vì JSON
          body = {
            message: {
              chat: { id: ALLOWED_CHAT_ID },
              date: Math.floor(Date.now() / 1000),
              text: rawBody,
              is_notification: true
            }
          };
        }

        // Đảm bảo có secret_token
        body.secret_token = SECRET_TOKEN;

        // Nếu gửi dạng { text: "..." } trực tiếp
        if (body.text && !body.message) {
          body.message = {
            chat: { id: ALLOWED_CHAT_ID },
            date: Math.floor(Date.now() / 1000),
            text: body.text,
            is_notification: true
          };
        }

        // Chuyển tiếp sang Google Apps Script
        ctx.waitUntil(
          fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            redirect: 'follow',
          })
        );

        return new Response('OK', { status: 200 });
      } catch (err) {
        return new Response('OK', { status: 200 });
      }
    }

    return new Response('Finance Telegram & MacroDroid Worker is active! (Warning: No text parameter received in query)', { status: 200 });
  },
};
