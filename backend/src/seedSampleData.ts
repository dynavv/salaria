import { db, initDatabase } from './db';

initDatabase();

// Clear existing transactions for fresh sample demo
db.prepare('DELETE FROM transactions').run();

const insertTx = db.prepare(`
  INSERT INTO transactions (id, date, amount, type, category_id, account_id, note, source, raw_telegram_text)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Sample data for June 2026 (Tháng 6)
const juneData = [
  { d: '2026-06-01', a: 18000000, t: 'income', c: 'cat_salary', acc: 'acc_bank', n: 'Lương tháng 5', raw: '+18tr luong' },
  { d: '2026-06-02', a: 3500000, t: 'expense', c: 'cat_housing', acc: 'acc_bank', n: 'Tiền phòng trọ T6', raw: '3tr5 tien nha' },
  { d: '2026-06-03', a: 450000, t: 'expense', c: 'cat_housing', acc: 'acc_bank', n: 'Tiền điện nước mạng', raw: 'dien nuoc 450k' },
  { d: '2026-06-05', a: 50000, t: 'expense', c: 'cat_food', acc: 'acc_cash', n: 'Ăn sáng phở bò', raw: 'an sang 50k' },
  { d: '2026-06-06', a: 60000, t: 'expense', c: 'cat_food', acc: 'acc_cash', n: 'Cơm trưa văn phòng', raw: 'com trua 60k' },
  { d: '2026-06-07', a: 45000, t: 'expense', c: 'cat_food', acc: 'acc_momo', n: 'Cafe Highland', raw: 'cf highland 45k' },
  { d: '2026-06-08', a: 80000, t: 'expense', c: 'cat_transport', acc: 'acc_cash', n: 'Đổ xăng xe máy', raw: 'do xang 80k' },
  { d: '2026-06-12', a: 1200000, t: 'expense', c: 'cat_shopping', acc: 'acc_credit', n: 'Mua giày thể thao', raw: 'mua giay 1.2tr' },
  { d: '2026-06-15', a: 2500000, t: 'expense', c: 'cat_food', acc: 'acc_bank', n: 'Tiền chợ & siêu thị tháng 6', raw: 'sieu thi 2.5tr' },
  { d: '2026-06-18', a: 200000, t: 'expense', c: 'cat_entertainment', acc: 'acc_momo', n: 'Xem phim CGV', raw: 'xem phim 200k' },
  { d: '2026-06-25', a: 55000, t: 'expense', c: 'cat_food', acc: 'acc_cash', n: 'Trà sữa Phúc Long', raw: 'tra sua 55k' },
];

// Sample data for July 2026 (Tháng 7)
const julyData = [
  { d: '2026-07-01', a: 18500000, t: 'income', c: 'cat_salary', acc: 'acc_bank', n: 'Lương tháng 6', raw: '+18.5tr luong' },
  { d: '2026-07-02', a: 3500000, t: 'expense', c: 'cat_housing', acc: 'acc_bank', n: 'Tiền phòng trọ T7', raw: '3tr5 tien nha' },
  { d: '2026-07-03', a: 520000, t: 'expense', c: 'cat_housing', acc: 'acc_bank', n: 'Tiền điện nước T7', raw: 'dien nuoc 520k' },
  { d: '2026-07-05', a: 55000, t: 'expense', c: 'cat_food', acc: 'acc_cash', n: 'Bún bò Huế', raw: 'bun bo 55k' },
  { d: '2026-07-06', a: 65000, t: 'expense', c: 'cat_food', acc: 'acc_cash', n: 'Cơm sườn nướng', raw: 'com suon 65k' },
  { d: '2026-07-08', a: 90000, t: 'expense', c: 'cat_transport', acc: 'acc_cash', n: 'Đổ xăng xe máy', raw: 'do xang 90k' },
  { d: '2026-07-10', a: 2100000, t: 'expense', c: 'cat_shopping', acc: 'acc_credit', n: 'Mua sắm Shopee đợt 7/7', raw: 'shopee 2.1tr' },
  { d: '2026-07-14', a: 2800000, t: 'expense', c: 'cat_food', acc: 'acc_bank', n: 'Siêu thị Winmart', raw: 'winmart 2.8tr' },
  { d: '2026-07-20', a: 350000, t: 'expense', c: 'cat_entertainment', acc: 'acc_momo', n: 'Ăn tối bạn bè & bia', raw: 'an toi nhau 350k' },
  { d: '2026-07-22', a: 65000, t: 'expense', c: 'cat_food', acc: 'acc_momo', n: 'Trà sữa KOI', raw: 'tra sua koi 65k' },
  { d: '2026-07-28', a: 2000000, t: 'income', c: 'cat_side_income', acc: 'acc_bank', n: 'Làm dự án ngoài', raw: '+2tr freelance' },
];

// Sample data for August 2026 (Tháng 8)
const augustData = [
  { d: '2026-08-01', a: 18500000, t: 'income', c: 'cat_salary', acc: 'acc_bank', n: 'Lương tháng 7', raw: '+18.5tr luong' },
  { d: '2026-08-02', a: 3500000, t: 'expense', c: 'cat_housing', acc: 'acc_bank', n: 'Tiền phòng trọ T8', raw: '3tr5 tien nha' },
  { d: '2026-08-03', a: 480000, t: 'expense', c: 'cat_housing', acc: 'acc_bank', n: 'Tiền điện nước T8', raw: 'dien nuoc 480k' },
  { d: '2026-08-04', a: 45000, t: 'expense', c: 'cat_food', acc: 'acc_cash', n: 'Ăn sáng phở bò', raw: 'an sang 45k' },
  { d: '2026-08-05', a: 50000, t: 'expense', c: 'cat_food', acc: 'acc_momo', n: 'Cafe Highland', raw: '50.000 cf highland' },
  { d: '2026-08-07', a: 80000, t: 'expense', c: 'cat_transport', acc: 'acc_cash', n: 'Đổ xăng xe máy', raw: 'xang xe 80k' },
  { d: '2026-08-10', a: 350000, t: 'expense', c: 'cat_shopping', acc: 'acc_credit', n: 'Mua áo sơ mi Shopee', raw: 'mua ao shopee 350k' },
  { d: '2026-08-12', a: 2200000, t: 'expense', c: 'cat_food', acc: 'acc_bank', n: 'Đi chợ & mua thực phẩm', raw: 'di cho 2.2tr' },
  { d: '2026-08-15', a: 210000, t: 'expense', c: 'cat_entertainment', acc: 'acc_momo', n: 'Xem phim CGV', raw: 'xem phim 210k' },
  { d: '2026-08-16', a: 65000, t: 'expense', c: 'cat_food', acc: 'acc_cash', n: 'Trà sữa Phúc Long', raw: 'tra sua phuc long 65k' },
  { d: '2026-08-18', a: 75000, t: 'expense', c: 'cat_health', acc: 'acc_cash', n: 'Mua thuốc cảm sốt', raw: 'mua thuoc 75k' },
  { d: '2026-08-19', a: 55000, t: 'expense', c: 'cat_food', acc: 'acc_cash', n: 'Cơm trưa văn phòng', raw: 'com trua 55k' },
];

const allData = [...juneData, ...julyData, ...augustData];

for (const item of allData) {
  const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  insertTx.run(id, item.d, item.a, item.t, item.c, item.acc, item.n, 'telegram_html', item.raw);
}

console.log(`✅ Seeded ${allData.length} realistic transactions across June, July, and August 2026!`);
