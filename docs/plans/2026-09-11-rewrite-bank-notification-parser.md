# 📋 Implementation Plan — Viết Lại Toàn Bộ Hệ Thống Nhận Diện Thông Báo Ngân Hàng (Dedicated Bank Parser)

**Ngày tạo:** 11/09/2026  
**Trọng tâm:** Xóa bỏ toàn bộ các đoạn vá chắp vá (hacks) giữa Chat Parser và Bank Parser. Thiết kế module độc lập, chuyên biệt `bank_parser.ts` cho bộ ba ứng dụng mục tiêu (**MSB**, **Google Wallet**, **ZaloPay**), khắc phục triệt để lỗi bỏ sót giao dịch Google Wallet, chặn đứng 100% tin rác ZaloPay (như 60k nạp game), phục hồi số dư và dọn sạch nhật ký hệ thống.

---

## 1. Bối Cảnh & Vấn Đề (Problem Statement)

1. **Sự lẫn lộn tai hại giữa Chat Parser và Bank Parser**:
   - Hiện tại, `ingest.ts` đang tái sử dụng hàm `parseMoneyAndNote` vốn dùng cho chat tự nhiên (ví dụ: *"cà phê 25k"*).
   - Vì hàm này hỗ trợ từ viết tắt không dấu `60k` ➔ Khi tin rác ZaloPay gửi *"Nhận 60K nạp LoL..."*, hệ thống tưởng là giao dịch thật 60.000 ₫ và trừ tiền vào tài khoản!
2. **Cơ chế Title-First cứng nhắc làm mất giao dịch Google Wallet**:
   - Google Wallet đưa Tên điểm bán / Cửa hàng lên **Title** (`KFM_HCM_TDU - TMDV CIT`), còn Số tiền thực tế nằm ở **Body** (`₫160,200 with MSB mDigi ••3420`).
   - Bộ lọc cũ chỉ nhìn vào Title, thấy không có tiền biến động ➔ Bỏ qua giao dịch `160.200 ₫` của người dùng.
3. **Spam nhật ký và hàng đợi offline cũ**:
   - `MainActivity.onResume()` liên tục bắn log `rebind thành công` mỗi lần người dùng chuyển màn hình.
   - Hàng đợi Room DB trên máy còn sót các noti cũ bị đẩy lên gây nhân đôi giao dịch.

---

## 2. Thiết Kế Kiến Trúc Mới: Dedicated Bank Parser (`bank_parser.ts`)

Tách biệt hoàn toàn luồng xử lý thông báo ngân hàng thành module độc lập `backend/src/services/bank_parser.ts` với 3 parser chuẩn hóa tuyệt đối:

### 2.1. Google Wallet Parser (`parseGoogleWallet`)
- **Dấu hiệu nhận diện**:
  - `packageName == 'com.google.android.apps.walletnfcrel'` HOẶC
  - Body/Text khớp mẫu: `[₫$đ]?\s*([\d.,]+)\s*(?:VND|vnd|đ|₫|\$)?\s+with\s+(.+)` (ví dụ: `₫160,200 with MSB mDigi ••3420`).
- **Xử lý**:
  - **Số tiền (`amount`)**: Trích xuất chính xác `160200` từ Body.
  - **Loại (`type`)**: Luôn là `expense` (thanh toán quẹt thẻ).
  - **Ghi chú (`note`)**: Lấy trực tiếp từ **Title** (Tên điểm bán: `KFM_HCM_TDU - TMDV CIT`).
  - **Thẻ thanh toán**: Bóc tách `MSB mDigi ••3420` để mapping vào tài khoản ngân hàng `acc_bank`.
  - **Lọc rác**: Bỏ qua các thông báo hệ thống như *"Preparing your receipt"*, *"We're adding location"*.

### 2.2. MSB DigiBank Parser (`parseMSB`)
- **Dấu hiệu nhận diện**:
  - `packageName == 'com.msb.digibank.retail'` HOẶC Title/Text chứa thông tin MSB.
  - **Title BẮT BUỘC** phải khớp pattern biến động số dư có dấu:
    `^([+-])\s*([\d.,]+)\s*(?:VND|vnd|đ|₫|\bđ\b)`
    *(Ví dụ: `-40,500 VND`, `-49,000 VND`, `+69,000 VND`, `-35,000 VND`).*
