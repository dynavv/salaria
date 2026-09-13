# 💎 Salaria

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20Web%20%7C%20Cloudflare-blue?style=for-the-badge&logo=android" alt="Platform">
  <img src="https://img.shields.io/badge/Backend-Cloudflare%20Workers%20%28TypeScript%29-F38020?style=for-the-badge&logo=cloudflare">
  <img src="https://img.shields.io/badge/Database-Cloudflare%20D1%20%28Edge%20SQLite%29-4285F4?style=for-the-badge&logo=sqlite">
  <img src="https://img.shields.io/badge/AI-Gemma%204%2026B%20%7C%20Llama%203.2-8E44AD?style=for-the-badge">
  <img src="https://img.shields.io/badge/License-GPL--3.0--or--later-green?style=for-the-badge" alt="License">
</p>

> An automated personal finance companion that captures your bank alerts in real time — keeping you on budget without the chore of manual logging.

<p align="center">
  <img src="docs/assets/dashboard_overview.png" alt="Salaria Modern Fintech Dashboard" width="100%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
</p>

---

## 🌟 Tính Năng Nổi Bật (Key Features)

### 1. 📱 Lắng Nghe Biến Động Số Dư Ngân Hàng 24/7 & AI Chat Logging
- **Real-Time Bank Notification Auto-Capture**: Tự động bắt biến động số dư tức thì 24/7 chạy ngầm tầng OS trực tiếp qua **Salaria Native Android App** (*MSB DigiBank, ZaloPay, Google Wallet, HSBC, Vietcombank, Techcombank, VPBank, TPBank, MoMo...*).
- **Title-First Smart Ingestion**: Cơ chế lọc tiền thông minh từ tiêu đề thông báo kết hợp bộ lọc tự động thử lại khi thông báo bị che (`RetryScanReceiver`).
- **Phân loại AI Đa Tầng (3-Tier Engine)**:
  - **Tầng 1 (0ms Word-Boundary Regex)**: Khớp từ khóa chuẩn từ danh mục với cơ chế chống va chạm từ con.
  - **Tầng 2 (Cloudflare Workers AI - Llama 3.2 3B)**: Bóc tách ngữ cảnh món ăn, quán xá, thương hiệu trên mạng GPU Edge siêu tốc (< 0.2s).
  - **Tầng 3 (Data Safety Fallback)**: Giữ trạng thái an toàn `Chưa phân loại` (`category_id = NULL`) với các giao dịch mơ hồ hoặc chuyển khoản không rõ nội dung.
- **Zero-Latency In-App AI Chat**: Ghi chép thu chi siêu tốc bằng ngôn ngữ tự nhiên (`35k cafe`, `-45k cơm trưa`, `+15tr lương cty`, `rút 500k atm`). Bộ nhớ đệm phiên Chat 0ms (`ChatManager`), hỗ trợ cử chỉ vuốt để trích dẫn giao dịch và lệnh hoàn tác nhanh `/undo`.

### 2. 📊 Bảng Điều Khiển Tài Chính Fintech 2026 (Modern Dashboard)
- **Financial Health Score Gauge (0 - 100)**: Vòng đo sức khỏe tài chính tính toán theo thời gian thực dựa trên tỷ lệ tích lũy và cấu trúc chi tiêu.
- **Daily Burn Rate & Month-End Projection**: Đo lường tốc độ "đốt tiền" trung bình mỗi ngày và dự báo tổng chi tiêu cuối tháng.
- **Safe Daily Spending**: Hạn mức chi tiêu an toàn còn lại mỗi ngày để đảm bảo hoàn thành mục tiêu tiết kiệm ≥ 20%.
- **Biểu đồ cột tương tác (Interactive Daily Spending)**: Tự động đổi màu theo mức độ chi (Xanh = Dưới TB, Cam = Vượt TB, Đỏ = Đột biến), tương tác trực tiếp để kiểm tra chi tiết từng ngày.
- **Đo lường Quy tắc 50/30/20 & Chu kỳ kỳ lương**: Theo dõi 3 trụ cột: *50% Thiết yếu (Needs)*, *30% Linh hoạt (Wants)*, *20% Tích lũy (Savings)* khớp theo ngày nhận lương thực tế (`PaycheckCycleHelper`).

