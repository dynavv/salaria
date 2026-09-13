# 💾 Backup & Recovery (Sao Lưu & Khôi Phục Dữ Liệu)

Cơ chế sao lưu dự phòng toàn diện và khôi phục dữ liệu tài chính dạng JSON độc lập với nền tảng đám mây, bảo đảm an toàn dữ liệu người dùng trước mọi sự cố.

---

## 📌 Sub-features

- **Full JSON Export**:
  - `GET /api/backup/export-json`: Xuất toàn bộ dữ liệu hiện có trong Cloudflare D1 thành một file JSON duy nhất chứa đầy đủ 3 thực thể cốt lõi: `accounts`, `categories`, và `transactions` kèm mốc thời gian xuất `exported_at`.
- **Transaction JSON Import & Restoration**:
  - `POST /api/backup/import-json`: Tiếp nhận mảng giao dịch từ file backup và thực thi câu lệnh an toàn `INSERT OR REPLACE INTO transactions`, giúp khôi phục dữ liệu mà không gây lỗi trùng khóa chính (`id`).
- **Cross-Platform Portability**:
  - Định dạng JSON chuẩn cho phép người dùng di chuyển dữ liệu sang máy tính cá nhân hoặc tự tạo kho lưu trữ ngoại tuyến độc lập.

---

## 🚶 How to get to it (User POV)

1. **Thực hiện Backup định kỳ**:
   - Gửi yêu cầu HTTP GET đến endpoint backup:
     ```bash
     curl -s -H "x-api-key: <MASTER_PIN>" https://salaria-vault.dynav.workers.dev/api/backup/export-json > salaria_backup_$(date +%F).json
     ```
2. **Khôi phục khi cần thiết**:
   - Gửi file backup qua HTTP POST đến `/api/backup/import-json`.

---

## 🎛️ Controls & Driving

- **API Endpoints**:
  - `GET /api/backup/export-json`
  - `POST /api/backup/import-json`
    ```json
    {
      "version": "2026.1",
      "data": {
        "transactions": [
          {
            "id": "tx_123456",
            "date": "2026-09-09",
            "amount": 50000,
            "type": "expense",
            "category_id": "cat_food",
            "account_id": "acc_cash",
            "destination_account_id": null,
            "note": "Cơm trưa",
            "source": "backup_import"
          }
        ]
      }
    }
    ```

---

## 👁️ Observable State & Invariants

- **Success**:
  - Xuất dữ liệu: Nhận JSON có `success: undefined` (hoặc cấu trúc chuẩn), chứa mảng dữ liệu đầy đủ.
  - Nhập dữ liệu: Trả về HTTP 200 `{ success: true, message: "Imported N transactions successfully" }`.
- **Failure**:
  - Payload import rỗng hoặc sai cấu trúc: Không ghi đè cơ sở dữ liệu.

---

## 🧩 Owning Components

- **Entry / Route**:
  - Backend Backup Route: [`backend/src/routes/backup.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/backup.ts)
- **Database**:
  - D1 Tables: `accounts`, `categories`, `transactions` trong [`backend/migrations/0001_initial_schema.sql`](file:///home/dynav/Documents/antigravity/Salarini/backend/migrations/0001_initial_schema.sql)

---

## ⚠️ Known Edge Cases & Common Traps

- **Cân bằng lại số dư sau khi Import**: `import-json` chèn giao dịch với `INSERT OR REPLACE` nhưng không tự động kích hoạt điều chỉnh số dư của các tài khoản tương ứng trong bảng `accounts`. Nếu import lịch sử lớn vào database mới hoàn toàn, cần đồng bộ lại trường `balance` của `accounts` dựa trên subquery tính toán.
