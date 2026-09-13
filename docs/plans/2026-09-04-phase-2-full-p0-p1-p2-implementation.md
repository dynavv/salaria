# 📋 Kế Hoạch Triển Khai: Toàn Bộ Hạng Mục P0, P1, P2 (Salaria v1.2)

> **Mục tiêu**: Hoàn thiện triệt để tất cả các tính năng cốt lõi (P0), giao diện di động (P1) và tính năng mở rộng/trải nghiệm nâng cao (P2) cho Salaria trên cả 3 nền tảng: Backend Edge Worker, Android Native App và Desktop Web App.

---

## 🗺️ Danh Sách Hạng Mục Triển Khai

| Mã | Hạng mục | Nền tảng | File tác động |
|---|---|---|---|
| **P0-03** | Nhận diện ATM khi nhập qua Chat tự nhiên (tiếng Việt có dấu, ép `acc_bank` ➔ `acc_cash`) | Backend & Android | `backend/cloudflare_worker.js`, `ChatScreen.kt` |
| **P1-Polish** | Thẻ giao dịch Chat đồng bộ loại `transfer` (màu xanh, biểu tượng `⇄`) | Android | `ChatScreen.kt` |
| **P2-01** | Thông báo tổng kết chi tiêu cuối ngày lúc 22h30 (Daily Spending Digest via WorkManager) | Android Native | `DailySummaryWorker.kt` (mới), `NotificationHelper.kt`, `MainActivity.kt` |
| **P2-02** | Phản hồi Chat kèm hạn mức an toàn tức thời (Safe-to-Spend Limit) | Backend & Android | `backend/cloudflare_worker.js`, `Models.kt`, `ChatScreen.kt` |
| **P2-03** | Tinh giản Theme Web: Dark gốc + GitHub Light (`#ffffff`, `#f6f8fa`) | Frontend Web | `ThemeContext.tsx`, `ThemeSelector.tsx`, `index.css` |
| **P2-04** | Hoàn thiện Phân tích So sánh Đa Tháng (Multi-Month MoM Analytics) | Backend & Frontend | `backend/cloudflare_worker.js`, `MultiMonthComparePage.tsx` |

---

## 🛠️ Chi Tiết Triển Khai Từng Bước

### Bước 1: Backend Edge Worker (`backend/cloudflare_worker.js`)
1. **[P0-03] Nhận diện ATM thông minh**:
   - Sử dụng `normalizeText()` bóc tách `rawText` và `finalNote`.
   - Áp dụng Regex linh hoạt cho phép số tiền nằm giữa: `"rút 500k atm"`, `"rút tiền atm 2tr"`, `"vừa rút ở cây atm 1 củ"`, `"rút tiền mặt 500k"`.
   - Khi nhận diện `isAtmWithdrawal = true`:
     - Ép tài khoản nguồn `accountId = 'acc_bank'` (dù là nhập từ chat).
     - Tài khoản đích `destinationAccountId = 'acc_cash'`.
     - `parsed.type = 'transfer'`, `catId = null`.
     - Trả về `category_name = 'Chuyển tiền nội bộ (Rút ATM)'`.
2. **[P2-02] Thêm thống kê chu kỳ lương tức thời vào Ingestion Response**:
   - Khi ghi chép thành công trong `/api/webhook`, tính toán nhanh:
     - `totalExpenseCycle`: Tổng chi tiêu chu kỳ hiện tại.
     - `safeToSpendPerDay`: Hạn mức an toàn mỗi ngày còn lại.
     - `daysRemaining`: Số ngày còn lại đến kỳ lương kế tiếp.
     - `usedPercentage`: Tỷ lệ % lương đã dùng.
   - Đính kèm vào `data.financial_health` trong JSON trả về.
3. **[P2-04] Hoàn thiện API `GET /api/analytics/comparison`**:
   - Nhận danh sách tháng từ query `months`.
   - Tổng hợp `categoryComparison` thật từ database D1 (tính `monthlyAmounts`, `diffAmount`, `diffPercentage`, `trend` 'up'|'down').
   - Tính toán `overallMoM` (chênh lệch thu, chi, tiết kiệm giữa tháng mới nhất và tháng liền trước).
