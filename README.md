# Ứng Dụng Quản Lý Tài Chính Cá Nhân (Personal Finance Tracker)
### *Tích hợp Bộ Parser Telegram HTML Export, So sánh Đa tháng & Cố vấn Tài chính Thông minh*

Ứng dụng quản lý tài chính cá nhân hiện đại, 100% riêng tư (local use), lưu trữ SQLite cục bộ và được tối ưu hóa cho thói quen ghi chép chi tiêu qua Telegram.

---

## 🌟 Các Tính năng Nổi bật

1. **Bộ Import & Bóc tách Telegram HTML Thông minh**:
   - Nhập trực tiếp file `messages.html` xuất từ Telegram Desktop.
   - Nhận diện cú pháp tự nhiên: `Ăn trưa 50k`, `50.000 cf Highland`, `Đổ xăng 80k`, `Tiền trọ 3tr5`, `+18.5tr lương cty`, `Grab 35k`,...
   - Tự động gán danh mục tiếng Việt (Ăn uống, Di chuyển, Nhà cửa, Mua sắm, Giải trí, Lương...) dựa trên từ khóa phong phú.
   - Màn hình Preview cho phép kiểm tra, sửa/xóa và chọn các giao dịch trước khi lưu.

2. **So sánh Biến động giữa các Tháng (Multi-Month Analytics)**:
   - Chọn và so sánh 2 hoặc 3 tháng bất kỳ side-by-side.
   - Biểu đồ cột so sánh từng danh mục qua các tháng.
   - Bảng phân tích biến động chi tiêu tăng/giảm (+/- % và số tiền chênh lệch).

3. **Cố vấn & Lời khuyên Tài chính Cá nhân (Financial Advisor)**:
   - Chấm điểm **Sức khỏe tài chính** (1 - 100 điểm).
   - Đánh giá theo chuẩn mô hình **50 / 30 / 20** (Thiết yếu 50% • Sở thích 30% • Tiết kiệm 20%).
   - Phát hiện **Hiệu ứng Latte** (các khoản chi nhỏ lẻ tích tụ như cafe, trà sữa).
   - Đưa ra nhận xét tổng quan và **lời khuyên hành động cụ thể** cho tháng tiếp theo.
   - Tích hợp khung trò chuyện cùng Cố vấn để giải đáp thắc mắc tài chính.

4. **Sổ Giao dịch & Quản lý Ví**:
   - Quản lý đa ví: Tiền mặt, Tài khoản ngân hàng, Ví Momo/ZaloPay, Thẻ tín dụng.
   - Bộ lọc đa chiều theo tháng, loại thu/chi/chuyển khoản, danh mục, từ khóa.
   - Sao lưu (Export) và khôi phục (Import) dữ liệu dạng JSON an toàn.

---

## 🚀 Hướng dẫn Chạy Ứng Dụng

### Khởi động nhanh (Development & Production):

Mở terminal tại thư mục dự án:
```bash
cd /home/dynav/.gemini/antigravity/scratch/personal-finance-app
npm run dev
```
- **Giao diện Web**: [http://localhost:5173](http://localhost:5173) (hoặc [http://localhost:3001](http://localhost:3001))
- **REST API Backend**: [http://localhost:3001/api](http://localhost:3001/api)

### Dữ liệu lưu trữ:
- Toàn bộ cơ sở dữ liệu được lưu trong file cục bộ: `data/finance.db` (SQLite).
- Không gửi bất kỳ dữ liệu nào ra máy chủ bên ngoài, đảm bảo 100% quyền riêng tư cá nhân.
