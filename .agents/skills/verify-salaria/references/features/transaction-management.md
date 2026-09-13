# 💳 Transaction Management (Quản Lý Giao Dịch & Toàn Vẹn Số Dư)

Trung tâm xử lý và lưu trữ toàn bộ các biến động thu, chi, chuyển tiền nội bộ và rút tiền ATM với cơ chế đảm bảo tính toàn vẹn số dư tài chính tuyệt đối (Balance Integrity & Two-Way Reversal).

---

## 📌 Sub-features

- **Transaction CRUD Operations**:
  - `GET /api/transactions`: Tra cứu danh sách giao dịch với bộ lọc đa chiều (tháng, khoảng ngày, danh mục, tài khoản, loại thu/chi/chuyển khoản, tìm kiếm từ khóa, phân trang).
  - `POST /api/transactions`: Tạo giao dịch thủ công từ Web hoặc Android.
  - `PUT /api/transactions/:id`: Cập nhật chi tiết giao dịch (ngày, số tiền, tài khoản, ghi chú) và tự động tính toán bù trừ chênh lệch số dư.
  - `DELETE /api/transactions/:id`: Xóa giao dịch kèm cơ chế hoàn tác số dư ngược chiều.
- **Double-Counting Prevention (Chống Bẫy Tính Trùng Chi Tiêu)**:
  - Giao dịch loại `transfer` hoặc rút tiền ATM: Trừ tài khoản nguồn, cộng tài khoản đích, `category_id = NULL`, tuyệt đối không tính vào tổng chi tiêu tháng.
- **Two-Way Balance Reversal (Hoàn Tác 2 Chiều)**:
  - Khi xóa hoặc sửa giao dịch chuyển khoản: Hệ thống cộng trả lại tiền cho tài khoản nguồn và trừ thu hồi tiền từ tài khoản đích.
- **Clear All Data Reset**: Xóa sạch toàn bộ giao dịch và reset số dư các tài khoản về `initial_balance`.

---

## 🚶 How to get to it (User POV)

1. **Web App**: Nhấp menu **Giao Dịch** (`/transactions`) trên thanh điều hướng bên trái.
   - Bấm **Thêm giao dịch** để nhập số tiền, chọn ví và danh mục.
   - Nhấp vào biểu tượng Bút chì để chỉnh sửa hoặc Thùng rác để xóa.
2. **Android App**: Chọn tab **Sổ Thu Chi** ở thanh điều hướng dưới đáy.
   - Chạm vào một giao dịch để mở `EditTransactionBottomSheet.kt`.
   - Chỉnh sửa thông tin hoặc bấm **Xóa giao dịch** kèm hộp thoại xác nhận.

---

## 🎛️ Controls & Driving

- **API Endpoints**:
  - `GET /api/transactions?month=2026-09&limit=50&search=cafe`
  - `POST /api/transactions`
    ```json
    {
      "amount": 35000,
      "type": "expense",
      "category_id": "cat_food",
      "account_id": "acc_cash",
      "note": "Cà phê sáng",
      "date": "2026-09-09"
    }
    ```
  - `PUT /api/transactions/:id`
  - `DELETE /api/transactions/:id`
- **UI Components**:
  - Web: [`TransactionsPage.tsx`](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/pages/TransactionsPage.tsx)
  - Android: [`TransactionsScreen.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/TransactionsScreen.kt), [`EditTransactionBottomSheet.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/components/EditTransactionBottomSheet.kt)

---

## 👁️ Observable State & Invariants

- **Success**:
  - Giao dịch Chi tiêu (Expense): `acc.balance` giảm đúng bằng `amount`. Chi tiêu tháng tăng `amount`.
  - Giao dịch Thu nhập (Income): `acc.balance` tăng đúng bằng `amount`. Thu nhập tháng tăng `amount`.
  - Giao dịch Chuyển khoản (Transfer): `acc_src.balance` giảm `amount`, `acc_dst.balance` tăng `amount`. Tổng tài sản không đổi, chi tiêu tháng không đổi.
  - Khi Xóa giao dịch: Số dư tài khoản tự động phục hồi về đúng trạng thái như trước khi giao dịch phát sinh.
- **Failure**:
  - Không tìm thấy ID giao dịch khi sửa/xóa.
  - D1 database connection failure trả về HTTP 500.

---

## 🧩 Owning Components

- **Entry / Route**:
  - Backend Transaction Route: [`backend/src/routes/transactions.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/transactions.ts)
- **Controller / View**:
  - Web Transactions Page: [`frontend/src/pages/TransactionsPage.tsx`](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/pages/TransactionsPage.tsx)
  - Android Screen & Sheet: [`android/app/src/main/java/com/salaria/app/ui/screens/TransactionsScreen.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/TransactionsScreen.kt), [`android/app/src/main/java/com/salaria/app/ui/components/EditTransactionBottomSheet.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/components/EditTransactionBottomSheet.kt)
- **Service / API Client**:
  - Web API: [`frontend/src/api/client.ts`](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/api/client.ts)
  - Android Retrofit: [`android/app/src/main/java/com/salaria/app/data/api/SalariaApi.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/data/api/SalariaApi.kt)
- **Schema / Model**:
  - Table `transactions` trong [`backend/migrations/0001_initial_schema.sql`](file:///home/dynav/Documents/antigravity/Salarini/backend/migrations/0001_initial_schema.sql)
  - Model `Transaction` trong [`android/app/src/main/java/com/salaria/app/data/model/Models.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/data/model/Models.kt)

---

## ⚠️ Known Edge Cases & Common Traps

- **Sửa loại giao dịch (Type Mutation Trap)**: Khi sửa một giao dịch từ `expense` thành `transfer` hoặc ngược lại, bắt buộc phải hoàn tác tác động số dư của loại cũ trước khi áp dụng số dư của loại mới.
- **Phân trang và sắp xếp**: Luôn sắp xếp theo `date DESC, created_at DESC` để các giao dịch mới nhất luôn nằm ở đầu danh sách.