4. **Deploy Worker lên Cloudflare Edge**:
   - Chạy `npx wrangler deploy` và kiểm thử các endpoint qua curl.

---

### Bước 2: Android Native App (`android/`)
1. **[P0-03 & P1-Polish] Cập nhật giao diện Chat cho giao dịch chuyển tiền**:
   - Trong `ChatScreen.kt`:
     - Nếu `tx.type == "transfer"`: Hiển thị biểu tượng `⇄`, số tiền màu xanh dương `TransferBlue` (thay vì dấu `-` đỏ).
     - Badge danh mục hiển thị: `Chuyển tiền nội bộ (Rút ATM)` với màu nền xanh pastel.
2. **[P2-02] Hiển thị thẻ sức khỏe tài chính trong phản hồi Chat**:
   - Cập nhật `Models.kt` bổ sung `financialHealth` vào `IngestResult`.
   - Render thanh trạng thái nhỏ gọn dưới Smart Receipt Card:
     - 📊 Đã tiêu kỳ này: `[X] ₫` (Đã dùng [Z]%)
     - 🛡️ Hạn mức an toàn: `[Y] ₫ / ngày` (cho [N] ngày tới).
3. **[P2-01] Xây dựng DailySummaryWorker (22h30 mỗi tối)**:
   - Tạo file `DailySummaryWorker.kt`: Lấy dữ liệu tổng chi tiêu trong ngày, tính hạn mức an toàn cho ngày mai.
   - Thêm kênh thông báo `salaria_daily_digest_channel` trong `NotificationHelper.kt`.
   - Đăng ký lịch chạy ngầm `PeriodicWorkRequest` trong `MainActivity.kt` định kỳ mỗi ngày lúc 22h30 GMT+7 (100% cục bộ, tiết kiệm pin, không cần Firebase).
4. **Biên dịch APK v1.2**:
   - Chạy `./gradlew assembleDebug` với `JDK-21`.
   - Xuất file APK hoàn thiện ra `android/Salaria.apk`.

---

### Bước 3: Desktop Web App (`frontend/`)
1. **[P2-03] Tinh giản Theme**:
   - Cập nhật `ThemeContext.tsx`: Chuẩn hóa 2 theme: `dark` (Gốc) và `github_light` (Chủ đề sáng phong cách GitHub).
   - Cập nhật `ThemeSelector.tsx`: Giao diện chuyển đổi 🌙 / ☀️ tinh gọn, nhanh chóng.
   - Cập nhật `index.css`: Thiết kế bộ màu GitHub Light chuẩn xác (`#ffffff`, `#f6f8fa`, viền `#d0d7de`, chữ `#1f2328`, accent `#0969da`).
2. **[P2-04] Kích hoạt Phân tích So sánh Đa Tháng**:
   - Kiểm tra `MultiMonthComparePage.tsx` nhận dữ liệu thật từ API `GET /api/analytics/comparison`.
   - Đảm bảo biểu đồ cột nhóm Recharts và bảng chi tiết danh mục hoạt động mượt mà.

---

## 🧪 Kế Hoạch Kiểm Thử (Verification Plan)
1. **Backend Edge API**:
   - Kiểm tra curl gửi chat `"rút 500k atm"`: Xác nhận `type = transfer`, `account_id = acc_bank`, `destination_account_id = acc_cash`.
   - Kiểm tra curl `GET /api/analytics/comparison`: Xác nhận trả về mảng `categoryComparison` và `overallMoM` có số liệu thật.
2. **Android App**:
   - Build thành công không có lỗi biên dịch.
   - Kiểm tra giao diện Chat hiển thị thẻ transfer màu xanh.
3. **Web App**:
   - Chạy `npm run build` trong `frontend/` xác nhận 0 lỗi TypeScript.
   - Chuyển đổi qua lại giữa theme Dark và GitHub Light.

---

## 🔄 Kế Hoạch Rollback
- Mã nguồn được bảo toàn qua Git commit.
- Nếu Worker phát sinh vấn đề, rollback về bản deploy trước `a222ea9d-3f0e-4340-a3da-16ba488d5507`.
