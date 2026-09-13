# 🔔 Bank Notification Ingest (Bóc Tách Thông Báo Ngân Hàng)

Tự động bắt thông báo biến động số dư từ các ứng dụng ngân hàng và ví điện tử Việt Nam (VCB, MSB, Techcombank, TPBank, Momo, ZaloPay...), bóc tách số tiền, phân loại danh mục thông minh và ghi nhận tức thì vào hệ thống.

---

## 📌 Sub-features

- **24/7 Notification Listening**: Dịch vụ nền Android `NotificationListenerService` lắng nghe sự kiện `onNotificationPosted` từ các package ngân hàng được cấp phép.
- **Noise Filtering**: Tự động loại bỏ thông báo mã OTP, chương trình khuyến mãi, tin tức quảng cáo không chứa biến động tài chính thực sự.
- **Two-Tier Intelligent Parser**:
  - *Tầng 1 (0ms)*: Khớp Regex từ khóa danh mục cực nhanh từ nội dung chuyển khoản.
  - *Tầng 2 (<0.2s)*: Nếu Regex không xác định được danh mục, tự động chuyển tiếp sang Cloudflare Workers AI (Llama 3.1 8B) để phân tích ngữ cảnh.
- **ATM Withdrawal Detection**: Tự động nhận diện giao dịch rút tiền mặt tại cây ATM và chuyển đổi thành giao dịch chuyển khoản nội bộ (`transfer` từ ngân hàng -> ví tiền mặt).
- **Local Notification Feedback**: Sau khi ghi nhận giao dịch thành công, Android bắn thông báo đẩy cục bộ dạng `"🔴 Chi tiêu: -48.000 ₫ (Ăn uống)"` giúp người dùng theo dõi minh bạch.

---

## 🚶 How to get to it (User POV)

1. Người dùng thực hiện thanh toán quẹt thẻ, chuyển khoản VietQR hoặc nhận tiền từ đối tác.
2. Ứng dụng ngân hàng (ví dụ: Vietcombank / MSB) đẩy một thông báo lên thanh trạng thái (Status Bar).
3. Salaria ngầm bắt thông báo, phân tích và trong vòng ~1 giây, điện thoại rung nhẹ kèm thông báo cục bộ từ Salaria xác nhận giao dịch đã được ghi sổ.

---

## 🎛️ Controls & Driving

- **Entrypoint**: `POST /api/transactions/ingest` (hoặc `GET /api/transactions/ingest?title=...&text=...`)
- **Headers**:
  - `x-api-key: <MASTER_PIN>`
  - `Content-Type: application/json`
- **Payload**:
  ```json
  {
    "title": "VCB Digibank",
    "text": "Số dư TK 0123xxx -45,000 VND lúc 12:30. ND: Pho bo tai chin",
    "source": "bank_notification",
    "is_notification": true
  }
  ```
- **Android Package Whitelist**: Cấu hình danh sách các app ngân hàng cần lắng nghe trong `PreferencesManager.kt` hoặc `BankNotificationListener.kt`.

---

## 👁️ Observable State & Invariants

- **Success**:
  - Backend trả về HTTP 200 `{ success: true, action: "transaction_created", transaction: { amount: 45000, type: "expense", category_id: "cat_food", ... } }`.
  - Bảng `transactions` trong D1 có thêm 1 bản ghi mới với `source = 'bank_notification'`.
  - Số dư của tài khoản tương ứng trong `accounts` bị trừ 45.000 ₫.
  - Android hiển thị Heads-up notification xác nhận chi tiêu.
- **Failure**:
  - Thông báo quảng cáo/OTP: Backend trả về `{ success: true, action: "ignored_noise", reason: "noise_pattern_matched" }` và không tạo transaction.
  - Không có mạng: Android lưu tạm thông báo vào bảng `offline_transactions` của Room DB (xem tính năng `offline-sync-and-workers`).

---

## 🧩 Owning Components

- **Entry / Route**:
  - Backend Ingest Route: [`backend/src/routes/ingest.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/ingest.ts#L20-L260)
- **Controller / View**:
  - Android Local Notification: [`android/app/src/main/java/com/salaria/app/service/NotificationHelper.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/service/NotificationHelper.kt)
- **Service / Logic**:
  - Android Background Listener: [`android/app/src/main/java/com/salaria/app/service/BankNotificationListener.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/service/BankNotificationListener.kt)
  - Backend Regex Parser: [`backend/src/services/parser.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/services/parser.ts)
  - Fast AI Categorizer: [`backend/src/ai/workers_ai.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/ai/workers_ai.ts)
- **Schema / Model**:
  - D1 Schema (`transactions`, `accounts`): [`backend/migrations/0001_initial_schema.sql`](file:///home/dynav/Documents/antigravity/Salarini/backend/migrations/0001_initial_schema.sql)
  - TypeScript Types: [`backend/src/types.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/types.ts)

---

## ⚠️ Known Edge Cases & Common Traps

- **Notification Dedup (Trùng lặp thông báo)**: Một số ngân hàng đẩy 2 thông báo liên tiếp cho 1 giao dịch (ví dụ: biến động số dư và thông báo loyalty point). Listener phải lưu hash hoặc ID thông báo trong bộ nhớ cache ngắn hạn để tránh ghi đúp 2 lần.
- **Dấu phân cách số tiền**: Cần xử lý cả định dạng Việt Nam (`45.000`) lẫn quốc tế (`45,000` hoặc `45000`) trong regex `parseMoneyAndNote`.
- **Rút ATM không phải là Chi tiêu**: Rút 2.000.000 ₫ tiền mặt từ ATM tuyệt đối không được gán là `expense`, mà phải là `transfer` từ tài khoản ngân hàng sang `acc_cash`.
