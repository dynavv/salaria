# 🎯 Kế Hoạch Triển Khai: Cơ Chế Ngân Sách 3 Ngăn (3-Bucket Budgeting & Safe-To-Spend)

- **Ngày tạo**: 06/09/2026
- **Trạng thái**: Chờ người dùng duyệt (Pending Approval)
- **Mục tiêu**: Nâng cấp công thức tính Hạn mức an toàn mỗi ngày (`safeToSpendPerDay`) trên toàn hệ thống Salaria nhằm tự động trích trước Khoản Tiết Kiệm (Savings Goal) và Đóng băng chi phí cố định lớn (Tiền nhà) khi chưa thanh toán.

---

## 1. Nguyên Tắc Cấu Hình Mặc Định
- **Khoản Tiết kiệm mục tiêu (`savings_goal`)**: Mặc định **`0 ₫`** (khi người dùng nhập giá trị thì tính theo giá trị mới).
- **Tiền nhà định kỳ (`housing_budget`)**: Mặc định **`4.000.000 ₫`** cho đến khi có thông tin thực tế (người dùng cập nhật giá trị mới hoặc phát sinh giao dịch đóng tiền nhà thực tế).

---

## 2. Bản Đồ File Sẽ Chỉnh Sửa

| Thành phần | Đường dẫn file | Loại thay đổi | Nhiệm vụ |
| :--- | :--- | :--- | :--- |
| **Backend API** | [backend/src/routes/settings.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/settings.ts) | **NEW** | Quản lý cấu hình `settings` (savings_goal, housing_budget) |
| **Backend Core** | [backend/src/services/paycheck.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/services/paycheck.ts) | **MODIFY** | Bổ sung hàm tính toán `calculateThreeBucketSafeToSpend` |
| **Backend Router**| [backend/src/index.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/index.ts) | **MODIFY** | Đăng ký route `handleSettings` |
| **Backend Ingest**| [backend/src/routes/ingest.ts](file:///home/dynav/Documents/antigravity/Salarini/backend/src/routes/ingest.ts) | **MODIFY** | Tích hợp công thức 3 ngăn vào Ingest Webhook & Chat History |
| **Android Prefs** | [PreferencesManager.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/data/local/PreferencesManager.kt) | **MODIFY** | Lưu trữ `savingsGoal` và `housingBudget` |
| **Android Helper**| [PaycheckCycleHelper.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/data/model/PaycheckCycleHelper.kt) | **MODIFY** | Thêm hàm tính toán hạn mức 3 ngăn |
| **Android Worker**| [DailySummaryWorker.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/worker/DailySummaryWorker.kt) | **MODIFY** | Cập nhật phép tính 22h30 theo công thức 3 ngăn |
| **Android UI**    | [SettingsScreen.kt](file:///home/dynav/Documents/antigravity/Salarini/android/app/src/main/java/com/salaria/app/ui/screens/SettingsScreen.kt) | **MODIFY** | Thêm Card thiết lập Ngân sách & Hạn mức trực quan |

---

## 3. Công Thức & Mô Hình Toán Học

$$\text{reservedHousing} = \begin{cases} \max(0, \text{housingBudget} - \text{paidHousing}) & \text{nếu } \text{housingBudget} > 0 \\ 0 & \text{nếu } \text{housingBudget} = 0 \end{cases}$$

$$\text{remainingDiscretionary} = \max(0, \text{baseBudget} - \text{savingsGoal} - \text{reservedHousing} - \text{totalExpense})$$

$$\text{safeToSpendPerDay} = \text{round}\left(\frac{\text{remainingDiscretionary}}{\text{daysRemaining}}\right)$$

---

## 4. Kế Hoạch Kiểm Thử (Verification Plan)
1. `npx tsc -p backend/tsconfig.json` đảm bảo không có lỗi type TypeScript.
2. `wrangler deploy --config backend/wrangler.jsonc` deploy backend Cloudflare Edge.
3. Test API `GET /api/settings` và `POST /api/settings`.
4. `./gradlew assembleDebug` build APK Android không lỗi.
5. Sao chép APK ra `android/Salaria.apk`.
