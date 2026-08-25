import { Router } from 'express';
import { db } from '../db';

export const transactionsRouter = Router();

// GET transactions with search, filters, pagination
transactionsRouter.get('/', (req, res) => {
  try {
    const { month, date, category_id, account_id, type, group_type, max_amount, search, sort_by = 'date_desc', limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT t.*, 
             c.name as category_name, c.icon as category_icon, c.color as category_color, c.group_type,
             a.name as account_name, a.icon as account_icon, a.color as account_color,
             da.name as destination_account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN accounts da ON t.destination_account_id = da.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      query += ` AND DATE(t.date) = DATE(?)`;
      params.push(date);
    } else if (month) {
      query += ` AND strftime('%Y-%m', t.date) = ?`;
      params.push(month);
    }
    if (category_id) {
      query += ` AND t.category_id = ?`;
      params.push(category_id);
    }
    if (group_type) {
      query += ` AND c.group_type = ?`;
      params.push(group_type);
    }
    if (max_amount) {
      query += ` AND t.amount <= ?`;
      params.push(Number(max_amount));
    }
    if (account_id) {
      query += ` AND (t.account_id = ? OR t.destination_account_id = ?)`;
      params.push(account_id, account_id);
    }
    if (type) {
      query += ` AND t.type = ?`;
      params.push(type);
    }
    if (search) {
      query += ` AND (t.note LIKE ? OR t.raw_telegram_text LIKE ? OR c.name LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    // Dynamic sorting
    if (sort_by === 'amount_desc') {
      query += ` ORDER BY t.amount DESC, t.date DESC LIMIT ? OFFSET ?`;
    } else if (sort_by === 'amount_asc') {
      query += ` ORDER BY t.amount ASC, t.date DESC LIMIT ? OFFSET ?`;
    } else if (sort_by === 'date_asc') {
      query += ` ORDER BY t.date ASC, t.created_at ASC LIMIT ? OFFSET ?`;
    } else {
      query += ` ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`;
    }
    params.push(Number(limit), Number(offset));

    const transactions = db.prepare(query).all(...params);

    // Get available distinct months for month selector
    const distinctMonths = db.prepare(`
      SELECT DISTINCT strftime('%Y-%m', date) as month 
      FROM transactions 
      WHERE date IS NOT NULL AND date != ''
      ORDER BY month DESC
    `).all() as Array<{ month: string }>;

    res.json({
      success: true,
      data: transactions,
      availableMonths: distinctMonths.map(m => m.month)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create transaction
transactionsRouter.post('/', (req, res) => {
  try {
    const { date, amount, type = 'expense', category_id, account_id, destination_account_id, note = '', source = 'manual', raw_telegram_text } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Số tiền phải lớn hơn 0' });
    }
    if (!account_id) {
      return res.status(400).json({ success: false, error: 'Vui lòng chọn ví/tài khoản' });
    }

    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const txDate = date || new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO transactions (id, date, amount, type, category_id, account_id, destination_account_id, note, source, raw_telegram_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, txDate, amount, type, category_id || null, account_id, destination_account_id || null, note, source, raw_telegram_text || null);

    res.json({ success: true, data: { id, date: txDate, amount, type } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update transaction
transactionsRouter.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { date, amount, type, category_id, account_id, destination_account_id, note } = req.body;

    db.prepare(`
      UPDATE transactions
      SET date = COALESCE(?, date),
          amount = COALESCE(?, amount),
          type = COALESCE(?, type),
          category_id = COALESCE(?, category_id),
          account_id = COALESCE(?, account_id),
          destination_account_id = COALESCE(?, destination_account_id),
          note = COALESCE(?, note)
      WHERE id = ?
    `).run(date, amount, type, category_id, account_id, destination_account_id, note, id);

    res.json({ success: true, message: 'Đã cập nhật giao dịch thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE all transactions (reset data)
transactionsRouter.delete('/clear-all', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM transactions').run();
    res.json({ success: true, message: `Đã xóa sạch ${result.changes} giao dịch. Sổ đã sẵn sàng cho dữ liệu mới!` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE transaction
transactionsRouter.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    db.prepare('INSERT OR IGNORE INTO deleted_transactions (id) VALUES (?)').run(id);
    res.json({ success: true, message: 'Đã xóa giao dịch thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE batch transactions by month
transactionsRouter.delete('/batch/by-month', (req, res) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ success: false, error: 'Tháng là bắt buộc' });

    const result = db.prepare(`DELETE FROM transactions WHERE strftime('%Y-%m', date) = ?`).run(month);
    res.json({ success: true, message: `Đã xóa ${result.changes} giao dịch trong tháng ${month}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
