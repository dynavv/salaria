/**
 * 💎 SALARIA BACKEND — BACKUP & EXPORT/IMPORT ROUTE HANDLER
 */

import { Env } from '../types';
import { jsonResponse } from '../utils/response';

export async function handleBackup(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/backup/export-json' && request.method === 'GET') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const accounts = await env.DB.prepare('SELECT * FROM accounts').all();
    const categories = await env.DB.prepare('SELECT * FROM categories').all();
    const transactions = await env.DB.prepare('SELECT * FROM transactions').all();

    return jsonResponse({
      version: '2026.1',
      exported_at: new Date().toISOString(),
      data: {
        accounts: accounts.results || [],
        categories: categories.results || [],
        transactions: transactions.results || []
      }
    });
  }

  if (url.pathname === '/api/backup/import-json' && request.method === 'POST') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const body: any = await request.json();
    const backupData = body.data?.data || body.data || body;
    const txs = backupData.transactions || [];

    if (Array.isArray(txs) && txs.length > 0) {
      for (const t of txs) {
        await env.DB.prepare(`
          INSERT OR REPLACE INTO transactions (id, date, amount, type, category_id, account_id, destination_account_id, note, source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          t.id,
          t.date,
          t.amount,
          t.type,
          t.category_id,
          t.account_id,
          t.destination_account_id || null,
          t.note,
          t.source || 'backup_import'
        ).run();
      }
    }

    return jsonResponse({ success: true, message: `Imported ${txs.length} transactions successfully` });
  }

  return null;
}
