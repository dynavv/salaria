/**
 * =========================================================================
 * ỨNG DỤNG QUẢN LÝ TÀI CHÍNH CÁ NHÂN - GOOGLE APPS SCRIPT BACKEND
 * =========================================================================
 * Bot Telegram: @nav_expense_tracker_bot
 * 100% Cloud Serverless - Chạy 24/7 Miễn Phí Trên Google Cloud
 */

var BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
var SECRET_TOKEN = 'YOUR_SECRET_TOKEN_HERE';
var ALLOWED_CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID';

/**
 * 1. KHỞI TẠO CÁC SHEET MẪU NẾU CHƯA CÓ (Chạy 1 lần đầu tiên)
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Sheet 1: Transactions
  let txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) {
    txSheet = ss.insertSheet('Transactions');
    txSheet.appendRow(['id', 'date', 'amount', 'type', 'category', 'account', 'note', 'source', 'raw_telegram_text', 'created_at']);
    txSheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#1e293b').setFontColor('#f8fafc');
  }

  // Sheet 2: Categories
  let catSheet = ss.getSheetByName('Categories');
  if (!catSheet) {
    catSheet = ss.insertSheet('Categories');
    catSheet.appendRow(['id', 'name', 'type', 'group_type', 'icon', 'color', 'keywords', 'budget_monthly']);
    catSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#1e293b').setFontColor('#f8fafc');
    
    // Default categories
    const defaultCats = [
      ['cat_food', 'Ăn uống', 'expense', 'needs', 'UtensilsCrossed', '#f59e0b', 'an,ăn,com,cơm,sang,sáng,trua,trưa,toi,tối,cafe,cà phê,tra,trà,sua,sữa,bun,bún,pho,phở,banh,bánh,nhau,nhậu,bia,luong kho,lương khô', 4000000],
      ['cat_housing', 'Nhà cửa & Hóa đơn', 'expense', 'needs', 'Home', '#3b82f6', 'nha,nhà,tro,trọ,dien,điện,nuoc,nước,wifi,internet,rac,rác,chung cu,chung cư,tien nha,tiền nhà', 4500000],
      ['cat_transport', 'Đi lại & Xe cộ', 'expense', 'needs', 'Car', '#06b6d4', 'xang,xăng,grab,be,gojek,taxi,xe,gui xe,gửi xe,sua xe,sửa xe,rua xe,rửa xe,ve xe,vé xe', 800000],
      ['cat_health', 'Sức khỏe & Y tế', 'expense', 'needs', 'HeartPulse', '#ef4444', 'thuoc,thuốc,kham,khám,benh,bệnh,vien,viện,nha khoa,mat kinh,mắt kính,gym,yoga,vitamin', 500000],
      ['cat_shopping', 'Mua sắm & Đồ dùng', 'expense', 'wants', 'ShoppingBag', '#ec4899', 'shopee,lazada,tiki,tiktok,mua sam,mua sắm,quan ao,quần áo,ao,áo,ao khoac,áo khoác,ao thun,áo thun,quan jean,quần jean,giay,giày,dep,dép,balo,tui,túi,vi,ví,dong ho,đồng hồ,tai nghe,sac,sạc,op lung,ốp lưng', 1500000],
      ['cat_entertainment', 'Giải trí & Dịch vụ', 'expense', 'wants', 'Gamepad2', '#8b5cf6', 'phim,cinema,game,steam,netflix,spotify,youtube,du lich,du lịch,ve xem,vé xem,karaoke,hen ho,hẹn hò,party', 1000000],
      ['cat_education', 'Học tập & Phát triển', 'expense', 'wants', 'GraduationCap', '#10b981', 'hoc,học,sach,sách,khoa hoc,khóa học,thi,bang,bằng,lai xe,lái xe,hoc phi,học phí', 1000000],
      ['cat_other_expense', 'Chi tiêu khác', 'expense', 'wants', 'HelpCircle', '#64748b', 'khac,khác,linh tinh,phat,phạt,danh roi,đánh rơi', 500000],
      ['cat_salary', 'Lương chính', 'income', 'income', 'Briefcase', '#10b981', 'luong,lương,salary,cty,cong ty,công ty,nhan luong,nhận lương', 0],
      ['cat_bonus', 'Thưởng & Làm thêm', 'income', 'income', 'Gift', '#f59e0b', 'thuong,thưởng,bonus,freelance,ot,tip,du an,dự án', 0],
      ['cat_other_income', 'Thu nhập khác', 'income', 'income', 'Coins', '#06b6d4', 'lai,lãi,tiet kiem,tiết kiệm,ban do,bán đồ,hoan tien,hoàn tiền,cashback,ck den,ck đến', 0]
    ];
    defaultCats.forEach(r => catSheet.appendRow(r));
  }

  // Sheet 3: Accounts
  let accSheet = ss.getSheetByName('Accounts');
  if (!accSheet) {
    accSheet = ss.insertSheet('Accounts');
    accSheet.appendRow(['id', 'name', 'type', 'balance', 'icon', 'color', 'is_default']);
    accSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#1e293b').setFontColor('#f8fafc');
    
    accSheet.appendRow(['acc_cash', 'Tiền mặt', 'cash', 2000000, 'Banknote', '#10b981', 1]);
    accSheet.appendRow(['acc_bank', 'Tài khoản Ngân hàng', 'bank', 15000000, 'Landmark', '#3b82f6', 0]);
    accSheet.appendRow(['acc_momo', 'Ví MoMo', 'e-wallet', 500000, 'Smartphone', '#ec4899', 0]);
  }
}

/**
 * 2. ĐĂNG KÝ WEBHOOK VỚI TELEGRAM (Chạy 1 lần sau khi Deploy Web App)
 * Thay WEB_APP_URL bằng URL sau khi bấm Deploy
 */
