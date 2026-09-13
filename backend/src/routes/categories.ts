/**
 * 💎 SALARIA BACKEND — CATEGORIES ROUTE HANDLER (CRUD)
 */

import { Env } from '../types';
import { jsonResponse } from '../utils/response';

export async function handleCategories(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/categories' && request.method === 'GET') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const type = url.searchParams.get('type');
    let query = 'SELECT * FROM categories';
    let params: any[] = [];
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    query += ' ORDER BY group_type ASC, name ASC';
    const res = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, data: res.results || [] });
  }

  if (url.pathname === '/api/categories' && request.method === 'POST') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const body: any = await request.json();
    const id = body.id || `cat_${Date.now()}`;
    const name = body.name || 'Danh mục mới';
    const type = body.type || 'expense';
    const group_type = body.group_type || 'needs';
    const icon = body.icon || 'Tag';
    const color = body.color || '#64748b';
    const keywords = body.keywords || '';
    const budget_monthly = Number(body.budget_monthly) || 0;

    await env.DB.prepare(`
      INSERT INTO categories (id, name, type, group_type, icon, color, keywords, budget_monthly)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, name, type, group_type, icon, color, keywords, budget_monthly).run();

    return jsonResponse({ success: true, data: { id, name, type, group_type, icon, color, keywords, budget_monthly } }, 201);
  }

  if (url.pathname.startsWith('/api/categories/') && request.method === 'PUT') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const id = url.pathname.replace('/api/categories/', '');
    const body: any = await request.json();
    await env.DB.prepare(`
      UPDATE categories SET
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        group_type = COALESCE(?, group_type),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color),
        keywords = COALESCE(?, keywords),
        budget_monthly = COALESCE(?, budget_monthly)
      WHERE id = ?
    `).bind(body.name, body.type, body.group_type, body.icon, body.color, body.keywords, body.budget_monthly, id).run();

    return jsonResponse({ success: true, message: 'Category updated' });
  }

  if (url.pathname.startsWith('/api/categories/') && request.method === 'DELETE') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const id = url.pathname.replace('/api/categories/', '');
    await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true, message: 'Category deleted' });
  }

  return null;
}
