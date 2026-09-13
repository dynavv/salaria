# ADR-0002: Kiến Trúc Dual-Model Cho Workers AI (Llama 3.1 8B + Gemma 4 26B)

* **Trạng thái**: Đã phê duyệt (Accepted)
* **Ngày quyết định**: 2026-08-20
* **Người quyết định**: Salaria Architecture Team

---

## Bối Cảnh (Context)
Ứng dụng có 2 tác vụ AI với đặc thù hoàn toàn trái ngược nhau:
1. **Bóc tách giao dịch (Extraction)**: Cần tốc độ phản hồi siêu tốc (< 0.2s) khi ngân hàng vừa gửi thông báo để nảy Local Notification ngay lập tức. Nội dung ngắn (`35k cafe`).
2. **Cố vấn tài chính chuyên sâu (Financial Advisory)**: Cần khả năng suy luận logic sâu (Deep Reasoning) dựa trên toàn bộ bảng thu chi 30 ngày, phân tích theo quy tắc 50/30/20 và hiệu ứng Latte.

## Các Lựa Chọn Đã Xem Xét (Options Considered)
1. **Dùng duy nhất 1 model lớn (Gemma 4 26B hoặc Llama 70B)** cho mọi tác vụ: Phân tích sâu tốt nhưng bóc tách tin nhắn bị chậm (mất 2–3 giây), gây nghẽn luồng bắt thông báo thời gian thực.
2. **Dùng duy nhất 1 model nhỏ (Llama 3.2 1B / 3B)**: Bóc tách nhanh nhưng khi hỏi cố vấn tài chính thì trả lời nông cạn, hallucination các con số ngân sách.
3. **Kiến trúc Dual-Model (Tách biệt theo Task Type qua WorkersAIAdapter)**:
   - `fast_extraction`: Sử dụng Llama 3.1 8B (`@cf/meta/llama-3.1-8b-instruct`), `max_tokens = 256`.
   - `deep_reasoning`: Sử dụng Gemma 4 26B (`@cf/google/gemma-4-26b-a4w-act-int4`), `max_tokens = 3000`.

## Quyết Định (Decision)
Chọn giải pháp **Dual-Model** thông qua cổng `WorkersAIAdapter`:
- Tự động normalize messages (lồng system prompt vào user prompt nếu model không hỗ trợ system role).
- Tách biệt token budget và temperature cho từng loại tác vụ.

## Hệ Quả (Consequences)
- **Tích cực**: Trải nghiệm bóc tách thông báo ngân hàng tức thì (< 0.2s); đồng thời trang Cố vấn AI trên Web có năng lực phân tích tài chính sâu sắc.
- **Tiêu cực**: Cần quản lý cấu hình và prompt riêng biệt cho 2 model.
