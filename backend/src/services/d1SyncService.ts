import { db } from '../db';

export function getWorkerUrl(): string {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'worker_url'`).get() as { value: string } | undefined;
  return row?.value || process.env.WORKER_URL || 'https://salaria.inkarmattuskur.workers.dev';
}

export function setWorkerUrl(url: string) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('worker_url', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(url.trim());
}

export function getWorkerApiKey(): string {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'worker_api_key'`).get() as { value: string } | undefined;
  return row?.value || process.env.WORKER_API_KEY || 'salaria_secret_2026';
}

export function setWorkerApiKey(key: string) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('worker_api_key', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key.trim());
}

export async function syncFromCloudflareD1(): Promise<{
  success: boolean;
  syncedCount: number;
  transactions: any[];
  error?: string;
}> {
  const workerUrl = getWorkerUrl();
  const apiKey = getWorkerApiKey();

  if (!workerUrl) {
    return { success: false, syncedCount: 0, transactions: [], error: 'Chưa cấu hình Cloudflare Worker URL' };
  }

  try {
    const pullUrl = `${workerUrl.replace(/\/$/, '')}/api/sync/pull?token=${encodeURIComponent(apiKey)}`;
    const res = await fetch(pullUrl, {
      headers: { 'x-api-key': apiKey },
    });

    if (!res.ok) {
      return {
        success: false,
        syncedCount: 0,
        transactions: [],
        error: `Lỗi kết nối Worker D1 (HTTP ${res.status}): ${await res.text()}`,
      };
    }

    const data = await res.json();
    if (!data.success || !data.data) {
      return {
        success: false,
        syncedCount: 0,
        transactions: [],
        error: data.error || 'Dữ liệu từ Cloudflare D1 không hợp lệ',
      };
    }

    const pendingTxs = data.data.transactions || [];
    if (pendingTxs.length === 0) {
      return { success: true, syncedCount: 0, transactions: [] };
    }

    const catMap = new Map<string, string>();
    const allCats = db.prepare('SELECT id, name FROM categories').all() as any[];
    allCats.forEach((c) => {
      catMap.set(c.id, c.id);
      catMap.set(c.name.toLowerCase(), c.id);
      catMap.set(c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), c.id);
    });

    const accMap = new Map<string, string>();
    const allAccs = db.prepare('SELECT id, name, type FROM accounts').all() as any[];
    allAccs.forEach((a) => {
      accMap.set(a.id, a.id);
      accMap.set(a.name.toLowerCase(), a.id);
      accMap.set(a.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), a.id);
      accMap.set(a.type.toLowerCase(), a.id);
    });

    const insertStmt = db.prepare(`
      INSERT INTO transactions (id, date, amount, type, category_id, account_id, destination_account_id, note, source, raw_telegram_text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `);

    const syncedIds: string[] = [];
    const newTxs: any[] = [];

    const tx = db.transaction(() => {
      for (const t of pendingTxs) {
        // Skip if deleted locally
        const isDeleted = db.prepare('SELECT id FROM deleted_transactions WHERE id = ?').get(t.id);
        if (isDeleted) {
          syncedIds.push(t.id);
          continue;
        }

        const catId = t.category_id && catMap.has(t.category_id) ? t.category_id : null;
        const accId = t.account_id && accMap.has(t.account_id) ? t.account_id : (t.source === 'bank_notification' ? 'acc_bank' : 'acc_cash');

        insertStmt.run(
          t.id,
          t.date,
          t.amount,
          t.type,
          catId,
          accId,
          t.destination_account_id || null,
          t.note,
          t.source || 'cloudflare_d1',
          t.raw_telegram_text || null,
          t.created_at || new Date().toISOString()
        );

        syncedIds.push(t.id);
        newTxs.push(t);
      }
    });

    tx();

    // Acknowledge receipt to Cloudflare D1
    if (syncedIds.length > 0) {
      try {
        const ackUrl = `${workerUrl.replace(/\/$/, '')}/api/sync/ack?token=${encodeURIComponent(apiKey)}`;
        await fetch(ackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({ ids: syncedIds }),
        });
      } catch (ackErr: any) {
        console.error('Ack error to Cloudflare D1:', ackErr.message);
      }
    }

    return {
      success: true,
      syncedCount: newTxs.length,
      transactions: newTxs,
    };
  } catch (err: any) {
    return {
      success: false,
      syncedCount: 0,
      transactions: [],
      error: `Lỗi đồng bộ Cloudflare D1: ${err.message}`,
    };
  }
}
