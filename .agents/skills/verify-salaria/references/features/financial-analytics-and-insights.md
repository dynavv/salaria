# 📊 Financial Analytics & Insights (Phân Tích Dòng Tiền & Báo Cáo Tài Chính)

Động cơ tính toán phân tích tài chính thông minh: Chỉ số Safe-to-Spend theo kỳ lương, cấu trúc chi tiêu 50/30/20, phát hiện chi tiêu thầm lặng (Latte Factor) và so sánh xu hướng đa tháng (MoM).

---

## 📌 Sub-features

- **Three-Bucket Safe-to-Spend Engine**:
  - Tính toán số tiền an toàn có thể chi tiêu mỗi ngày/mỗi tuần từ nay cho đến ngày nhận lương tiếp theo, sau khi đã trừ đi các chi phí cố định (Tiền nhà, hóa đơn) và mục tiêu tiết kiệm.
- **50/30/20 Real-time Compliance**:
  - Đối chiếu tỷ lệ thực tế với tỷ lệ chuẩn vàng: Needs (<= 50%), Wants (<= 30%), Savings (>= 20%).
- **Latte Factor Detector**:
  - Tự động gom nhóm các khoản chi tiêu nhỏ lẻ lặp đi lặp lại thường xuyên (ví dụ: cà phê 35k, trà sữa 45k, thuốc lá, ăn vặt) để chỉ ra tổng số tiền thất thoát mỗi tháng.
- **Multi-Month Comparison (MoM - Month over Month)**:
  - So sánh chi tiết tỷ lệ tăng giảm chi tiêu theo từng danh mục giữa các tháng liên tiếp hoặc hai tháng bất kỳ.
- **Paycheck Cycle Recognition**:
  - Hỗ trợ chu kỳ chi tiêu theo ngày nhận lương thực tế (ví dụ: từ ngày 25 tháng này đến ngày 24 tháng sau) thay vì chỉ bó hẹp theo tháng dương lịch.

---

## 🚶 How to get to it (User POV)

1. **Web App**:
   - Truy cập **Tổng Quan** (`/`): Xem thẻ Safe-to-Spend, biểu đồ tròn cơ cấu danh mục, và cảnh báo Latte Factor.
   - Truy cập **So Sánh Đa Tháng** (`/compare`): Chọn 2 tháng bất kỳ để xem biểu đồ cột so sánh biến động chi phí.
2. **Android App**:
   - Mở app, thẻ Safe-to-Spend nằm ngay trên cùng màn hình chính.
   - Vào tab **Báo Cáo** (AnalyticsScreen) để xem biểu đồ phân bổ chi tiêu tháng.

---

## 🎛️ Controls & Driving

- **API Endpoints**:
  - `GET /api/analytics/monthly?month=2026-09`
  - `GET /api/analytics/comparison?month1=2026-08&month2=2026-09`
  - `GET /api/analytics/available-months`
- **Logic Helpers**:
  - [`backend/src/services/paycheck.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/services/paycheck.ts): `calculateThreeBucketSafeToSpend`, `getPaycheckCycle`
  - [`android/app/src/main/java/com/salaria/app/data/model/PaycheckCycleHelper.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/data/model/PaycheckCycleHelper.kt)

---

## 👁️ Observable State & Invariants

- **Success**:
  - API trả về cấu trúc dữ liệu phong phú: `{ total_income, total_expense, net_savings, savings_rate, budget_50_30_20, latte_factor: [...], safe_to_spend: { daily_safe, days_remaining, ... } }`.
  - Không bao giờ tính các giao dịch `type = 'transfer'` vào `total_expense`.
- **Failure**:
  - Tháng chưa có giao dịch nào: Trả về số liệu rỗng an toàn (0đ), không bị lỗi chia cho 0 (`NaN` hay `Infinity`).

---

## 🧩 Owning Components

- **Entry / Route**:
  - Backend Analytics Route: [`backend/src/routes/analytics.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/analytics.ts)
- **Controller / View**:
  - Web Dashboard: [`frontend/src/pages/DashboardPage.tsx`](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/pages/DashboardPage.tsx)
  - Web Comparison: [`frontend/src/pages/MultiMonthComparePage.tsx`](file:///home/dynav/Documents/antigravity/Salarini/frontend/src/pages/MultiMonthComparePage.tsx)
  - Android Dashboard: [`android/app/src/main/java/com/salaria/app/ui/screens/DashboardScreen.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/DashboardScreen.kt)
  - Android Analytics: [`android/app/src/main/java/com/salaria/app/ui/screens/AnalyticsScreen.kt`](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/AnalyticsScreen.kt)
- **Service / Logic**:
  - Paycheck Cycle Calculations: [`backend/src/services/paycheck.ts`](file:///home/dynav/Documents/antigravity/Salarini/backend/src/services/paycheck.ts)

---

## ⚠️ Known Edge Cases & Common Traps

- **Tháng có 28, 30 hoặc 31 ngày**: Số ngày còn lại (`days_remaining`) trong kỳ chi tiêu cần tính chính xác theo lịch thiên văn và múi giờ GMT+7.
- **Thu nhập âm hoặc bằng 0**: Khi tháng chưa có thu nhập ghi nhận, tỷ lệ tiết kiệm (`savings_rate`) phải trả về `0%` thay vì lỗi toán học.
