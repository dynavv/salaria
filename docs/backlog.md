# 📋 Salaria — Product Backlog & Engineering Roadmap

Tài liệu này theo dõi toàn bộ các hạng mục công việc cần làm, được phân cấp theo tiêu chuẩn **P0 – P3** và mức độ ưu tiên **MoSCoW**.

---

## 🚦 Trạng Thái Tổng Thể: 🟢 HOÀN TẤT TRIỂN KHAI PHASE 5 (v1.5)
> **Mục tiêu đạt được**: Triển khai Bộ nhớ đệm phiên (`ChatManager`) triệt tiêu hoàn toàn độ trễ và không reload API khi chuyển tab Nhập AI; Hỗ trợ tương tác toàn diện trên tin nhắn AI: mở Popup BottomSheet sửa/xóa trực tiếp (`✏️ Sửa`), thanh ghim trích dẫn (`QuoteBar`), và hỗ trợ trích dẫn giao dịch cũ để chỉnh sửa số tiền / danh mục / hoàn tác bằng ngôn ngữ tự nhiên (`↩ Trích dẫn`).


---

## 🔴 MỨC P0: TÍNH TOÀN VẸN DỮ LIỆU & GIAO DỊCH CHUYỂN TIỀN (MUST HAVE)
> *Các hạng mục ảnh hưởng trực tiếp đến tính đúng đắn của tiền bạc và số dư database.*

- [x] **[P0-01] Sửa logic hoàn tác số dư hai chiều cho giao dịch `transfer`**
  - **Vị trí**: [backend/src/routes/transactions.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/transactions.ts)
  - **Mô tả**: Sửa triệt để PUT & DELETE: hoàn tác cả số dư `account_id` nguồn và `destination_account_id` đích chuẩn xác 100%.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.1 & v1.3 TS)**.

- [x] **[P0-02] Tự động nhận diện Rút tiền ATM thành transfer nội bộ (Luồng thông báo ngân hàng)**
  - **Vị trí**: [backend/src/routes/ingest.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/ingest.ts)
  - **Mô tả**: Tự động bóc tách từ khóa rút tiền ATM từ thông báo ngân hàng thành `type = 'transfer'`, trừ `acc_bank`, cộng `acc_cash` và loại khỏi chi tiêu tháng.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.1 & v1.3 TS)**.

- [x] **[P0-03] Tự động nhận diện Rút tiền ATM khi nhập qua Chat tự nhiên (Hỗ trợ tiếng Việt có dấu & ép nguồn `acc_bank` ➔ `acc_cash`)**
  - **Vị trí**: [backend/src/routes/ingest.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/ingest.ts) & [ChatScreen.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/ChatScreen.kt)
  - **Mô tả**:
    1. Chuẩn hóa `normalizeText()` trước khi kiểm tra Regex để nhận diện trọn vẹn văn bản tiếng Việt có dấu ("rút", "tiền mặt").
    2. Nâng cấp Regex linh hoạt với cú pháp chat: `"rút 500k atm"`, `"rút tiền atm 2tr"`, `"vừa rút 1tr ở cây atm"`, `"rút tiền mặt 1 triệu"`.
    3. Tự động ép tài khoản nguồn `accountId = 'acc_bank'` (thay vì mặc định `acc_cash` của chat) và đích `destinationAccountId = 'acc_cash'`.
    4. Trả về tên danh mục `Chuyển tiền nội bộ (Rút ATM)` và hiển thị giao diện thẻ màu xanh chuyển khoản `⇄` trên ChatScreen.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.2 & v1.3 TS)**.

- [x] **[P0-04] Cơ chế Chống trùng lặp kép (Double Deduplication Layer) & Phục hồi số dư thực tế D1**
  - **Vị trí**: [backend/src/routes/ingest.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/ingest.ts) & [BankNotificationListener.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/service/BankNotificationListener.kt)
  - **Mô tả**:
    1. Xóa 2 bản ghi bị trùng trên D1 (`tx_1788584598080_8fbnj` 400k chi tiêu sai và `tx_1788584744452_w0c76` 20k ZaloPay) để khôi phục +420.000 ₫ cho `acc_bank`.
    2. Android: Cache hash thông báo trong 60s bằng `ConcurrentHashMap` để chặn các lần trigger lặp lại từ hệ điều hành.
    3. Backend: Idempotency check theo mã tham chiếu ngân hàng (RRN / ZP) trong 24h hoặc `amount` + `account_id` + `raw_text` trong vòng 120s.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.4)**.

