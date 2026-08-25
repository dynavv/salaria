var BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
var SECRET_TOKEN = 'YOUR_SECRET_TOKEN_HERE';
var ALLOWED_CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID';

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) {
    txSheet = ss.insertSheet('Transactions');
    txSheet.appendRow(['id', 'date', 'amount', 'type', 'category', 'account', 'note', 'source', 'raw_telegram_text', 'created_at']);
    txSheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#1e293b').setFontColor('#f8fafc');
  }

  var catSheet = ss.getSheetByName('Categories');
  if (!catSheet) {
    catSheet = ss.insertSheet('Categories');
    catSheet.appendRow(['id', 'name', 'type', 'group_type', 'icon', 'color', 'keywords', 'budget_monthly']);
    catSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#1e293b').setFontColor('#f8fafc');
    
    var cats = [
      ['cat_food', 'An uong', 'expense', 'needs', 'UtensilsCrossed', '#f59e0b', 'an,com,sang,trua,toi,cafe,tra,sua,bun,pho,banh,nhau,bia,luong kho,che,chè,banh trang,bánh tráng,an uong', 4000000],
      ['cat_housing', 'Nha cua & Hoa don', 'expense', 'needs', 'Home', '#3b82f6', 'nha,tro,dien,nuoc,wifi,internet,rac,tien nha,hoa don', 4500000],
      ['cat_transport', 'Di lai & Xe co', 'expense', 'needs', 'Car', '#06b6d4', 'xang,grab,be,gojek,taxi,xe,gui xe,sua xe,rua xe', 800000],
      ['cat_health', 'Suc khoe & Y te', 'expense', 'needs', 'HeartPulse', '#ef4444', 'thuoc,kham,benh,vien,gym,yoga,y te', 500000],
      ['cat_shopping', 'Mua sam & Do dung', 'expense', 'wants', 'ShoppingBag', '#ec4899', 'shopee,lazada,tiki,tiktok,mua sam,quan ao,ao khoac,ao thun,quan jean,giay,dep,balo,tui,vi,dong ho,tai nghe,sac', 1500000],
      ['cat_entertainment', 'Giai tri & Dich vu', 'expense', 'wants', 'Gamepad2', '#8b5cf6', 'phim,cinema,game,steam,netflix,spotify,du lich,karaoke', 1000000],
      ['cat_education', 'Hoc tap & Phat trien', 'expense', 'wants', 'GraduationCap', '#10b981', 'hoc,sach,khoa hoc,thi,bang,lai xe,hoc phi', 1000000],
      ['cat_other_expense', 'Chi tieu khac', 'expense', 'wants', 'HelpCircle', '#64748b', 'khac,linh tinh,phat', 500000],
      ['cat_salary', 'Luong chinh', 'income', 'income', 'Briefcase', '#10b981', 'luong,salary,cty,nhan luong', 0],
      ['cat_bonus', 'Thuong & Lam them', 'income', 'income', 'Gift', '#f59e0b', 'thuong,bonus,freelance', 0],
      ['cat_other_income', 'Thu nhap khac', 'income', 'income', 'Coins', '#06b6d4', 'lai,tiet kiem,cashback,ck den', 0]
    ];
    for (var i = 0; i < cats.length; i++) {
      catSheet.appendRow(cats[i]);
    }
  }

  var accSheet = ss.getSheetByName('Accounts');
  if (!accSheet) {
    accSheet = ss.insertSheet('Accounts');
    accSheet.appendRow(['id', 'name', 'type', 'balance', 'icon', 'color', 'is_default']);
    accSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#1e293b').setFontColor('#f8fafc');
    accSheet.appendRow(['acc_cash', 'Tien mat', 'cash', 2000000, 'Banknote', '#10b981', 1]);
    accSheet.appendRow(['acc_bank', 'Tai khoan Ngan hang', 'bank', 15000000, 'Landmark', '#3b82f6', 0]);
  }
}

