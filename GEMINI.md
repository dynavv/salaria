# 🧭 Salaria — Project Rules & AI Agent Constitution

Chào mừng AI Agent đến với dự án **Salaria** (Tên kho lưu trữ: `Salarini`). Tài liệu này là **Hiến pháp tối cao** quy định quy tắc ứng xử, bản đồ mã nguồn và quy trình làm việc trong repository này.

---

## 🏷️ 1. Quy Ước Định Danh & Thương Hiệu (Brand Identity)
- **Tên sản phẩm chính thức**: **Salaria** (Salaria Personal Finance).
- **Package Android**: `com.salaria.app` | **API Client**: `SalariaApi` | **Worker Hostname**: `salaria-vault`.
- **Salarini**: Giữ vai trò là tên thư mục repository và tên D1 Database binding (`salarini-db`) để đảm bảo tính tương thích kỹ thuật.

---

## 🗺️ 2. Bản Đồ Mã Nguồn (Master Codebase Navigation Map)
Trước khi tìm kiếm hay phỏng đoán, hãy tra cứu nhanh các vị trí cốt lõi sau:

### 📱 Android Native App (`android/`)
- **Lắng nghe thông báo ngân hàng 24/7**: [BankNotificationListener.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/service/BankNotificationListener.kt)
- **Bắn thông báo cục bộ (Local Noti)**: [NotificationHelper.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/service/NotificationHelper.kt)
- **Bộ nhớ đệm phiên Chat (0ms latency)**: [ChatManager.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/data/model/ChatManager.kt)
- **Đồng bộ Offline (WorkManager)**: [SyncOfflineTransactionsWorker.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/worker/SyncOfflineTransactionsWorker.kt) & [DailySummaryWorker.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/worker/DailySummaryWorker.kt)
- **Database cục bộ (Room DB)**: [AppDatabase.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/data/local/AppDatabase.kt) & [PreferencesManager.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/data/local/PreferencesManager.kt)
- **Giao diện chính (Screens)**:
  - Sổ thu chi: [TransactionsScreen.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/TransactionsScreen.kt)
  - Tổng quan: [DashboardScreen.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/DashboardScreen.kt)
  - AI Chat ghi chép & trích dẫn: [ChatScreen.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/ChatScreen.kt)
  - Cài đặt & Logs: [SettingsScreen.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/SettingsScreen.kt)
- **Popup chỉnh sửa/xóa giao dịch**: [EditTransactionBottomSheet.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/components/EditTransactionBottomSheet.kt)
- **Hộp đen Telemetry**: [AppLogger.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/util/AppLogger.kt)

### ☁️ Cloudflare Edge Backend (`backend/src/` — TypeScript Modular)
- **Router trung tâm & Bảo mật**: [backend/src/index.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/index.ts)
- **Các Route nghiệp vụ**:
  - Ingestion Webhook, Chat AI & Command Interceptor (/undo, trích dẫn): [backend/src/routes/ingest.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/ingest.ts)
  - CRUD Transactions & Toàn vẹn số dư transfer: [backend/src/routes/transactions.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/transactions.ts)
  - Quản lý tài khoản & số dư: [backend/src/routes/accounts.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/accounts.ts)
  - Analytics 50/30/20, Latte Factor & So sánh đa tháng MoM: [backend/src/routes/analytics.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/analytics.ts)
  - Danh mục chi tiêu: [backend/src/routes/categories.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/categories.ts)
  - Sao lưu / Khôi phục: [backend/src/routes/backup.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/backup.ts)
  - Nhật ký & Telemetry: [backend/src/routes/logs.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/logs.ts)
  - Kênh Telegram Bot dự phòng: [backend/src/routes/telegram_webhook.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/telegram_webhook.ts)