---

## 🟡 MỨC P1: NÂNG CẤP UI/UX NATIVE ANDROID APP (SHOULD HAVE)
> *Các cải tiến giao diện di động đã được phát hiện qua thực tế sử dụng.*

- [x] **[P1-01] Fix lỗi hiển thị tràn chữ thanh thời gian & Dropdown chọn tháng/kỳ lương cũ**
  - **Vị trí**: [TransactionsScreen.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/TransactionsScreen.kt)
  - **Khắc phục**: Chuyển nút Kỳ lương sang 2 dòng co giãn linh hoạt (không tràn chữ); Nút Tháng tích hợp `DropdownMenu` danh sách các tháng từ API.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.1)**.

- [x] **[P1-02] Tối ưu trải nghiệm Popup Sửa & Xóa giao dịch**
  - **Vị trí**: [EditTransactionBottomSheet.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/components/EditTransactionBottomSheet.kt)
  - **Khắc phục**: Bật `skipPartiallyExpanded = true` mở bung toàn màn hình; đưa nút thùng rác đỏ `🗑️` lên Top Bar góc phải; dưới đáy dành trọn cho nút lớn `[ Lưu thay đổi ]`.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.1)**.

- [x] **[P1-03] Bổ sung tab "Chuyển tiền nội bộ (⇄)" trên Android App**
  - **Vị trí**: [EditTransactionBottomSheet.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/components/EditTransactionBottomSheet.kt)
  - **Mô tả**: Bổ sung tab thứ 3 bên cạnh `Khoản chi (-)` và `Khoản thu (+)` hỗ trợ giao dịch chuyển tiền nội bộ.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.1)**.

- [x] **[P1-04] Tinh chỉnh UI Theme Web: Đổi nhãn "Dark gốc" & Khắc phục độ tương phản GitHub Light**
  - **Vị trí**: `frontend/src/components/ThemeSelector.tsx`, `frontend/src/index.css`, `frontend/src/pages/DashboardPage.tsx`
  - **Nội dung công việc**:
    1. Đổi nhãn nút chuyển theme từ `"Dark gốc"` sang tên gọi UI chuẩn mực: `"Chế độ Tối"` (🌙) và `"Chế độ Sáng"` (☀️).
    2. Sửa lỗi tương phản chữ đen trên nền tối của các nút active (`Mới nhất`, `Theo ngày`) trong chế độ GitHub Light: chuyển `bg-slate-700` khi active thành nền trắng `#ffffff` chữ đen đậm `#1f2328`, viền `#d0d7de` (chuẩn segmented control).
    3. Làm sáng khối Hero Banner "Sức Khỏe Tài Chính" và thanh chọn chế độ xem Kỳ lương / Tháng sang nền sáng đồng bộ toàn trang.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.2)**.

- [x] **[P1-05] Loại bỏ thẻ HTML trên Android Notification (Format văn bản thuần với ngắt dòng \n)**
  - **Vị trí**: [NotificationHelper.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/service/NotificationHelper.kt)
  - **Mô tả**: Thay thế chuỗi HTML thô (`<b>`, `<br/>`, `<i>`) bằng text thuần với ngắt dòng `\n` và emoji trực quan để thanh thông báo Android hiển thị sạch đẹp.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.4)**.

- [x] **[P1-06] Mở rộng nhận diện rút ATM liên minh ngân hàng (Từ khóa "Rut tien SML", "Napas")**
  - **Vị trí**: [backend/src/routes/ingest.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/ingest.ts)
  - **Mô tả**: Bổ sung từ khóa `rut tien sml`, `rut sml`, `napas` vào regex nhận diện ATM để tự động chuyển thành giao dịch `transfer` nội bộ.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.4)**.

