/**
 * ==============================================================================
 * 💎 SALARIA — 100% SERVERLESS CLOUDFLARE EDGE WORKER (TYPESCRIPT MODULAR ARCHITECTURE)
 * ==============================================================================
 * Native Cloudflare Full-Stack Architecture:
 * - Database: Cloudflare D1 (salarini-db)
 * - AI Engine: Cloudflare Workers AI (Llama 3.2 3B & Gemma 4 26B Fallback Chain)
 * - Web App REST API: Full CRUD for Transactions, Accounts, Categories, Analytics & AI
 * - Ingestion: Android Native App Webhook + Telegram Bot Webhook 24/7
 */

import { Env } from './types';
import { corsHeaders, jsonResponse } from './utils/response';
import { handleAccounts } from './routes/accounts';
import { handleCategories } from './routes/categories';
import { handleTransactions } from './routes/transactions';
import { handleAnalytics } from './routes/analytics';
import { handleBackup } from './routes/backup';
import { handleLogs } from './routes/logs';
import { handleIngest, handleChatHistory, handleDailySummary } from './routes/ingest';
import { handleSettings } from './routes/settings';

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

    const ALLOWED_KEYS = new Set(
      [env?.API_KEY, env?.SECRET_TOKEN, env?.MASTER_PIN].filter(Boolean)
    );

    // 2. Auth / PIN Verification
    if (url.pathname === '/api/auth/verify-pin' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const pin = String(body?.pin || '').trim();
        if (ALLOWED_KEYS.has(pin)) {
          return jsonResponse({ success: true, message: 'Xác thực PIN thành công', token: pin });
        }
        return jsonResponse({ success: false, error: 'Mã PIN không chính xác' }, 401);
      } catch (e) {
        return jsonResponse({ success: false, error: 'Dữ liệu không hợp lệ' }, 400);
      }
    }

    // 3. Frontend SPA & Static Assets Routing
    if (
      !url.pathname.startsWith('/api/') &&
      url.pathname !== '/health' &&
      url.pathname !== '/status' &&
      !url.searchParams.has('text') &&
      request.method === 'GET'
    ) {
      if (env.ASSETS) {
        const assetRes = await env.ASSETS.fetch(request);
        const pathname = url.pathname.toLowerCase();
        let mime: string | null = null;

        if (pathname.endsWith('.js') || pathname.endsWith('.mjs')) {
          mime = 'application/javascript; charset=UTF-8';
        } else if (pathname.endsWith('.css')) {
          mime = 'text/css; charset=UTF-8';
        } else if (pathname.endsWith('.svg')) {
          mime = 'image/svg+xml';
        } else if (pathname.endsWith('.html') || pathname === '/' || !pathname.includes('.')) {
          mime = 'text/html; charset=UTF-8';
        } else if (pathname.endsWith('.json')) {
          mime = 'application/json; charset=UTF-8';
        } else if (pathname.endsWith('.png')) {
          mime = 'image/png';
        } else if (pathname.endsWith('.ico')) {
          mime = 'image/x-icon';
        } else if (pathname.endsWith('.woff2')) {
          mime = 'font/woff2';
        }

        if (mime) {
          const newHeaders = new Headers(assetRes.headers);
          newHeaders.set('Content-Type', mime);
          return new Response(assetRes.body, {
            status: assetRes.status,
            statusText: assetRes.statusText,
            headers: newHeaders
          });
        }
        return assetRes;
      }
    }

    // 4. Health / Status Check
    if (
      (url.pathname === '/health' || url.pathname === '/api/status') &&
      request.method === 'GET' &&
      !url.searchParams.has('text')
    ) {
      let dbStatus = 'Disconnected';
      let totalTransactions = 0;

      if (env.DB) {
        try {
          const countRes = await env.DB.prepare('SELECT COUNT(*) as count FROM transactions').first();
          totalTransactions = countRes?.count || 0;
          dbStatus = 'Connected (Cloudflare D1)';
        } catch (e: any) {
          dbStatus = `Error: ${e.message}`;
        }
      }

      const AI_MODEL = env?.AI_MODEL || '@cf/google/gemma-4-26b-a4b-it';
      return jsonResponse({
        success: true,
        service: 'Salaria Cloudflare D1 Full-Stack REST API & Edge Worker (TypeScript Modular)',
        database: dbStatus,
        ai_engine: env.AI ? `Active (Workers AI: ${AI_MODEL})` : 'Disabled',
        stats: { total_transactions: totalTransactions },
        timestamp: new Date().toISOString()
      });
    }

    // 5. Route Dispatches
    let res = await handleAccounts(request, env, url);
    if (res) return res;

    res = await handleCategories(request, env, url);
    if (res) return res;

    res = await handleTransactions(request, env, url);
    if (res) return res;

    res = await handleAnalytics(request, env, url);
    if (res) return res;

    res = await handleBackup(request, env, url);
    if (res) return res;

    res = await handleLogs(request, env, url);
    if (res) return res;

    res = await handleChatHistory(request, env, url);
    if (res) return res;

    res = await handleDailySummary(request, env, url);
    if (res) return res;

    res = await handleSettings(request, env, url);
    if (res) return res;

    // 6. Ingestion Pipeline (Bank Notification, Chat Ingestion & Smart ATM Recognition)
    return await handleIngest(request, env, url, ctx);
  },

  // Cloudflare Cron Trigger (Daily Log Retention Cleanup at 22:30 GMT+7)
  async scheduled(event: any, env: Env, ctx: any): Promise<void> {
    console.log('[Cron] Daily maintenance triggered:', event?.cron, new Date().toISOString());
    ctx.waitUntil(
      (async () => {
        try {
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          await env.DB.prepare('DELETE FROM system_logs WHERE timestamp < ?').bind(thirtyDaysAgo).run();
        } catch (e) {
          console.error('[Cron] Log retention cleanup error:', e);
        }
      })()
    );
  }
};