// 2. TU DONG DONG BO TELEGRAM 24/7 BANG TRIGGER CLOUD MOI 1 PHUT
function pollTelegramUpdates() {
  var props = PropertiesService.getScriptProperties();
  var lastOffset = parseInt(props.getProperty('LAST_OFFSET') || '0', 10);
  
  var offsetParam = lastOffset > 0 ? (lastOffset + 1) : 0;
  var url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/getUpdates?offset=' + offsetParam + '&limit=100';
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var json = JSON.parse(res.getContentText());
  
  if (!json.ok || !json.result || json.result.length === 0) return;
  
  var updates = json.result;
  var highestId = lastOffset;
  
  for (var i = 0; i < updates.length; i++) {
    var u = updates[i];
    if (u.update_id > highestId) highestId = u.update_id;
    if (u.message || u.edited_message) {
      handleTelegramMessage(u.message || u.edited_message);
    }
  }
  
  props.setProperty('LAST_OFFSET', String(highestId));
}

// 3. XU LY GET REQUEST (Web App lay du lieu)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var txSheet = ss.getSheetByName('Transactions');
    var txData = txSheet ? txSheet.getDataRange().getValues() : [];
    var transactions = [];
    for (var i = 1; i < txData.length; i++) {
      var row = txData[i];
      if (!row[0]) continue;
      var dStr = row[1] instanceof Date ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[1]).split('T')[0];
      transactions.push({
        id: String(row[0]),
        date: dStr,
        amount: Number(row[2]) || 0,
        type: String(row[3]) || 'expense',
        category_name: String(row[4]) || 'Chi tieu khac',
        account_name: String(row[5]) || 'Tien mat',
        note: String(row[6]) || '',
        source: String(row[7]) || 'telegram_bot',
        raw_telegram_text: String(row[8]) || '',
        created_at: String(row[9]) || ''
      });
    }

    var catSheet = ss.getSheetByName('Categories');
    var catData = catSheet ? catSheet.getDataRange().getValues() : [];
    var categories = [];
    for (var j = 1; j < catData.length; j++) {
      var r = catData[j];
      if (!r[0]) continue;
      categories.push({
        id: String(r[0]),
        name: String(r[1]),
        type: String(r[2]),
        group_type: String(r[3]),
        icon: String(r[4]),
        color: String(r[5]),
        keywords: String(r[6]),
        budget_monthly: Number(r[7]) || 0
      });
    }

    var accSheet = ss.getSheetByName('Accounts');
    var accData = accSheet ? accSheet.getDataRange().getValues() : [];
    var accounts = [];
    for (var k = 1; k < accData.length; k++) {
      var a = accData[k];
      if (!a[0]) continue;
      accounts.push({
        id: String(a[0]),
        name: String(a[1]),
        type: String(a[2]),
        balance: Number(a[3]) || 0,
        icon: String(a[4]),
        color: String(a[5]),
        is_default: Number(a[6]) || 0
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: { transactions: transactions, categories: categories, accounts: accounts }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleTelegramMessage(msg) {
  if (!msg || !msg.text) return;
  var rawText = msg.text.trim();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) return;

  var lower = rawText.toLowerCase();
  if (lower === '/xoa' || lower === '/undo' || lower === 'xoa' || lower === 'xóa' || lower === 'huy' || lower === 'hủy') {
    var lastRow = txSheet.getLastRow();
    if (lastRow > 1) {
      txSheet.deleteRow(lastRow);
    }
    return;
  }

  var msgDate = new Date(msg.date * 1000);
  var dateStr = Utilities.formatDate(msgDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  var catSheet = ss.getSheetByName('Categories');
  var catData = catSheet ? catSheet.getDataRange().getValues() : [];
  var categories = [];
  if (catData.length > 1) {
    for (var i = 1; i < catData.length; i++) {
      categories.push({
        name: String(catData[i][1]),
        type: String(catData[i][2]),
        keywords: String(catData[i][6] || '').split(',')
      });
    }
  }

  var lines = rawText.split('\n');
  for (var j = 0; j < lines.length; j++) {
    var line = lines[j].trim();
    if (!line) continue;

    var parsed = parseLine(line);
    if (!parsed || parsed.amount <= 0) continue;

    var catName = matchCat(line, parsed.type, categories);
    if (!catName) {
      catName = parsed.type === 'income' ? 'Thu nhap khac' : 'Chi tieu khac';
    }

    var txId = 'tx_gs_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000);
    txSheet.appendRow([
      txId,
      dateStr,
      parsed.amount,
      parsed.type,
      catName,
      'Tien mat',
      parsed.note,
      'telegram_bot',
      line,
      nowStr
    ]);
  }
}

function parseLine(line) {
  var explicitType = null;
  if (line.indexOf('+') === 0 || /^thu\s*[:\-\s]/i.test(line)) explicitType = 'income';
  else if (line.indexOf('-') === 0 || /^chi\s*[:\-\s]/i.test(line)) explicitType = 'expense';

  var amount = 0;
  var matched = '';

  var m = line.match(/(?:^|\s)([-+]?\s*\d+)\s*(?:tr|triệu|trieu|củ|cu|m)\s*(\d+)(?:\s|$|[^\w\d])/i);
  if (m) {
    var whole = parseFloat(m[1].replace(/\s+/g, ''));
    var frac = parseFloat(m[2]);
    var mult = frac >= 10 ? Math.pow(10, 6 - String(m[2]).length) : 100000;
    amount = Math.abs(whole) * 1000000 + frac * mult;
    matched = m[0];
  }

  if (!amount) {
    m = line.match(/(?:^|\s)([-+]?\s*\d+(?:[.,]\d+)?)\s*(?:tr|triệu|trieu|củ|cu|m)(?:\s|$|[^\w\d])/i);
    if (m) {
      amount = Math.abs(parseFloat(m[1].replace(',', '.'))) * 1000000;
      matched = m[0];
    }
  }

  if (!amount) {
    m = line.match(/(?:^|\s)([-+]?\s*\d+(?:[.,]\d+)?)\s*(?:k|nghìn|nghin|ngàn|ngan)(?:\s|$|[^\w\d])/i);
    if (m) {
      amount = Math.abs(parseFloat(m[1].replace(',', '.'))) * 1000;
      matched = m[0];
    }
  }

  if (!amount) {
    m = line.match(/(?:^|\s)([-+]?\s*\d{1,3}(?:[.,]\d{3})+(?:\s*(?:đ|d|vnd))?)(?:\s|$|[^\w\d])/i);
    if (m) {
      amount = parseInt(m[1].replace(/[^\d]/g, ''), 10);
      matched = m[0];
    }
  }

  if (!amount) {
    m = line.match(/(?:^|\s)([-+]?\s*\d{4,9})(?:\s*(?:đ|d|vnd))?(?:\s|$|[^\w\d])/i);
    if (m) {
      var val = parseInt(m[1].replace(/[^\d]/g, ''), 10);
      if (val >= 1000 && val !== 2024 && val !== 2025 && val !== 2026) {
        amount = val;
        matched = m[0];
      }
    }
  }

  if (!amount) {
    m = line.match(/(?:^|\s)([-+]?\s*\d{2,3})(?:\s|$|[^\w\d])/i);
    if (m) {
      var sval = parseInt(m[1].replace(/[^\d]/g, ''), 10);
      if (sval >= 10 && sval <= 999) {
        amount = sval * 1000;
        matched = m[0];
      }
    }
  }

  if (!amount || amount <= 0) return null;

  var note = line.replace(matched.trim(), '').replace(/^[+\-:\s]+/, '').replace(/[+\-:\s]+$/, '').trim();
  if (!note) note = 'Chi tieu';

  var type = explicitType || 'expense';
  if (!explicitType) {
    var norm = removeAccents(line);
    if (norm.indexOf('luong kho') === -1) {
      var incomeWords = ['luong cty', 'nhan luong', 'salary', 'thuong', 'bonus', 'hoan tien', 'lai', 'ck den'];
      for (var k = 0; k < incomeWords.length; k++) {
        if (norm.indexOf(incomeWords[k]) !== -1) {
          type = 'income';
          break;
        }
      }
    }
  }

  return { amount: amount, type: type, note: note };
}

function matchCat(text, type, categories) {
  var norm = removeAccents(text);
  var bestName = null;
  var maxScore = 0;

  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    if (cat.type !== type) continue;

    for (var j = 0; j < cat.keywords.length; j++) {
      var kw = removeAccents(cat.keywords[j].trim().toLowerCase());
      if (kw && norm.indexOf(kw) !== -1 && kw.length > maxScore) {
        maxScore = kw.length;
        bestName = cat.name;
      }
    }
  }
  return bestName;
}

function removeAccents(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
