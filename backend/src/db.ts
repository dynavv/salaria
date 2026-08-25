import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'finance.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'bank', 'credit', 'e-wallet', 'investment'
      balance REAL NOT NULL DEFAULT 0,
      initial_balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'VND',
      icon TEXT NOT NULL DEFAULT 'Wallet',
      color TEXT NOT NULL DEFAULT '#3b82f6',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'expense', 'income'
      group_type TEXT NOT NULL DEFAULT 'needs', -- 'needs', 'wants', 'savings', 'income' (for 50/30/20 rule)
      icon TEXT NOT NULL DEFAULT 'Tag',
      color TEXT NOT NULL DEFAULT '#64748b',
      keywords TEXT NOT NULL DEFAULT '', -- Comma-separated keywords for auto-categorization
      budget_monthly REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL, -- YYYY-MM-DD or ISO string
      amount REAL NOT NULL,
      type TEXT NOT NULL, -- 'expense', 'income', 'transfer'
      category_id TEXT,
      account_id TEXT NOT NULL,
      destination_account_id TEXT,
      note TEXT,
      source TEXT DEFAULT 'manual', -- 'manual', 'telegram_bot', 'telegram_html', 'csv'
      raw_telegram_text TEXT,
      telegram_message_id INTEGER,
      telegram_chat_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      month TEXT NOT NULL, -- YYYY-MM
      amount REAL NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(category_id, month)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS telegram_sync_logs (
      id TEXT PRIMARY KEY,
      update_id INTEGER,
      message_id INTEGER,
      chat_id TEXT,
      raw_text TEXT,
      parsed_amount REAL,
      parsed_type TEXT,
      parsed_note TEXT,
      status TEXT, -- 'success', 'ignored_command', 'parse_failed', 'edited', 'undo_deleted'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS deleted_transactions (
      id TEXT PRIMARY KEY,
      deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Run safe column migrations
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(transactions)`).all() as Array<{ name: string }>;
    const cols = new Set(tableInfo.map(c => c.name));
    if (!cols.has('telegram_message_id')) {
      db.prepare(`ALTER TABLE transactions ADD COLUMN telegram_message_id INTEGER`).run();
    }
    if (!cols.has('telegram_chat_id')) {
      db.prepare(`ALTER TABLE transactions ADD COLUMN telegram_chat_id TEXT`).run();
    }
  } catch (e) {
    // Column already exists or error handled
  }

  seedDefaultData();
}

function seedDefaultData() {
  // Check if default account exists
  const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number };
  if (accountCount.count === 0) {
    const insertAccount = db.prepare(`
      INSERT INTO accounts (id, name, type, balance, initial_balance, icon, color, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAccount.run('acc_cash', 'Tiền mặt', 'cash', 0, 0, 'Banknote', '#10b981', 1);
    insertAccount.run('acc_bank', 'Tài khoản Ngân hàng', 'bank', 0, 0, 'Building2', '#3b82f6', 0);
    insertAccount.run('acc_momo', 'Ví MoMo / ZaloPay', 'e-wallet', 0, 0, 'Smartphone', '#ec4899', 0);
    insertAccount.run('acc_credit', 'Thẻ tín dụng', 'credit', 0, 0, 'CreditCard', '#8b5cf6', 0);
  }

  // Check if default categories exist
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (categoryCount.count === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (id, name, type, group_type, icon, color, keywords, budget_monthly)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // EXPENSES - NEEDS (50%)
    insertCat.run(
      'cat_food',
      'Ăn uống',
      'expense',
      'needs',
      'UtensilsCrossed',
      '#f59e0b',
      'an,ăn,com,cơm,bun,bún,pho,phở,mi,mì,an sang,ăn sáng,an trua,ăn trưa,an toi,ăn tối,cf,cafe,cà phê,ca phe,tra sua,trà sữa,highland,starbucks,phuc long,bánh mì,banh mi,do an,đồ ăn,thit,thịt,rau,chợ,cho,sieu thi,siêu thị,winmart,coopmart,bach hoa xanh,bách hóa xanh,lotte,kfc,lotteria,pizza,tra da,trà đá',
      4000000
    );

    insertCat.run(
      'cat_housing',
      'Nhà cửa & Hóa đơn',
      'expense',
      'needs',
      'Home',
      '#6366f1',
      'tien nha,tiền nhà,tien phong,tiền phòng,tien tro,tiền trọ,dien,điện,tien dien,tiền điện,nuoc,nước,tien nuoc,tiền nước,internet,wifi,mang,mạng,rac,rác,chung cu,chung cư,dich vu,dịch vụ,ve sinh,vệ sinh,gas',
      3500000
    );

    insertCat.run(
      'cat_transport',
      'Di chuyển & Xăng xe',
      'expense',
      'needs',
      'Car',
      '#06b6d4',
      'xang,xăng,do xang,đổ xăng,gui xe,gửi xe,ve xe,vé xe,grab,be,gojek,taxi,sua xe,sửa xe,bao duong,bảo dưỡng,thay nhot,thay nhớt,rua xe,rửa xe,cau duong,cầu đường,ve bus,vé bus',
      600000
    );

    insertCat.run(
      'cat_health',
      'Sức khỏe & Y tế',
      'expense',
      'needs',
      'HeartPulse',
      '#ef4444',
      'thuoc,thuốc,mua thuoc,mua thuốc,kham benh,khám bệnh,benh vien,bệnh viện,nha khoa,rang,răng,kham mat,khám mắt,vitamin,dau goi,dầu gội,kem danh rang,kem đánh răng',
      500000
    );

    // EXPENSES - WANTS (30%)
    insertCat.run(
      'cat_shopping',
      'Mua sắm & Đồ dùng',
      'expense',
      'wants',
      'ShoppingBag',
      '#ec4899',
      'shopee,lazada,tiki,tiktok,mua sam,mua sắm,quan ao,quần áo,ao,áo,ao khoac,áo khoác,ao gio,áo gió,ao len,áo len,ao thun,áo thun,ao phong,áo phông,so mi,sơ mi,ao so mi,áo sơ mi,quan,quần,quan jean,quần jean,quan bo,quần bò,quan tay,quần tây,quan short,quần short,quan dui,quần đùi,vay,váy,dam,đầm,chan vay,chân váy,do lot,đồ lót,tat,tất,vo,vớ,giay,giày,dep,dép,sandal,sneaker,tui,túi,tui xach,túi xách,balo,ba lô,vi,ví,bop,bóp,that lung,thắt lưng,day nit,dây nịt,dong ho,đồng hồ,kinh,kính,gong kinh,gọng kính,trang suc,trang sức,nhan,nhẫn,vong tay,vòng tay,day chuyen,dây chuyền,bong tai,bông tai,my pham,mỹ phẩm,son,kem duong,srm,sua rua mat,sữa rửa mặt,nuoc hoa,nước hoa,do dien tu,đồ điện tử,chuot,chuột,ban phim,bàn phím,sac,sạc,cap sac,cáp sạc,tai nghe,headphone,op lung,ốp lưng,loa,phu kien,phụ kiện',
      1500000
    );

    insertCat.run(
      'cat_entertainment',
      'Giải trí & Dịch vụ',
      'expense',
      'wants',
      'Gamepad2',
      '#8b5cf6',
      'netflix,spotify,youtube,xem phim,rap chieu phim,rạp chiếu phim,cgv,bhd,du lich,du lịch,khach san,khách sạn,game,nap game,nạp game,nhau,nhậu,bia,bar,karaoke,hen ho,hẹn hò,party',
      1000000
    );

    insertCat.run(
      'cat_education',
      'Học tập & Phát triển',
      'expense',
      'wants',
      'GraduationCap',
      '#3b82f6',
      'sach,sách,khoa hoc,khóa học,hoc phi,học phí,tai lieu,tài liệu,tieng anh,tiếng anh,udemy,coursera,workshop',
      500000
    );

    insertCat.run(
      'cat_personal_care',
      'Cá nhân & Thể thao',
      'expense',
      'wants',
      'Smile',
      '#14b8a6',
      'cat toc,cắt tóc,gym,tap gym,tập gym,yoga,the thao,thể thao,boi,bơi,matxa,massage,spa',
      500000
    );

    insertCat.run(
      'cat_other_expense',
      'Chi tiêu khác',
      'expense',
      'wants',
      'MoreHorizontal',
      '#64748b',
      'cuoi hoi,cưới hỏi,mung,mừng,ma chay,tang le,tang lễ,cho vay,cho mượn,ung ho,ủng hộ,tu thien,từ thiện,phat,phạt',
      500000
    );

    // INCOME
    insertCat.run(
      'cat_salary',
      'Lương chính',
      'income',
      'income',
      'Briefcase',
      '#10b981',
      'luong,lương,salary,cty,công ty,nhan luong,nhận lương,ck luong,ck lương,tam ung,tạm ứng',
      0
    );

    insertCat.run(
      'cat_bonus',
      'Thưởng & Tip',
      'income',
      'income',
      'Award',
      '#22c55e',
      'thuong,thưởng,bonus,kpi,tip,tien tip,tiền tip,hoa hong,hoa hồng,commission',
      0
    );

    insertCat.run(
      'cat_side_income',
      'Thu nhập phụ / Freelance',
      'income',
      'income',
      'Coins',
      '#84cc16',
      'freelance,lam ngoai,làm ngoài,du an,dự án,part time,ban hang,bán hàng,thanh ly,thanh lý,ban do,bán đồ',
      0
    );

    insertCat.run(
      'cat_investment_income',
      'Lãi & Đầu tư',
      'income',
      'income',
      'TrendingUp',
      '#059669',
      'lai,lãi,tien lai,tiền lãi,co tuc,cổ tức,chung khoan,chứng khoán,crypto,loi nhuan,lợi nhuận,tiet kiem,tiết kiệm',
      0
    );

    insertCat.run(
      'cat_other_income',
      'Thu nhập khác',
      'income',
      'income',
      'PlusCircle',
      '#10b981',
      'duoc tang,được tặng,li xi,lì xì,hoan tien,hoàn tiền,cashback,thu hoi no,thu hồi nợ,tra no,trả nợ',
      0
    );
  }
}
