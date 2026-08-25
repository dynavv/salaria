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
  'Hôm nay đi chơi vui quá' // Non-financial
];

testCases.forEach(tc => {
  const result = extractMoneyAndNote(tc);
  if (result) {
    console.log(`✅ MATCH: "${tc}" => Amount: ${result.amount.toLocaleString('vi-VN')}₫ | Type: ${result.type} | Note: "${result.note}" | Conf: ${result.confidence}`);
  } else {
    console.log(`❌ NO MATCH: "${tc}" (Correctly filtered out non-financial message)`);
  }
});
