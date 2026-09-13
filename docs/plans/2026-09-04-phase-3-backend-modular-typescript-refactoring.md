# 📋 Kế Hoạch Triển Khai: Tái Cấu Trúc Kiến Trúc Backend Module & TypeScript (Salaria v1.3 - P3)

> **Mục tiêu**: Giải phẫu file đơn khối `cloudflare_worker.js` (2.170 dòng) thành kiến trúc module sạch bằng TypeScript (`backend/src/`), thiết lập D1 Migrations chính quy, duy trì tính toàn vẹn 100% của dữ liệu thực tế và giữ an toàn kênh dự phòng Telegram Bot.

---

## 🗺️ Bản Đồ Kiến Trúc Mới (`backend/src/`)

```text
backend/
├── migrations/
│   └── 0001_initial_schema.sql       # [P3-03] Quản lý version DB D1 chính quy
├── src/
│   ├── index.ts                      # [P3-01] Entry point (fetch router & scheduled cron)
│   ├── types.ts                      # [P3-02] TypeScript types & Env bindings
│   ├── ai/
│   │   └── workers_ai.ts             # Universal AI Adapter (Gemma 4 26B & Llama 3.2 3B)
│   ├── db/
│   │   └── index.ts                  # D1 query helpers & System logs
│   ├── services/
│   │   ├── parser.ts                 # normalizeText, parseMoneyAndNote, noise filter
│   │   ├── paycheck.ts               # getPaycheckCycle (tính chu kỳ lương 22 hàng tháng)
│   │   └── telegram.ts               # sendTelegram & formatters (giữ kênh dự phòng an toàn)
│   └── routes/
│       ├── transactions.ts           # CRUD giao dịch kèm logic rollback số dư 2 chiều
│       ├── accounts.ts               # CRUD tài khoản
│       ├── categories.ts             # CRUD danh mục
│       ├── analytics.ts              # Thống kê monthly, MoM comparison, advisor
│       ├── ingest.ts                 # Webhook bắt Noti ngân hàng & Chat tự nhiên (ATM detector)
│       ├── telegram_webhook.ts       # Router lệnh Telegram bot (/start, /undo, /day)
│       └── logs.ts                   # Endpoint telemetry /api/logs
├── wrangler.jsonc                    # Cập nhật "main": "src/index.ts"
├── tsconfig.json                     # Cấu hình TypeScript cho Cloudflare Workers
└── cloudflare_worker.js.bak          # Bản sao lưu dự phòng an toàn tuyệt đối
```

---

## 🛡️ Tuân Thủ Hiến Pháp & Giới Hạn Nghiêm Ngặt
1. **Không làm mất dữ liệu D1 Database**: Tuyệt đối không chạy lệnh `DROP TABLE` hoặc xóa bảng `transactions`, `accounts`, `categories` trên D1 `salarini-db`.
2. **Không đổi khóa bảo mật**: Giữ nguyên `x-api-key`, `MASTER_PIN` và token Telegram bot trong `wrangler.jsonc`.
3. **Bảo tồn kênh Telegram Bot**: Tuân thủ Điều 4.4 của Hiến pháp `GEMINI.md`, giữ nguyên router và logic Telegram Bot làm kênh dự phòng độc lập.
4. **Bảo toàn 100% logic nghiệp vụ**:
   - Toàn vẹn số dư Transfer PUT/DELETE.
   - Nhận diện rút ATM thông minh (`acc_bank` ➔ `acc_cash`).
   - Phản hồi hạn mức an toàn chu kỳ lương.
   - Phân tích so sánh đa tháng MoM.

---

## 🛠️ Trình Tự Triển Khai Từng Bước

### Bước 1: Sao lưu & Tạo cấu trúc TypeScript
1. Sao lưu `cloudflare_worker.js` thành `cloudflare_worker.js.bak`.
2. Tạo `backend/tsconfig.json` chuẩn hóa môi trường Cloudflare Workers.
3. Tạo `backend/src/types.ts` khai báo interface: `Env`, `Transaction`, `Account`, `Category`, `FinancialHealth`, `IngestResult`.

### Bước 2: Tách các Module Dịch Vụ & Lõi
1. `backend/src/services/parser.ts`: Chuyển `normalizeText`, `isNoiseMessage`, `parseMoneyAndNote`.
2. `backend/src/services/paycheck.ts`: Chuyển `getPaycheckCycle`.
3. `backend/src/services/telegram.ts`: Chuyển `sendTelegram` và format thông báo.
4. `backend/src/ai/workers_ai.ts`: Chuyển `WorkersAIAdapter` và `categorizeWithWorkersAI`.
5. `backend/src/db/index.ts`: Chuyển `logToD1`, helper kết nối DB.

### Bước 3: Tách các Module Tuyến Đường (Routes)
1. `backend/src/routes/transactions.ts`: Xử lý GET, POST, PUT, DELETE (kèm logic hoàn tác 2 chiều transfer).
2. `backend/src/routes/accounts.ts` & `categories.ts`: Xử lý CRUD tài khoản và danh mục.
3. `backend/src/routes/analytics.ts`: Xử lý `/api/analytics/monthly`, `/api/analytics/comparison`, `/api/analytics/advisor`, `/api/analytics/available-months`.
4. `backend/src/routes/ingest.ts`: Xử lý `/api/ingest`, `/api/webhook` với nhận diện Rút ATM tự nhiên và phản hồi hạn mức chu kỳ lương.
5. `backend/src/routes/telegram_webhook.ts`: Xử lý các lệnh Bot Telegram.
6. `backend/src/routes/logs.ts`: Xử lý telemetry system logs.

### Bước 4: Tích hợp Entry Point (`backend/src/index.ts`)
1. Hàm `fetch(request, env, ctx)`: Định tuyến sạch sẽ theo `pathname` và `method`.
2. Hàm `scheduled(event, env, ctx)`: Chạy cron tổng kết lúc 22:30 và dọn log 30 ngày.

### Bước 5: Khởi tạo D1 Native Migrations (`backend/migrations/`)
1. Tạo thư mục `backend/migrations/` và file `0001_initial_schema.sql` khớp hoàn toàn với schema hiện tại.

### Bước 6: Cập nhật `wrangler.jsonc` & Triển khai
1. Đổi `"main": "src/index.ts"` trong `wrangler.jsonc`.
2. Kiểm tra type check và chạy deploy với `npx --yes wrangler deploy`.

---

## 🧪 Kế Hoạch Kiểm Thử (Verification Plan)
1. **Kiểm tra biên dịch TypeScript**:
   - `npx --yes wrangler deploy --dry-run` đảm bảo 0 lỗi type/syntax.
2. **Kiểm tra API Live trên Edge**:
   - Test Health: `GET /health`
   - Test Ingest ATM: `POST /api/webhook` với `"rút 500k atm"` (xác nhận `acc_bank` ➔ `acc_cash`).
   - Test Transactions: `GET /api/transactions?limit=1`.
   - Test Analytics Comparison: `GET /api/analytics/comparison?months=2026-08,2026-09`.
3. **Kiểm tra Tính toàn vẹn số dư Transfer**:
   - Tạo transfer test 10k ➔ Kiểm tra balance ➔ Sửa 20k ➔ Xóa ➔ Xác nhận balance ban đầu không lệch 1 xu.

---

## 🔄 Kế Hoạch Rollback
- Nếu phát sinh lỗi, chỉ cần đổi lại `"main": "cloudflare_worker.js"` trong `wrangler.jsonc` và chạy deploy lại là hệ thống lập tức trở về bản cũ ổn định trong 10 giây.
