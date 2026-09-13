# 🏛️ Salaria — System Architecture & Data Flow

Tài liệu này mô tả chi tiết kiến trúc kỹ thuật và các luồng dữ liệu (Data Flows) trong hệ sinh thái quản lý tài chính **Salaria**.

---

## 1. Sơ Đồ Tổng Quan Hệ Thống (High-Level Architecture)

```mermaid
flowchart TD
    subgraph Mobile ["📱 Thiết Bị Di Động (Android Client)"]
        BankApp["🔔 Ứng Dụng Ngân Hàng<br/>(MSB, VCB, Momo, ZaloPay...)"]
        Listener["🎧 BankNotificationListener<br/>(Dịch vụ chạy ngầm 24/7)"]
        RoomDB[("💾 Room Database Cục Bộ<br/>(Offline Queue & Cache)")]
        WorkMgr["⏰ WorkManager Worker<br/>(Sync offline & Báo cáo 22h30)"]
        ComposeUI["🎨 Jetpack Compose UI<br/>(Dashboard, Sổ thu chi, Chat)"]
        
        BankApp -->|StatusBarNotification| Listener
        Listener -->|Khi mất mạng| RoomDB
        RoomDB -.->|Khi có mạng lại| WorkMgr
        ComposeUI <--> RoomDB
    end

    subgraph Edge ["☁️ Cloudflare Serverless Edge Network"]
        Worker["⚡ Cloudflare Worker Backend<br/>(REST API Router & Universal Ingest)"]
        
        subgraph AI_Gateway ["🧠 Universal LLM Gateway (WorkersAIAdapter)"]
            Llama["🚀 Fast Extraction: Llama 3.1 8B<br/>(Bóc tách số tiền & danh mục < 0.2s)"]
            Gemma["🔬 Deep Reasoning: Gemma 4 26B<br/>(Cố vấn tài chính & Phân tích chuyên sâu)"]
        end
        
        D1[("🗄️ Cloudflare D1 Database<br/>(SQLite toàn cầu: accounts, transactions, logs)")]
        
        Worker <--> AI_Gateway
        Worker <--> D1
    end

    subgraph Web ["💻 Máy Tính Để Bàn (Desktop Web Client)"]
        ReactApp["⚛️ Salaria Web App (React 18 + Vite + TS)<br/>(Phân tích đa tháng MoM, 50/30/20, Cố vấn AI)"]
    end

    Listener -->|HTTPS REST API| Worker
    WorkMgr -->|Đẩy giao dịch tồn đọng| Worker
    ReactApp <-->|REST API + PIN Auth| Worker
```

---

## 2. Luồng Bóc Tách Thông Báo & Đồng Bộ Ngoại Tuyến (Ingestion & Sync Flow)

Luồng này bảo đảm **không bao giờ thất thoát giao dịch** ngay cả khi điện thoại không có kết nối Internet:

```mermaid
sequenceDiagram
    autonumber
    participant Bank as App Ngân Hàng
    participant Service as BankNotificationListener
    participant Room as Room Database
    participant Worker as Cloudflare Worker
    participant AI as Workers AI (Llama 3.1)
    participant D1 as D1 Database
    participant Noti as NotificationHelper

    Bank->>Service: Bắn thông báo biến động số dư (StatusBar)
    Service->>Service: Kiểm tra package & Lọc sạch số tài khoản/số dư (Sanitization)
    
    alt Không có kết nối mạng (Offline)
        Service->>Room: Lưu vào bảng offline_transactions (Pending)
        Note over Room: Chờ WorkManager kích hoạt khi có Wi-Fi/4G lại
    else Có kết nối mạng (Online)
        Service->>Worker: POST /api/transactions/ingest
        Worker->>Worker: Tầng 1: Khớp Regex từ khóa danh mục (0ms)
        opt Nếu Regex không khớp
            Worker->>AI: Tầng 2: Gọi Llama 3.1 8B bóc tách ngữ cảnh
            AI-->>Worker: Trả về { amount, category_id, clean_note }
        end
        Worker->>D1: INSERT giao dịch & UPDATE số dư tài khoản
        Worker-->>Service: Trả về kết quả JSON thành công
        Service->>Noti: Kích hoạt thông báo cục bộ Android (Local Notification)
        Noti-->>Service: Hiển thị: "🔴 Chi tiêu: -48.000 ₫ (Ăn uống)"
    end
```

---

## 3. Luồng Tính Toàn Vẹn Số Dư Khi Chuyển Tiền & Rút ATM (Balance Integrity Flow)

Quy tắc bất biến: **Chuyển tiền nội bộ (Transfer) hoặc Rút tiền ATM tuyệt đối KHÔNG tính vào chi tiêu sinh hoạt tháng (Tránh bẫy Double Counting)**.

```mermaid
flowchart TD
    Action["Người dùng thực hiện Chuyển tiền / Rút ATM<br/>(Ví dụ: Rút 500k từ Ngân hàng vào Ví tiền mặt)"]
    
    subgraph Creation ["1. Khi Tạo Giao Dịch (POST)"]
        C1["Trừ số dư tài khoản nguồn: acc_bank (-500.000₫)"]
        C2["Cộng số dư tài khoản đích: acc_cash (+500.000₫)"]
        C3["Gán type = 'transfer', category_id = NULL"]
        C1 & C2 & C3 --> C_Done["Tổng tài sản KHÔNG đổi, Chi tiêu tháng KHÔNG tăng"]
    end

    subgraph Deletion ["2. Khi Xóa Giao Dịch (DELETE - Hoàn tác 2 chiều)"]
        D1["Hoàn lại tiền cho nguồn: UPDATE acc_bank (+500.000₫)"]
        D2["Thu hồi tiền khỏi đích: UPDATE acc_cash (-500.000₫)"]
        D3["Xóa dòng dữ liệu khỏi bảng transactions"]
        D1 & D2 & D3 --> D_Done["Số dư 2 tài khoản quay về trạng thái ban đầu chuẩn xác 100%"]
    end

    Action --> Creation
```

