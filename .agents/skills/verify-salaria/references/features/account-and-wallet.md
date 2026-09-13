# 👛 Account & Wallet (Quản Lý Tài Khoản & Số Dư Ví)

Quản lý danh mục các tài khoản tài chính (Ví tiền mặt, Tài khoản ngân hàng, Thẻ tín dụng, Quỹ tiết kiệm) và tự động đối soát tính toán số dư thực tế theo thời gian thực (Real-time Balance Reconciliation).

---

## 📌 Sub-features

- **Multi-Account Types**: Hỗ trợ nhiều loại ví/tài khoản khác nhau: `cash` (Tiền mặt), `bank` (Ngân hàng), `credit` (Thẻ tín dụng), `savings` (Tiết kiệm tích lũy).
- **Dynamic Real-time Balance**:
  - Số dư hiện tại (`current_balance`) được tính toán động dựa trên công thức bất biến:
    $$\text{Balance} = \text{initial\_balance} + \sum \text{Income} - \sum \text{Expense} - \sum \text{Transfer Out} + \sum \text{Transfer In}$$
- **Account CRUD**:
  - `GET /api/accounts`: Lấy danh sách tài khoản cùng số dư thời gian thực.
  - `POST /api/accounts`: Tạo tài khoản mới với số dư ban đầu (`initial_balance`).
  - `PUT /api/accounts/:id`: Cập nhật tên, icon, màu sắc, số dư khởi tạo.
  - `DELETE /api/accounts/:id`: Xóa tài khoản không còn sử dụng.
- **Default Account Selection**: Đặt một tài khoản làm mặc định (`is_default = 1`), dùng làm tài khoản mặc định khi ghi nhận chi tiêu nhanh từ chat hoặc thông báo không rõ nguồn.

---

## 🚶 How to get to it (User POV)

1. **Web App**: Nhấp vào mục **Tài Khoản** (`/accounts`) trên thanh Sidebar.
   - Xem tổng tài sản (Net Worth) và số dư chi tiết từng ví.
   - Thêm tài khoản mới hoặc điều chỉnh số dư ban đầu.
2. **Android App**:
   - Xem nhanh số dư các ví ngay trên thẻ đầu tiên của **DashboardScreen.kt**.
   - Khi chỉnh sửa giao dịch, chọn tài khoản chi trả qua bottom sheet.

---

## 🎛️ Controls & Driving

- **API Endpoints**:
  - `GET /api/accounts`
  - `POST /api/accounts`
    ```json
    {
      "name": "Vietcombank Priority",
      "type": "bank",
      "balance": 15000000,
      "initial_balance": 15000000,
      "currency": "VND",
      "icon": "Building2",
      "color": "#10b981",
      "is_default": 1
    }
    ```
  - `PUT /api/accounts/:id`
  - `DELETE /api/accounts/:id`
- **UI Components**:
  - Web: [`AccountsPage.tsx`](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/pages/AccountsPage.tsx)
  - Android: [`DashboardScreen.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/DashboardScreen.kt)

---

## 👁️ Observable State & Invariants

- **Success**:
  - Endpoint `GET /api/accounts` trả về trường `balance` và `current_balance` phản ánh chính xác từng đồng dựa trên lịch sử giao dịch.
  - Khi thêm một khoản chi 50.000 ₫ cho `acc_cash`, số dư `acc_cash` giảm tức thì 50.000 ₫.
- **Failure**:
  - Thất thoát số dư hoặc lệch số do cập nhật bảng `accounts` nhưng không có giao dịch đối ứng (hoặc ngược lại).

---

## 🧩 Owning Components

- **Entry / Route**:
  - Backend Account Route: [`backend/src/routes/accounts.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/accounts.ts)
- **Controller / View**:
  - Web Accounts Page: [`frontend/src/pages/AccountsPage.tsx`](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/pages/AccountsPage.tsx)
  - Android Dashboard Cards: [`android/app/src/main/java/com/salaria/app/ui/screens/DashboardScreen.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/DashboardScreen.kt)
- **Schema / Model**:
  - Table `accounts` trong [`backend/migrations/0001_initial_schema.sql`](file:///home/dynav/Documents/antigravity/Salarini/backend/migrations/0001_initial_schema.sql)
  - TypeScript Account Type: [`backend/src/types.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/types.ts#L4-L15)

---

## ⚠️ Known Edge Cases & Common Traps

- **Xóa tài khoản đang có giao dịch**: Khi xóa tài khoản đang gắn với các dòng trong `transactions`, các giao dịch đó có thể bị mồ côi tài khoản (orphaned). Cần kiểm tra ràng buộc trước khi xóa.
- **Đồng bộ song song số dư**: Bảng `accounts` có cột `balance`, nhưng truy vấn `GET /api/accounts` tính toán `current_balance` trực tiếp từ subquery để đảm bảo không bao giờ bị trôi số dư nếu có sự cố ngắt giữa chừng.
