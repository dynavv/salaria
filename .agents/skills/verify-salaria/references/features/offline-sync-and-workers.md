# 📶 Offline Sync & Workers (Đồng Bộ Offline & Tác Vụ Chạy Ngầm)

Cơ chế phòng thủ mất mạng (Zero-Drop Offline Defense) và các tác vụ định kỳ tự động chạy nền thông qua Android Jetpack WorkManager và Cloudflare Cron Triggers.

---

## 📌 Sub-features

- **Offline Transaction Queue**: Khi điện thoại mất sóng 4G/Wi-Fi, `BankNotificationListener` tự động lưu toàn bộ payload thông báo ngân hàng vào bảng SQLite cục bộ `offline_transactions` (Room DB) với trạng thái `PENDING`.
- **WorkManager Auto-Sync (`SyncOfflineTransactionsWorker`)**: Đăng ký tác vụ ngầm với hệ điều hành Android kèm ràng buộc `Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED)`. Ngay khi có mạng trở lại, worker tự động quét hàng đợi và đẩy lên Cloudflare D1.
- **Daily Summary Worker (`DailySummaryWorker`)**: Tác vụ định kỳ kích hoạt vào 22:30 mỗi tối (giờ Việt Nam), gọi API `/api/daily-summary` để lấy tổng kết thu chi và hiển thị thông báo tổng kết ngày cho người dùng.
- **Cloudflare Scheduled Cron**: Cloudflare Worker tự kích hoạt theo lịch trình `cron: "30 15 * * *"` (tức 22:30 GMT+7) để gửi báo cáo qua Telegram và dọn dẹp log cũ hơn 30 ngày.

---

## 🚶 How to get to it (User POV)

1. **Khi đi vào vùng mất sóng (Tầng hầm, máy bay, thang máy)**: Người dùng thanh toán tiền gửi xe hoặc mua sắm. Thông báo vẫn được bắt và lưu an toàn vào máy.
2. **Khi ra ngoài và có mạng**: Thiết bị tự động đồng bộ ngầm mà không cần người dùng phải mở app hay bấm bất kỳ nút nào.
3. **Mỗi tối lúc 22:30**: Điện thoại xuất hiện thông báo tổng kết tài chính: *"📊 Tổng kết ngày: Đã chi 185.000 ₫ (3 giao dịch). Safe-to-Spend còn lại: 1.250.000 ₫"*.

---

## 🎛️ Controls & Driving

- **Android Database Entity**: `@Entity(tableName = "offline_transactions")`
  - Các trường: `id`, `title`, `text`, `source`, `timestamp`, `isSynced`
- **WorkManager Task Names**:
  - `SyncOfflineTransactionsWorker`: `OneTimeWorkRequestBuilder` hoặc `PeriodicWorkRequestBuilder`
  - `DailySummaryWorker`: `PeriodicWorkRequestBuilder<DailySummaryWorker>(24, TimeUnit.HOURS)`
- **Cloudflare Cron Trigger**: Khai báo trong [`wrangler.jsonc`](file:///home/dynav/Documents/antigravity/Salarini/backend/wrangler.jsonc):
  ```jsonc
  "triggers": {
    "crons": ["30 15 * * *"]
  }
  ```

---

## 👁️ Observable State & Invariants

- **Success**:
  - Khi offline: Bảng `offline_transactions` trong Room DB tăng số dòng; log `AppLogger.d("Saved offline transaction...")`.
  - Khi online trở lại: Worker chạy ngầm, gửi POST đến `/api/transactions/ingest`, nhận HTTP 200, sau đó xóa hoặc đánh dấu `isSynced = true` trong Room DB.
  - Số dư trên Cloudflare D1 được cập nhật đầy đủ, không bỏ sót giao dịch nào.
- **Failure**:
  - Mạng chập chờn / Timeout: Worker tự động áp dụng chính sách `BackoffPolicy.EXPONENTIAL` để thử lại ở chu kỳ tiếp theo mà không làm crash ứng dụng.

---

## 🧩 Owning Components

- **Room Database & DAO**:
  - Room DB: [`android/app/src/main/java/com/salaria/app/data/local/AppDatabase.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/data/local/AppDatabase.kt)
- **WorkManager Workers**:
  - Offline Sync Worker: [`android/app/src/main/java/com/salaria/app/worker/SyncOfflineTransactionsWorker.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/worker/SyncOfflineTransactionsWorker.kt)
  - Daily Summary Worker: [`android/app/src/main/java/com/salaria/app/worker/DailySummaryWorker.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/worker/DailySummaryWorker.kt)
- **Backend Cron Handler**:
  - Scheduled Event Handler: [`backend/src/index.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/index.ts#L161-L175)
  - Telegram Daily Digest: [`backend/src/services/telegram.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/services/telegram.ts)

---

## ⚠️ Known Edge Cases & Common Traps

- **Doze Mode & Battery Saver**: Trên các dòng máy Xiaomi (MIUI/HyperOS), Samsung (OneUI), tác vụ ngầm có thể bị hệ điều hành đóng băng. App cần hướng dẫn người dùng tắt tối ưu pin (Disable Battery Optimization) cho Salaria.
- **Thứ tự thời gian khi đồng bộ muộn**: Khi đồng bộ lại nhiều giao dịch offline, cần đảm bảo trường `date` và `created_at` phản ánh thời điểm diễn ra giao dịch thực tế chứ không phải thời điểm worker chạy đồng bộ.