- **Xử lý**:
  - **Số tiền & Loại**: `+` ➔ `income`, `-` ➔ `expense`.
  - **Ghi chú (`note`)**: Trích xuất từ Body sau khi làm sạch các trường kỹ thuật (`Số thẻ: ***3420`, `HM khả dụng`, `ND:`, `ma giao dich`, `rrn`).
  - **Bảo vệ tuyệt đối**: Nếu Title không có dấu `+` hoặc `-` đi kèm đơn vị tiền tệ ➔ **Loại bỏ 100%**, không cho lọt bất kỳ tin quảng cáo/mời vay nào.

### 2.3. ZaloPay Parser (`parseZaloPay`)
- **Dấu hiệu nhận diện**:
  - `packageName == 'vn.com.vng.zalopay'` HOẶC Text chứa ZaloPay.
  - **Title BẮT BUỘC** phải có dấu `+` hoặc `-` kèm số tiền rõ ràng:
    `^([+-])\s*([\d.,]+)\s*(?:đ|₫|VND|vnd)`
- **Lọc rác đa tầng**:
  - Chặn đứng mọi tin chứa từ khóa tiếp thị: `loa báo`, `bảo hiểm`, `skin`, `lol`, `game`, `nạp lol`, `caps`, `ưu đãi`, `voucher`, `săn vé`, `vé`, `giảm ngay`, `chỉ từ`.
  - Nghiêm cấm bóc tách từ viết tắt trơ trọi như `60K`, `40k` khi không có dấu `+` hoặc `-` của biến động số dư thực tế.

---

## 3. Kế Hoạch Thay Đổi Chi Tiết (Proposed Changes)

### 3.1. Backend Cloudflare
- **[NEW] `backend/src/services/bank_parser.ts`**:
  - Viết mới toàn bộ logic nhận diện chuyên biệt cho MSB, Google Wallet, ZaloPay.
- **[MODIFY] `backend/src/routes/ingest.ts`**:
  - Xóa bỏ toàn bộ các đoạn if/else chắp vá cũ cho `isBankNoti`.
  - Chuyển thẳng `isBankNoti` sang `parseBankNotification(title, body, rawText, packageName)`.
  - Giữ `parseMoneyAndNote` nguyên bản chỉ phục vụ Chat tự nhiên.

### 3.2. Dọn Dẹp Dữ Liệu D1 Database
- **Hoàn trả số dư & xóa giao dịch rác 60k**:
  - Xóa `tx_1789091963458_90lds` (ZaloPay nạp skin LoL).
  - Hoàn trả lại 60.000 ₫ cho `acc_bank`.
- **Ghi nhận bổ sung giao dịch Google Wallet bị bỏ sót**:
  - Thêm giao dịch: `-160.200 ₫` tại `KFM_HCM_TDU - TMDV CIT` (Thẻ MSB mDigi ••3420).
  - Khấu trừ 160.200 ₫ vào tài khoản `acc_bank` để số dư thực tế khớp hoàn hảo.
- **Làm sạch nhật ký `system_logs`**:
  - Xóa các dòng log rác cũ để giao diện Cài đặt sạch sẽ hoàn toàn.

### 3.3. Android Native Client
- **[MODIFY] `MainActivity.kt`**:
  - Xóa dòng log rebind trong `onResume()` để triệt tiêu spam log.
- **[MODIFY] `BankNotificationListener.kt`**:
  - Truyền `packageName` lên `IngestRequest` để Backend nhận diện chính xác nguồn phát thông báo.
  - Tự động xóa sạch bảng `offline_transactions` khi app khởi động để tránh đồng bộ lại dữ liệu lỗi cũ.

---

## 4. Kế Hoạch Kiểm Thử (Verification Plan)

### Kiểm Thử Unit Test Parser Cục Bộ:
1. Google Wallet: `Title: KFM_HCM_TDU - TMDV CIT`, `Body: ₫160,200 with MSB mDigi ••3420` ➔ ✅ Nhận diện 160.200 ₫, chi tiêu, note đúng tên quán.
2. MSB: `Title: -35,000 VND`, `Body: 043***427 ND: Nap tien Vi ZaloPay...` ➔ ✅ Nhận diện 35.000 ₫ chi tiêu.
3. MSB: `Title: +69,000 VND`, `Body: 043***427 ND: Bo kho cf tks isp` ➔ ✅ Nhận diện 69.000 ₫ thu nhập.
4. ZaloPay rác: `Title: Nhận 60K nạp LoL mua skin Caps` ➔ 🛑 Bị từ chối ngay lập tức (không có dấu biến động).
5. ZaloPay rác: `Title: Bảo hiểm xe sắp hết hạn rồi!` ➔ 🛑 Bị từ chối ngay lập tức.
6. Chat thông thường: `cà phê 25k` ➔ ✅ Vẫn bóc tách bình thường trong tab Chat.