---

## 4. Kênh Dự Phòng An Toàn (Safety Fallback Channel)

* **Telegram Bot**: Duy trì hoạt động độc lập 24/7 trên Cloudflare Worker làm kênh ghi chép dự phòng và kênh cứu hộ (/undo).
* **MacroDroid**: Đã chính thức được loại bỏ hoàn toàn khỏi kiến trúc và thay thế bởi ứng dụng Native Android (`BankNotificationListener.kt`).
* Nếu người dùng có nhu cầu chuyển máy hoặc app Android tạm dừng, luồng Telegram Bot vẫn sẵn sàng phục vụ 24/7.

---

## 5. Bản Đồ Cấu Trúc Mã Nguồn (Master Project & Component Map)

```text
Salaria/ (Repository: Salarini)
├── 📱 android/                   # Ứng dụng Di động Native (Kotlin + Jetpack Compose)
│   ├── app/src/main/java/com/salaria/app/
│   │   ├── data/api/             # Retrofit REST Client (SalariaApi.kt, ApiClient.kt)
│   │   ├── data/local/           # Room DB ngoại tuyến (AppDatabase.kt) & PreferencesManager.kt
│   │   ├── data/model/           # Models, DTOs & ChatManager.kt (Bộ nhớ đệm phiên 0ms cho Chat)
│   │   ├── service/              # BankNotificationListener.kt (Bắt noti 24/7) & NotificationHelper.kt
│   │   ├── ui/screens/           # Compose Screens (ChatScreen, TransactionsScreen, DashboardScreen...)
│   │   ├── ui/components/        # Popup chỉnh sửa (EditTransactionBottomSheet.kt), Khóa PIN...
│   │   └── worker/               # WorkManager chạy ngầm (SyncOfflineTransactionsWorker & DailySummaryWorker)
│   └── Salaria.apk               # Bộ cài đặt APK hoàn thiện (18.8 MB)
│
├── ☁️ backend/                   # Cloudflare Serverless Edge Backend (TypeScript Modular)
│   ├── src/
│   │   ├── index.ts              # Router trung tâm, Middleware xác thực Master PIN & CORS
│   │   ├── routes/               # Modular Endpoints tách biệt:
│   │   │   ├── ingest.ts         # Tiếp nhận noti ngân hàng, Chat AI & Command Interceptor (/undo, quote)
│   │   │   ├── transactions.ts   # CRUD giao dịch & Toàn vẹn số dư transfer
│   │   │   ├── accounts.ts       # Quản lý ví/ngân hàng & số dư
│   │   │   ├── analytics.ts      # Phân tích 50/30/20, Latte Factor & So sánh đa tháng MoM
│   │   │   ├── categories.ts     # Danh mục chi tiêu & icon
│   │   │   ├── backup.ts         # Xuất/nhập dữ liệu D1
│   │   │   ├── logs.ts           # Hệ thống hộp đen Telemetry
│   │   │   └── telegram_webhook.ts # Kênh dự phòng Telegram Bot an toàn
│   │   ├── ai/workers_ai.ts      # Gateway LLM (Universal WorkersAIAdapter: Llama 3.1 & Gemma 4)
│   │   ├── db/index.ts           # D1 Database client wrapper
│   │   ├── services/             # Bộ phân loại regex (parser.ts), kỳ lương (paycheck.ts), Telegram bot
│   │   └── types.ts              # Type-safe contract chung giữa Backend, Android và Web
│   ├── migrations/               # D1 Database Migrations (0001_initial_schema.sql)
│   ├── schema.sql                # Bản tra cứu nhanh cấu trúc SQLite
│   └── wrangler.jsonc            # Cấu hình Cloudflare Worker, AI model & D1 bindings
│
├── 💻 frontend/                  # Ứng dụng Quản trị Web Desktop (React 18 + Vite + TS + Tailwind)
│   ├── src/
│   │   ├── api/client.ts         # Axios client tích hợp mã PIN phiên làm việc
│   │   ├── pages/                # DashboardPage, AiAdvisorPage, MultiMonthComparePage, AccountsPage
│   │   ├── context/ThemeContext  # Quản lý 2 Theme: Tối gốc (Ocean) & Sáng (GitHub Light)
│   │   └── components/           # Sidebar, Navbar, ThemeSelector, PinLockScreen
│   └── wrangler.jsonc            # Cấu hình triển khai Cloudflare Assets/Pages
│
├── 📚 docs/                      # Tài liệu Kỹ thuật & Quản trị Dự án
│   ├── adr/                      # Bản ghi quyết định kiến trúc (ADR 0001 - 0006)
│   ├── plans/                    # Kế hoạch thực thi chi tiết của từng Phase (1 - 5)
│   ├── architecture.md           # Sơ đồ kiến trúc tổng thể, luồng dữ liệu & toàn vẹn số dư
│   ├── backlog.md                # Lộ trình sản phẩm & trạng thái hoàn thành các tính năng (P0 - P3)
│   └── retro.md                  # Đánh giá sau các đợt phát hành & bài học kinh nghiệm
│
├── 🧭 GEMINI.md                  # Hiến pháp tối cao & Hướng dẫn dành cho AI Agent
├── 📖 README.md                  # Giới thiệu tổng quan & hướng dẫn khởi chạy dự án
└── 🚀 start.sh                   # Script khởi động nhanh Web Dashboard cục bộ (port 5173)
```

