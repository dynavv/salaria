// ==========================================
// ⚙️ CẤU HÌNH BẢO MẬT (THAY BẰNG THÔNG TIN CỦA BẠN)
// ==========================================
var BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN'; // Điền Token từ @BotFather
var SECRET_TOKEN = 'YOUR_SECRET_TOKEN_HERE'; // Đặt mật khẩu bí mật (vd: salaria_secret_2026)
var ALLOWED_CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID'; // Điền Chat ID của bạn (lấy từ @userinfobot)

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName('Transactions') || ss.insertSheet('Transactions');
  if (txSheet.getLastRow() === 0) {
    txSheet.appendRow(['id', 'date', 'amount', 'type', 'category', 'account', 'note', 'source', 'raw_telegram_text', 'created_at']);
    txSheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#1e293b').setFontColor('#f8fafc');
  }

  var catSheet = ss.getSheetByName('Categories') || ss.insertSheet('Categories');
  if (catSheet.getLastRow() === 0) {
    catSheet.appendRow(['id', 'name', 'type', 'group_type', 'icon', 'color', 'keywords', 'budget_monthly']);
    catSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#1e293b').setFontColor('#f8fafc');
    var cats = [
      ['cat_food', 'An uong', 'expense', 'needs', 'UtensilsCrossed', '#f59e0b', 'an,com,sang,trua,toi,cafe,ca phe,cà phê,cf,coffee,highlands,phuc long,tra,sua,bun,pho,banh,nhau,bia,luong kho,che,chè,banh trang,bánh tráng,the coffee house,starbucks,an uong,nuoc mia,nuoc ngot,trai cay', 4000000],
      ['cat_housing', 'Nha cua & Hoa don', 'expense', 'needs', 'Home', '#3b82f6', 'nha,tro,dien,wifi,internet,rac,tien nha,hoa don,evn,tien nuoc,hoa don nuoc', 4500000],
      ['cat_transport', 'Di lai & Xe co', 'expense', 'needs', 'Car', '#06b6d4', 'xang,grab,be,gojek,taxi,xe,gui xe,sua xe,rua xe,petrolimex,ve xe,xe khach,ac quy', 800000],
      ['cat_health', 'Suc khoe & Y te', 'expense', 'needs', 'HeartPulse', '#ef4444', 'thuoc,kham,benh,vien,gym,yoga,y te,pharmacity,long chau', 500000],
      ['cat_shopping', 'Mua sam & Do dung', 'expense', 'wants', 'ShoppingBag', '#ec4899', 'shopee,lazada,tiki,tiktok,mua sam,quan ao,ao khoac,ao thun,quan jean,giay,dep,balo,tui,vi,dong ho,tai nghe,sac,sieu thi,winmart,coopmart,tops market,bach hoa xanh,camera,lens,flash,cable', 1500000],
      ['cat_entertainment', 'Giai tri & Dich vu', 'expense', 'wants', 'Gamepad2', '#8b5cf6', 'phim,cinema,cgv,galaxy,game,steam,netflix,spotify,du lich,karaoke,ve phim,xem phim,acc', 1000000],
      ['cat_education', 'Hoc tap & Phat trien', 'expense', 'wants', 'GraduationCap', '#10b981', 'hoc,sach,khoa hoc,thi,bang,lai xe,hoc phi', 1000000],
      ['cat_other_expense', 'Chi tieu khac', 'expense', 'wants', 'HelpCircle', '#64748b', 'khac,linh tinh,phat,zalopay,vi zalopay,nap tien', 500000],
      ['cat_salary', 'Luong chinh', 'income', 'income', 'Briefcase', '#10b981', 'luong,salary,cty,nhan luong', 0],
      ['cat_bonus', 'Thuong & Lam them', 'income', 'income', 'Gift', '#f59e0b', 'thuong,bonus,freelance', 0],
      ['cat_other_income', 'Thu nhap khac', 'income', 'income', 'Coins', '#06b6d4', 'lai,tiet kiem,cashback,ck den,nhan tien', 0]
    ];
    for (var i = 0; i < cats.length; i++) catSheet.appendRow(cats[i]);
  }

  var accSheet = ss.getSheetByName('Accounts') || ss.insertSheet('Accounts');
  if (accSheet.getLastRow() === 0) {
    accSheet.appendRow(['id', 'name', 'type', 'balance', 'icon', 'color', 'is_default']);
    accSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#1e293b').setFontColor('#f8fafc');
    accSheet.appendRow(['acc_cash', 'Tien mat', 'cash', 2000000, 'Banknote', '#10b981', 1]);
    accSheet.appendRow(['acc_bank', 'Tai khoan Ngan hang', 'bank', 15000000, 'Landmark', '#3b82f6', 0]);
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return ContentService.createTextOutput('OK');
    var raw = e.postData.contents;
    var data = {};
    try {
      data = JSON.parse(raw);
    } catch (ex) {
      data = { secret_token: SECRET_TOKEN, message: { chat: { id: ALLOWED_CHAT_ID }, text: raw } };
    }
    
    if (data.secret_token !== SECRET_TOKEN) {
      return ContentService.createTextOutput('Forbidden').setMimeType(ContentService.MimeType.TEXT);
    }

    if (data.message || data.edited_message) {
      var msg = data.message || data.edited_message;
      if (String(msg.chat.id) !== String(ALLOWED_CHAT_ID)) {
        return ContentService.createTextOutput('Unauthorized Chat ID');
      }
      handleTelegramMessage(msg);
    }
    return ContentService.createTextOutput('OK');
  } catch (err) {
    return ContentService.createTextOutput('OK');
  }
}

