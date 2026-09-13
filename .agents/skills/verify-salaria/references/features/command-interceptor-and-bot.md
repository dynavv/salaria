# 🤖 Command Interceptor & Fallback Bot (Lệnh Nhanh & Kênh Dự Phòng Telegram)

Hệ thống đánh chặn câu lệnh tức thì (`/undo`, xóa giao dịch) và kênh cứu trợ dự phòng hoạt động độc lập 24/7 qua Telegram Bot.

---

## 📌 Sub-features

- **Instant Command Interceptor (`/undo`, `/xoa`)**:
  - Khi người dùng gửi tin nhắn dạng câu lệnh như `/undo`, `/xoa`, `/xóa`, `hoàn tác`: Hệ thống lập tức bỏ qua luồng AI và thực hiện hoàn tác giao dịch mới nhất (hoặc giao dịch đang được trích dẫn qua `target_tx_id`).
  - Tự động đối soát và khôi phục số dư tài khoản về trạng thái trước đó.
- **24/7 Telegram Safety Fallback Channel**:
  - Hoạt động song song và độc lập với Android app.
  - Người dùng có thể nhắn tin cho Telegram Bot để ghi chép chi tiêu, truy vấn số dư hoặc ra lệnh `/undo` khi đổi điện thoại hoặc khi app di động tạm dừng hoạt động.
- **Automated Daily Telegram Digest**:
  - Gửi bản tin tóm tắt tài chính hàng ngày lúc 22:30 vào khung chat Telegram của chủ sở hữu (`ALLOWED_CHAT_ID`).

---

## 🚶 How to get to it (User POV)

1. **Trên Android ChatScreen**: Sau khi vừa ghi nhầm một khoản chi, gõ `/undo` -> Hệ thống xóa ngay giao dịch vừa tạo và báo: *"Đã hoàn tác và xóa giao dịch: Cà phê sáng 35.000 ₫"*.
2. **Trên Telegram**: Mở ứng dụng Telegram -> Tìm Bot Salaria -> Nhắn: *"ăn sáng 30k"* -> Bot phản hồi xác nhận ghi sổ thành công.

---

## 🎛️ Controls & Driving

- **Command Syntax**:
  - `/undo`, `/xoa`, `/xóa`, `xoa`, `xóa`, `hoàn tác`, `hoan tac`
- **Telegram Webhook Route**:
  - `POST /api/telegram-webhook` (hoặc `POST /api/transactions/ingest` với payload Telegram chuẩn).
- **Environment Variables**:
  - `TELEGRAM_BOT_TOKEN`: Token cấp từ @BotFather.
  - `ALLOWED_CHAT_ID`: Telegram Chat ID của người dùng (ngăn chặn người lạ can thiệp bot).
  - `SECRET_TOKEN`: Token xác thực webhook do Telegram gửi qua header `x-telegram-bot-api-secret-token`.

---

## 👁️ Observable State & Invariants

- **Success**:
  - Lệnh `/undo`: Xóa bản ghi trong `transactions`, số dư tài khoản được hoàn trả chính xác, bot/chat phản hồi tin nhắn xác nhận.
  - Telegram Webhook: Trả về HTTP 200 `{ ok: true }` cho Telegram servers.
- **Failure**:
  - Tin nhắn từ Chat ID lạ: Bị từ chối và ghi log cảnh báo xâm nhập.
  - Chạy `/undo` khi danh sách giao dịch rỗng: Trả về thông báo *"Không có giao dịch nào gần đây để hoàn tác"*.

---

## 🧩 Owning Components

- **Entry / Route**:
  - Telegram Webhook Handler: [`backend/src/routes/telegram_webhook.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/telegram_webhook.ts)
  - Ingest Command Interceptor: [`backend/src/routes/ingest.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/ingest.ts#L108-L155)
- **Service / Logic**:
  - Telegram Message Sender & Formatter: [`backend/src/services/telegram.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/services/telegram.ts)

---

## ⚠️ Known Edge Cases & Common Traps

- **HTML Special Characters trong Telegram**: Telegram yêu cầu mã hóa các ký tự đặc biệt (`<`, `>`, `&`). Luôn sử dụng hàm `escapeHtml()` trước khi gửi tin nhắn dạng `parse_mode: 'HTML'` để tránh lỗi 400 Bad Request từ Telegram API.
- **Quy tắc cấm xóa Telegram Bot**: Telegram Bot là kênh cứu trợ và dự phòng bắt buộc theo Hiến pháp `GEMINI.md`, tuyệt đối không tự ý xóa bỏ.