### 3. 🧠 Cố Vấn Tài Chính AI & Phân Tích Hiệu Ứng Latte (AI Advisor)
- Tự động phát hiện và cảnh báo các khoản chi nhỏ lẻ (`≤ 60.000₫`) tích tụ hàng tháng gây thất thoát dòng tiền (Hiệu ứng Latte).
- Cố vấn AI thông minh hỗ trợ giải đáp chiến lược ngân sách, gợi ý phương án cắt giảm chi phí và tính toán dòng tiền qua mô hình suy luận sâu **Cloudflare Workers AI (Gemma 4 26B)**.

<p align="center">
  <img src="docs/assets/ai_financial_advisor.png" alt="Salaria AI Financial Advisor" width="100%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
</p>

### 4. 📈 So Sánh Biến Động Đa Tháng & Báo Cáo Định Kỳ
- Theo dõi xu hướng tăng giảm thu chi và dòng tiền thặng dư giữa các tháng (MoM - Month over Month).
- Tự động tạo thông báo tổng kết chi tiêu mỗi tối lúc 22h30 qua Android WorkManager (`DailySummaryWorker`).

<p align="center">
  <img src="docs/assets/multi_month_compare.png" alt="Salaria Multi-Month Comparison" width="100%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
</p>

### 5. 🎨 Bộ Sưu Tập 5 Theme Modern 2026 & Bảo Mật Session PIN
- 🌌 **Midnight Cyber (Mặc định)**: Nền Slate đen bóng, viền xanh ngọc Emerald & Cyan công nghệ.
- 🔮 **Neon Tokyo (Cyberpunk)**: Nền tím thẫm OLED, dạ quang Electric Violet & Cyber Pink tương lai.
- 🌲 **Nordic Forest**: Nền rêu thông Bắc Âu, kính mờ Sage Glass dịu mắt và thư thái.
- 🌊 **Oceanic Sapphire**: Nền xanh biển sâu Cobalt, viền xanh băng Ice Cyan phong cách Fintech.
- ☕ **Espresso Gold**: Nền Mocha trầm ấm, điểm xuyết ánh vàng kim Champagne Gold sang trọng.
- 🔒 **Khóa Bảo Mật Session PIN**: Tự động khóa bảo vệ dữ liệu khi đóng tab trình duyệt; hỗ trợ tùy biến mã PIN quản trị viên linh hoạt.

---

## 🏗️ Kiến Trúc Hệ Thống (System Architecture)

```mermaid
flowchart TD
    subgraph Mobile ["📱 Thiết Bị Di Động (Native Android App - Jetpack Compose)"]
        BankNoti["🔔 Thông báo Ngân hàng<br/>(MSB, ZaloPay, Google Wallet, VCB, MoMo...)"]
        Listener["🎧 BankNotificationListener<br/>(Dịch vụ ngầm tầng OS 24/7, Title-First Filter)"]
        Room["💾 Room DB Offline Queue<br/>(Bộ nhớ đệm giao dịch khi mất mạng)"]
        WorkMgr["⏰ WorkManager Engine<br/>(Auto-Sync khi có mạng & Digest 22h30)"]
        ComposeUI["🎨 Jetpack Compose UI<br/>(Sổ thu chi, AI Chat 0ms Cache, Dashboard)"]
        
        BankNoti --> Listener
        Listener -->|Offline / Mất mạng| Room
        Room -.->|Khi có mạng trở lại| WorkMgr
        ComposeUI <--> Room
    end

    subgraph Cloudflare ["☁️ Cloudflare Serverless Edge 24/7 (100% Cloud-Native)"]
        Worker["⚡ Cloudflare Worker Backend<br/>(Modular TypeScript REST API)"]
        
        subgraph AI_Engine ["🧠 3-Tier Edge AI Parser Engine"]
            Regex["1. Word-Boundary Regex (0ms)"]
            Llama["2. Workers AI: Llama 3.2 3B (<0.2s)<br/>(Context & Merchant Brand Extraction)"]
            Fallback["3. Data Safety Unassigned Fallback"]
            Regex --> Llama --> Fallback
        end
        
        subgraph Deep_AI ["🔬 Deep Financial Reasoning Engine"]
            Gemma["Workers AI: Gemma 4 26B<br/>(Cố vấn 50/30/20, Latte Factor & MoM Analytics)"]
        end
        
        D1[("🗄️ Cloudflare D1 Database<br/>(salarini-db - Serverless Relational DB)")]
        Telemetry["📋 Blackbox Telemetry & Audit Logs<br/>(Ghi nhật ký Ingest & Debug)"]
        
        Worker --> AI_Engine
        Worker <--> Deep_AI
        AI_Engine --> D1
        Worker --> Telemetry
    end

    subgraph WebClient ["💻 Bảng Điều Khiển Máy Tính (Modern Desktop Web)"]
        ReactUI["⚛️ Salaria Web App (React 18 + Vite + Tailwind CSS)<br/>(Dashboard toàn cảnh, Cố vấn AI, Bộ 5 Theme Fintech, Session PIN Lock)"]
    end

    Listener -->|HTTPS Ingest API| Worker
    WorkMgr -->|Đẩy giao dịch tồn đọng| Worker
    ReactUI <-->|REST API + PIN Auth| Worker
```