- [x] **[P1-07] Bộ nhớ đệm phiên (`ChatManager`) & Khởi tạo vị trí cuộn — Chấm dứt reload & cuộn giật khi chuyển tab**
  - **Vị trí**: `android/app/src/main/java/com/salaria/app/data/model/ChatManager.kt` & [ChatScreen.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/ChatScreen.kt)
  - **Mô tả**:
    1. Chuyển trạng thái lưu trữ tin nhắn sang Singleton `ChatManager` với cờ `isHistoryLoaded` và nạp dữ liệu nguyên tử (atomic `addAll`), chỉ gọi API 1 lần duy nhất khi khởi động.
    2. Khởi tạo `listState` ngay lập tức tại vị trí cuối cùng (`initialFirstVisibleItemIndex = maxOf(0, messages.size - 1)`).
    3. Loại bỏ việc kích hoạt `animateScrollToItem` khi chuyển tab (chỉ cuộn khi thực sự có tin nhắn mới tăng thêm trong phiên hoặc khi mở bàn phím). Chấm dứt hoàn toàn hiện tượng tuôn cuộn/chớp giật khi chuyển tab.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.5)**.

- [x] **[P1-08] Tương tác chỉnh sửa cử chỉ trực tiếp (Tap để Sửa, Nhấn giữ để Trích dẫn) & Tinh gọn giao diện**
  - **Vị trí**: [ChatScreen.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/ChatScreen.kt), [backend/src/routes/ingest.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/ingest.ts), [EditTransactionBottomSheet.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/components/EditTransactionBottomSheet.kt)
  - **Nội dung công việc**:
    1. **Loại bỏ 100% các nút thừa cồng kềnh**: Xóa bỏ hoàn toàn hàng nút `[ ✏️ Sửa ]` và `[ ↩ Trích dẫn ]` ở đáy thẻ cùng chip trích dẫn trên bong bóng, tiết kiệm 45dp chiều cao cho mỗi thẻ receipt.
    2. **Cử chỉ tương tác tự nhiên (`combinedClickable` + Haptic Feedback)**:
       - **Chạm 1 chạm (Click)** vào thẻ hóa đơn: Mở bung ngay `EditTransactionBottomSheet` để sửa số tiền, danh mục, tài khoản hoặc xóa giao dịch.
       - **Nhấn giữ (Long press)** vào bất kỳ tin nhắn nào (thẻ hóa đơn, tin nhắn người dùng, thông báo ngân hàng): Rung phản hồi haptic và ghim vào thanh trích dẫn `QuoteBar`.
    3. **Backend Command Interceptor với `quote_tx_id` / `target_tx_id`**: Tiếp nhận giao dịch trích dẫn và xử lý bằng ngôn ngữ tự nhiên: sửa số tiền/ghi chú, đổi danh mục, hoàn tác/xóa.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.5)**.


---

## 🟢 MỨC P2: TÍNH NĂNG NÂNG CAO & TINH GIẢN WEB APP (COULD HAVE)

- [x] **[P2-01] Thông báo tổng kết chi tiêu cuối ngày lúc 22h30 (Daily Spending Digest) & Đồng bộ Cloud D1 Chat History**
  - **Vị trí**: `android/app/src/main/java/com/salaria/app/worker/DailySummaryWorker.kt`, `NotificationHelper.kt`, `ChatScreen.kt`, `ChatManager.kt`, `backend/src/routes/ingest.ts`, `backend/migrations/0002_add_daily_summaries.sql`
  - **Mô tả**:
    1. Chạy ngầm định kỳ 22:30 mỗi tối qua Android `WorkManager` (100% cục bộ, không cần Firebase). Bắn thông báo tổng kết không bị lặp Title, làm tròn số nguyên tiền VND chuẩn xác.
    2. Đánh giá trạng thái tài chính thông minh dựa trên so sánh giữa chi tiêu hôm nay và hạn mức an toàn.
    3. Đồng bộ hóa bản tin tổng kết ngày lên Cloudflare D1 Database (`daily_summaries`) độc lập với bảng `transactions` (bảo toàn 100% tính toàn vẹn số dư).
    4. Tích hợp bản tin tổng kết vào luồng Lịch sử Chat (`GET /api/chat/history`), hiển thị thành **Thẻ Daily Digest Card** sang trọng trong tab Nhập AI (`ChatScreen`).
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.2 & v1.6 Cloud Sync)**.


