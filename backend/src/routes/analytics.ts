import { Router } from 'express';
import { getMonthlyStats, generateFinancialAdvice, getMultiMonthComparison } from '../advisor/financialAdvisor';
import { askAiAdvisor } from '../advisor/aiAdvisor';
import { db } from '../db';

export const analyticsRouter = Router();

// GET monthly summary for a specific month
analyticsRouter.get('/monthly', (req, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
    const stats = getMonthlyStats(month);
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET multi-month comparison (e.g. ?months=2026-06,2026-07,2026-08)
analyticsRouter.get('/comparison', (req, res) => {
  try {
    const monthsParam = req.query.months as string;
    let months: string[] = [];

    if (monthsParam) {
      months = monthsParam.split(',').map(m => m.trim()).filter(Boolean);
    } else {
      // Default: fetch the last 3 distinct recorded months
      const distinctMonths = db.prepare(`
        SELECT DISTINCT strftime('%Y-%m', date) as month 
        FROM transactions 
        WHERE date IS NOT NULL AND date != ''
        ORDER BY month DESC 
        LIMIT 3
      `).all() as Array<{ month: string }>;

      months = distinctMonths.map(m => m.month).reverse();
    }

    if (months.length === 0) {
      const currentMonth = new Date().toISOString().substring(0, 7);
      months = [currentMonth];
    }

    const comparison = getMultiMonthComparison(months);
    res.json({ success: true, data: comparison });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET financial health analysis, insights, and actionable advice
analyticsRouter.get('/advisor', (req, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
    const prevMonth = req.query.prevMonth as string | undefined;

    const analysis = generateFinancialAdvice(month, prevMonth);
    res.json({ success: true, data: analysis });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST ask AI financial advisor
analyticsRouter.post('/ai-ask', async (req, res) => {
  try {
    const { question, month, apiKey } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, error: 'Câu hỏi là bắt buộc' });
    }

    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const result = await askAiAdvisor(question, targetMonth);

    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all available recorded months in the database
analyticsRouter.get('/available-months', (req, res) => {
  try {
    const distinctMonths = db.prepare(`
      SELECT DISTINCT strftime('%Y-%m', date) as month 
      FROM transactions 
      WHERE date IS NOT NULL AND date != ''
      ORDER BY month DESC
    `).all() as Array<{ month: string }>;

    res.json({
      success: true,
      data: distinctMonths.map(m => m.month)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
