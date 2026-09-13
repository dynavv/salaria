# ADR-0003: Xây Dựng Native Android App (Kotlin + Room + WorkManager) Thay Vì Cross-Platform

* **Trạng thái**: Đã phê duyệt (Accepted)
* **Ngày quyết định**: 2026-08-25
* **Người quyết định**: Salaria Architecture Team

---

## Bối Cảnh (Context)
Tính năng sống còn của Salaria là **bắt thông báo biến động số dư ngân hàng 24/7 trong chế độ nền** (`NotificationListenerService`). Dịch vụ này đòi hỏi quyền can thiệp sâu tầng hệ điều hành Android, duy trì tiến trình không bị cơ chế tiết kiệm pin (Doze Mode) tiêu diệt, và phải lưu trữ offline khi người dùng ở vùng mất mạng (tầng hầm, thang máy).

## Các Lựa Chọn Đã Xem Xét (Options Considered)
1. **Flutter / React Native**: Làm giao diện nhanh đa nền tảng nhưng plugin `NotificationListener` hoạt động thiếu ổn định, dễ bị hệ điều hành tắt ngầm, khó tích hợp Room DB và WorkManager nguyên bản.
2. **Tiếp tục dùng MacroDroid**: Phụ thuộc ứng dụng bên thứ 3, dễ bị người dùng gỡ nhầm hoặc cấu hình sai webhook, thiếu giao diện sổ thu chi cầm tay.
3. **Native Android (Kotlin, Jetpack Compose, Room, WorkManager)**: 100% can thiệp sâu vào Android Framework, kiểm soát hoàn toàn vòng đời dịch vụ.

## Quyết Định (Decision)
Chọn **Native Android App**:
- Tích hợp `BankNotificationListener` chạy ngầm tầng OS, đọc trực tiếp `StatusBarNotification`.
- Sử dụng **Room Database** làm hàng đợi ngoại tuyến (`offline_transactions`): Mất mạng vẫn lưu an toàn trên máy.
- Sử dụng **WorkManager** (`SyncOfflineTransactionsWorker`): Tự động phát hiện khi có mạng trở lại để đẩy toàn bộ giao dịch lên Cloudflare Worker.

## Hệ Quả (Consequences)
- **Tích cực**: Độ ổn định 24/7 tối đa, trải nghiệm giao diện Compose hiện đại, bảo mật cao.
- **Tiêu cực**: Chỉ hỗ trợ hệ điều hành Android (không hỗ trợ iOS vì iOS cấm hoàn toàn quyền đọc notification của app khác).
