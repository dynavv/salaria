# ADR-0001: Sử Dụng Cloudflare D1 (Serverless SQLite) Làm Database Chính

* **Trạng thái**: Đã phê duyệt (Accepted)
* **Ngày quyết định**: 2026-08-15
* **Người quyết định**: Salaria Architecture Team

---

## Bối Cảnh (Context)
Ứng dụng Salaria cần một cơ sở dữ liệu quan hệ (RDBMS) để lưu trữ tài khoản, danh mục, giao dịch tài chính và nhật ký hệ thống. Các giải pháp truyền thống như thuê VPS chạy PostgreSQL / MySQL đòi hỏi chi phí duy trì hàng tháng (5$ - 15$/tháng), cấu hình mạng phức tạp và thời gian khởi động (cold start).

## Các Lựa Chọn Đã Xem Xét (Options Considered)
1. **PostgreSQL trên Supabase / Neon / Render**: Mạnh mẽ, hỗ trợ transaction tốt nhưng bị giới hạn kết nối đồng thời và độ trễ mạng nếu server đặt xa người dùng.
2. **Cloudflare KV / D1**: KV chỉ phù hợp key-value đơn giản, không chạy được các truy vấn tổng hợp phức tạp (GROUP BY theo danh mục, tính tổng chi tiêu MoM).
3. **Cloudflare D1 (Serverless SQLite trên Edge)**: Phân tán toàn cầu, chi phí 0đ (Free tier hào phóng 5M rows read/ngày), độ trễ cực thấp (< 15ms).

## Quyết Định (Decision)
Chọn **Cloudflare D1 Database (`salarini-db`)**:
- Tích hợp tự nhiên với Cloudflare Worker thông qua binding `env.DB`.
- Cú pháp chuẩn SQL (SQLite) dễ bảo trì, dễ viết trigger và transaction.
- Không tốn chi phí hạ tầng máy chủ.

## Hệ Quả (Consequences)
- **Tích cực**: Độ trễ cực thấp, không tốn chi phí vận hành, backup dễ dàng.
- **Tiêu cực**: Giới hạn một số tính năng nâng cao của Postgres (như JSON aggregation phức tạp); cần kiểm soát kích thước database và phân trang khi dữ liệu lớn.