---

## 📂 Cấu Trúc Thư Mục Chuẩn Hóa (Project Structure)

```text
Salarini/
├── 📄 GEMINI.md              # 🧭 Hiến pháp AI Agent: Bản đồ mã nguồn, triage P0/P3, hành động cấm kỵ
├── 📄 FRAMEWORK.md           # 📐 Khung kỹ nghệ phát triển phần mềm chuẩn mực từ ý tưởng đến triển khai
├── 📄 README.md              # 🌟 Mặt tiền dự án & hướng dẫn kiến trúc vận hành
├── 📁 android/               # 📱 Native Android App (Kotlin, Jetpack Compose, Room DB, WorkManager)
│   ├── app/src/main/java/    # Kiến trúc dịch vụ ngầm 24/7, UI Components và DataStore
│   └── build.gradle.kts      # Cấu hình Gradle nạp biến an toàn từ local.properties
├── 📁 backend/               # ☁️ Cloudflare Worker REST API & D1 SQLite Database
│   ├── src/                  # Mã nguồn TypeScript Modular (routes, services, AI engine, telemetry)
│   ├── migrations/           # D1 SQL Migrations (0001 schema, 0002 daily summaries)
│   └── wrangler.jsonc        # Cấu hình binding Worker D1, AI và Assets
├── 📁 frontend/              # 💻 React 18 + Vite + Tailwind CSS Desktop Web App
│   ├── src/                  # Dashboard, AI Advisor, Analytics, Theme Engine & PIN Screen
│   └── vite.config.ts        # Vite proxy và tối ưu bundle build
└── 📁 docs/                  # 🧠 Trung tâm tri thức & quản trị kỹ nghệ
    ├── 📄 architecture.md    # 🗺️ Bản đồ luồng dữ liệu chi tiết
    ├── 📄 feature-map.md     # 🗺️ Ma trận tính năng & file liên đới
    ├── 📄 backlog.md         # 📋 Danh sách công việc P0 - P3 (Chuẩn MoSCoW)
    ├── 📁 plans/             # 📑 Kế hoạch thực thi chi tiết các tính năng
    └── 📁 adr/               # 🏛️ Architecture Decision Records (Lưu các quyết định kỹ thuật cốt lõi)
```

---

## 💬 Cú Pháp Ghi Chép Nhanh Bằng Ngôn Ngữ Tự Nhiên (Natural Language Logging)

Người dùng có thể nhập trực tiếp tại thanh nhập liệu **AI Chat** trên ứng dụng Android hoặc Web Dashboard:

