# 🏷️ Category & Budgeting (Danh Mục Chi Tiêu & Thiết Lập Ngân Sách)

Quản lý cấu trúc danh mục thu/chi, phân bổ tài chính theo mô hình chuẩn 50/30/20 (Needs, Wants, Savings), định mức ngân sách tháng và từ khóa nhận diện regex tự động.

---

## 📌 Sub-features

- **50/30/20 Budgeting Rule**: Phân nhóm toàn bộ danh mục chi tiêu thành 3 nhóm tài chính chuẩn:
  - `needs`: Nhu cầu thiết yếu (Nhà ở, Ăn uống hàng ngày, Tiền điện nước, Y tế, Xăng xe).
  - `wants`: Mong muốn & giải trí (Cà phê, Xem phim, Du lịch, Mua sắm đồ chơi công nghệ).
  - `savings`: Tiết kiệm & Tích lũy (Quỹ khẩn cấp, Trả nợ gốc, Đầu tư tài chính).
- **Monthly Category Budget (`budget_monthly`)**: Thiết lập trần ngân sách cho từng danh mục riêng lẻ để cảnh báo khi chi tiêu vượt mức.
- **Automated Keywords Matching**: Mỗi danh mục gắn liền với danh sách từ khóa không dấu/có dấu (`keywords`, ví dụ: `cơm, phở, bún, highlands, kfc`), giúp Tầng 1 Regex phân loại với độ trễ 0ms.
- **System Budget Settings**:
  - `GET /api/settings`: Tra cứu các mục tiêu tài chính cốt lõi (`savings_goal`, `housing_budget`, `custom_budget`).
  - `POST /api/settings`: Cập nhật mục tiêu tài chính từ Web.

---

## 🚶 How to get to it (User POV)

1. **Web App**: Nhấp vào mục **Danh Mục** (`/categories`) trên Sidebar.
   - Xem tỷ lệ phân bổ ngân sách 50/30/20.
   - Thêm danh mục mới, gắn icon, màu sắc, từ khóa nhận diện và định mức chi tháng.
2. **Android App**:
   - Khi tạo hoặc sửa giao dịch, người dùng nhấp vào danh mục để mở danh sách chọn nhanh.
   - Màu sắc và icon của danh mục phản ánh ngay lập tức trên dòng giao dịch.

---

## 🎛️ Controls & Driving

- **API Endpoints**:
  - `GET /api/categories?type=expense`
  - `POST /api/categories`
    ```json
    {
      "name": "Cà phê & Trà sữa",
      "type": "expense",
      "group_type": "wants",
      "icon": "Coffee",
      "color": "#f59e0b",
      "keywords": "cafe,ca phe,tra sua,highlands,starbucks,phuc long",
      "budget_monthly": 1000000
    }
    ```
  - `PUT /api/categories/:id`
  - `DELETE /api/categories/:id`
  - `GET /api/settings`
  - `POST /api/settings` (`savings_goal`, `housing_budget`, `custom_budget`)
- **UI Components**:
  - Web: [`CategoriesPage.tsx`](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/pages/CategoriesPage.tsx)

---

## 👁️ Observable State & Invariants

- **Success**:
  - Khi thông báo ngân hàng chứa từ khóa "highlands", hệ thống tự động gắn `category_id = "cat_coffee"` mà không cần gọi đến LLM.
  - Danh mục mới tạo xuất hiện tức thì trong danh sách gợi ý của cả Web và Android.
- **Failure**:
  - Xóa danh mục cha khi đang có hàng trăm giao dịch gắn với nó -> giao dịch hiển thị `category_name = NULL` hoặc "Khác".

---

## 🧩 Owning Components

- **Entry / Route**:
  - Category Route: [`backend/src/routes/categories.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/categories.ts)
  - Settings Route: [`backend/src/routes/settings.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/settings.ts)
- **Controller / View**:
  - Web Categories Page: [`frontend/src/pages/CategoriesPage.tsx`](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/pages/CategoriesPage.tsx)
- **Service / Logic**:
  - Fuzzy Keyword Matcher: [`backend/src/services/parser.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/services/parser.ts#L60-L120)
- **Schema / Model**:
  - Table `categories` và `settings` trong [`backend/migrations/0001_initial_schema.sql`](file:///home/dynav/Documents/antigravity/Salarini/backend/migrations/0001_initial_schema.sql)

---

## ⚠️ Known Edge Cases & Common Traps

- **Từ khóa trùng lặp giữa các danh mục**: Nếu từ khóa "cơm" xuất hiện ở cả danh mục "Ăn uống" và "Đi chợ siêu thị", hệ thống ưu tiên khớp danh mục có độ tương đồng cao hơn hoặc danh mục xuất hiện trước.
- **Phân biệt chữ hoa/thường và dấu tiếng Việt**: Luôn chuẩn hóa văn bản về chữ thường không dấu (`normalizeText`) trước khi so khớp Regex.
