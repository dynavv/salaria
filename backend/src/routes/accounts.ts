/**
 * 💎 SALARIA BACKEND — ACCOUNTS ROUTE HANDLER (CRUD)
 */

import { Env } from '../types';
import { jsonResponse } from '../utils/response';

export async function handleAccounts(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/accounts' && request.method === 'GET') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const accounts = await env.DB.prepare(`
      SELECT a.*, 
        (a.initial_balance + 
          COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id = a.id AND type = 'income'), 0) -
          COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id = a.id AND type = 'expense'), 0) -
          COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id = a.id AND type = 'transfer'), 0) +
          COALESCE((SELECT SUM(amount) FROM transactions WHERE destination_account_id = a.id AND type = 'transfer'), 0)
        ) as current_balance,
        (a.initial_balance + 
          COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id = a.id AND type = 'income'), 0) -
          COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id = a.id AND type = 'expense'), 0) -
          COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id = a.id AND type = 'transfer'), 0) +
          COALESCE((SELECT SUM(amount) FROM transactions WHERE destination_account_id = a.id AND type = 'transfer'), 0)
        ) as balance
      FROM accounts a
      ORDER BY a.is_default DESC, a.name ASC
    `).all();
    return jsonResponse({ success: true, data: accounts.results || [] });
  }

  if (url.pathname === '/api/accounts' && request.method === 'POST') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const body: any = await request.json();
    const id = body.id || `acc_${Date.now()}`;
    const name = body.name || 'Tài khoản mới';
    const type = body.type || 'cash';
    const balance = Number(body.balance) || 0;
    const initial_balance = Number(body.initial_balance) || balance;
    const currency = body.currency || 'VND';
    const icon = body.icon || 'Wallet';
    const color = body.color || '#3b82f6';
    const is_default = body.is_default ? 1 : 0;

    await env.DB.prepare(`
      INSERT INTO accounts (id, name, type, balance, initial_balance, currency, icon, color, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, name, type, balance, initial_balance, currency, icon, color, is_default).run();

    return jsonResponse({ success: true, data: { id, name, type, balance, initial_balance, currency, icon, color, is_default } }, 201);
  }

  if (url.pathname.startsWith('/api/accounts/') && request.method === 'PUT') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const id = url.pathname.replace('/api/accounts/', '');
    const body: any = await request.json();
    await env.DB.prepare(`
      UPDATE accounts SET
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        balance = COALESCE(?, balance),
        initial_balance = COALESCE(?, initial_balance),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color),
        is_default = COALESCE(?, is_default)
      WHERE id = ?
    `).bind(body.name, body.type, body.balance, body.initial_balance, body.icon, body.color, body.is_default, id).run();

    return jsonResponse({ success: true, message: 'Account updated' });
  }

  if (url.pathname.startsWith('/api/accounts/') && request.method === 'DELETE') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const id = url.pathname.replace('/api/accounts/', '');
    await env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true, message: 'Account deleted' });
  }

  return null;
}
