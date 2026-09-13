# 📝 Salaria — Release Retrospectives & Learnings

Tài liệu ghi nhận những bài học kinh nghiệm, phân tích sau sự cố (Post-mortem) và cải tiến quy trình sau mỗi đợt phát hành (Release Milestone).

---

## 🎯 Template Đánh Giá Sau Mỗi Đợt Cập Nhật (Milestone Template)

Mỗi khi phát hành xong một phiên bản (ví dụ v1.1.0, v1.2.0), hãy trả lời 3 câu hỏi sau:

1. **🌟 Điều gì đã hoạt động tốt? (What worked well?)**
   - Những giải pháp kiến trúc nào giúp tiết kiệm thời gian và chạy ổn định?
   - Tính năng nào được người dùng hài lòng nhất?
2. **⚠️ Điều gì chưa tốt hoặc gặp trục trặc? (What didn't work?)**
   - Có phát sinh lỗi P0 nào trên thiết bị thật không?
   - Tại sao lỗi đó lại lọt qua khâu kiểm tra cục bộ?
3. **💡 Bài học rút ra & Thay đổi hành động (Action Items & Improvements)**
   - Cần bổ sung test case nào vào bộ unit test tự động?
   - Cần cập nhật thêm quy tắc nào vào `GEMINI.md`?

---

## 📅 Nhật Ký Các Đợt Đánh Giá Trước

### Đợt 1: Khởi Tạo Native Android App & Nhận Diện Technical Debt (2026-09-03)
- **Đã làm tốt**:
  - Dựng thành công `BankNotificationListener` bắt thông báo ngân hàng 24/7 trực tiếp trên Android OS mà không cần phụ thuộc Firebase hay MacroDroid.
  - Tích hợp Room DB offline queue và WorkManager tự động đồng bộ.
  - Xây dựng `WorkersAIAdapter` tương thích đa model trên Cloudflare Edge.
- **Vấn đề phát hiện**:
  - Lỗi hoàn tác số dư 2 chiều cho giao dịch chuyển tiền (`transfer`) khi sửa/xóa.
  - Lỗi giao diện tràn chữ `Kỳ lương` trên màn hình điện thoại hẹp.
  - Backend tồn tại God File gần 2.000 dòng bằng JavaScript thuần.
- **Hành động khắc phục**:
  - Đã lập danh mục theo dõi P0-P3 trong [docs/backlog.md](file:///home/dynav/Documents/antigravity/Salarini/docs/backlog.md).
  - Tạm hoãn chỉnh sửa code để người dùng kiểm nghiệm thực tế app Android trong 3–5 ngày.
