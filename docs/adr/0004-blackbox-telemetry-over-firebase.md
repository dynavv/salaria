# ADR-0004: Sử Dụng Hộp Đen Telemetry Nội Bộ (AppLogger ➜ D1) Thay Vì Google Firebase

* **Trạng thái**: Đã phê duyệt (Accepted)
* **Ngày quyết định**: 2026-08-28
* **Người quyết định**: Salaria Architecture Team

---

## Bối Cảnh (Context)
Để kiểm soát và khắc phục sự cố khi `BankNotificationListener` chạy nền ngoài đời thực, hệ thống cần biết chính xác: Khi nào noti đến, bị lọc bởi lý do gì (noise filter), kết nối tới Cloudflare có bị timeout hay lỗi 500 không.

## Các Lựa Chọn Đã Xem Xét (Options Considered)
1. **Google Firebase (Crashlytics, Analytics, FCM)**: Phổ biến nhưng làm tăng dung lượng APK, đòi hỏi file `google-services.json`, gửi dữ liệu tài chính qua bên thứ 3, và cồng kềnh với dự án cá nhân.
2. **Sentry / Datadog**: Đắt đỏ hoặc bị giới hạn số lượng event miễn phí.
3. **Black-box Telemetry Tự Xây Dựng (AppLogger + D1 `system_logs`)**:
   - Ghi log 2 tầng: Lưu 100 dòng gần nhất trong bộ nhớ máy (xem trực tiếp trên màn hình Cài đặt của App).
   - Đồng bộ từ xa lên bảng `system_logs` trên Cloudflare D1 qua endpoint `/api/logs`.

## Quyết Định (Decision)
Chọn giải pháp **Telemetry nội bộ (`AppLogger` ➜ D1)**:
- Không phụ thuộc SDK bên thứ 3.
- Bảo mật 100% dữ liệu biến động số dư ngân hàng của người dùng.
- Cho phép xem log cả trên điện thoại lẫn trên Cloudflare Dashboard.

## Hệ Quả (Consequences)
- **Tích cực**: Dung lượng app cực nhẹ (< 12MB), không cần đăng ký tài khoản Firebase, bảo mật dữ liệu tuyệt đối.
- **Tiêu cực**: Không có dashboard biểu đồ crash phân tích tự động như Crashlytics (chấp nhận được cho ứng dụng cá nhân).
