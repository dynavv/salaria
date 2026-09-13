# 🔒 Auth & Security (Bảo Mật & Xác Thực)

Quản lý cơ chế xác thực toàn diện của hệ thống Salaria: xác thực Master PIN trên Web, xác thực Header Token trên Mobile API & Webhook, và cơ chế làm sạch (Sanitization) dữ liệu nhạy cảm của người dùng.

---

## 📌 Sub-features

- **Web Master PIN Verification**: Xác thực mã PIN cá nhân để mở khóa giao diện Desktop Web Dashboard và lưu trữ phiên trong `sessionStorage`.
- **API Token Gatekeeper**: Middleware chặn mọi truy vấn REST API không có header `x-api-key` hoặc secret token hợp lệ.
- **Android Settings Security**: Lưu trữ mã hóa cục bộ Master PIN và Server URL trong Android SharedPreferences.
- **Sensitive Data Masking**: Tự động che dấu số tài khoản, số thẻ tín dụng (masking regex) trước khi dữ liệu rời khỏi thiết bị Android.

---

## 🚶 How to get to it (User POV)

1. **Web**: Mở `http://localhost:5173` -> Hệ thống hiển thị popup Khóa PIN `PinLockScreen`. Người dùng nhập 4 hoặc 6 chữ số -> Bấm Mở khóa.
2. **Android**: Vào tab **Cài đặt** (biểu tượng bánh răng) -> Nhập **Server URL** và **Master PIN** -> Nhấn **Lưu cấu hình**.
3. **API Client**: Gửi HTTP Request kèm header `x-api-key: <MASTER_PIN>`.

---

## 🎛️ Controls & Driving

- **Web Route**: `POST /api/auth/verify-pin`
  - Body: `{"pin": "1234"}`
- **Headers bắt buộc cho các API bảo mật**:
  - `x-api-key`: Giá trị khớp với `MASTER_PIN`, `API_KEY` hoặc `SECRET_TOKEN`.
  - `x-telegram-bot-api-secret-token`: Dành riêng cho webhook Telegram.
- **Android Preferences**:
  - `KEY_SERVER_URL` (ví dụ: `https://salaria-vault.dynav.workers.dev`)
  - `KEY_MASTER_PIN`

---

## 👁️ Observable State & Invariants

- **Success**:
  - Web: Nhận HTTP 200 `{ success: true, token: "..." }`, giao diện Dashboard hiển thị đầy đủ, không còn màn hình khóa.
  - API: Nhận kết quả nghiệp vụ bình thường (HTTP 200 / 201).
  - Android Sanitization: Trong log `system_logs` hoặc text gửi lên worker, các chuỗi số tài khoản (ví dụ `0391000...`) được thay thế thành `***1234`.
- **Failure**:
  - Nhập sai PIN trên Web: Báo lỗi "Mã PIN không chính xác" (HTTP 401).
  - Thiếu hoặc sai header `x-api-key`: API trả về HTTP 401 `{ success: false, error: "Unauthorized: Invalid API Key" }`.

---

## 🧩 Owning Components

- **Entry / Route**:
  - Backend Auth Router: [`backend/src/index.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/index.ts#L38-L50)
  - Backend Ingest Auth Check: [`backend/src/routes/ingest.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/ingest.ts#L26-L56)
- **Controller / View**:
  - Web PIN Dialog: [`frontend/src/components/PinLockScreen.tsx`](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/components/PinLockScreen.tsx)
  - Android Settings View: [`android/app/src/main/java/com/salaria/app/ui/screens/SettingsScreen.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/SettingsScreen.kt)
- **Service / Logic**:
  - Web API Interceptor: [`frontend/src/api/client.ts`](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/api/client.ts)
  - Android Sanitization & API: [`android/app/src/main/java/com/salaria/app/service/BankNotificationListener.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/service/BankNotificationListener.kt)
  - Android Preferences: [`android/app/src/main/java/com/salaria/app/data/local/PreferencesManager.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/data/local/PreferencesManager.kt)

---

## ⚠️ Known Edge Cases & Common Traps

- **CORS Preflight**: Yêu cầu HTTP `OPTIONS` phải trả về `204 No Content` trước khi trình duyệt gửi header `x-api-key`, nếu chặn ở bước preflight thì Web sẽ lỗi CORS trên trình duyệt.
- **GET Request Query Fallback**: Endpoint Ingest hỗ trợ fallback param `?token=` hoặc `?key=` cho các webhook không hỗ trợ gắn custom header.
- **Không bao giờ hardcode PIN**: Không lưu mã PIN dạng chuỗi cố định trong codebase; luôn dùng biến môi trường `env.MASTER_PIN`.
