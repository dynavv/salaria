import { Router } from 'express';
import { db } from '../db';

export const accountsRouter = Router();

// GET all accounts with calculated balances
accountsRouter.get('/', (req, res) => {
  try {
    const accounts = db.prepare(`
      SELECT a.*, 
        (a.initial_balance + 
          COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id = a.id AND type = 'income'), 0) -
          COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id = a.id AND type = 'expense'), 0) -
          COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id = a.id AND type = 'transfer'), 0) +
          COALESCE((SELECT SUM(amount) FROM transactions WHERE destination_account_id = a.id AND type = 'transfer'), 0)
        ) as current_balance
      FROM accounts a
      ORDER BY a.is_default DESC, a.created_at ASC
    `).all();

    res.json({ success: true, data: accounts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create account
accountsRouter.post('/', (req, res) => {
  try {
    const { name, type, initial_balance = 0, currency = 'VND', icon = 'Wallet', color = '#3b82f6' } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Tên ví là bắt buộc' });

    const id = `acc_${Date.now()}`;
    db.prepare(`
      INSERT INTO accounts (id, name, type, balance, initial_balance, currency, icon, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, type || 'cash', initial_balance, initial_balance, currency, icon, color);

    res.json({ success: true, data: { id, name, type, balance: initial_balance } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update account
accountsRouter.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, initial_balance, icon, color } = req.body;

    db.prepare(`
      UPDATE accounts 
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          initial_balance = COALESCE(?, initial_balance),
          icon = COALESCE(?, icon),
          color = COALESCE(?, color)
      WHERE id = ?
    `).run(name, type, initial_balance, icon, color, id);

    res.json({ success: true, message: 'Đã cập nhật ví thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE account
accountsRouter.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    res.json({ success: true, message: 'Đã xóa ví thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
