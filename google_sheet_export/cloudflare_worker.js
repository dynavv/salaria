/**
 * CLOUDFLARE WORKER FOR TELEGRAM & MACRODROID 24/7 INSTANT SYNC
 * Hỗ trợ cả Telegram Webhook, MacroDroid JSON, và MacroDroid URL Query/Text
 */
const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_EXEC_URL'; // URL Web App từ Google Apps Script
const SECRET_TOKEN = 'YOUR_SECRET_TOKEN_HERE';
const ALLOWED_CHAT_ID = 123456789; // Chat ID của bạn

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Nếu nhận request có query ?text=... (từ MacroDroid gửi đơn giản)
    const queryText = url.searchParams.get('text') || url.searchParams.get('msg') || url.searchParams.get('body');
    if (queryText) {
      const payload = {
        secret_token: SECRET_TOKEN,
        message: {
          chat: { id: ALLOWED_CHAT_ID },
          date: Math.floor(Date.now() / 1000),
          text: queryText
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
      return new Response('OK', { status: 200 });
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
              text: rawBody
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
            text: body.text
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

    return new Response('Finance Telegram & MacroDroid Worker is active!', { status: 200 });
  },
};