function doGet(e) {
  try {
    var token = (e && e.parameter) ? e.parameter.token : '';
    if (token !== SECRET_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Forbidden: Invalid Token' })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var txSheet = ss.getSheetByName('Transactions');
    var txData = txSheet ? txSheet.getDataRange().getValues() : [];
    var transactions = [];
    for (var i = 1; i < txData.length; i++) {
      var row = txData[i];
      if (!row[0]) continue;
      var dStr = row[1] instanceof Date ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[1]).split('T')[0];
      transactions.push({
        id: String(row[0]), date: dStr, amount: Number(row[2]) || 0, type: String(row[3]) || 'expense',
        category_name: String(row[4]) || 'Chi tieu khac', account_name: String(row[5]) || 'Tien mat', note: String(row[6]) || '',
        source: String(row[7]) || 'telegram_bot', raw_telegram_text: String(row[8]) || '', created_at: String(row[9]) || ''
      });
    }

    var catSheet = ss.getSheetByName('Categories');
    var catData = catSheet ? catSheet.getDataRange().getValues() : [];
    var categories = [];
    for (var j = 1; j < catData.length; j++) {
      var r = catData[j];
      if (!r[0]) continue;
      categories.push({ id: String(r[0]), name: String(r[1]), type: String(r[2]), group_type: String(r[3]), icon: String(r[4]), color: String(r[5]), keywords: String(r[6]), budget_monthly: Number(r[7]) || 0 });
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: { transactions: transactions, categories: categories } })).setMimeType(ContentService.MimeType.JSON);
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
  if (['/xoa', '/undo', 'xoa', 'xóa', 'huy', 'hủy'].indexOf(lower) !== -1) {
    var lastRow = txSheet.getLastRow();
    if (lastRow > 1) {
      txSheet.deleteRow(lastRow);
      sendTelegramMessage(ALLOWED_CHAT_ID, '🗑️ Đã xóa giao dịch gần nhất khỏi sổ!');
    }
    return;
  }

  var msgDate = new Date((msg.date || Math.floor(Date.now() / 1000)) * 1000);
  var dateStr = Utilities.formatDate(msgDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  // Đọc danh mục động trực tiếp từ tab Categories
  var catSheet = ss.getSheetByName('Categories');
  var catData = catSheet ? catSheet.getDataRange().getValues() : [];
  var categories = [];
  for (var i = 1; i < catData.length; i++) {
    categories.push({
      rowIdx: i + 1,
      name: String(catData[i][1]),
      type: String(catData[i][2]),
      keywords: String(catData[i][6] || '').split(','),
      budget: Number(catData[i][7]) || 0,
      group_type: String(catData[i][3])
    });
  }

  var isBankNotification = /Số tiền|So tien|Số dư|So du|Hạn mức|Han muc|Số thẻ|So the|Tài khoản|Tai khoan|GD:|TK\s*\d|Thanh toan|Thanh toán|VND|vnd|₫|\$|vietcombank|techcombank|mbbank|tpbank|momo|hsbc|msb|zalopay|wallet/i.test(rawText);
  var source = isBankNotification ? 'bank_notification' : 'telegram_bot';
  var account = isBankNotification ? 'Tai khoan Ngan hang' : 'Tien mat';

  // 🧠 1. DẠY TỪ KHÓA MỚI (Ví dụ: "cà phê = Ăn uống" hoặc "netflix = Giải trí")
  if (rawText.indexOf('=') !== -1 && !isBankNotification) {
    var parts = rawText.split('=');
    if (parts.length === 2) {
      var kw = parts[0].trim().toLowerCase();
      var targetCatInput = parts[1].trim();
      if (kw && targetCatInput) {
        var targetNorm = removeAccents(targetCatInput);
        var matchedRow = -1, matchedCatName = '';
        for (var k = 0; k < categories.length; k++) {
          var c = categories[k];
          var cNorm = removeAccents(c.name);
          if (cNorm.indexOf(targetNorm) !== -1 || targetNorm.indexOf(cNorm) !== -1) {
            matchedRow = c.rowIdx;
            matchedCatName = c.name;
            break;
          }
        }
        if (matchedRow > 0) {
          var currentKw = String(catSheet.getRange(matchedRow, 7).getValue() || '');
          if (currentKw.indexOf(kw) === -1) {
            var updatedKw = currentKw ? currentKw + ',' + kw : kw;
            catSheet.getRange(matchedRow, 7).setValue(updatedKw);
          }
          
          var lastRow = txSheet.getLastRow();
          if (lastRow > 1) {
            txSheet.getRange(lastRow, 5).setValue(matchedCatName);
          }

          sendTelegramMessage(ALLOWED_CHAT_ID, '🧠 <b>ĐÃ HỌC TỪ KHÓA MỚI:</b>\n• Từ khóa: <b>"' + kw + '"</b> ➜ Danh mục: <b>[' + matchedCatName + ']</b>\n<i>Từ nay các giao dịch liên quan sẽ tự động vào ' + matchedCatName + '!</i>');
          return;
        }
      }
    }
  }

  var addedList = [];

  // 💳 XỬ LÝ THÔNG BÁO NGÂN HÀNG & GOOGLE WALLET
  if (isBankNotification) {
    var parsedBank = parseBankNotification(rawText);
    if (parsedBank && parsedBank.amount > 0) {
      var catName = matchCat(parsedBank.note + ' ' + rawText, parsedBank.type, categories) || (parsedBank.type === 'income' ? 'Thu nhap khac' : 'Chi tieu khac');
      var txId = 'tx_gs_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000);
      
      // 🛡️ Chống trùng lặp 60 giây
      var lastRow = txSheet.getLastRow();
      var isDuplicate = false;
      if (lastRow > 1) {
        var checkCount = Math.min(lastRow - 1, 5);
        var recentRows = txSheet.getRange(lastRow - checkCount + 1, 1, checkCount, 10).getValues();
        var nowTime = new Date().getTime();
        for (var rIdx = 0; rIdx < recentRows.length; rIdx++) {
          var rVal = recentRows[rIdx];
          var rAmt = Number(rVal[2]) || 0;
          var rDate = rVal[1] instanceof Date ? Utilities.formatDate(rVal[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(rVal[1]).split('T')[0];
          var rCreated = rVal[9] ? new Date(rVal[9]).getTime() : 0;
          
          if (rAmt === parsedBank.amount && rDate === dateStr && (nowTime - rCreated < 60000)) {
            var targetRowIndex = lastRow - checkCount + 1 + rIdx;
            txSheet.getRange(targetRowIndex, 5).setValue(catName);
            txSheet.getRange(targetRowIndex, 7).setValue(parsedBank.note);
            isDuplicate = true;
            break;
          }
        }
      }

      if (!isDuplicate) {
        txSheet.appendRow([txId, dateStr, parsedBank.amount, parsedBank.type, catName, account, parsedBank.note, source, rawText.replace(/\n+/g, ' | '), nowStr]);
        addedList.push({ amount: parsedBank.amount, type: parsedBank.type, catName: catName, note: parsedBank.note });
      }
    }
  } else {
    // ✏️ XỬ LÝ TIN NHẮN THỦ CÔNG TỪ TELEGRAM
    var lines = rawText.split('\n');

    var hasAnyAmount = false;
    for (var c = 0; c < lines.length; c++) {
      var p = parseLine(lines[c].trim());
      if (p && p.amount > 0) { hasAnyAmount = true; break; }
    }

    if (!hasAnyAmount && rawText.length > 0) {
      var lastRow = txSheet.getLastRow();
      if (lastRow > 1) {
        var lastRowData = txSheet.getRange(lastRow, 1, 1, 10).getValues()[0];
        var lastAmt = Number(lastRowData[2]) || 0;
        var lastType = String(lastRowData[3]) || 'expense';
        var newCatName = matchCat(rawText, lastType, categories) || (lastType === 'income' ? 'Thu nhap khac' : 'An uong');
        
        txSheet.getRange(lastRow, 5).setValue(newCatName);
        txSheet.getRange(lastRow, 7).setValue(rawText);

        sendTelegramMessage(ALLOWED_CHAT_ID, '✏️ <b>ĐÃ CẬP NHẬT GIAO DỊCH (' + formatMoney(lastAmt) + '):</b>\n• 📁 Danh mục: <b>' + newCatName + '</b>\n• 📝 Ghi chú: <i>' + rawText + '</i>');
        return;
      }
    }

    for (var j = 0; j < lines.length; j++) {
      var line = lines[j].trim();
      if (!line) continue;
      var parsed = parseLine(line);
      if (!parsed || parsed.amount <= 0) continue;
      var catName = matchCat(line, parsed.type, categories) || (parsed.type === 'income' ? 'Thu nhap khac' : 'Chi tieu khac');
      var txId = 'tx_gs_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000);
      
      txSheet.appendRow([txId, dateStr, parsed.amount, parsed.type, catName, account, parsed.note, source, line, nowStr]);
      addedList.push({ amount: parsed.amount, type: parsed.type, catName: catName, note: parsed.note });
    }
  }

  // 🔔 GỬI TIN NHẮN PHẢN HỒI XÁC NHẬN TELEGRAM
  if (addedList.length > 0) {
    var replyText = isBankNotification ? '💳 <b>ĐÃ TỰ ĐỘNG GHI NHẬN NGÂN HÀNG:</b>\n' : '✅ <b>ĐÃ LƯU GIAO DỊCH:</b>\n';
    for (var k = 0; k < addedList.length; k++) {
      var item = addedList[k];
      var sign = item.type === 'income' ? '+' : '-';
      replyText += '• ' + (item.type === 'income' ? '🟢' : '🔴') + ' <b>' + sign + formatMoney(item.amount) + '</b> [' + item.catName + '] - <i>' + item.note + '</i>\n';
    }

    var alertMsg = checkBudgetAlert(ss, categories);
    if (alertMsg) replyText += '\n' + alertMsg;

    sendTelegramMessage(ALLOWED_CHAT_ID, replyText);
  }
}

function parseBankNotification(text) {
  var amount = 0;
  var type = 'expense';
  var note = 'Giao dịch ngân hàng';

  // 1. Tìm số tiền giao dịch (ưu tiên sau 'Số tiền' hoặc 'GD')
  var amtM = text.match(/(?:^|\n)\s*Số tiền\s*[:\s]*([+-]?\s*[\d.,]+)\s*(?:VND|vnd|đ|d|₫)?/i);
  if (amtM) {
    var raw = amtM[1].replace(/[^\d]/g, '');
    amount = parseInt(raw, 10);
    if (amtM[1].indexOf('+') !== -1) type = 'income';
    else type = 'expense';
  } else {
    var cleanText = text.replace(/(?:Số dư|So du|Hạn mức khả dụng|Han muc kha dung)[\s\S]*/i, '');
    var m = cleanText.match(/(?:^|\s)([+-]?\s*[\d.,]+)\s*(?:VND|vnd|đ|d|₫|\$|USD)/i);
    if (m) {
      amount = parseInt(m[1].replace(/[^\d]/g, ''), 10);
      if (m[1].indexOf('+') !== -1) type = 'income';
      else type = 'expense';
    }
  }

  // 2. Tìm Nội dung giao dịch
  var ndM = text.match(/(?:^|\n)\s*(?:Nội dung|Noi dung|\bND\b)\s*[:\s]+([^\n\r]+)/i);
  if (ndM) {
    note = ndM[1].trim();
  } else {
    var taiM = text.match(/(?:tại|tai|cho)\s+([^.\n]+)/i);
    if (taiM) note = taiM[1].trim();
  }

  return { amount: amount, type: type, note: note };
}

function parseLine(line) {
  var explicitType = line.indexOf('+') === 0 ? 'income' : line.indexOf('-') === 0 ? 'expense' : null;
  var amount = 0, matched = '';

  var bankMatch = line.match(/(?:^|\s)([+-]?\s*[\d.,]+)\s*(?:VND|vnd|đ|d|₫|\$|USD)/i);
  if (bankMatch) {
    var rawAmt = bankMatch[1].replace(/[^\d]/g, '');
    if (rawAmt && parseInt(rawAmt, 10) >= 1000) {
      amount = parseInt(rawAmt, 10);
      matched = bankMatch[0];
      if (!explicitType) {
        if (bankMatch[1].indexOf('+') !== -1 || /nhan tien|chuyen vao|hoan tien|cong tien/i.test(line)) explicitType = 'income';
        else explicitType = 'expense';
      }
    }
  }

  if (!amount) {
    var m = line.match(/(?:^|\s)([-+]?\s*\d+)\s*(?:tr|triệu|trieu|củ|cu|m)\s*(\d+)(?:\s|$|[^\w\d])/i);
    if (m) { amount = Math.abs(parseFloat(m[1].replace(/\s+/g, ''))) * 1000000 + parseFloat(m[2]) * (parseFloat(m[2]) >= 10 ? Math.pow(10, 6 - String(m[2]).length) : 100000); matched = m[0]; }
  }
  if (!amount) { var m = line.match(/(?:^|\s)([-+]?\s*\d+(?:[.,]\d+)?)\s*(?:tr|triệu|trieu|củ|cu|m)(?:\s|$|[^\w\d])/i); if (m) { amount = Math.abs(parseFloat(m[1].replace(',', '.'))) * 1000000; matched = m[0]; } }
  if (!amount) { var m = line.match(/(?:^|\s)([-+]?\s*\d+(?:[.,]\d+)?)\s*(?:k|nghìn|nghin|ngàn|ngan)(?:\s|$|[^\w\d])/i); if (m) { amount = Math.abs(parseFloat(m[1].replace(',', '.'))) * 1000; matched = m[0]; } }
  if (!amount) { var m = line.match(/(?:^|\s)([-+]?\s*\d{1,3}(?:[.,]\d{3})+(?:\s*(?:đ|d|vnd|₫))?)(?:\s|$|[^\w\d])/i); if (m) { amount = parseInt(m[1].replace(/[^\d]/g, ''), 10); matched = m[0]; } }
  if (!amount) { var m = line.match(/(?:^|\s)([-+]?\s*\d{4,9})(?:\s*(?:đ|d|vnd|₫))?(?:\s|$|[^\w\d])/i); if (m) { var val = parseInt(m[1].replace(/[^\d]/g, ''), 10); if (val >= 1000 && val !== 2024 && val !== 2025 && val !== 2026) { amount = val; matched = m[0]; } } }
  if (!amount) { var m = line.match(/(?:^|\s)([-+]?\s*\d{2,3})(?:\s|$|[^\w\d])/i); if (m) { var sval = parseInt(m[1].replace(/[^\d]/g, ''), 10); if (sval >= 10 && sval <= 999) { amount = sval * 1000; matched = m[0]; } } }

  if (!amount || amount <= 0) return null;

  var note = '';
  var ndMatch = line.match(/(?:ND|Nội dung|Noi dung)\s*:\s*([^.]+)/i);
  if (!ndMatch) ndMatch = line.match(/(?:tại|tai|cho)\s+([^.]+)/i);
  if (ndMatch) {
    note = ndMatch[1].trim();
  } else {
    note = line.replace(matched.trim(), '').replace(/^[+\-:\s]+/, '').replace(/[+\-:\s]+$/, '').trim() || 'Chi tieu';
  }

  note = note.replace(/So du:.*$/i, '').replace(/TK \d+.*$/i, '').trim() || 'Chi tieu';

  var type = explicitType || 'expense';
  if (!explicitType) {
    var norm = removeAccents(line);
    if (norm.indexOf('luong kho') === -1 && ['luong cty', 'nhan luong', 'salary', 'thuong', 'bonus', 'hoan tien', 'lai', 'ck den', 'nhan tien'].some(function(kw) { return norm.indexOf(kw) !== -1; })) type = 'income';
  }
  return { amount: amount, type: type, note: note };
}

function matchCat(text, type, categories) {
  var norm = removeAccents(text);
  var bestName = null, maxScore = 0;
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

function checkBudgetAlert(ss, categories) {
  try {
    var txSheet = ss.getSheetByName('Transactions');
    if (!txSheet) return null;
    var txData = txSheet.getDataRange().getValues();
    var currentMonth = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM');
    
    var wantsSpend = 0;
    for (var i = 1; i < txData.length; i++) {
      var r = txData[i];
      var d = r[1] instanceof Date ? Utilities.formatDate(r[1], Session.getScriptTimeZone(), 'yyyy-MM') : String(r[1]).substring(0, 7);
      if (d === currentMonth && r[3] === 'expense') {
        wantsSpend += Number(r[2]) || 0;
      }
    }

    if (wantsSpend >= 10000000) {
      return '⚠️ <b>Lưu ý:</b> Tổng chi tháng này đã chạm ' + formatMoney(wantsSpend) + '!';
    }
    return null;
  } catch (e) {
    return null;
  }
}

function sendDailyDigest() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) return;

  var todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var txData = txSheet.getDataRange().getValues();
  var todayExpense = 0, count = 0, notes = [];

  for (var i = 1; i < txData.length; i++) {
    var row = txData[i];
    var d = row[1] instanceof Date ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[1]).split('T')[0];
    if (d === todayStr && row[3] === 'expense') {
      todayExpense += Number(row[2]) || 0;
      count++;
      if (notes.length < 4) notes.push(row[6] || row[4]);
    }
  }

  var msg = '🌙 <b>TỔNG KẾT CHI TIÊU HÔM NAY (' + todayStr + '):</b>\n';
  if (count === 0) {
    msg += '🎉 Hôm nay bạn không phát sinh khoản chi tiêu nào!';
  } else {
    msg += '• 🔴 Đã chi: <b>' + formatMoney(todayExpense) + '</b> (' + count + ' giao dịch)\n';
    msg += '• 📝 Bao gồm: <i>' + notes.join(', ') + '...</i>\n';
    msg += '• 💡 Chúc bạn một buổi tối an lành!';
  }

  sendTelegramMessage(ALLOWED_CHAT_ID, msg);
}

function sendTelegramMessage(chatId, text) {
  try {
    var url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage';
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' }),
      muteHttpExceptions: true
    });
  } catch (e) {}
}

function formatMoney(amount) {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫';
}

function removeAccents(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