- **Gateway Workers AI (Universal LLM)**: [backend/src/ai/workers_ai.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/ai/workers_ai.ts)
- **Hợp đồng Type-safe**: [backend/src/types.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/types.ts)
- **D1 Migrations**: [backend/migrations/0001_initial_schema.sql](file:///home/dynav/Documents/antigravity/Salarini/backend/migrations/0001_initial_schema.sql)
- **Cấu hình Cloudflare**: [backend/wrangler.jsonc](file:///home/dynav/Documents/antigravity/Salarini/backend/wrangler.jsonc)

### 💻 Desktop Web App (`frontend/`)
- **API Client**: [frontend/src/api/client.ts](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/api/client.ts)
- **Các trang phân tích**: [DashboardPage.tsx](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/pages/DashboardPage.tsx), [AiAdvisorPage.tsx](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/pages/AiAdvisorPage.tsx), [AccountsPage.tsx](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/pages/AccountsPage.tsx), [MultiMonthComparePage.tsx](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/pages/MultiMonthComparePage.tsx)
- **Quản lý Theme (Dark Ocean + GitHub Light)**: [frontend/src/context/ThemeContext.tsx](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/context/ThemeContext.tsx)

---

## 🚦 3. Quy Trình Phân Loại Lỗi & Xử Lý (Bug Triage Rule)

* **🔴 Mức P0 — Lỗi Chí Mạng (Critical / Blocker / Data Corruption)**:
  - *Dấu hiệu*: App bị văng/crash; sai lệch hoặc mất mát số dư tài chính; API trả về mã 500; nghẽn luồng bắt thông báo ngân hàng.
  - *Hành động*: Chẩn đoán nguyên nhân gốc rễ, giải thích cho người dùng và **tiến hành sửa chữa ngay lập tức (Hotfix)**.

* **🟡 Mức P1 - P3 — Lỗi Thứ Yếu / UI / UX / Tính Năng Bổ Sung**:
  - *Dấu hiệu*: Lỗi hiển thị, tràn chữ (text truncation), lệch layout, thiếu dropdown chọn tháng, trải nghiệm thao tác chưa tối ưu.
  - *Hành động*: **TUYỆT ĐỐI KHÔNG sửa code ngay lập tức** (tránh vòng lặp build APK/deploy liên tục). Phân tích nguyên nhân và **ghi chép chi tiết vào [docs/backlog.md](file:///home/dynav/Documents/antigravity/Salarini/docs/backlog.md)** để gom xử lý theo đợt cập nhật (Batch Release).

---

## 🚫 4. Những Hành Động Cấm Kỵ Đối Với AI (Forbidden Actions)
AI tuyệt đối **KHÔNG ĐƯỢC TỰ Ý** thực hiện các hành động sau nếu chưa có sự chỉ định rõ ràng của người dùng:
1. **Cấm tự ý sửa Schema D1 Database**: Không tự ý thêm, sửa, xóa bảng hoặc chạy lệnh `DROP TABLE` gây mất dữ liệu thực tế.
2. **Cấm sửa đổi khóa bảo mật**: Không thay đổi giá trị của `x-api-key`, `MASTER_PIN` hoặc token xác thực.
3. **Cấm tự ý xóa các file nhị phân hoặc logic nghiệp vụ cốt lõi**: Không xóa các file trong `android/`, `backend/` hoặc các module AI.
4. **Kênh Telegram Bot đã gỡ bỏ chính thức (Decommissioned)**: Kênh Telegram Bot đã được hoàn tất gỡ bỏ vào ngày 2026-09-13 theo yêu cầu chính thức của người dùng để chuẩn hóa 100% về Native Mobile App & Desktop Web. Không tự ý khôi phục hoặc tạo lại bot Telegram khi chưa có chỉ định.

---

## 📑 5. Quy Tắc Lập Kế Hoạch Thực Thi (Implementation Planning Rule)
- Trước khi can thiệp mã nguồn cho bất kỳ task nào trong Backlog, AI phải tạo bản kế hoạch chi tiết trong `docs/plans/` (Liệt kê file sửa, các bước tiến hành, kế hoạch kiểm thử và cách rollback).
- Chờ người dùng đồng thuận trước khi bắt đầu sửa code.

---

## 🌐 6. Quy Tắc Giao Tiếp & Kiểm Thử
- **Ngôn ngữ phản hồi**: Luôn phản hồi bằng **Tiếng Việt**. Giữ nguyên thuật ngữ kỹ thuật, mã nguồn, câu lệnh bằng tiếng Anh.
- **Giải thích trước khi chạy lệnh**: Luôn giải thích mục đích và tác động trước khi đề xuất hoặc chạy bất kỳ lệnh bash nào.
- **Không vội kết luận thành công**: Không tự khẳng định tính năng "hoàn hảo" khi người dùng chưa thực tế kiểm nghiệm trên thiết bị thật.