- [x] **[P2-02] Phản hồi Chat giàu ngữ cảnh với hạn mức an toàn tức thời**
  - **Vị trí**: [backend/src/routes/ingest.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/ingest.ts), [Models.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/data/model/Models.kt), [ChatScreen.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/ChatScreen.kt)
  - **Nội dung thẻ**:
    ```text
    ✨ Ghi chép thành công: 🔴 -150.000 ₫ (Valve Software)
    🏷️ Danh mục: Giải trí & Dịch vụ (Gemma 4 26B)
    ━━━━━━━━━━━━━━━━━━━━
    📊 Đã tiêu kỳ này: 11.780.000 ₫ (Đã dùng 78% thu nhập)
    🛡️ Hạn mức an toàn còn lại: 180.000 ₫ / ngày (cho 17 ngày tới)
    ```
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.2 & v1.3 TS)**.

- [x] **[P2-03] Tinh giản hệ thống Theme Web: Giữ Dark gốc & Thêm GitHub Light Theme**
  - **Vị trí**: `frontend/src/index.css`, `ThemeContext.tsx`, `ThemeSelector.tsx`
  - **Mô tả**: Xóa bỏ các theme tối màu dư thừa, chuẩn hóa về 2 chế độ: Dark gốc (Ocean) + GitHub Light (`#ffffff`, `#f6f8fa`, `#d0d7de`, `#1f2328`, `#0969da`). Thay bằng nút gạt toggle: 🌙 / ☀️.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.2)**.

- [x] **[P2-04] Hoàn thiện Phân Tích So Sánh Đa Tháng (Multi-Month MoM Analytics)**
  - **Vị trí**: [backend/src/routes/analytics.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/analytics.ts) & [MultiMonthComparePage.tsx](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/pages/MultiMonthComparePage.tsx)
  - **Nội dung công việc**:
    - **Backend**: Truy vấn D1 tổng hợp chi tiêu theo từng tháng và danh mục, tính `categoryComparison` đầy đủ và chỉ số chênh lệch toàn diện **`overallMoM`** (Month-over-Month %).
    - **Frontend**: Kết nối API vào `MultiMonthComparePage.tsx`, kích hoạt biểu đồ cột nhóm và bảng chi tiết danh mục theo thời gian thực.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.2 & v1.3 TS)**.

- [x] **[P2-05] Lưu trữ trên Cloud D1 & Hiển thị 5-10 thông báo/phản hồi gần nhất trong tab Nhập AI**
  - **Vị trí**: [backend/src/routes/ingest.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/ingest.ts), [SalariaApi.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/data/api/SalariaApi.kt), [ChatScreen.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/ChatScreen.kt)
  - **Nội dung công việc**:
    - **Backend**: Cung cấp `GET /api/chat/history?limit=10` lấy các giao dịch gần nhất kèm thông báo gốc và kết quả AI.
    - **Android**: Tab Nhập AI tự động tải 5–10 thông báo/phản hồi mới nhất khi mở app để đối chiếu (lưu trữ trên Cloud D1, đổi máy không mất).
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.4)**.

---

## ⚪ MỨC P3: TÁI CẤU TRÚC KIẾN TRÚC & DỌN DẸP KỸ THUẬT (HOUSEKEEPING)
> *Đã hoàn tất sau khi toàn bộ hệ thống vận hành trơn tru.*

- [x] **[P3-01] Giải phẫu God File `cloudflare_worker.js` (2.209 dòng) thành các Module sạch**
  - **Cấu trúc mới**: `backend/src/` (`index.ts`, `routes/`, `services/`, `ai/`, `db/`, `utils/`).
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.3)**.

- [x] **[P3-02] Chuyển đổi Backend sang TypeScript nguyên bản**
  - Đồng bộ hợp đồng kiểu dữ liệu (Type-safe) giữa Android Kotlin, React TS và Cloudflare Worker qua `backend/src/types.ts`.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.3)**.

- [x] **[P3-03] Khởi tạo Cloudflare D1 Native Migrations (`backend/migrations/`)**
  - Tạo `0001_initial_schema.sql`, quản lý version DB chuẩn mực, chấm dứt việc chạy file SQL phẳng.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.3)**.

- [x] **[P3-04] Bảo tồn & Cô lập Kênh Dự phòng Telegram Bot**
  - Tuân thủ Điều 4.4 Hiến pháp Salaria, cô lập thành module độc lập `telegram_webhook.ts` và `telegram.ts` để làm kênh dự phòng an toàn.
  - **Trạng thái**: ✅ **Đã hoàn thành (v1.3)**.
