# 📋 Kế Hoạch Thực Thi: Tối Ưu Thông Báo Cuối Ngày & Đồng Bộ Chat History Cloud D1 (Phương án B)

- **Ngày lập**: 2026-09-06
- **Mức độ ưu tiên**: P1/P2 (Cải tiến UI/UX thông báo & Tính năng mở rộng Chat History)
- **Phương án đã thống nhất**: Phương án B (Đồng bộ Cloudflare D1 Database)

---

## 🎯 1. Mục Tiêu Cần Đạt
1. **Khắc phục lỗi thông báo hệ thống Android**:
   - Triệt tiêu hoàn toàn lỗi lặp lại tiêu đề `$title` ở dòng đầu tiên của thân thông báo (`BigTextStyle`).
   - Sửa lỗi số tiền lẻ thập phân VND (làm tròn số nguyên `roundToLong()` để không bao giờ xuất hiện số lẻ `,471 ₫`).
   - Nâng cấp nội dung thông báo trực quan, chuyên nghiệp, kèm lời khuyên đánh giá tài chính ngắn gọn.
2. **Đồng bộ hóa bản tin tổng kết ngày lên Cloudflare D1 & Lịch sử Chat**:
   - Thêm bảng D1 `daily_summaries` độc lập với bảng `transactions` (bảo toàn 100% tính toàn vẹn số dư).
   - Bổ sung API `POST /api/daily-summary` (chống ghi đè/lặp qua `ON CONFLICT(date) DO UPDATE`).
   - Cập nhật `GET /api/chat/history` trên Backend để gộp cả giao dịch và các bản tin tổng kết theo mốc thời gian `created_at`.
   - Android App hiển thị thẻ chuyên biệt **Daily Digest Card** sang trọng trong tab Nhập AI (ChatScreen).

---

## 🗺️ 2. Danh Sách Các File Sẽ Chỉnh Sửa

### Backend (`backend/`):
- `backend/migrations/0002_add_daily_summaries.sql` (Tạo bảng D1 mới)
- `backend/schema.sql` (Cập nhật sơ đồ SQLite tổng hợp)
- `backend/src/types.ts` (Thêm type contract `DailySummaryRecord`, `DailySummaryDto`)
- `backend/src/routes/ingest.ts` (Endpoint `POST /api/daily-summary` & Cập nhật `handleChatHistory`)

### Android Native (`android/`):
- `android/app/src/main/java/com/salaria/app/data/model/Models.kt` (Thêm `DailySummaryDto`, cập nhật `ChatMessage`, `ChatHistoryItem`)
- `android/app/src/main/java/com/salaria/app/data/api/SalariaApi.kt` (Thêm `postDailySummary`)
- `android/app/src/main/java/com/salaria/app/service/NotificationHelper.kt` (Tối ưu nội dung thông báo & sửa lỗi lặp/lẻ tiền)
- `android/app/src/main/java/com/salaria/app/worker/DailySummaryWorker.kt` (Đẩy bản tin tổng kết lên Cloud sau khi thông báo)
- `android/app/src/main/java/com/salaria/app/data/model/ChatManager.kt` (Xử lý mapping bản tin tổng kết vào `messages`)
- `android/app/src/main/java/com/salaria/app/ui/screens/ChatScreen.kt` (Giao diện thẻ Daily Digest Card)

### Tài liệu (`docs/`):
- `docs/backlog.md` (Cập nhật tiến độ task [P2-01])

---

## 🔄 3. Kế Hoạch Rollback
- Nếu xảy ra sự cố với migration D1: `DROP TABLE IF EXISTS daily_summaries;` (Không ảnh hưởng đến bất kỳ bảng dữ liệu nào khác như `transactions` hay `accounts`).
- Nếu Android gặp lỗi biên dịch: Có thể rollback các file Kotlin về trạng thái git trước đó nhanh chóng.
