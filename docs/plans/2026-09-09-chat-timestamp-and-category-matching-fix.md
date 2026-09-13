# Kế hoạch Kỹ thuật: Timestamp & Thứ tự Chat + Sửa lỗi Fast-Regex Phân loại "Sửa xe"
**Ngày lập**: 09/09/2026  
**Mục tiêu**: 
1. Khắc phục dứt điểm hiện tượng "380k sửa xe" bị phân loại nhầm vào "Ăn uống" do va chạm từ khóa "sua".
2. Bổ sung timestamp cho toàn bộ tin nhắn trong Chat, sắp xếp tăng dần theo thời gian (cũ ở trên, mới ở dưới).

---

## 1. Backend Changes
- `backend/src/services/parser.ts`:
  - Nâng cấp `matchCategoryFast` sang thuật toán **Longest-Keyword-First**: gom toàn bộ từ khóa của các danh mục, sort theo `kw.length DESC` trước khi test regex.
- `backend/src/routes/ingest.ts`:
  - Endpoint `/chat/history`: Trả về cả `createdAt` và `created_at` để bảo đảm tương thích với Android client.
- D1 Database:
  - Cập nhật từ khóa của `cat_food`: Thay thế `"sữa,sua"` thành `"sữa tươi,sua tuoi,sữa chua,sua chua,sữa đặc,sua dac,uống sữa,uong sua,hộp sữa,hop sua,lốc sữa,loc sua"` để tránh va chạm với hành động "sửa" (sửa xe, sửa chữa...).

## 2. Android Native Changes
- `android/app/src/main/java/com/salaria/app/data/model/Models.kt`:
  - `ChatHistoryItem`: Bổ sung `@SerializedName(value = "createdAt", alternate = ["created_at"])`.
- `android/app/src/main/java/com/salaria/app/data/model/ChatManager.kt`:
  - Viết hàm `parseTimestamp(createdAt: String?): Long`.
  - Gán đúng `timestamp` cho tin nhắn người dùng và tin phản hồi của bot (`timestamp = ts + 1`).
  - Welcome message: gán `timestamp = 0L`.
  - Sắp xếp danh sách `messages.sortWith(compareBy { it.timestamp })` sau khi nhận dữ liệu từ server.
- `android/app/src/main/java/com/salaria/app/ui/screens/ChatScreen.kt`:
  - Thêm helper `formatChatTimestamp(timestamp: Long): String` (`HH:mm` nếu hôm nay, `HH:mm • dd/MM` nếu khác ngày).
  - Hiển thị timestamp ở góc tin nhắn người dùng / ngân hàng, chân thẻ hóa đơn và các tin nhắn text thông thường.

## 3. Verification & Rollback
- Chạy test node chẩn đoán `matchCategoryFast` với `"380k sửa xe"` và `"35k sua tuoi"`.
- Build APK Android qua `./gradlew assembleDebug`.
- Deploy Worker qua `npx wrangler deploy`.
- Rollback nếu có lỗi: `git checkout HEAD -- <files>` và revert migration D1.
