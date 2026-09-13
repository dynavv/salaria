# 📋 Telemetry & Observability (Hộp Đen Nhật Ký & Quan Sát Hệ Thống)

Hệ thống hộp đen viễn thám (Blackbox Telemetry) thu thập toàn bộ nhật ký vận hành từ thiết bị di động Android và Cloudflare Worker vào cơ sở dữ liệu D1 phục vụ việc chẩn đoán sự cố từ xa.

---

## 📌 Sub-features

- **Android Client Telemetry (`AppLogger`)**:
  - Ghi nhận chi tiết các sự kiện quan trọng: Bắt thông báo, lọc noise, trạng thái mạng, gọi API, lỗi parsing, tác vụ Worker.
  - Vừa xuất ra Android Logcat, vừa tự động gom gói và gửi lên Cloudflare D1.
- **Backend Centralized Logs Route**:
  - `GET /api/logs`: Tra cứu nhật ký theo bộ lọc đa tiêu chí (`level`: INFO, WARN, ERROR; `tag`: LISTENER, INGEST, AI, SYNC; `source`: android_app, worker; `limit`).
  - `POST /api/logs`: Tiếp nhận một hoặc một mảng các log entry từ client.
  - `DELETE /api/logs`: Xóa toàn bộ hoặc xóa các log cũ hơn N ngày (`days=30`).
- **Automated 30-Day Retention Policy**:
  - Tác vụ Cloudflare Cron Trigger chạy lúc 22:30 mỗi tối tự động dọn dẹp các dòng log cũ hơn 30 ngày, ngăn chặn phình to dung lượng D1 database.
- **In-App Logs Viewer**:
  - Người dùng có thể xem trực tiếp nhật ký vận hành ngay trong tab Cài đặt của ứng dụng Android để kiểm tra sự cố tại chỗ.

---

## 🚶 How to get to it (User POV)

1. **Android App**: Vào **Cài đặt** -> Cuộn xuống mục **Nhật ký hệ thống (Logs)** -> Nhấn **Xem nhật ký** để đọc danh sách sự kiện kèm mốc thời gian.
2. **Kỹ thuật viên / Developer**:
   - Chạy lệnh cURL tra cứu logs trực tiếp từ Cloudflare Worker:
     ```bash
     curl -s -H "x-api-key: <MASTER_PIN>" "https://salaria-vault.dynav.workers.dev/api/logs?level=ERROR&limit=20" | jq .
     ```

---

## 🎛️ Controls & Driving

- **API Endpoints**:
  - `GET /api/logs?level=WARN&tag=AI_FALLBACK&limit=50`
  - `POST /api/logs`
    ```json
    [
      {
        "level": "INFO",
        "tag": "LISTENER",
        "source": "android_app",
        "message": "Processed bank notification from com.vcb",
        "metadata": { "amount": 50000, "duration_ms": 120 }
      }
    ]
    ```
  - `DELETE /api/logs?days=30`
- **Helper Functions**:
  - Backend: `logToD1(db, level, tag, message, metadata)` trong [`backend/src/db/index.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/db/index.ts)
  - Android: `AppLogger.i()`, `AppLogger.w()`, `AppLogger.e()` trong [`android/app/src/main/java/com/salaria/app/util/AppLogger.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/util/AppLogger.kt)

---

## 👁️ Observable State & Invariants

- **Success**:
  - Bảng `system_logs` lưu trữ đầy đủ `id`, `timestamp`, `level`, `tag`, `source`, `message`, `metadata`.
  - Cron trigger định kỳ giải phóng các bản ghi cũ mà không ảnh hưởng tới dữ liệu giao dịch.
- **Failure**:
  - D1 gặp lỗi ghi log: Không được làm gián đoạn luồng giao dịch chính (bọc trong khối `try/catch` an toàn).

---

## 🧩 Owning Components

- **Entry / Route**:
  - Backend Logs Route: [`backend/src/routes/logs.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/logs.ts)
- **Database Helper**:
  - D1 Logger: [`backend/src/db/index.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/db/index.ts)
- **Android Logger & UI**:
  - Android Telemetry Engine: [`android/app/src/main/java/com/salaria/app/util/AppLogger.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/util/AppLogger.kt)
  - Android Settings Screen: [`android/app/src/main/java/com/salaria/app/ui/screens/SettingsScreen.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/SettingsScreen.kt)
- **Schema / Model**:
  - Table `system_logs` trong [`backend/migrations/0001_initial_schema.sql`](file:///home/dynav/Documents/antigravity/Salarini/backend/migrations/0001_initial_schema.sql)

---

## ⚠️ Known Edge Cases & Common Traps

- **Không lưu dữ liệu nhạy cảm vào log**: Số thẻ, mật khẩu, mã PIN, mã OTP tuyệt đối KHÔNG được ghi vào `message` hoặc `metadata` của log.
- **Flood Logs**: Khi mất mạng, không bắn log dồn dập làm cạn kiệt tài nguyên máy; áp dụng cơ chế throttling cho các log lặp lại.
