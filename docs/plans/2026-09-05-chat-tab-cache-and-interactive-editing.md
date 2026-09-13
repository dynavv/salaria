# 📋 Kế Hoạch Triển Khai: Bộ Nhớ Đệm Tab Nhập AI & Tương Tác Chỉnh Sửa Hai Chiều (v1.5)

## 🎯 1. Bối Cảnh & Mục Tiêu

1. **Khắc phục lỗi tải lại từ server khi chuyển tab**:
   - Khi người dùng chuyển đổi qua lại giữa các tab (*Tổng quan*, *Sổ thu chi*, *Nhập AI*), `ChatScreen` bị recompose và kích hoạt `LaunchedEffect(Unit)` gọi lại `GET /api/chat/history`.
   - **Mục tiêu**: Đưa danh sách chat và trạng thái tải vào bộ nhớ đệm phiên (`ChatManager`). Ứng dụng chỉ tải duy nhất 1 lần khi mở tab lần đầu tiên. Khi chuyển tab, hiển thị tức thì 0ms, không chớp nháy, không gọi server trừ khi người dùng bấm "Làm mới".

2. **Tương tác trực tiếp trên Thẻ giao dịch (Click to Edit)**:
   - Khi người dùng chạm vào Thẻ Hóa Đơn AI trong khung chat, mở ngay `EditTransactionBottomSheet` để sửa số tiền, đổi danh mục, đổi tài khoản hoặc xóa giao dịch (`🗑️`).
   - Cập nhật tức thời trạng thái thẻ trong chat sau khi lưu/xóa.

3. **Tính năng Trích dẫn (Quote to Edit bằng Ngôn ngữ Tự Nhiên)**:
   - Người dùng có thể nhấn giữ hoặc bấm nút Trả lời (`↩`) trên bất kỳ thông báo ngân hàng hoặc thẻ giao dịch cũ nào.
   - Xuất hiện thanh Trích dẫn (Quote Bar) phía trên ô nhập liệu.
   - Người dùng gõ lệnh tự nhiên (ví dụ: `"đổi sang ăn uống"`, `"sửa thành 30k"`, `"/undo"`, `"/xoa"`).
   - Backend tiếp nhận `quote_tx_id` (hoặc `target_tx_id`) và thực thi lệnh sửa đổi/xóa trực tiếp trên đúng giao dịch được trích dẫn đó (thay vì chỉ áp dụng cho giao dịch cuối cùng `lastTx`).

---

## 🛠️ 2. Các File Cần Thay Đổi

### A. Android App (`android/`)
1. **[NEW] `android/app/src/main/java/com/salaria/app/data/model/ChatManager.kt`**:
   - Quản lý danh sách `messages: SnapshotStateList<ChatMessage>`.
   - Biến cờ `isHistoryLoaded: Boolean` và `isLoadingHistory: Boolean`.
   - Hàm `loadHistory(api: SalariaApi, forceRefresh: Boolean = false)`: Chỉ gọi server khi `!isHistoryLoaded` hoặc `forceRefresh == true`.
   - Hàm `updateTransaction(...)` và `removeTransaction(txId: String)` để đồng bộ trạng thái khi người dùng sửa/xóa giao dịch.
2. **[MODIFY] `android/app/src/main/java/com/salaria/app/data/model/Models.kt`**:
   - Thêm `quoteTxId: String? = null` vào `IngestRequest`.
   - Thêm `targetTxId: String? = null` vào `ChatMessage`.
3. **[MODIFY] `android/app/src/main/java/com/salaria/app/ui/screens/ChatScreen.kt`**:
   - Sử dụng `ChatManager.messages` và `ChatManager.loadHistory()`.
   - Bổ sung state `editingTransaction: Transaction?` và tích hợp `EditTransactionBottomSheet` khi click vào thẻ giao dịch.
   - Bổ sung state `quotedMessage: ChatMessage?` và giao diện thanh Quote Bar phía trên ô nhập liệu kèm nút hủy trích dẫn `✕`.
   - Thêm icon Quote/Reply `↩` và sự kiện nhấn giữ trên `ChatBubble`.
   - Truyền `quoteTxId` khi gửi request sang `/api/ingest`.

### B. Cloudflare Edge Backend (`backend/src/routes/ingest.ts`)
1. **[MODIFY] `backend/src/routes/ingest.ts`**:
   - Trích xuất `const targetTxId = body.target_tx_id || body.quote_tx_id;` từ request body.
   - Khi có `targetTxId`:
     - Khi nhận lệnh hoàn tác (`/undo`, `/xoa`, `xóa`): Tìm và xóa đúng giao dịch `targetTxId`, hoàn tác số dư tài khoản của giao dịch đó.
     - Khi nhận lệnh đổi danh mục (ví dụ: `"ăn uống"`, `"nhà cửa"`): Cập nhật `category_id` cho đúng giao dịch `targetTxId` và học từ khóa từ note của giao dịch đó.
     - Khi nhận lệnh sửa số tiền / nội dung (ví dụ: `"sửa thành 30k"`, `"30k bún chả"`): Điều chỉnh số tiền chênh lệch vào số dư tài khoản và cập nhật note/amount cho `targetTxId`.
   - Triển khai Worker lên Cloudflare Edge bằng `npx --yes wrangler deploy`.

---

## 🧪 3. Kế Hoạch Kiểm Thử & Xác Minh (Verification Plan)

1. **Kiểm tra Backend Edge**:
   - Gửi request curl kiểm tra lệnh đổi danh mục với `target_tx_id`.
   - Gửi request curl kiểm tra lệnh hoàn tác với `target_tx_id`.
2. **Kiểm tra Android Native**:
   - Chạy lệnh Gradle biên dịch với JDK 21 (`./gradlew assembleDebug`).
   - Kiểm tra chuyển qua lại giữa các tab xem có bị reload từ server không.
   - Kiểm tra bấm vào thẻ giao dịch xem popup `EditTransactionBottomSheet` có mở lên không.
   - Kiểm tra bấm nút Quote trên thẻ cũ và gõ lệnh sửa đổi.
