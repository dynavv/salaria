/**
 * 💎 SALARIA BACKEND — SYSTEM & BUDGET SETTINGS ROUTE HANDLER
 */

import { Env } from '../types';
import { jsonResponse } from '../utils/response';

export async function handleSettings(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/settings' && request.method === 'GET') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);

    const rowsRes = await env.DB.prepare('SELECT key, value FROM settings').all();
    const rows = rowsRes.results || [];
    const settingsMap = new Map(rows.map((r: any) => [r.key, r.value]));

    const savingsGoal = settingsMap.has('savings_goal') ? Number(settingsMap.get('savings_goal')) : 0;
    const housingBudget = settingsMap.has('housing_budget') ? Number(settingsMap.get('housing_budget')) : 4000000;
    const customBudget = settingsMap.has('custom_budget') ? Number(settingsMap.get('custom_budget')) : 0;

    return jsonResponse({
      success: true,
      data: {
        savings_goal: savingsGoal,
        housing_budget: housingBudget,
        custom_budget: customBudget
      }
    });
  }

  if (url.pathname === '/api/settings' && request.method === 'POST') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);

    const body: any = await request.json();

    const updates: Array<{ key: string; value: string }> = [];

    if (body.savings_goal !== undefined || body.savingsGoal !== undefined) {
      const val = Math.max(0, Number(body.savings_goal ?? body.savingsGoal) || 0);
      updates.push({ key: 'savings_goal', value: String(val) });
    }

    if (body.housing_budget !== undefined || body.housingBudget !== undefined) {
      const val = Math.max(0, Number(body.housing_budget ?? body.housingBudget) || 0);
      updates.push({ key: 'housing_budget', value: String(val) });
    }

    if (body.custom_budget !== undefined || body.customBudget !== undefined) {
      const val = Math.max(0, Number(body.custom_budget ?? body.customBudget) || 0);
      updates.push({ key: 'custom_budget', value: String(val) });
    }

    for (const item of updates) {
      await env.DB.prepare(`
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).bind(item.key, item.value).run();
    }

    // Lấy lại cấu hình sau khi cập nhật
    const rowsRes = await env.DB.prepare('SELECT key, value FROM settings').all();
    const rows = rowsRes.results || [];
    const settingsMap = new Map(rows.map((r: any) => [r.key, r.value]));

    return jsonResponse({
      success: true,
      message: 'Cập nhật thiết lập ngân sách thành công',
      data: {
        savings_goal: settingsMap.has('savings_goal') ? Number(settingsMap.get('savings_goal')) : 0,
        housing_budget: settingsMap.has('housing_budget') ? Number(settingsMap.get('housing_budget')) : 4000000,
        custom_budget: settingsMap.has('custom_budget') ? Number(settingsMap.get('custom_budget')) : 0
      }
    });
  }

  return null;
}
