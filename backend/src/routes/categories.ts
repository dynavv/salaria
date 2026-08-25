import { Router } from 'express';
import { db } from '../db';

export const categoriesRouter = Router();

// GET all categories
categoriesRouter.get('/', (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM categories';
    const params: any[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    query += ' ORDER BY type DESC, group_type ASC, name ASC';

    const categories = db.prepare(query).all(...params);
    res.json({ success: true, data: categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create category
categoriesRouter.post('/', (req, res) => {
  try {
    const { name, type = 'expense', group_type = 'needs', icon = 'Tag', color = '#64748b', keywords = '', budget_monthly = 0 } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Tên danh mục là bắt buộc' });

    const id = `cat_${Date.now()}`;
    db.prepare(`
      INSERT INTO categories (id, name, type, group_type, icon, color, keywords, budget_monthly)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, type, group_type, icon, color, keywords, budget_monthly);

    res.json({ success: true, data: { id, name, type } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update category
categoriesRouter.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, group_type, icon, color, keywords, budget_monthly } = req.body;

    db.prepare(`
      UPDATE categories
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          group_type = COALESCE(?, group_type),
          icon = COALESCE(?, icon),
          color = COALESCE(?, color),
          keywords = COALESCE(?, keywords),
          budget_monthly = COALESCE(?, budget_monthly)
      WHERE id = ?
    `).run(name, type, group_type, icon, color, keywords, budget_monthly, id);

    res.json({ success: true, message: 'Đã cập nhật danh mục thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE category
categoriesRouter.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true, message: 'Đã xóa danh mục thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
