/**
 * 💎 SALARIA BACKEND — SYSTEM LOGS ROUTE HANDLER (TELEMETRY & OBSERVABILITY)
 */

import { Env } from '../types';
import { jsonResponse } from '../utils/response';

export async function handleLogs(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/logs' && request.method === 'GET') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
    const level = url.searchParams.get('level');
    const tag = url.searchParams.get('tag');
    const source = url.searchParams.get('source');

    let query = 'SELECT * FROM system_logs WHERE 1=1';
    const params: any[] = [];

    if (level) {
      query += ' AND level = ?';
      params.push(level.toUpperCase());
    }
    if (tag) {
      query += ' AND tag = ?';
      params.push(tag.toUpperCase());
    }
    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const { results } = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, count: results.length, data: results });
  }

  if (url.pathname === '/api/logs' && request.method === 'POST') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    try {
      const body: any = await request.json();
      const logs = Array.isArray(body) ? body : [body];

      for (const item of logs) {
        const logId = item.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const ts = item.timestamp ? Number(item.timestamp) : Date.now();
        const level = (item.level || 'INFO').toUpperCase();
        const tag = (item.tag || 'APP').toUpperCase();
        const source = item.source || 'android_app';
        const msg = item.message || '';
        const meta = typeof item.metadata === 'object' ? JSON.stringify(item.metadata) : (item.metadata || null);

        await env.DB.prepare(`
          INSERT INTO system_logs (id, timestamp, level, tag, source, message, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(logId, ts, level, tag, source, msg, meta).run();
      }

      return jsonResponse({ success: true, count: logs.length });
    } catch (err: any) {
      return jsonResponse({ success: false, error: err.message }, 400);
    }
  }

  if (url.pathname === '/api/logs' && request.method === 'DELETE') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const olderThanDays = parseInt(url.searchParams.get('days') || '0', 10);
    if (olderThanDays > 0) {
      const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      await env.DB.prepare('DELETE FROM system_logs WHERE timestamp < ?').bind(cutoff).run();
      return jsonResponse({ success: true, message: `Deleted logs older than ${olderThanDays} days` });
    } else {
      await env.DB.prepare('DELETE FROM system_logs').run();
      return jsonResponse({ success: true, message: 'All logs cleared' });
    }
  }

  return null;
}
