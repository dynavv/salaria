# 📋 Kế Hoạch Thực Thi: Nâng Cấp Thẻ Phản Hồi Chi Tiết & Sắp Xếp Danh Mục Thường Dùng

- **Ngày lập**: 2026-09-06
- **Mức độ ưu tiên**: P1 (UI/UX Native Android App & Backend Enhancements)
- **Mục tiêu**:
  1. Thể hiện tin nhắn phản hồi giao dịch đầy đủ, chi tiết (Số tiền, Nội dung, Danh mục, Phân loại, Nguồn, Phân tích tài chính kỳ này).
  2. Sắp xếp danh mục trong popup chỉnh sửa theo mức độ thường xuyên sử dụng, đưa **Ăn uống** lên đầu tiên.

---

## 🗺️ Chi Tiết Triển Khai

### 1. Backend (`backend/src/routes/ingest.ts`)
- Trong `handleChatHistory`:
  - Tính toán `financialHealth` của chu kỳ hiện tại một lần và gán vào các giao dịch chi tiêu trong kết quả trả về.
  - Nhờ đó, cả các giao dịch vừa ghi chép lẫn các giao dịch tải từ lịch sử đám mây đều có đầy đủ thông tin phân tích tài chính chu kỳ hiện tại.

### 2. Android UI (`android/app/src/main/java/com/salaria/app/`)
- `ChatScreen.kt`:
  - Cập nhật giao diện `ChatBubble` (nhánh `message.transaction != null`) để hiển thị theo đúng format:
    - `✨ Ghi chép giao dịch thành công!`
    - `• Số tiền: 🔴 -...`
    - `• Nội dung: ...`
    - `• Danh mục: ...`
    - `• Phân loại: ...`
    - `• Nguồn: 🔔 Thông báo Ngân hàng | 💬 Chat Copilot | ✈️ Telegram Bot`
    - Phân cách bằng nét gạch mỏng
    - `📊 Đã tiêu kỳ này: ... (...)`
    - `🛡️ Hạn mức an toàn: .../ngày (còn ... ngày)`
- `EditTransactionBottomSheet.kt`:
  - Thêm bảng trọng số ưu tiên `priorityOrder` để sắp xếp danh mục chi tiêu:
    `cat_food` (Ăn uống) ➔ `cat_shopping` ➔ `cat_transport` ➔ `cat_entertainment` ➔ `cat_housing` ➔ `cat_personal_care` ➔ `cat_health` ➔ `cat_education` ➔ `cat_other_expense`.
