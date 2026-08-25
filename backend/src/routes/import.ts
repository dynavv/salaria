import { Router } from 'express';
import multer from 'multer';
import { parseTelegramHtml, ParsedTransaction } from '../parser/telegramParser';
import { db } from '../db';

export const importRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB limit

// POST upload and parse Telegram HTML
importRouter.post('/telegram-html', upload.single('file'), (req, res) => {
  try {
    let htmlContent = '';
    const defaultAccountId = (req.body.defaultAccountId as string) || 'acc_cash';

    if (req.file) {
      htmlContent = req.file.buffer.toString('utf-8');
    } else if (req.body.htmlContent) {
      htmlContent = req.body.htmlContent;
    } else {
      return res.status(400).json({ success: false, error: 'Không tìm thấy file hoặc nội dung HTML' });
    }

    const parseResult = parseTelegramHtml(htmlContent, defaultAccountId);

    res.json({
      success: true,
      data: parseResult
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Lỗi khi xử lý file Telegram: ' + err.message });
  }
});

// POST confirm and batch save verified transactions into SQLite
importRouter.post('/confirm', (req, res) => {
  try {
    const { transactions } = req.body as { transactions: ParsedTransaction[] };

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ success: false, error: 'Danh sách giao dịch trống' });
    }

    const insertTx = db.prepare(`
      INSERT INTO transactions (id, date, amount, type, category_id, account_id, note, source, raw_telegram_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'telegram_html', ?)
    `);

    // Execute within a single database transaction for extreme speed and consistency
    const insertMany = db.transaction((txs: ParsedTransaction[]) => {
      let count = 0;
      for (const tx of txs) {
        if (!tx.amount || tx.amount <= 0) continue;
        const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        insertTx.run(
          id,
          tx.date,
          tx.amount,
          tx.type || 'expense',
          tx.categoryId || null,
          tx.accountId || 'acc_cash',
          tx.note || 'Chi tiêu Telegram',
          tx.rawText || null
        );
        count++;
      }
      return count;
    });

    const savedCount = insertMany(transactions);

    res.json({
      success: true,
      message: `Đã nhập thành công ${savedCount} giao dịch vào hệ thống!`,
      savedCount
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Lỗi khi lưu giao dịch: ' + err.message });
  }
});

// GET generate sample Telegram Export HTML for testing
importRouter.get('/sample-html', (req, res) => {
  const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Telegram Chat History Export Sample</title>
</head>
<body>
  <div class="page_body chat_page">
    <div class="history">

      <!-- Message 1 -->
      <div class="message default clearfix" id="message1">
        <div class="body">
          <div class="pull_right date details" title="01.08.2026 08:30:00 UTC+07:00">08:30</div>
          <div class="from_name">Bạn</div>
          <div class="text">Ăn sáng phở bò 45k</div>
        </div>
      </div>

      <!-- Message 2 -->
      <div class="message default clearfix" id="message2">
        <div class="body">
          <div class="pull_right date details" title="01.08.2026 09:15:00 UTC+07:00">09:15</div>
          <div class="from_name">Bạn</div>
          <div class="text">50.000 cf Highland với bạn</div>
        </div>
      </div>

      <!-- Message 3 -->
      <div class="message default clearfix" id="message3">
        <div class="body">
          <div class="pull_right date details" title="02.08.2026 12:45:00 UTC+07:00">12:45</div>
          <div class="from_name">Bạn</div>
          <div class="text">Cơm trưa văn phòng 55k</div>
        </div>
      </div>

      <!-- Message 4 -->
      <div class="message default clearfix" id="message4">
        <div class="body">
          <div class="pull_right date details" title="03.08.2026 18:00:00 UTC+07:00">18:00</div>
          <div class="from_name">Bạn</div>
          <div class="text">Đổ xăng xe máy 80k</div>
        </div>
      </div>

      <!-- Message 5 -->
      <div class="message default clearfix" id="message5">
        <div class="body">
          <div class="pull_right date details" title="05.08.2026 10:00:00 UTC+07:00">10:00</div>
          <div class="from_name">Bạn</div>
          <div class="text">+18.5tr lương công ty tháng 7</div>
        </div>
      </div>

      <!-- Message 6 -->
      <div class="message default clearfix" id="message6">
        <div class="body">
          <div class="pull_right date details" title="05.08.2026 19:30:00 UTC+07:00">19:30</div>
          <div class="from_name">Bạn</div>
          <div class="text">Tiền phòng trọ 3tr5</div>
        </div>
      </div>

      <!-- Message 7 -->
      <div class="message default clearfix" id="message7">
        <div class="body">
          <div class="pull_right date details" title="06.08.2026 14:00:00 UTC+07:00">14:00</div>
          <div class="from_name">Bạn</div>
          <div class="text">Tiền điện nước 450k</div>
        </div>
      </div>

      <!-- Message 8 -->
      <div class="message default clearfix" id="message8">
        <div class="body">
          <div class="pull_right date details" title="10.08.2026 21:00:00 UTC+07:00">21:00</div>
          <div class="from_name">Bạn</div>
          <div class="text">Mua áo khoác Shopee 320k</div>
        </div>
      </div>

      <!-- Message 9 -->
      <div class="message default clearfix" id="message9">
        <div class="body">
          <div class="pull_right date details" title="15.08.2026 16:20:00 UTC+07:00">16:20</div>
          <div class="from_name">Bạn</div>
          <div class="text">Đi siêu thị Winmart mua đồ 480.000</div>
        </div>
      </div>

      <!-- Message 10 -->
      <div class="message default clearfix" id="message10">
        <div class="body">
          <div class="pull_right date details" title="20.08.2026 20:00:00 UTC+07:00">20:00</div>
          <div class="from_name">Bạn</div>
          <div class="text">Xem phim CGV & bắp nước 210k</div>
        </div>
      </div>

      <!-- Message 11 -->
      <div class="message default clearfix" id="message11">
        <div class="body">
          <div class="pull_right date details" title="22.08.2026 11:30:00 UTC+07:00">11:30</div>
          <div class="from_name">Bạn</div>
          <div class="text">Trà sữa Phúc Long 65k</div>
        </div>
      </div>

      <!-- Message 12 -->
      <div class="message default clearfix" id="message12">
        <div class="body">
          <div class="pull_right date details" title="25.08.2026 15:00:00 UTC+07:00">15:00</div>
          <div class="from_name">Bạn</div>
          <div class="text">Mua thuốc cảm sốt 75k</div>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(sampleHtml);
});
