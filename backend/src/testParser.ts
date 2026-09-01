import { extractMoneyAndNote, parseTelegramHtml } from './parser/telegramParser';
import { initDatabase } from './db';

initDatabase();

console.log('--- Testing extractMoneyAndNote ---');
const testCases = [
  'Ăn sáng phở bò 45k',
  '50.000 cf Highland với bạn',
  'Cơm trưa văn phòng 55k',
  'Đổ xăng xe máy 80k',
  '+18.5tr lương công ty tháng 7',
  'Tiền phòng trọ 3tr5',
  'Tiền điện nước 450k',
  'Mua áo khoác Shopee 320k',
  'Đi siêu thị Winmart mua đồ 480.000',
  'Xem phim CGV & bắp nước 210k',
  'Trà sữa Phúc Long 65k',
  'Mua thuốc cảm sốt 75k',
  '2củ5 tiền nhà',
  'Grab đi làm 35k',
  '-250k sách udemy',
  'KFM_HCM_TDU - 05 DUONG ₫32,649 with MSB mDigi ••3420',
  '-32,649 VND\nSố thẻ: ***3420\nHM khả dụng: 55,380,215 VND\nND: The TD MSB ***3420 thuc hien GD...',
  '-25,000 VND\nTài khoản: 043xx0427\nSố dư: 71,607,695 VND\nND: Nap tien Vi ZaloPay ma giao dich ZP7D722BRDIM rrn 100001444009',
  'Google Wallet: Preparing your receipt. We\'re adding the location to your receipt',
  'Còn (1) đặc quyền chưa sử dụng Bạn có sẵn hạn mức lên đến 70.000.000đ, không cần chứng minh thu nhập, 1 phút đăng ký. Kiểm tra để khi cần thì dùng bạn nhé!',
  '+50,000 VND Tài khoản: 043xx0427 Số dư: 71,507,695 VND ND: NGUYEN VAN A chuyen tien',
  '+50.000đ từ Momo',
  '+500k',
  '+1.5tr',
  '+2tr5',
  '+50.000',
  '+35 cafe',
  '-50,000 VND Tài khoản: 043xx0427 Số dư: 71,507,695 VND ND: Nap tien Vi ZaloPay',
  'GD: +1,000,000 VND',
  'Nhận tiền từ TRAN B: 200,000 VND',
  'Hôm nay đi chơi vui quá' // Non-financial
];

testCases.forEach(tc => {
  const result = extractMoneyAndNote(tc);
  if (result) {
    console.log(`✅ MATCH: "${tc.replace(/\n/g, ' ')}" => Amount: ${result.amount.toLocaleString('vi-VN')}₫ | Type: ${result.type} | Note: "${result.note}" | Conf: ${result.confidence}`);
  } else {
    console.log(`❌ NO MATCH: "${tc.replace(/\n/g, ' ')}" (Correctly filtered out non-financial/system message)`);
  }
});