function setTelegramWebhook() {
  const WEB_APP_URL = ScriptApp.getService().getUrl();
  if (!WEB_APP_URL) {
    Logger.log('⚠️ Hãy Deploy Web App trước (Execute as Me, Who has access: Anyone)');
    return;
  }
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(WEB_APP_URL)}`;
  const res = UrlFetchApp.fetch(url);
  Logger.log('Kết quả đăng ký Webhook: ' + res.getContentText());
}

/**
 * 3. XỬ LÝ POST REQUEST (Telegram Webhook 24/7 & Web App API)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput('OK');
    }

    const data = JSON.parse(e.postData.contents);

    // TH1: Telegram Webhook Update
    if (data.update_id && (data.message || data.edited_message)) {
      handleTelegramMessage(data.message || data.edited_message, Boolean(data.edited_message));
      return ContentService.createTextOutput('OK');
    }

    // TH2: API Gọi từ Web App (Tạo / Sửa / Xóa giao dịch)
    if (data.action) {
      const result = handleWebAppAction(data);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput('OK');
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 4. XỬ LÝ GET REQUEST (Web App lấy toàn bộ dữ liệu)
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Đọc Transactions
    const txSheet = ss.getSheetByName('Transactions');
    const txData = txSheet ? txSheet.getDataRange().getValues() : [];
    const transactions = [];
    if (txData.length > 1) {
      const headers = txData[0];
      for (let i = 1; i < txData.length; i++) {
        const row = txData[i];
        if (!row[0]) continue;
        const rawDate = row[1];
        let dateStr = '';
        if (rawDate instanceof Date) {
          dateStr = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        } else {
          dateStr = String(rawDate).split('T')[0];
        }
        
        transactions.push({
          id: String(row[0]),
          date: dateStr,
          amount: Number(row[2]) || 0,
          type: String(row[3]) || 'expense',
          category_name: String(row[4]) || 'Chi tiêu khác',
          account_name: String(row[5]) || 'Tiền mặt',
          note: String(row[6]) || '',
          source: String(row[7]) || 'telegram_bot',
          raw_telegram_text: String(row[8]) || '',
          created_at: String(row[9]) || ''
        });
      }
    }

    // Đọc Categories
    const catSheet = ss.getSheetByName('Categories');
    const catData = catSheet ? catSheet.getDataRange().getValues() : [];
    const categories = [];
    if (catData.length > 1) {
      for (let i = 1; i < catData.length; i++) {
        const row = catData[i];
        if (!row[0]) continue;
        categories.push({
          id: String(row[0]),
          name: String(row[1]),
          type: String(row[2]),
          group_type: String(row[3]),
          icon: String(row[4]),
          color: String(row[5]),
          keywords: String(row[6]),
          budget_monthly: Number(row[7]) || 0
        });
      }
    }

    // Đọc Accounts
    const accSheet = ss.getSheetByName('Accounts');
    const accData = accSheet ? accSheet.getDataRange().getValues() : [];
    const accounts = [];
    if (accData.length > 1) {
      for (let i = 1; i < accData.length; i++) {
        const row = accData[i];
        if (!row[0]) continue;
        accounts.push({
          id: String(row[0]),
          name: String(row[1]),
          type: String(row[2]),
          balance: Number(row[3]) || 0,
          icon: String(row[4]),
          color: String(row[5]),
          is_default: Number(row[6]) || 0
        });
      }
    }

    const payload = {
      success: true,
      data: {
        transactions,
        categories,
        accounts
      }
    };

    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 5. BÓC TÁCH & GHI TIN NHẮN TELEGRAM VÀO SHEET
 */
function handleTelegramMessage(msg, isEdit) {
  if (!msg || !msg.text) return;
  const rawText = msg.text.trim();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) return;

  // Lệnh xóa nhanh: /undo, /xoa, xóa, hủy
  const undoCommands = ['/xoa', '/undo', '/delete', 'xoa', 'xóa', 'huy', 'hủy'];
  if (undoCommands.includes(rawText.toLowerCase())) {
    const lastRow = txSheet.getLastRow();
    if (lastRow > 1) {
      txSheet.deleteRow(lastRow);
    }
    return;
  }

  // Nếu là edit message, xóa các dòng cũ có cùng message_id nếu có
  const msgDate = new Date(msg.date * 1000);
  const dateStr = Utilities.formatDate(msgDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  // Lấy danh mục từ sheet Categories
  const catSheet = ss.getSheetByName('Categories');
  const catData = catSheet ? catSheet.getDataRange().getValues() : [];
  const categories = [];
  if (catData.length > 1) {
    for (let i = 1; i < catData.length; i++) {
      categories.push({
        id: catData[i][0],
        name: catData[i][1],
        type: catData[i][2],
        keywords: (catData[i][6] || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
      });
    }
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const parsed = parseTelegramLine(line);
    if (!parsed || parsed.amount <= 0) continue;

    const matchedCat = matchCategory(line, parsed.type, categories);
    const catName = matchedCat ? matchedCat.name : (parsed.type === 'income' ? 'Thu nhập khác' : 'Chi tiêu khác');
    const txId = 'tx_gs_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    txSheet.appendRow([
      txId,
      dateStr,
      parsed.amount,
      parsed.type,
      catName,
      'Tiền mặt',
      parsed.note,
      'telegram_bot',
      line,
      nowStr
    ]);
  }
}

/**
 * 6. BỘ PHÂN TÍCH TIẾNG VIỆT TỰ NHIÊN CHO GOOGLE APPS SCRIPT
 */
function parseTelegramLine(line) {
  let explicitType = null;
  if (line.startsWith('+') || /^thu\s*[:\-\s]/i.test(line)) explicitType = 'income';
  else if (line.startsWith('-') || /^chi\s*[:\-\s]/i.test(line)) explicitType = 'expense';

  let amount = 0;
  let matchedStr = '';

  // 1. 2tr5, 1m2
  let match = line.match(/(?:^|\s)([-+]?\s*\d+)\s*(?:tr|triệu|trieu|củ|cu|m)\s*(\d+)(?:\s|$|[^\w\d])/i);
  if (match) {
    const whole = parseFloat(match[1].replace(/\s+/g, ''));
    const frac = parseFloat(match[2]);
    const fracMult = frac >= 10 ? Math.pow(10, 6 - frac.toString().length) : 100000;
    amount = Math.abs(whole) * 1000000 + frac * fracMult;
    matchedStr = match[0];
  }

  // 2. 1.5tr, 10tr
  if (!amount) {
    match = line.match(/(?:^|\s)([-+]?\s*\d+(?:[.,]\d+)?)\s*(?:tr|triệu|trieu|củ|cu|m)(?:\s|$|[^\w\d])/i);
    if (match) {
      const val = parseFloat(match[1].replace(/\s+/g, '').replace(',', '.'));
      amount = Math.abs(val) * 1000000;
      matchedStr = match[0];
    }
  }

  // 3. 50k, 150 k
  if (!amount) {
    match = line.match(/(?:^|\s)([-+]?\s*\d+(?:[.,]\d+)?)\s*(?:k|nghìn|nghin|ngàn|ngan)(?:\s|$|[^\w\d])/i);
    if (match) {
      const val = parseFloat(match[1].replace(/\s+/g, '').replace(',', '.'));
      amount = Math.abs(val) * 1000;
      matchedStr = match[0];
    }
  }

  // 4. 50.000, 50000đ
  if (!amount) {
    match = line.match(/(?:^|\s)([-+]?\s*\d{1,3}(?:[.,]\d{3})+(?:\s*(?:đ|d|vnd))?)(?:\s|$|[^\w\d])/i);
    if (match) {
      amount = parseInt(match[1].replace(/[^\d]/g, ''), 10);
      matchedStr = match[0];
    }
  }

  // 5. 50000
  if (!amount) {
    match = line.match(/(?:^|\s)([-+]?\s*\d{4,9})(?:\s*(?:đ|d|vnd))?(?:\s|$|[^\w\d])/i);
    if (match) {
      const val = parseInt(match[1].replace(/[^\d]/g, ''), 10);
      if (val !== 2024 && val !== 2025 && val !== 2026 && val >= 1000) {
        amount = val;
        matchedStr = match[0];
      }
    }
  }

  // 6. Số rút gọn 35 cafe, cafe 35, 120 ăn tối
  if (!amount) {
    match = line.match(/(?:^|\s)([-+]?\s*\d{2,3})(?:\s|$|[^\w\d])/i);
    if (match) {
      const val = parseInt(match[1].replace(/[^\d]/g, ''), 10);
      if (val >= 10 && val <= 999) {
        amount = val * 1000;
        matchedStr = match[0];
      }
    }
  }

  if (!amount || amount <= 0) return null;

  let cleanNote = line.replace(matchedStr.trim(), '').replace(/^[+\-:\s]+/, '').replace(/[+\-:\s]+$/, '').trim();
  if (!cleanNote) cleanNote = 'Chi tiêu';

  let finalType = explicitType || 'expense';
  if (!explicitType) {
    const norm = normalizeText(line);
    if (norm.includes('luong kho') || norm.includes('lương khô')) {
      finalType = 'expense';
    } else {
      const incomeKws = ['luong cty', 'lương cty', 'nhan luong', 'nhận lương', 'salary', 'thuong', 'thưởng', 'bonus', 'hoan tien', 'hoàn tiền', 'lai', 'lãi', 'cashback', 'ck den', 'ck đến'];
      if (incomeKws.some(kw => norm.includes(kw))) {
        finalType = 'income';
      }
    }
  }

  return { amount, type: finalType, note: cleanNote };
}

function matchCategory(text, type, categories) {
  const norm = normalizeText(text);
  const filtered = categories.filter(c => c.type === type);
  let best = null;
  let maxScore = 0;

  for (const cat of filtered) {
    for (const kw of cat.keywords) {
      if (norm.includes(kw) && kw.length > maxScore) {
        maxScore = kw.length;
        best = cat;
      }
    }
  }
  return best;
}

function normalizeText(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * 7. XỬ LÝ CÁC ACTION TỪ WEB APP (Tạo / Xóa / Cập nhật)
 */
function handleWebAppAction(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) return { success: false, error: 'Không tìm thấy sheet Transactions' };

  if (data.action === 'deleteTransaction' && data.id) {
    const values = txSheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(data.id)) {
        txSheet.deleteRow(i + 1);
        return { success: true, message: 'Đã xóa giao dịch' };
      }
    }
    return { success: false, error: 'Không tìm thấy ID giao dịch' };
  }

  if (data.action === 'createTransaction' && data.transaction) {
    const t = data.transaction;
    const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const txId = t.id || ('tx_web_' + Date.now());
    txSheet.appendRow([
      txId,
      t.date,
      t.amount,
      t.type,
      t.category_name || 'Chi tiêu khác',
      t.account_name || 'Tiền mặt',
      t.note || '',
      t.source || 'manual',
      t.raw_telegram_text || '',
      nowStr
    ]);
    return { success: true, id: txId };
  }

  return { success: false, error: 'Action không hợp lệ' };
}
