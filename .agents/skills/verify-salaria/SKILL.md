---
name: verify-salaria
description: Verification runbook, health checks, and feature map guide for the Salaria personal finance ecosystem.
---

# 🛡️ Verify Salaria: Verification Runbook & Architecture Navigator

Tài liệu hướng dẫn xác minh, kiểm tra vận hành hệ thống (Doctor Checks) và tra cứu Feature Map cho hệ sinh thái tài chính cá nhân **Salaria** (Repository: `Salarini`).

---

## 🧭 Triết Lý Cốt Lõi: The Iron Law

```
NO DIAGNOSIS OR FIX WITHOUT LOCATING THE DEFECT ON THE FEATURE MAP FIRST
```

Mọi chẩn đoán sự cố, phân tích lỗi (P0 - P3) hoặc điều chỉnh mã nguồn phải:
1. Tra cứu khu vực tính năng bị ảnh hưởng trong `references/features/`.
2. Xác định chuỗi thành phần (Component Chain) từ Entrypoint -> Service/AI -> Persistence (Room DB / D1).
3. Phân biệt rõ giữa **Nơi phát tác triệu chứng (Symptom Site)** và **Nguồn gốc khiếm khuyết (Fault Origin)**.
4. Đảm bảo bất biến số dư (Balance Integrity): Chuyển tiền (Transfer) không được tính vào chi tiêu sinh hoạt, hoàn tác 2 chiều chính xác.

---

## 🩺 System Doctor Checks (Kiểm Tra Nhanh Môi Trường)

### 1. Edge Backend & Database Health
```bash
# Kiểm tra trạng thái REST API và kết nối Cloudflare D1
curl -s https://salaria-vault.dynav.workers.dev/health | jq .
```
- **Kỳ vọng**: `success: true`, `database: "Connected (Cloudflare D1)"`, `ai_engine: "Active ..."`.

### 2. Desktop Web Dashboard Health
```bash
# Kiểm tra frontend dev server (cổng 5173)
curl -I http://localhost:5173
```
- **Kỳ vọng**: HTTP `200 OK`.

### 3. Android Native Listener Status
- Vào **Cài đặt hệ thống Android** -> **Notification Access** -> Xác nhận **Salaria** đang được cấp quyền.
- Kiểm tra logs hệ thống từ endpoint:
```bash
curl -s -H "x-api-key: <MASTER_PIN>" "https://salaria-vault.dynav.workers.dev/api/logs?tag=LISTENER&limit=5" | jq .
```

---

## 🗺️ Feature Map Navigation Index

Danh sách các khu vực tính năng đã được lập bản đồ chi tiết trong `references/features/`:

| STT | Khu Vực Tính Năng | File Đặc Tả | Phạm Vi Chính |
| :---: | :--- | :--- | :--- |
| 1 | **Bảo Mật & Xác Thực** | [`auth-and-security.md`](references/features/auth-and-security.md) | Master PIN, API Key, Token, Sanitization dữ liệu nhạy cảm |
| 2 | **Bóc Tách Noti Ngân Hàng** | [`bank-notification-ingest.md`](references/features/bank-notification-ingest.md) | `BankNotificationListener`, Regex parser, Local noti |
| 3 | **Đồng Bộ Offline & Workers** | [`offline-sync-and-workers.md`](references/features/offline-sync-and-workers.md) | Room DB queue, `SyncOfflineTransactionsWorker`, `DailySummaryWorker` |
| 4 | **Quản Lý Giao Dịch** | [`transaction-management.md`](references/features/transaction-management.md) | CRUD giao dịch, Toàn vẹn số dư Transfer/ATM, Hoàn tác 2 chiều |
| 5 | **Tài Khoản & Ví Tiền** | [`account-and-wallet.md`](references/features/account-and-wallet.md) | Quản lý ví/ngân hàng, tính số dư thời gian thực từ giao dịch |
| 6 | **Danh Mục & Ngân Sách** | [`category-and-budgeting.md`](references/features/category-and-budgeting.md) | Phân loại 50/30/20 (Needs/Wants/Savings), ngân sách định mức, từ khóa |
| 7 | **Phân Tích Dòng Tiền** | [`financial-analytics-and-insights.md`](references/features/financial-analytics-and-insights.md) | Safe-to-Spend 3-Bucket, Latte Factor, So sánh đa tháng MoM |
| 8 | **Trợ Lý Cố Vấn & Chat AI** | [`ai-advisor-and-chat.md`](references/features/ai-advisor-and-chat.md) | Llama 3.1 8B, Gemma 4 26B, ChatScreen ghi chép, trích dẫn giao dịch |
| 9 | **Lệnh Nhanh & Telegram Bot** | [`command-interceptor-and-bot.md`](references/features/command-interceptor-and-bot.md) | Lệnh `/undo`, `/xoa`, Fallback Telegram Bot 24/7, Báo cáo 22h30 |
| 10 | **Nhật Ký & Quan Sát Hệ Thống** | [`telemetry-and-observability.md`](references/features/telemetry-and-observability.md) | `AppLogger`, bảng `system_logs`, D1 log retention 30 ngày |
| 11 | **Sao Lưu & Khôi Phục** | [`backup-and-recovery.md`](references/features/backup-and-recovery.md) | Xuất/nhập JSON toàn vẹn cơ sở dữ liệu (accounts, categories, transactions) |

---

## 🔄 Thứ Tự Kiểm Thử Quét Hồi Quy Toàn Diện (Full Sweep Order)

Khi phát hành phiên bản mới hoặc cập nhật lớn, thực hiện kiểm tra theo trình tự phụ thuộc:
1. `auth-and-security` -> Kiểm tra quyền truy cập và bảo mật đầu vào.
2. `account-and-wallet` & `category-and-budgeting` -> Dữ liệu nền tảng danh mục và tài khoản.
3. `transaction-management` -> Thêm/sửa/xóa giao dịch và toàn vẹn số dư.
4. `bank-notification-ingest` -> Bóc tách thông báo ngân hàng thực tế.
5. `offline-sync-and-workers` -> Ngắt mạng thử nghiệm và đồng bộ lại.
6. `command-interceptor-and-bot` -> Thử nghiệm lệnh `/undo` và kênh Telegram.
7. `ai-advisor-and-chat` -> Tương tác hội thoại ghi chép và phân tích.
8. `financial-analytics-and-insights` -> Kiểm tra số liệu Safe-to-Spend và MoM.
9. `telemetry-and-observability` -> Kiểm tra ghi nhận log hệ thống.
10. `backup-and-recovery` -> Kiểm tra xuất và khôi phục dữ liệu an toàn.
