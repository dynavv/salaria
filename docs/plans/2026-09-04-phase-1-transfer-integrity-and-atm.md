# 🚀 Kế Hoạch Triển Khai: Đợt Cập Nhật Salaria v1.1 (Đã Phê Duyệt)

## 📌 Bối Cảnh & Phân Định Nghiệp Vụ Chính Xác

1. **Thanh toán qua Ví điện tử liên kết (ZaloPay / MoMo Auto-Debit)**:
   - Khi thanh toán qua ZaloPay/MoMo liên kết ngân hàng (ví dụ: `043***427 Nap tien Vi ZaloPay` 20.000 ₫), đây là **Khoản chi tiêu thực tế (type = 'expense')** được trừ từ `acc_bank`. Tiền không nằm lại trong ví mà chuyển thẳng cho người bán.
   - Giải pháp: Giữ nguyên `expense`, tối ưu luồng "Chạm vào Noti mở thẳng popup sửa" để người dùng đổi note/danh mục trong 1 chạm.

2. **Rút tiền mặt ATM (`Rut tien ATM`, `Cash withdrawal`)**:
   - Đây là **Chuyển tiền nội bộ (type = 'transfer')**: Trừ `acc_bank`, cộng `acc_cash`, không gán danh mục chi tiêu tháng (`category_id = null`).

3. **Toàn vẹn số dư `transfer` (P0 - Data Integrity)**:
   - Sửa lỗi PUT & DELETE trong `cloudflare_worker.js`: Hoàn tác chính xác cả tài khoản nguồn lẫn tài khoản đích.

4. **Tối ưu Android UI/UX (P1)**:
   - `EditTransactionBottomSheet.kt`: Mở bung trọn vẹn (`skipPartiallyExpanded = true`), đưa nút thùng rác đỏ `🗑️` lên Top Bar góc phải, bổ sung tab `Chuyển tiền (⇄)`.
   - `TransactionsScreen.kt`: Fix tràn chữ `Kỳ lương`, thêm dropdown chọn tháng/kỳ lương cũ.
   - `NotificationHelper.kt` + `MainActivity.kt`: Chạm vào Noti mở thẳng vào Sổ thu chi và tự bật popup sửa giao dịch đó.

---

## 🛠️ Trình Tự Triển Khai

### Bước 1: Cloudflare Worker Backend (`backend/cloudflare_worker.js`)
- [ ] Bổ sung logic hoàn tác và cập nhật 2 chiều cho `transfer` trong PUT.
- [ ] Bổ sung logic hoàn tác 2 chiều cho `transfer` trong DELETE.
- [ ] Bổ sung nhận diện từ khóa Rút tiền ATM (`rut tien atm`, `rut atm`, `cash withdrawal`) thành `transfer` nội bộ giữa `acc_bank` và `acc_cash`.
- [ ] Cập nhật deploy Worker lên Cloudflare Edge và kiểm thử API.

### Bước 2: Android Native App UI/UX
- [ ] `EditTransactionBottomSheet.kt`: Bật `skipPartiallyExpanded = true`, đưa nút xóa lên Top Bar, thêm tab Chuyển tiền (⇄).
- [ ] `TransactionsScreen.kt`: Fix tràn chữ thanh lọc thời gian, thêm dropdown chọn tháng/kỳ lương.
- [ ] `NotificationHelper.kt` & `MainActivity.kt`: Hỗ trợ deep-link `transaction_id` từ Notification mở thẳng popup sửa.

### Bước 3: Kiểm thử & Nghiệm thu
- [ ] Chạy test API transfer CRUD trên Worker.
- [ ] Build & xác nhận mã nguồn Android.
- [ ] Cập nhật `docs/backlog.md`.
