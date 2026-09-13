# 📋 Implementation Plan — Tự Động Quét Lại Thông Báo Bị Ẩn Bảo Mật & Cảnh Báo Cho Người Dùng (Android 15)

**Ngày tạo:** 10/09/2026  
**Trọng tâm:** Giải quyết triệt để vấn đề Android 15 tự động che giấu (`Sensitive notification content hidden`) thông báo ngân hàng khi có mã OTP. Triệt tiêu false positive do từ khóa không dấu, bổ sung Local Notification thông báo cho người dùng và cơ chế tự động quét lại thanh trạng thái sau 30s - 60s hoặc quét tức thì khi người dùng bấm nút.

---

## 1. Bối Cảnh & Phân Tích Kỹ Thuật (Problem Statement)

1. **Vấn đề từ khóa không dấu (`"noi dung an"`)**:
   - Dòng kiểm tra cũ chứa chuỗi `"noi dung an"` dễ dẫn đến nguy cơ bắt nhầm các giao dịch ăn uống/nhà hàng (ví dụ: `Noi dung: an com`, `ND: an uong`, `Quan an...`).
   - Cần loại bỏ hoàn toàn các chuỗi không dấu để tránh false positive.

2. **Cơ chế bảo mật Android 15 (Sensitive Notification Protection)**:
   - Khi có SMS OTP hoặc thao tác xác thực, Android 15 tự động tráo đổi nội dung thông báo ngân hàng gửi tới `NotificationListenerService` thành `"Sensitive notification content hidden"` dù màn hình vẫn sáng.
   - Sau khi người dùng nhập mã OTP và xóa thông báo SMS OTP, thông báo biến động số dư ngân hàng vẫn còn lưu trên thanh trạng thái (Status bar) với đầy đủ nội dung thật.
   - Nếu Salaria chủ động quét lại danh sách thông báo hoạt động (`getActiveNotifications()`), Salaria hoàn toàn có thể đọc được nội dung thật và ghi nhận giao dịch mà không bị bỏ sót.

---

## 2. Kế Hoạch Thay Đổi Chi Tiết (Proposed Changes)

### 2.1. Cập nhật `NotificationHelper.kt`
- **Tạo Channel cảnh báo bảo mật**: `salaria_security_alerts_channel` với mức ưu tiên cao (`IMPORTANCE_HIGH`).
- **Thêm hàm `showSecurityRedactedWarning(context, packageName)`**:
  - Tiêu đề: `⚠️ Phát hiện giao dịch bị ẩn bảo mật (Android 15)`
  - Nội dung: `Android đang ẩn nội dung chống lộ OTP. Sau khi nhập/xóa OTP, Salaria sẽ tự quét lại sau 30s.`
  - Nút bấm (Notification Action): **`[Quét lại ngay]`** gắn với `PendingIntent.getBroadcast` trỏ tới `RetryScanReceiver`.
- **Thêm hàm `cancelSecurityWarning(context)`**:
  - Hủy thông báo cảnh báo ngay khi giao dịch được quét thành công.

### 2.2. Tạo `RetryScanReceiver.kt`
- `BroadcastReceiver` tiếp nhận sự kiện khi người dùng nhấn `[Quét lại ngay]` từ notification.
- Kích hoạt `BankNotificationListener.instance?.triggerManualScan()`.
- Đăng ký receiver trong `AndroidManifest.xml`.

### 2.3. Cập nhật `BankNotificationListener.kt`
- **Lưu instance static**: `instance = this` trong `onListenerConnected()` và hủy trong `onDestroy()`.
- **Chuẩn hóa hàm `isContentHidden(fullText)`**:
  - Loại bỏ hoàn toàn `"noi dung an"`.
  - Chỉ giữ: `"sensitive notification content hidden"`, `"content hidden"`, `"nội dung ẩn"`, `"nội dung bị ẩn"`, `"nội dung thông báo bị ẩn"`.
- **Xử lý khi phát hiện nội dung bị ẩn**:
  - Ghi log cảnh báo `AppLogger.w("NOTI", "Thông báo từ $packageName đang bị Android ẩn nội dung. Đang kích hoạt thông báo cảnh báo và hẹn giờ tự quét lại...")`.
  - Bắn local notification cảnh báo qua `NotificationHelper.showSecurityRedactedWarning(...)`.
  - Khởi chạy Coroutine tự động quét lại (Auto-Retry):
    - Đợi 30 giây ➔ Quét lần 1 qua `scanAndProcessActiveNotifications(packageName)`.
    - Nếu vẫn bị ẩn, đợi thêm 30 giây (tổng 60s) ➔ Quét lần 2.
    - Nếu sau 60s vẫn bị ẩn: Ghi log hướng dẫn người dùng tắt "Enhanced notifications" trong Cài đặt Android.
- **Hàm `scanAndProcessActiveNotifications(targetPackage, isManual)`**:
  - Gọi `getActiveNotifications()`.
  - Tìm thông báo của `targetPackage` hoặc các ứng dụng ngân hàng được cho phép.
  - Trích xuất `title`, `text`, `bigText`.
  - Nếu nội dung đã bung ra (không còn bị ẩn):
    - Tự động gọi `NotificationHelper.cancelSecurityWarning(applicationContext)`.
    - Ghi log thành công và gửi lên Cloudflare API ghi nhận giao dịch bình thường.

---

## 3. Kế Hoạch Kiểm Thử (Verification Plan)

### Kiểm Thử Biên Dịch & Chạy Ngầm:
1. Compile và build ứng dụng Android (`./gradlew assembleDebug`).
2. Kiểm tra không có lỗi cú pháp hoặc cảnh báo nghiêm trọng.
3. Chạy HTTP server phục vụ APK mới cho người dùng tải và cài đặt.

### Kiểm Thử Thực Tế Trên Thiết Bị:
1. Kiểm tra khi có thông báo bị ẩn nội dung ➔ Salaria bắn thông báo cảnh báo kèm nút `[Quét lại ngay]`.
2. Sau khi người dùng quẹt xóa SMS OTP hoặc đợi 30s ➔ Salaria tự động bắt lại thông báo và ghi nhận giao dịch thành công.
3. Thông báo cảnh báo tự động biến mất khi giao dịch đã được ghi nhận.
