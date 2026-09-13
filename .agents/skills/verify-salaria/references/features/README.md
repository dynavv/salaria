# 🗺️ Salaria Feature Map — Master Directory & Index

Chào mừng bạn đến với **Salaria Feature Map**. Tài liệu này định nghĩa toàn bộ năng lực hệ thống, ranh giới thành phần (Component Boundaries), luồng dữ liệu (Data Flows) và các điều kiện tiên quyết phục vụ việc định vị lỗi (Defect Localization) và kiểm thử hồi quy (Regression Sweeps).

---

## ⚡ 1. Điều Kiện Môi Trường & Tiên Quyết (Baseline Preconditions)

Trước khi thực hiện kiểm thử bất kỳ tính năng nào, đảm bảo các điều kiện sau:

1. **Edge Backend (Cloudflare Worker)**:
   - D1 Database binding: `salarini-db` (bảng: `accounts`, `categories`, `transactions`, `settings`, `system_logs`).
   - Biến môi trường / Secrets: `MASTER_PIN`, `API_KEY`, `AI_MODEL` (mặc định `@cf/google/gemma-4-26b-a4b-it` và fallback `@cf/meta/llama-3.1-8b-instruct`), `TELEGRAM_BOT_TOKEN`, `ALLOWED_CHAT_ID`.
2. **Desktop Web App (React 18 + Vite)**:
   - Chạy trên `http://localhost:5173` (hoặc domain Cloudflare Pages).
   - Xác thực: Master PIN hợp lệ lưu trong `sessionStorage`.
3. **Android Client (Kotlin + Jetpack Compose)**:
   - Quyền hệ thống: `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE` (Notification Access), `POST_NOTIFICATIONS`.
   - Kết nối: Cấu hình URL Cloudflare Worker và Master PIN trong [PreferencesManager.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/data/local/PreferencesManager.kt).

---

## 🧭 2. Danh Mục Các Khu Vực Tính Năng (Feature Areas)

| Khu Vực Tính Năng | File Đặc Tả Chi Tiết | Trọng Yếu | Phạm Vi Nền Tảng |
| :--- | :--- | :---: | :--- |
| **Bảo Mật & Xác Thực** | [`auth-and-security.md`](file:///home/dynav/Documents/antigravity/Salarini/.agents/skills/verify-salaria/references/features/auth-and-security.md) | P0 | Backend, Web, Android |
| **Bóc Tách Noti Ngân Hàng** | [`bank-notification-ingest.md`](file:///home/dynav/Documents/antigravity/Salarini/.agents/skills/verify-salaria/references/features/bank-notification-ingest.md) | P0 | Android Listener, Backend Parser/AI |
| **Đồng Bộ Offline & Workers** | [`offline-sync-and-workers.md`](file:///home/dynav/Documents/antigravity/Salarini/.agents/skills/verify-salaria/references/features/offline-sync-and-workers.md) | P0 | Android Room DB, WorkManager |
| **Quản Lý Giao Dịch** | [`transaction-management.md`](file:///home/dynav/Documents/antigravity/Salarini/.agents/skills/verify-salaria/references/features/transaction-management.md) | P0 | Backend D1, Web, Android UI |
| **Tài Khoản & Ví Tiền** | [`account-and-wallet.md`](file:///home/dynav/Documents/antigravity/Salarini/.agents/skills/verify-salaria/references/features/account-and-wallet.md) | P0 | Backend, Web, Android |
| **Danh Mục & Ngân Sách** | [`category-and-budgeting.md`](file:///home/dynav/Documents/antigravity/Salarini/.agents/skills/verify-salaria/references/features/category-and-budgeting.md) | P1 | Backend, Web, AI Parser |
| **Phân Tích Dòng Tiền** | [`financial-analytics-and-insights.md`](file:///home/dynav/Documents/antigravity/Salarini/.agents/skills/verify-salaria/references/features/financial-analytics-and-insights.md) | P1 | Backend Engine, Web, Android |
| **Trợ Lý Cố Vấn & Chat AI** | [`ai-advisor-and-chat.md`](file:///home/dynav/Documents/antigravity/Salarini/.agents/skills/verify-salaria/references/features/ai-advisor-and-chat.md) | P1 | Workers AI, Android Chat, Web Advisor |
| **Lệnh Nhanh & Telegram Bot** | [`command-interceptor-and-bot.md`](file:///home/dynav/Documents/antigravity/Salarini/.agents/skills/verify-salaria/references/features/command-interceptor-and-bot.md) | P1 | Telegram Bot, Cron Ingest Interceptor |
| **Nhật Ký & Quan Sát Hệ Thống** | [`telemetry-and-observability.md`](file:///home/dynav/Documents/antigravity/Salarini/.agents/skills/verify-salaria/references/features/telemetry-and-observability.md) | P2 | AppLogger, D1 system_logs, Retention |
| **Sao Lưu & Khôi Phục** | [`backup-and-recovery.md`](file:///home/dynav/Documents/antigravity/Salarini/.agents/skills/verify-salaria/references/features/backup-and-recovery.md) | P1 | Backup Route, JSON Exporter/Importer |

---

## 🔁 3. Thứ Tự Kiểm Thử Quét Hồi Quy (Full Regression Sweep Order)

Khi thực hiện kiểm thử diện rộng, tuân thủ đúng thứ tự từ dưới lên (Bottom-up Dependency Order):

```text
[1. auth-and-security]
       │
       ▼
[2. account-and-wallet] ──► [3. category-and-budgeting]
       │                            │
       └──────────────┬─────────────┘
                      ▼
       [4. transaction-management] (Kiểm tra Toàn vẹn số dư)
                      │
       ┌──────────────┴─────────────┐
       ▼                            ▼
[5. bank-notification-ingest]  [6. offline-sync-and-workers]
       │                            │
       └──────────────┬─────────────┘
                      ▼
       [7. command-interceptor-and-bot]
                      │
                      ▼
       [8. ai-advisor-and-chat]
                      │
                      ▼
       [9. financial-analytics-and-insights]
                      │
                      ▼
       [10. telemetry-and-observability]
                      │
                      ▼
       [11. backup-and-recovery]
```

---

## 🚨 4. Quy Tắc Bất Biến (System Invariants)

1. **Bất Biến Chuyển Khoản & ATM (Transfer Invariant)**:
   - Giao dịch `type = 'transfer'` hoặc rút tiền từ ngân hàng về tiền mặt:
     - `acc_source.balance -= amount`
     - `acc_destination.balance += amount`
     - `category_id = NULL`
     - **TUYỆT ĐỐI KHÔNG** tính vào tổng chi tiêu tháng (Expense).
2. **Bất Biến Hoàn Tác 2 Chiều (Reversal Invariant)**:
   - Khi xóa (`DELETE`) hoặc sửa (`PUT`) một giao dịch transfer:
     - Trả lại số tiền cho tài khoản nguồn: `acc_source.balance += amount`
     - Thu hồi số tiền khỏi tài khoản đích: `acc_destination.balance -= amount`
3. **Bất Biến Bảo Vệ Dữ Liệu Riêng Tư (Sanitization Invariant)**:
   - `BankNotificationListener` bắt buộc chạy hàm che chắn số tài khoản, số thẻ tín dụng trước khi gửi lên đám mây hoặc lưu log.
