# 📋 Implementation Plan — Chuẩn Hóa Cơ Chế Title-First Cho Ingestion & Khắc Phục Lỗi Màn Hình Khóa

**Ngày tạo:** 10/09/2026  
**Trọng tâm:** Bóc tách thông báo biến động số dư ngân hàng chuẩn xác 100% cho bộ ba ứng dụng **MSB**, **Google Wallet**, **ZaloPay**. Triệt tiêu hoàn toàn noti quảng cáo, xử lý triệt để hiện tượng tin nhắn bị ẩn nội dung trên màn hình khóa Android và sửa bẫy lỗi HTTP 200 trong hàng đợi offline.

---

## 1. Bối Cảnh & Vấn Đề (Problem Statement)

1. **Noti quảng cáo lọt vào hệ thống**:
   - ZaloPay gửi thông báo quảng cáo: *Title: "Bảo hiểm xe sắp hết hạn rồi!", Body: "Gia hạn ngay hôm nay chỉ 40k/năm..."*.
   - Backend hiện có nhánh Fallback quét Body nếu Title không có tiền ➔ Tìm thấy `40k` ➔ Tạo giao dịch rác 40.000 ₫ (`tx_1789003198149_cmgkm`) trừ vào tài khoản `acc_bank`.
2. **Giao dịch thực tế MSB `-40,500 VND` bị bỏ sót**:
   - Khi màn hình điện thoại đang khóa (Lock screen), Android OS ẩn nội dung nhạy cảm của app ngân hàng và truyền chuỗi: *Title: "MSB DigiBank", Text: "Sensitive notification content hidden"*.
   - Backend từ chối với HTTP 200 `{ success: false }`.
   - Android Listener nhầm tưởng mã 200 mà `data == null` là lỗi server ➔ Nhét chuỗi rác vào Room DB `offline_transactions` ➔ Khiến hàng đợi offline bị nghẽn.
   - Khi người dùng mở khóa màn hình, Android OS không gọi lại sự kiện `onNotificationPosted` ➔ Giao dịch `-40,500 VND` bị thất thoát.
3. **Phạm vi người dùng xác định**:
   - Chỉ sử dụng 3 nguồn: **MSB**, **Google Wallet** và **ZaloPay**.
   - Cả 3 nguồn này đều có đặc điểm bất biến: **Tất cả các giao dịch biến động số dư thực tế đều có số tiền kèm dấu `+` hoặc `-` nằm ngay trên Title**. Mọi tin quảng cáo/tiếp thị đều có Title thuần chữ, không có dấu biến động.

---

## 2. Kế Hoạch Thay Đổi Chi Tiết (Proposed Changes)

### 2.1. Backend Cloudflare (`backend/src/routes/ingest.ts`)
- **Ép chuẩn Title-First cho luồng `isBankNoti`**:
  - Bắt buộc Title phải bóc tách được số tiền có dấu biến động (`+` hoặc `-` hoặc số tiền hợp lệ).
  - **Xóa bỏ hoàn toàn nhánh Fallback quét Body** đối với thông báo ngân hàng.
  - Nếu Title không có tiền biến động: Trả về HTTP 200 `{ success: false, action: "ignored", reason: "no_transaction_amount_in_title" }`.
  - Body (`notBody`) chỉ dùng thuần túy để làm nội dung ghi chú (`note`) và làm ngữ cảnh nhận diện danh mục (`category_id`).
- **Hoàn trả số dư & xóa giao dịch rác 40k**:
  - Chạy migration D1 hoàn lại 40.000 ₫ cho `acc_bank` và xóa `tx_1789003198149_cmgkm`.

### 2.2. Android Native Client (`BankNotificationListener.kt`)
- **Sửa logic xử lý phản hồi HTTP từ API**:
  - Phân biệt rõ giữa:
    - *Thành công*: `response.isSuccessful && response.body()?.data != null` ➔ Cập nhật chat, phát broadcast, bắn notification.
    - *Server chủ động bỏ qua (Ignored)*: `response.isSuccessful && response.body()?.data == null` ➔ Ghi log `AppLogger.i("NOTI", "Server bỏ qua: ${response.body()?.message}")`, **TUYỆT ĐỐI KHÔNG GỌI `enqueueOffline()`**.
    - *Lỗi kết nối thực sự*: HTTP >= 500, lỗi 4xx, hoặc ngoại lệ mạng `IOException` ➔ Mới lưu vào `offline_transactions`.
- **Chặn từ đầu các thông báo bị ẩn nội dung**:
  - Kiểm tra nếu `text` hoặc `title` chứa cụm từ `"Sensitive notification content hidden"` hoặc `"content hidden"` hoặc `"nội dung ẩn"`:
    - Ghi log cảnh báo `AppLogger.w("NOTI", "Nội dung bị ẩn do màn hình khóa. Cần bật 'Hiển thị tất cả nội dung trên màn hình khóa' trong Cài đặt Android.")`.
    - Không gửi lên backend và không lưu vào hàng đợi offline.
- **Xóa sạch dữ liệu rác trong Room DB**:
  - Dọn sạch các bản ghi lỗi hoặc bản ghi rác trong bảng `offline_transactions`.

---

## 3. Kế Hoạch Kiểm Thử (Verification Plan)

### Kiểm Thử Cục Bộ & Tự Động:
1. Chạy unit test bóc tách với các mẫu tin nhắn:
   - `-40,500 VND` + Body MSB ➔ Xác nhận bóc tách đúng số tiền `40.500 ₫`, `expense`, nội dung Payoo.
   - `-49,000 VND` + Body ZaloPay ➔ Xác nhận bóc tách đúng `49.000 ₫`.
   - `Bảo hiểm xe sắp hết hạn rồi!` + Body 40k/năm ➔ Xác nhận bị từ chối ngay ở bước kiểm tra Title, không sinh giao dịch.
   - `MSB DigiBank: Sensitive notification content hidden` ➔ Xác nhận bị bỏ qua an toàn.
2. Kiểm tra tính toàn vẹn số dư trên Cloudflare D1 sau khi xóa giao dịch 40k:
   - `acc_bank.balance` tăng lại đúng 40.000 ₫.
   - Không còn bản ghi `tx_1789003198149_cmgkm`.

### Hướng Dẫn Kiểm Thử Thực Tế Cho Người Dùng:
1. Mở Cài đặt Android ➔ Thông báo màn hình khóa ➔ Chọn "Hiển thị tất cả nội dung".
2. Thực hiện 1 giao dịch chuyển tiền hoặc quẹt thẻ MSB/ZaloPay ➔ Xác nhận Salaria bắt ngay lập tức và bắn thông báo cục bộ.
