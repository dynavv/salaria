/**
 * 💎 SALARIA BACKEND — TRANSACTIONS ROUTE HANDLER (CRUD & BALANCE INTEGRITY)
 */

import { Env } from '../types';
import { jsonResponse } from '../utils/response';
import { getVietnamDateString, getVietnamMonthString } from '../utils/date';

export async function handleTransactions(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/transactions' && request.method === 'GET') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);

    const month = url.searchParams.get('month');
    const date = url.searchParams.get('date');
    const start_date = url.searchParams.get('start_date') || url.searchParams.get('startDate');
    const end_date = url.searchParams.get('end_date') || url.searchParams.get('endDate');
    const category_id = url.searchParams.get('category_id');
    const account_id = url.searchParams.get('account_id');
    const type = url.searchParams.get('type');
    const group_type = url.searchParams.get('group_type');
    const max_amount = url.searchParams.get('max_amount');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '500', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    let conditions: string[] = [];
    let params: any[] = [];

    if (start_date) {
      conditions.push("t.date >= ?");
      params.push(start_date);
    }
    if (end_date) {
      conditions.push("t.date <= ?");
      params.push(end_date);
    }
    if (month) {
      conditions.push("substr(t.date, 1, 7) = ?");
      params.push(month);
    }
    if (date) {
      conditions.push("t.date = ?");
      params.push(date);
    }
    if (category_id) {
      conditions.push("t.category_id = ?");
      params.push(category_id);
    }
    if (account_id) {
      conditions.push("t.account_id = ?");
      params.push(account_id);
    }
    if (type) {
      conditions.push("t.type = ?");
      params.push(type);
    }
    if (group_type) {
      conditions.push("c.group_type = ?");
      params.push(group_type);
    }
    if (max_amount) {
      conditions.push("t.amount <= ?");
      params.push(Number(max_amount));
    }
    if (search) {
      conditions.push("(t.note LIKE ? OR c.name LIKE ? OR a.name LIKE ?)");
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        t.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        c.group_type as category_group_type,
        a.name as account_name,
        a.icon as account_icon,
        a.color as account_color,
        da.name as destination_account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN accounts da ON t.destination_account_id = da.id
      ${whereClause}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const rows = await env.DB.prepare(query).bind(...params).all();

    // Available months
    const monthsRes = await env.DB.prepare("SELECT DISTINCT substr(date, 1, 7) as month FROM transactions ORDER BY month DESC").all();
    const availableMonths = (monthsRes.results || []).map((r: any) => r.month).filter(Boolean);

    return jsonResponse({
      success: true,
      data: rows.results || [],
      availableMonths: availableMonths.length > 0 ? availableMonths : [getVietnamMonthString()]
    });
  }

  if (url.pathname === '/api/transactions' && request.method === 'POST') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const body: any = await request.json();
    const id = body.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const date = body.date || getVietnamDateString();
    const amount = Number(body.amount) || 0;
    const type = body.type || 'expense';
    const category_id = body.category_id || null;
    const account_id = body.account_id || 'acc_cash';
    const destination_account_id = body.destination_account_id || null;
    const note = body.note || '';
    const source = body.source || 'manual';

    await env.DB.prepare(`
      INSERT INTO transactions (id, date, amount, type, category_id, account_id, destination_account_id, note, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
    `).bind(id, date, amount, type, category_id, account_id, destination_account_id, note, source).run();

    // Update account balance
    if (type === 'expense') {
      await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(amount, account_id).run();
    } else if (type === 'income') {
      await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(amount, account_id).run();
    } else if (type === 'transfer' && destination_account_id) {
      await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(amount, account_id).run();
      await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(amount, destination_account_id).run();
    }

    return jsonResponse({ success: true, data: { id, date, amount, type, category_id, account_id, note } }, 201);
  }

  if (url.pathname.startsWith('/api/transactions/') && request.method === 'PUT') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const id = url.pathname.replace('/api/transactions/', '');
    const body: any = await request.json();

    // Fetch old transaction to revert balance
    const oldTx = await env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
    if (oldTx) {
      if (oldTx.type === 'expense') {
        await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(oldTx.amount, oldTx.account_id).run();
      } else if (oldTx.type === 'income') {
        await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(oldTx.amount, oldTx.account_id).run();
      } else if (oldTx.type === 'transfer' && oldTx.destination_account_id) {
        // Revert old transfer: add back to source account, deduct from destination account
        await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(oldTx.amount, oldTx.account_id).run();
        await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(oldTx.amount, oldTx.destination_account_id).run();
      }
    }

    const newDate = body.date || oldTx?.date;
    const newAmount = Number(body.amount) !== undefined ? Number(body.amount) : oldTx?.amount;
    const newType = body.type || oldTx?.type;
    const newCategoryId = body.category_id !== undefined ? body.category_id : oldTx?.category_id;
    const newAccountId = body.account_id || oldTx?.account_id;
    const newDestinationAccountId = body.destination_account_id !== undefined ? body.destination_account_id : (oldTx?.destination_account_id || null);
    const newNote = body.note !== undefined ? body.note : oldTx?.note;

    await env.DB.prepare(`
      UPDATE transactions SET
        date = ?,
        amount = ?,
        type = ?,
        category_id = ?,
        account_id = ?,
        destination_account_id = ?,
        note = ?
      WHERE id = ?
    `).bind(newDate, newAmount, newType, newCategoryId, newAccountId, newDestinationAccountId, newNote, id).run();

    // Apply new balance
    if (newType === 'expense') {
      await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(newAmount, newAccountId).run();
    } else if (newType === 'income') {
      await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(newAmount, newAccountId).run();
    } else if (newType === 'transfer' && newDestinationAccountId) {
      await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(newAmount, newAccountId).run();
      await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(newAmount, newDestinationAccountId).run();
    }

    return jsonResponse({ success: true, message: 'Transaction updated' });
  }

  if (url.pathname.startsWith('/api/transactions/') && request.method === 'DELETE') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const id = url.pathname.replace('/api/transactions/', '');
    if (id === 'clear-all') {
      await env.DB.prepare('DELETE FROM transactions').run();
      // Reset balances to initial_balance
      await env.DB.prepare('UPDATE accounts SET balance = initial_balance').run();
      return jsonResponse({ success: true, message: 'All transactions cleared and accounts reset' });
    }

    const oldTx = await env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
    if (oldTx) {
      if (oldTx.type === 'expense') {
        await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(oldTx.amount, oldTx.account_id).run();
      } else if (oldTx.type === 'income') {
        await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(oldTx.amount, oldTx.account_id).run();
      } else if (oldTx.type === 'transfer' && oldTx.destination_account_id) {
        // Revert transfer: add back to source account, deduct from destination account
        await env.DB.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').bind(oldTx.amount, oldTx.account_id).run();
        await env.DB.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').bind(oldTx.amount, oldTx.destination_account_id).run();
      }
      await env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run();
    }
    return jsonResponse({ success: true, message: 'Transaction deleted' });
  }

  return null;
}
