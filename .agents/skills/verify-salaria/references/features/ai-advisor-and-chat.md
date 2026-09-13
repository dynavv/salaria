# 🧠 AI Advisor & Natural Language Chat (Cố Vấn Tài Chính & Trò Chuyện Tự Nhiên)

Trung tâm trí tuệ nhân tạo toàn diện của Salaria: Gateway LLM đa tầng trên Cloudflare Workers AI (Llama 3.1 8B và Gemma 4 26B), giao diện trò chuyện ghi chép chi tiêu bằng tiếng Việt tự nhiên, trích dẫn giao dịch (Quote) và cố vấn chiến lược tài chính.

---

## 📌 Sub-features

- **Universal Workers AI Gateway (`WorkersAIAdapter`)**:
  - Hỗ trợ chuỗi mô hình dự phòng (Fallback Chain): Nếu model chính gặp sự cố, tự động fallback sang model tiếp theo trong danh sách.
  - Phân loại 2 chế độ tác vụ:
    - `fast_extraction`: Bóc tách số tiền & danh mục cực nhanh (< 0.2s) dùng Llama 3.1 8B / Llama 3.2 3B.
    - `deep_reasoning`: Phân tích sâu, kích hoạt `enable_thinking: true` với Gemma 4 26B.
- **Natural Language Expense Logging**:
  - Người dùng gõ tin nhắn tự nhiên: *"vừa đổ xăng 50k ví tiền mặt"* hoặc *"ăn trưa bún chả 45k"*.
  - AI bóc tách: `{ amount: 45000, category_id: "cat_food", account_id: "acc_cash", note: "Ăn trưa bún chả" }` và ghi sổ tự động.
- **Transaction Quoting & Editing via Chat**:
  - Gửi kèm `target_tx_id` / `quote_tx_id` để cập nhật ghi chú hoặc danh mục cho một giao dịch đã phát sinh trước đó bằng ngôn ngữ tự nhiên.
- **Zero-Latency In-Memory Chat Cache (`ChatManager`)**:
  - Quản lý tin nhắn hội thoại cục bộ trên Android với độ trễ 0ms khi chuyển đổi giữa các màn hình, đồng thời lưu lịch sử tin nhắn trên backend (`/api/chat/history`).
- **Personalized Financial Advisor**:
  - `GET /api/analytics/advisor`: Đánh giá sức khỏe tài chính dựa trên dữ liệu thu chi thực tế của tháng và đề xuất cắt giảm chi phí.
  - `POST /api/analytics/ai-ask`: Người dùng đặt câu hỏi tự do về đầu tư, tiết kiệm hoặc quản lý ngân sách cá nhân.

---

## 🚶 How to get to it (User POV)

1. **Android ChatScreen**:
   - Chạm vào tab **Trò Chuyện / AI** trên thanh điều hướng dưới đáy.
   - Gõ nội dung chi tiêu hoặc câu hỏi tài chính -> Nhấn Gửi.
   - Nhận phản hồi kèm card giao dịch vừa được ghi nhận thành công.
2. **Web Financial Advisor**:
   - Vào mục **Cố Vấn AI** (`/advisor`) trên Sidebar Web.
   - Xem bản đánh giá sức khỏe tài chính hàng tháng do Gemma 4 tạo lập.
   - Khung chat AI tương tác trực tiếp ở góc dưới trang.

---

## 🎛️ Controls & Driving

- **API Endpoints**:
  - Ingestion / Chat: `POST /api/transactions/ingest`
    ```json
    {
      "text": "vừa đổ xăng 50k",
      "source": "in_app_chat",
      "quote_tx_id": null
    }
    ```
  - Lịch sử Chat: `GET /api/chat/history` và `DELETE /api/chat/history`
  - Đánh giá Cố vấn: `GET /api/analytics/advisor?month=2026-09`
  - Hỏi đáp Cố vấn: `POST /api/analytics/ai-ask`
    ```json
    {
      "question": "Tháng này tôi tiêu nhiều vào khoản nào nhất?",
      "month": "2026-09"
    }
    ```
- **Environment Bindings**:
  - `env.AI`: Cloudflare Workers AI Binding.
  - `env.AI_MODEL`: Mặc định `@cf/google/gemma-4-26b-a4b-it`.

---

## 👁️ Observable State & Invariants

- **Success**:
  - Chat ghi chép: Tạo transaction mới trong D1, trả về JSON có `transaction` và câu trả lời thân thiện của AI.
  - Cố vấn: Nhận về phản hồi văn bản phân tích có cấu trúc, luận điểm và dẫn chứng cụ thể từ số liệu thực tế của người dùng.
- **Failure**:
  - Workers AI quá tải / Rate limit: Adapter tự động fallback sang mô hình tiếp theo mà không trả về lỗi 500 cho người dùng.

---

## 🧩 Owning Components

- **AI Adapter & Prompts**:
  - Workers AI Adapter: [`backend/src/ai/workers_ai.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/ai/workers_ai.ts)
  - Parser & AI Prompts: [`backend/src/services/parser.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/services/parser.ts)
- **Entry / Route**:
  - Ingest & Chat Route: [`backend/src/routes/ingest.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/ingest.ts)
  - Advisor Route: [`backend/src/routes/analytics.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/analytics.ts#L334-L520)
- **Controller / View**:
  - Android Chat View: [`android/app/src/main/java/com/salaria/app/ui/screens/ChatScreen.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/ChatScreen.kt)
  - Android Chat Cache: [`android/app/src/main/java/com/salaria/app/data/model/ChatManager.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/data/model/ChatManager.kt)
  - Web Advisor Page: [`frontend/src/pages/FinancialAdvisorPage.tsx`](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/pages/FinancialAdvisorPage.tsx)

---

## ⚠️ Known Edge Cases & Common Traps

- **Format JSON trả về từ LLM**: Mô hình ngôn ngữ đôi khi bọc JSON trong khối markdown ` ```json ... ``` `. Hàm `WorkersAIAdapter.extractContent` và `categorizeWithWorkersAI` đã được trang bị regex để bóc tách triệt để.
- **Ngữ cảnh Tiếng Việt nhiều nghĩa**: Từ lóng như "làm cốc cafe 40 cành", "bát phở 5 lít" được xử lý tiền xử lý regex trước khi đưa vào prompt LLM.
