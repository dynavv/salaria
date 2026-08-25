import { Router } from 'express';
import { db } from '../db';

export const backupRouter = Router();

// GET export full database as JSON
backupRouter.get('/export-json', (req, res) => {
  try {
    const accounts = db.prepare('SELECT * FROM accounts').all();
    const categories = db.prepare('SELECT * FROM categories').all();
    const transactions = db.prepare('SELECT * FROM transactions').all();
    const budgets = db.prepare('SELECT * FROM budgets').all();

    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        accounts,
        categories,
        transactions,
        budgets
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=personal_finance_backup_${Date.now()}.json`);
    res.json(backupData);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST import full backup JSON
backupRouter.post('/import-json', (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !data.transactions) {
      return res.status(400).json({ success: false, error: 'Dữ liệu backup không hợp lệ' });
    }

    const restore = db.transaction(() => {
      // Clear existing transactions
      db.prepare('DELETE FROM transactions').run();
      
      const insertTx = db.prepare(`
        INSERT INTO transactions (id, date, amount, type, category_id, account_id, destination_account_id, note, source, raw_telegram_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const tx of data.transactions) {
        insertTx.run(
          tx.id,
          tx.date,
          tx.amount,
          tx.type,
          tx.category_id || null,
          tx.account_id || 'acc_cash',
          tx.destination_account_id || null,
          tx.note || '',
          tx.source || 'backup',
          tx.raw_telegram_text || null
        );
      }
    });

    restore();

    res.json({
      success: true,
      message: `Đã khôi phục thành công ${data.transactions.length} giao dịch từ bản sao lưu!`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
