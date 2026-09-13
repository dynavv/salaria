# ADR-0005: Lộ Trình Chuyển Đổi Ngôn Ngữ Backend Từ JavaScript Sang TypeScript

* **Trạng thái**: Đã phê duyệt (Accepted)
* **Ngày quyết định**: 2026-09-03
* **Người quyết định**: Salaria Architecture Team

---

## Bối Cảnh (Context)
Hiện tại:
- Frontend Web viết bằng **TypeScript** (`.tsx`).
- Mobile App viết bằng **Kotlin** (Strict Type-Safety).
- Cloudflare Worker Backend viết bằng **JavaScript thuần** (`cloudflare_worker.js`, 1.990 dòng).

Một câu hỏi được đặt ra: *Tại sao ban đầu lại dùng JS, và tại sao bây giờ cần chuyển sang TS?*

## Phân Tích Lịch Sử & Động Lực Thay Đổi (Drivers)

### 1. Tại sao ban đầu dùng JavaScript thuần (Giai đoạn MVP)?
- **Tốc độ triển khai tối thượng**: Zero build-step, không cần `tsconfig.json`, gõ `wrangler deploy` là chạy ngay.
- **Quick Edit trên Web Console**: Cho phép sửa code trực tiếp trên Cloudflare Dashboard trong 2 giây để test webhook MacroDroid và Telegram.
- **Dynamic Typing cho Prompt AI**: Dễ dàng bóc tách JSON không cố định từ các mô hình AI ban đầu mà không bị compiler bắt lỗi kiểu dữ liệu.

### 2. Tại sao hiện tại cần chuyển sang TypeScript (Giai đoạn Production)?
- **Quy mô phình to (God File 1.990 dòng)**: JS không có type check khiến việc mở rộng và bảo trì trở nên nguy hiểm.
- **Lệch pha kiểu dữ liệu**: Backend trả về trường mới (như `destination_account_id` hay `safe_daily_limit`) nhưng không thể kiểm tra tính tương thích với Android và Web.
- **Chuẩn bị cho Module hóa**: Khi chia tách Worker thành các file nhỏ (`routes/`, `ai/`, `db/`), TypeScript là chiếc phao cứu sinh ngăn ngừa 100% lỗi runtime như `undefined is not a function`.

## Quyết Định (Decision)
1. **Giai đoạn Hiện tại**: **Tạm giữ nguyên JavaScript** để tập trung toàn lực kiểm nghiệm độ ổn định của Native Android App ngoài thực tế trong 3–5 ngày.
2. **Giai đoạn 4 (Thanh Lọc Backend)**: Sẽ thực hiện một đợt chuyển đổi đồng loạt:
   - Đổi đuôi sang `.ts`.
   - Chia tách God File thành các module trong `backend/src/`.
   - Tạo các Interface chia sẻ chung giữa Backend, Frontend và Android.

## Hệ Quả (Consequences)
- **Tích cực**: Đồng bộ 100% Type-Safe cho toàn bộ hệ sinh thái Salaria, loại bỏ bug runtime, hỗ trợ autocomplete và refactor an toàn tuyệt đối.
- **Tiêu cực**: Đòi hỏi một đợt kiểm thử kỹ lưỡng trong Giai đoạn 4 để đảm bảo không gãy route đang chạy.
