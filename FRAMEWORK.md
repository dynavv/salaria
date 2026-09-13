# 📐 Salaria Engineering & Product Framework
> Bản chuẩn hóa quy trình phát triển và vận hành cho dự án Salaria — Từ ý tưởng, kiến trúc, quản trị backlog đến triển khai.

---

## 0. Problem Statement (Bài Toán Cốt Lõi)
- **Problem (Vấn đề cần giải quyết)**:
  1. Thói quen ghi chép tài chính cá nhân thủ công thường thất bại sau 1–2 tuần vì ma sát nhập liệu quá lớn.
  2. "Bẫy tính chi tiêu 2 lần" (Double Counting): Khi rút tiền mặt tại ATM, các ứng dụng thông thường tính nhầm thành một khoản chi tiêu, sau đó chi tiêu tiền mặt lại bị tính thêm lần nữa.
  3. Dòng tiền bị phân mảnh giữa nhiều tài khoản ngân hàng, ví điện tử (MSB, MoMo, ZaloPay...) và tiền mặt.
- **Target User**: Cá nhân muốn kiểm soát tài chính tự động 100%, kỷ luật theo quy tắc 50/30/20 và hạn mức an toàn mỗi ngày.
- **Success Metric**:
  - Tự động hóa bóc tách 100% biến động số dư ngân hàng qua Android Service trong < 0.3s.
  - Số dư giữa các ví/tài khoản trên Salaria khớp 100% với tài khoản ngân hàng thực tế.
  - Tỷ lệ hoàn tác (Undo) và phân loại đúng danh mục đạt ≥ 95%.
- **Non-goals**:
  - Không xây dựng mạng xã hội hay chia sẻ chi tiêu nhóm (tập trung 100% tài chính cá nhân độc lập).
  - Không duy trì bot phụ thuộc bên thứ ba (loại bỏ dần Telegram Bot và MacroDroid để chuẩn hóa về Native Mobile + Desktop Web).

---

## I. Brainstorm & MoSCoW Prioritization
- **Must Have (Bắt buộc phải có)**:
  - Bắt thông báo ngân hàng 24/7 chạy ngầm tầng OS (`BankNotificationListener`).
  - Hàng đợi ngoại tuyến (Offline Queue) lưu trong Room Database khi mất mạng, tự đồng bộ khi online.
  - Động cơ AI phân loại 3 tầng (`WorkersAIAdapter` trên Cloudflare Edge).
  - Bảo toàn tính toàn vẹn số dư cho giao dịch chuyển tiền nội bộ & rút tiền ATM.
  - Dashboard phân tích dòng tiền chuyên sâu trên Web (50/30/20 & Latte Factor).
- **Should Have (Nên có)**:
  - Thông báo tổng kết chi tiêu mỗi tối lúc 22h30 (`DailySummaryWorker`).
  - Dropdown chọn tháng và kỳ lương linh hoạt trên điện thoại.
  - Chế độ sáng chuẩn GitHub Light cho Web App.
  - Phản hồi chat giàu ngữ cảnh với hạn mức an toàn tức thời.
- **Could Have (Có thể bổ sung sau)**:
  - Dự báo dòng tiền cuối tháng bằng mô hình học máy cục bộ.
  - Xuất báo cáo tài chính định dạng Excel/CSV.
- **Won't Have (Loại bỏ / Không làm)**:
  - Giữ lại 5 bộ theme tối màu cồng kềnh (thu gọn về Dark gốc + GitHub Light).
  - Các mock endpoint của Telegram Bot.

---

