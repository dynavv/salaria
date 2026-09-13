# 📋 Kế Hoạch Triển Khai: Chống Trùng Lặp Giao Dịch & Đồng Bộ Lịch Sử Thông Báo Lên D1 (v1.4)

> **Mục tiêu**:
> 1. Dọn dẹp 2 giao dịch trùng lặp trên D1 Database (`tx_1788584598080_8fbnj` 400k chi tiêu và `tx_1788584744452_w0c76` 20k ZaloPay) để khôi phục số dư chuẩn xác.
> 2. Thiết lập cơ chế chống trùng lặp kép (Double Deduplication Layer) tại Android và Backend (bắt theo mã RRN ngân hàng và cửa sổ thời gian 120s).
> 3. Mở rộng bộ nhận diện ATM với từ khóa hệ thống cây rút tiền liên minh ngân hàng: `"rut tien sml"`, `"napas"`.
> 4. Xóa bỏ mã HTML (`<b>`, `<br/>`) trên thông báo Android Notification, dùng ngắt dòng `\n` sạch đẹp.
> 5. Cung cấp API `GET /api/chat/history?limit=10` trên Cloudflare D1 và kết nối vào tab **Nhập AI** trên Android để lưu trữ trên Cloud (đổi máy không mất) và mặc định chỉ load 5–10 thông báo/phản hồi gần nhất theo đúng yêu cầu của người dùng.

---

## 🛠️ Chi Tiết Các File Can Thiệp

### 1. ☁️ Cloudflare Edge Backend (`backend/`)
- **[MODIFY] `backend/src/services/parser.ts`**:
  - Bổ sung các từ khóa rút tiền ATM ngân hàng liên minh: `"rut tien sml"`, `"rut sml"`, `"napas"` vào regex `isAtmWithdrawal`.
- **[MODIFY] `backend/src/routes/ingest.ts`**:
  - **Deduplication Check (Idempotency)**:
    - Bóc tách mã giao dịch duy nhất của ngân hàng nếu có: `rrn \d+` hoặc mã giao dịch `ZP[A-Z0-9]+`.
    - Kiểm tra trong vòng 120 giây qua trên D1: nếu đã tồn tại giao dịch cùng mã tham chiếu (RRN/ZP) HOẶC cùng `amount` + `account_id` + `raw_text` tương tự ➜ Bỏ qua, trả về giao dịch cũ, không tạo mới.
  - **API Chat / Notification History**:
    - Thêm route `GET /api/chat/history?limit=10` (hoặc `limit` tùy biến từ 5-10): truy vấn các giao dịch gần nhất có `source IN ('bank_notification', 'in_app_chat', 'telegram_bot')`, trả về cặp dữ liệu: Thông báo gốc (`raw_telegram_text`) + Kết quả phân loại AI (`IngestResult`).
- **[MODIFY] `backend/src/index.ts`**:
  - Đăng ký định tuyến cho `GET /api/chat/history`.

### 2. 📱 Android Native Mobile App (`android/`)
- **[MODIFY] `android/app/src/main/java/com/salaria/app/service/BankNotificationListener.kt`**:
  - Bổ sung bộ nhớ đệm `recentNotificationCache` (Map lưu hash chuỗi `packageName + title + text` trong vòng 60 giây). Nếu Android kích hoạt lại cùng 1 thông báo trong 60s ➜ Bỏ qua ngay lập tức, không gửi request lên backend.
- **[MODIFY] `android/app/src/main/java/com/salaria/app/service/NotificationHelper.kt`**:
  - Xóa bỏ các thẻ HTML `<b>`, `<br/>`, `<i>`. Thay bằng định dạng văn bản thuần với ngắt dòng `\n` và emoji trực quan.
- **[MODIFY] `android/app/src/main/java/com/salaria/app/data/api/SalariaApi.kt`**:
  - Thêm hàm `getChatHistory(@Query("limit") limit: Int = 10): Response<ApiResponse<List<ChatHistoryItem>>>`.
- **[MODIFY] `android/app/src/main/java/com/salaria/app/data/model/Models.kt`**:
  - Định nghĩa data class `ChatHistoryItem`.
- **[MODIFY] `android/app/src/main/java/com/salaria/app/ui/screens/ChatScreen.kt`**:
  - Khi mở tab **Nhập AI**: Tự động gọi API `getChatHistory(limit = 10)` từ Cloudflare D1.
  - Hiển thị theo thứ tự thời gian: mỗi thông báo/chat gồm 1 bong bóng tin nhắn gốc (VD: `🔔 [MSB] -20,000 VND...`) và 1 thẻ kết quả phân loại của AI.
  - Người dùng có thể kéo nhẹ để refresh lại 5-10 thông báo mới nhất bất kỳ lúc nào.

---

## 🧪 Kế Hoạch Kiểm Thử (Verification Plan)

1. **Dọn dẹp D1 Database**:
   - Gọi `DELETE /api/transactions/tx_1788584598080_8fbnj` (xóa 400k chi tiêu sai) ➜ Kiểm tra số dư `acc_bank` được cộng lại +400.000 ₫.
   - Gọi `DELETE /api/transactions/tx_1788584744452_w0c76` (xóa 20k trùng lặp) ➜ Kiểm tra số dư `acc_bank` được cộng lại +20.000 ₫.
   - Kiểm tra `GET /api/accounts`: Xác nhận số dư chuẩn xác.
2. **Kiểm tra Chống trùng lặp Backend (Idempotency)**:
   - Gửi 2 request `POST /api/webhook` giống hệt nhau liên tiếp trong vòng 3 giây ➜ Xác nhận hệ thống chỉ ghi nhận 1 giao dịch duy nhất trong DB, request thứ 2 trả về kết quả cũ mà không tạo thêm bản ghi mới.
3. **Kiểm tra Nhận diện Rút ATM liên minh (`Rut tien SML`)**:
   - Gửi test `-400,000 VND ... Rut tien SML` ➜ Xác nhận tự động phân loại `transfer` và gán nguồn `acc_bank`, đích `acc_cash`.
4. **Kiểm tra API Chat History**:
   - Gọi `GET /api/chat/history?limit=10` ➜ Xác nhận trả về đúng 10 thông báo/giao dịch gần nhất với đầy đủ nội dung gốc và kết quả AI.
5. **Kiểm tra Biên dịch & Giao diện Android**:
   - Build APK Android với JDK 21 (`./gradlew assembleDebug`).
   - Xác nhận Notification không còn lộ thẻ `<b>`, `<br/>`.
   - Xác nhận tab Nhập AI tải đúng 5-10 thông báo/phản hồi từ Cloud D1.