| Nhu cầu ghi chép | Cú pháp ví dụ | Cơ chế phân loại & Kết quả |
|---|---|---|
| **Chi tiêu cơ bản** | `35k cafe` hoặc `45k com trua` | Tự động gán `-35.000₫` vào `[Ăn uống]` (0ms Regex) |
| **Thương hiệu / Địa điểm** | `180k Haidilao Landmark` | Llama 3.2 tự bóc tách `Haidilao` và gán vào `[Ăn uống]` (<0.2s) |
| **Ứng dụng / Dịch vụ** | `1200k ELSA Speak goi 1 nam` | Llama 3.2 nhận diện `ELSA Speak` và gán vào `[Học tập]` |
| **Chuyển tiền / Rút tiền** | `rút 500k atm` hoặc `chuyển 2tr cho vợ` | Tự nhận diện giao dịch luân chuyển ví (`transfer`), bảo toàn tổng số dư |
| **Thu nhập** | `+15tr luong cty` hoặc `500k thuong kpi` | Tự gán `+15.000.000₫` vào `[Thu nhập]` |
| **Hoàn tác siêu tốc** | `/undo` hoặc `/xoa` | Xóa ngay giao dịch vừa ghi nhận mà không cần mở sổ chi tiêu |

---

## 🚀 Hướng Dẫn Cài Đặt & Triển Khai (Quickstart Guide)

### 1. Yêu Cầu Môi Trường
- **Node.js**: Phiên bản 18 trở lên (`node -v`).
- **Android Studio / SDK**: Để biên dịch ứng dụng di động Android.
- **Tài khoản Cloudflare**: Sử dụng Cloudflare Workers, D1 Database và Workers AI miễn phí.

### 2. Triển Khai Cloudflare Worker & D1 Database
1. Mở Terminal tại thư mục `backend/`:
   ```bash
   cd backend
   npx wrangler login
   ```
2. Tạo cơ sở dữ liệu D1 phân tán trên Cloudflare Edge:
   ```bash
   npx wrangler d1 create salarini-db
   ```
3. Khởi tạo cấu trúc bảng dữ liệu:
   ```bash
   npx wrangler d1 execute salarini-db --remote --file=schema.sql
   npx wrangler d1 execute salarini-db --remote --file=migrations/0002_add_daily_summaries.sql
   ```
4. Cấu hình biến bí mật qua Cloudflare Secrets (Không lưu cứng trong Git):
   ```bash
   printf 'YOUR_API_KEY' | npx wrangler secret put API_KEY
   printf 'YOUR_MASTER_PIN' | npx wrangler secret put MASTER_PIN
   ```
5. Deploy Worker lên Cloudflare:
   ```bash
   npx wrangler deploy
   ```

### 3. Khởi Chạy Desktop Web App
Tại thư mục gốc dự án:
```bash
chmod +x start.sh
./start.sh
```
Trình duyệt sẽ tự động mở trang quản trị tại: **`http://localhost:5173`**

### 4. Cài Đặt Ứng Dụng Android Native
1. Mở dự án thư mục `android/` bằng Android Studio hoặc biên dịch file APK:
   ```bash
   cd android && ./gradlew assembleDebug
   ```
2. Cài đặt file APK lên thiết bị và cấp quyền **Notification Listener (Truy cập thông báo)** để ứng dụng tự động ghi nhận giao dịch 24/7 từ các ứng dụng ngân hàng.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **Native Mobile App**: Android Native (Kotlin 2.0, Jetpack Compose, Room DB, WorkManager, NotificationListenerService).
- **Backend Edge**: Cloudflare Workers (Full-Stack TypeScript REST API, zero cold start).
- **Database**: Cloudflare D1 (Serverless SQLite phân tán toàn cầu).
- **Edge AI Models**:
  - Phân loại giao dịch: `@cf/meta/llama-3.2-3b-instruct`
  - Cố vấn tài chính sâu: `@cf/google/gemma-4-26b-a4b-it`
- **Desktop Web App**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons.

---

## 📄 Bản Quyền & Giấy Phép (License)

Dự án được phát hành dưới giấy phép mã nguồn mở Copyleft **[GNU General Public License v3.0 (GPLv3)](LICENSE)**.