## II. Planning System Architecture
### 2.1 High-Level Architecture
- **Mobile Client**: Native Android (Kotlin, Jetpack Compose, Room Database, WorkManager, NotificationListenerService).
- **Edge Backend**: Cloudflare Workers (Full-Stack Router, Workers AI Dual-Model Engine).
- **Database**: Cloudflare D1 (Serverless SQLite trên toàn cầu).
- **Desktop Web Client**: React 18, Vite, TypeScript, Tailwind CSS, Recharts.
- **Data Flow Detail**: Xem chi tiết tại [docs/architecture.md](file:///home/dynav/Documents/antigravity/Salarini/docs/architecture.md).

### 2.2 Key Architecture Decision Records (ADRs)
Mọi quyết định kiến trúc cốt lõi được lưu trữ tại `docs/adr/`:

| ADR ID | Tiêu đề | Lựa chọn | Lý do cốt lõi |
|---|---|---|---|
| [ADR-0001](file:///home/dynav/Documents/antigravity/Salarini/docs/adr/0001-cloudflare-d1-edge-db.md) | Database Engine | Cloudflare D1 (SQLite) | Serverless, chi phí 0đ, độ trễ Edge < 15ms |
| [ADR-0002](file:///home/dynav/Documents/antigravity/Salarini/docs/adr/0002-dual-ai-workers-engine.md) | AI Inference Engine | Dual-Model: Llama 3.1 8B + Gemma 4 26B | Phân tách bóc tách siêu tốc vs cố vấn sâu |
| [ADR-0003](file:///home/dynav/Documents/antigravity/Salarini/docs/adr/0003-native-android-with-room-sync.md) | Mobile Platform | Native Kotlin + Jetpack Compose | Can thiệp sâu tầng OS nghe thông báo 24/7 |
| [ADR-0004](file:///home/dynav/Documents/antigravity/Salarini/docs/adr/0004-blackbox-telemetry-over-firebase.md) | Telemetry & Logging | AppLogger ➜ D1 `system_logs` | Độc lập, bảo mật riêng tư, không cần Firebase |
| [ADR-0005](file:///home/dynav/Documents/antigravity/Salarini/docs/adr/0005-backend-language-evolution-js-to-ts.md) | Ngôn ngữ Backend | JS (MVP) ➜ TypeScript (Production) | Type-safe đồng bộ với Kotlin Android & React TS |

---

## III. Backlog & Prioritization (P0 – P3)
### Phân loại mức độ ưu tiên
- **🔴 P0 (Critical / Blocker)**: Sập app, sai lệch hoặc mất mát số dư tiền bạc, sập API, nghẽn luồng bắt thông báo ➜ **Sửa ngay lập tức (Hotfix)**.
- **🟡 P1 (Important / Next Release)**: Lỗi hiển thị tràn chữ, thiếu dropdown chọn tháng, trải nghiệm thao tác chưa tối ưu.
- **🟢 P2 (Enhancement / Polish)**: Theme GitHub Light, Rich chat response, thông báo 22h30.
- **⚪ P3 (Housekeeping / Refactoring)**: Tách file module Backend, chuyển sang TypeScript, dọn rác database.

> Danh sách công việc chi tiết được duy trì tại: [docs/backlog.md](file:///home/dynav/Documents/antigravity/Salarini/docs/backlog.md).

---

## III.5 Implementation Planning (Cầu Nối Giữa Backlog và Code)
> *Quy tắc tối thượng: Không bao giờ gõ dòng code nào nếu chưa có Implementation Plan được duyệt.*

Trước khi bắt tay vào triển khai một Task từ Backlog:
1. Tạo file kế hoạch: `docs/plans/YYYY-MM-DD-<task-name>.md`.
2. Xác định rõ:
   - Danh sách file can thiệp (`[MODIFY]`, `[NEW]`, `[DELETE]`).
   - Trình tự thực hiện (Dependencies first).
   - Kịch bản kiểm thử (Verification commands, Compose preview, API test).
   - Phương án hoàn tác (Rollback plan).
3. Được người dùng xác nhận và đồng thuận trước khi can thiệp mã nguồn.

---

## IV. Development Workflow
### 4.1 Chuẩn Ngôn Ngữ & Type-Safety
- **Android**: 100% Kotlin với Jetpack Compose, strict type-safe.
- **Web**: React 18 + TypeScript (`.tsx`).
- **Backend**: Cloudflare Worker (chuẩn hóa chuyển dịch sang TypeScript `.ts`).
- **Shared Contracts**: Schema dữ liệu phải khớp 100% giữa SQLite D1, Retrofit API và React Client.

### 4.2 AI Agent Rules (`GEMINI.md`)
Mọi AI trợ lý làm việc trong repository này bắt buộc phải tuân thủ [GEMINI.md](file:///home/dynav/Documents/antigravity/Salarini/GEMINI.md):
- **Forbidden Actions (Hành động cấm kỵ)**:
  - Cấm tự ý thay đổi DB schema, migration hoặc chạy lệnh `DROP TABLE`.
  - Cấm tự ý sửa đổi logic xác thực (`API_KEY`, `MASTER_PIN`).
  - Cấm tự tiện xóa file hoặc xóa dữ liệu thực tế.
  - Cấm sửa code vặt khi người dùng báo lỗi P1-P3 (phải ghi vào Backlog).
- **Feedback Loop**: Luôn kiểm tra kết quả trên môi trường Preview/Local trước khi đóng gói.

### 4.3 Testing Strategy (Kim Tự Tháp Kiểm Thử)
- **Unit Tests (Core Logic)**:
  - Kiểm thử bộ phân tách số tiền Regex (`parseMoneyAndNote`).
  - Kiểm thử hàm tính chu kỳ lương (`PaycheckCycleHelper`).
- **Local Simulation**:
  - Android: Xem trước tức thì qua Jetpack Compose `@Preview` (không build APK liên tục).
  - Backend: Chạy cục bộ qua `npx wrangler dev --local` với RAM D1 Database.

---

## V. Deployment & Operations
- **Mobile**: Đóng gói Release APK, cài đặt trực tiếp lên thiết bị Android.
- **Edge Backend**: `npx wrangler deploy` đẩy lên mạng lưới toàn cầu Cloudflare.
- **Web App**: `npm run build` tạo static SPA và deploy qua Cloudflare Pages/Worker.
- **Monitoring & Telemetry**: Xem trực tiếp nhật ký từ bảng `system_logs` trên D1 hoặc màn hình Settings trên app.

---

## VII. Definition of Done (DoD)
Một tính năng chỉ được đánh dấu là **Hoàn tất (Done)** khi:
- [ ] Giao diện hiển thị trọn vẹn, co giãn tốt trên màn hình hẹp, không bị tràn chữ.
- [ ] Tính toàn vẹn số dư được kiểm tra: Giao dịch tạo, sửa, xóa đều hoàn tác chính xác số dư tài khoản.
- [ ] Không làm phát sinh lỗi hồi quy (Regression bugs) ở các tính năng cũ.
- [ ] Tài liệu `docs/backlog.md` được cập nhật trạng thái tương ứng.
