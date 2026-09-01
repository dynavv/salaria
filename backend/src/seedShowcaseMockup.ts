import { db, initDatabase } from './db';

export function seedShowcaseData() {
  initDatabase();

  console.log('🚀 Đang khởi tạo bộ dữ liệu Mockup Showcase chất lượng cao cho Salaria...');

  // 1. Dọn sạch các bảng
  db.exec(`
    DELETE FROM transactions;
    DELETE FROM accounts;
    DELETE FROM categories;
    DELETE FROM budgets;
    DELETE FROM telegram_sync_logs;
  `);

  // 2. Thiết lập Tài khoản / Ví thông minh
  const insertAcc = db.prepare(`
    INSERT INTO accounts (id, name, type, balance, initial_balance, icon, color, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAcc.run('acc_cash', 'Tiền mặt hàng ngày', 'cash', 3250000, 3250000, 'Banknote', '#10b981', 1);
  insertAcc.run('acc_msb', 'MSB DigiBank (Lương)', 'bank', 26800000, 26800000, 'Landmark', '#3b82f6', 0);
  insertAcc.run('acc_zalopay', 'Ví ZaloPay / MoMo', 'e-wallet', 1450000, 1450000, 'Smartphone', '#ec4899', 0);
  insertAcc.run('acc_credit', 'Thẻ Visa Platinum', 'credit', -3420000, 0, 'CreditCard', '#8b5cf6', 0);

  // 3. Thiết lập Danh mục chuẩn
  const insertCat = db.prepare(`
    INSERT INTO categories (id, name, type, group_type, icon, color, keywords, budget_monthly)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Chi tiêu - Thiết yếu (Needs - 50%)
  insertCat.run('cat_food', 'Ăn uống & Cà phê', 'expense', 'needs', 'UtensilsCrossed', '#f59e0b', 'an,com,sang,trua,toi,cafe,ca phe,cà phê,cf,coffee,highlands,phuc long,tra,sua,bun,pho,banh,tra da,do an,thit,rau,cho,sieu thi,winmart,coopmart', 4500000);
  insertCat.run('cat_housing', 'Nhà cửa & Hóa đơn', 'expense', 'needs', 'Home', '#6366f1', 'nha,tro,dien,nuoc,wifi,internet,rac,tien nha,hoa don,evn,chung cu', 4500000);
  insertCat.run('cat_transport', 'Di chuyển & Xăng xe', 'expense', 'needs', 'Car', '#06b6d4', 'xang,grab,be,gojek,taxi,xe,gui xe,sua xe,rua xe,petrolimex,ve bus', 900000);
  insertCat.run('cat_health', 'Sức khỏe & Y tế', 'expense', 'needs', 'HeartPulse', '#ef4444', 'thuoc,kham,benh,vien,gym,yoga,y te,pharmacity,long chau,vitamin', 600000);

  // Chi tiêu - Sở thích (Wants - 30%)
  insertCat.run('cat_shopping', 'Mua sắm & Đồ dùng', 'expense', 'wants', 'ShoppingBag', '#ec4899', 'shopee,lazada,tiki,tiktok,mua sam,quan ao,ao khoac,ao thun,quan jean,giay,dep,balo,dong ho,tai nghe,sac', 1800000);
  insertCat.run('cat_entertainment', 'Giải trí & Dịch vụ', 'expense', 'wants', 'Gamepad2', '#8b5cf6', 'phim,cinema,cgv,game,steam,netflix,spotify,du lich,nhau,bia,karaoke', 1200000);
  insertCat.run('cat_education', 'Học tập & Phát triển', 'expense', 'wants', 'GraduationCap', '#3b82f6', 'hoc,sach,khoa hoc,thi,bang,udemy,coursera,hoc phi', 800000);
  insertCat.run('cat_personal_care', 'Cá nhân & Thể thao', 'expense', 'wants', 'Smile', '#14b8a6', 'cat toc,cắt tóc,massage,spa,boi', 500000);
  insertCat.run('cat_other_expense', 'Chi tiêu khác', 'expense', 'wants', 'HelpCircle', '#64748b', 'khac,linh tinh,phat,zalopay,vi zalopay,nap tien', 500000);

  // Thu nhập
  insertCat.run('cat_salary', 'Lương chính', 'income', 'income', 'Briefcase', '#10b981', 'luong,salary,cty,nhan luong,cong ty', 0);
  insertCat.run('cat_side_income', 'Thưởng & Freelance', 'income', 'income', 'Coins', '#f59e0b', 'thuong,bonus,freelance,du an,lam ngoai', 0);
  insertCat.run('cat_investment_income', 'Lãi & Đầu tư', 'income', 'income', 'TrendingUp', '#059669', 'lai,tiet kiem,cashback,co tuc', 0);

  // 4. Sinh dữ liệu giao dịch phong phú (Tháng 6, 7, 8, và 9/2026)
  const insertTx = db.prepare(`
    INSERT INTO transactions (id, date, amount, type, category_id, account_id, note, source, raw_telegram_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // --- THÁNG 8/2026 (THÁNG TRỌNG TÂM CHỤP ẢNH SHOWCASE) ---
  // Thu nhập tháng 8
  insertTx.run('tx_m8_inc1', '2026-08-01', 22000000, 'income', 'cat_salary', 'acc_msb', 'Lương công ty Tech Corp tháng 7', 'telegram_bot', '+22tr luong cty');
  insertTx.run('tx_m8_inc2', '2026-08-15', 2500000, 'income', 'cat_side_income', 'acc_msb', 'Thù lao dự án Freelance UI/UX', 'telegram_bot', '+2.5tr freelance');
  insertTx.run('tx_m8_inc3', '2026-08-25', 180000, 'income', 'cat_investment_income', 'acc_msb', 'Tiền lãi gửi tiết kiệm online', 'telegram_bot', '+180k lai tiet kiem');

  // Chi tiêu cố định tháng 8
  insertTx.run('tx_m8_exp1', '2026-08-02', 3800000, 'expense', 'cat_housing', 'acc_msb', 'Tiền phòng căn hộ dịch vụ T8', 'telegram_bot', '3tr8 tien nha');
  insertTx.run('tx_m8_exp2', '2026-08-03', 520000, 'expense', 'cat_housing', 'acc_zalopay', 'Hóa đơn tiền điện EVN & Nước', 'telegram_bot', 'dien nuoc 520k');
  insertTx.run('tx_m8_exp3', '2026-08-04', 280000, 'expense', 'cat_housing', 'acc_zalopay', 'Internet cáp quang Viettel T8', 'telegram_bot', 'internet 280k');

  // Chi tiêu mua sắm & giải trí tháng 8
  insertTx.run('tx_m8_exp4', '2026-08-08', 650000, 'expense', 'cat_shopping', 'acc_credit', 'Áo khoác gió Uniqlo chống nắng', 'telegram_bot', 'shopee 650k ao khoac');
  insertTx.run('tx_m8_exp5', '2026-08-12', 380000, 'expense', 'cat_shopping', 'acc_credit', 'Cáp sạc nhanh Baseus Type-C', 'telegram_bot', 'mua cap sac 380k');
  insertTx.run('tx_m8_exp6', '2026-08-16', 220000, 'expense', 'cat_entertainment', 'acc_zalopay', 'Vé xem phim CGV IMAX & bắp nước', 'telegram_bot', 'cgv 220k xem phim');
  insertTx.run('tx_m8_exp7', '2026-08-20', 260000, 'expense', 'cat_entertainment', 'acc_msb', 'Gói gia đình Spotify & Netflix', 'telegram_bot', 'netflix 260k');
  insertTx.run('tx_m8_exp8', '2026-08-22', 450000, 'expense', 'cat_education', 'acc_credit', 'Khóa học TypeScript Pro trên Udemy', 'telegram_bot', 'udemy 450k hoc ts');
  insertTx.run('tx_m8_exp9', '2026-08-26', 150000, 'expense', 'cat_personal_care', 'acc_cash', 'Cắt tóc & gội đầu 30shine', 'telegram_bot', 'cat toc 150k');

  // Siêu thị & đi chợ tháng 8
  insertTx.run('tx_m8_exp10', '2026-08-06', 750000, 'expense', 'cat_food', 'acc_msb', 'Đi siêu thị Winmart mua thực phẩm tuần', 'telegram_bot', 'winmart 750k');
  insertTx.run('tx_m8_exp11', '2026-08-14', 820000, 'expense', 'cat_food', 'acc_msb', 'Siêu thị KingFoodMart trái cây & thịt cá', 'telegram_bot', 'kfm 820k di cho');
  insertTx.run('tx_m8_exp12', '2026-08-21', 690000, 'expense', 'cat_food', 'acc_msb', 'Siêu thị Co.opmart đồ khô & gia vị', 'telegram_bot', 'coopmart 690k');

  // Sinh các khoản ăn uống hàng ngày, cafe và đi lại trải đều 31 ngày
  for (let day = 1; day <= 31; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const date = `2026-08-${dayStr}`;

    // Cơm trưa văn phòng
    if (day % 7 !== 0 && day % 7 !== 6) {
      const lunchPrices = [45000, 50000, 55000, 60000];
      const lunchNames = ['Cơm tấm sườn bì', 'Cơm văn phòng kiểu Nhật', 'Bún bò Huế', 'Phở bò tái nạm', 'Cơm gà xối mỡ'];
      const p = lunchPrices[day % lunchPrices.length];
      const n = lunchNames[day % lunchNames.length];
      insertTx.run(`tx_m8_lunch_${day}`, date, p, 'expense', 'cat_food', 'acc_cash', n, 'telegram_bot', `${Math.round(p/1000)}k ${n}`);
    }

    // Hiệu ứng Latte: Cafe sáng / Trà sữa / Snack nhỏ lẻ (≤ 60k)
    if (day % 2 === 0 || day % 3 === 0) {
      const latteItems = [
        { note: 'Cafe Highlands Phin Sữa', amount: 39000, raw: '39k cafe highlands' },
        { note: 'Trà sữa Phúc Long Oolong', amount: 55000, raw: '55k tra sua phuc long' },
        { note: 'Cà phê muối chú Long', amount: 25000, raw: '25k ca phe muoi' },
        { note: 'Bánh mì chả que ăn sáng', amount: 25000, raw: '25k banh mi' },
        { note: 'Cà phê đen đá vỉa hè', amount: 18000, raw: '18k cf da' },
        { note: 'Circle K kem matcha & snack', amount: 32000, raw: '32k circle k' },
      ];
      const item = latteItems[day % latteItems.length];
      insertTx.run(`tx_m8_latte_${day}`, date, item.amount, 'expense', 'cat_food', 'acc_zalopay', item.note, 'telegram_bot', item.raw);
    }

    // Đi lại & Xăng xe định kỳ
    if (day === 5 || day === 15 || day === 25) {
      insertTx.run(`tx_m8_gas_${day}`, date, 90000, 'expense', 'cat_transport', 'acc_cash', 'Đổ đầy bình xăng Petrolimex', 'telegram_bot', '90k do xang');
    }
    if (day === 10 || day === 19 || day === 28) {
      insertTx.run(`tx_m8_grab_${day}`, date, 42000, 'expense', 'cat_transport', 'acc_zalopay', 'GrabBike trời mưa đi làm', 'telegram_bot', 'grab 42k');
    }
  }

  // --- THÁNG 9/2026 (THÁNG ĐANG DIỄN RA) ---
  insertTx.run('tx_m9_inc1', '2026-09-01', 22000000, 'income', 'cat_salary', 'acc_msb', 'Lương công ty Tech Corp tháng 8', 'telegram_bot', '+22tr luong cty');
  insertTx.run('tx_m9_exp1', '2026-09-01', 45000, 'expense', 'cat_food', 'acc_cash', 'Cơm trưa bún thịt nướng', 'telegram_bot', '45k com trua');
  insertTx.run('tx_m9_exp2', '2026-09-01', 25000, 'expense', 'cat_food', 'acc_zalopay', 'Cà phê sữa đá sáng', 'telegram_bot', '25k cafe sang');
  insertTx.run('tx_m9_exp3', '2026-09-01', 90000, 'expense', 'cat_transport', 'acc_cash', 'Đổ xăng xe máy', 'telegram_bot', '90k xang');

  // --- THÁNG 7/2026 (DỮ LIỆU ĐỂ SO SÁNH) ---
  insertTx.run('tx_m7_inc1', '2026-07-01', 21500000, 'income', 'cat_salary', 'acc_msb', 'Lương tháng 6', 'telegram_bot', '+21.5tr luong');
  insertTx.run('tx_m7_inc2', '2026-07-20', 3000000, 'income', 'cat_side_income', 'acc_msb', 'Thưởng KPI Quý 2', 'telegram_bot', '+3tr thuong kpi');
  insertTx.run('tx_m7_exp1', '2026-07-02', 3800000, 'expense', 'cat_housing', 'acc_msb', 'Tiền phòng trọ T7', 'telegram_bot', '3tr8 tien nha');
  insertTx.run('tx_m7_exp2', '2026-07-03', 490000, 'expense', 'cat_housing', 'acc_zalopay', 'Tiền điện nước T7', 'telegram_bot', 'dien nuoc 490k');
  insertTx.run('tx_m7_exp3', '2026-07-10', 1850000, 'expense', 'cat_shopping', 'acc_credit', 'Săn sale Shopee 7/7 tai nghe Sony', 'telegram_bot', 'shopee 1.85tr tai nghe');
  insertTx.run('tx_m7_exp4', '2026-07-15', 2100000, 'expense', 'cat_food', 'acc_msb', 'Tiền siêu thị & ăn uống gia đình', 'telegram_bot', 'sieu thi 2.1tr');
  insertTx.run('tx_m7_exp5', '2026-07-22', 1200000, 'expense', 'cat_entertainment', 'acc_zalopay', 'Đi dã ngoại Vũng Tàu cuối tuần', 'telegram_bot', 'du lich 1.2tr');

  // --- THÁNG 6/2026 (DỮ LIỆU ĐỂ SO SÁNH) ---
  insertTx.run('tx_m6_inc1', '2026-06-01', 21000000, 'income', 'cat_salary', 'acc_msb', 'Lương tháng 5', 'telegram_bot', '+21tr luong');
  insertTx.run('tx_m6_exp1', '2026-06-02', 3800000, 'expense', 'cat_housing', 'acc_msb', 'Tiền phòng trọ T6', 'telegram_bot', '3tr8 tien nha');
  insertTx.run('tx_m6_exp2', '2026-06-03', 460000, 'expense', 'cat_housing', 'acc_zalopay', 'Tiền điện nước T6', 'telegram_bot', 'dien nuoc 460k');
  insertTx.run('tx_m6_exp3', '2026-06-12', 1200000, 'expense', 'cat_shopping', 'acc_credit', 'Mua giày chạy bộ Nike', 'telegram_bot', 'mua giay nike 1.2tr');
  insertTx.run('tx_m6_exp4', '2026-06-18', 2400000, 'expense', 'cat_food', 'acc_msb', 'Tiền chợ và siêu thị T6', 'telegram_bot', 'sieu thi 2.4tr');

  console.log('✅ Đã nạp thành công bộ dữ liệu Mockup Showcase hoàn hảo cho Salaria!');
}

// Chạy trực tiếp nếu gọi từ CLI
if (require.main === module) {
  seedShowcaseData();
}
