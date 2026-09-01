import { GoogleGenAI } from '@google/genai';
import { getMonthlyStats, generateFinancialAdvice, getMultiMonthComparison } from './financialAdvisor';
import { db } from '../db';

// --- 🛡️ PRODUCTION ANTI-ABUSE & RATE-LIMITING PROTECTION LAYER ---

interface CacheEntry {
  answer: string;
  modelUsed: string;
  timestamp: number;
}

// 1. In-memory response cache to eliminate redundant API calls (TTL: 1 hour)
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

// 2. Sliding window rate limiter (Max 10 requests / minute, Min 2.5s interval)
const requestTimestamps: number[] = [];
const MAX_RPM = 10;
const MIN_INTERVAL_MS = 2500;
let lastRequestTime = 0;

// 3. Cooldown timestamp on 429 or quota exceeded
let apiCooldownUntil = 0;

function cleanOldCache() {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      responseCache.delete(key);
    }
  }
}

export async function askGeminiAdvisor(
  question: string,
  month: string,
  userApiKey?: string
): Promise<{ answer: string; modelUsed: string }> {
  const trimmedQ = (question || '').trim();
  const normalizedQ = trimmedQ.toLowerCase();
  const cacheKey = `${month}:${normalizedQ}`;
  const now = Date.now();

  // 🛡️ STEP 1: Check In-Memory Cache first (0 API quota used, instant response)
  const cached = responseCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return {
      answer: cached.answer,
      modelUsed: `${cached.modelUsed} (Cached)`
    };
  }

  // Gather rich context from local SQLite database for this month
  const monthlyStats = getMonthlyStats(month);
  const adviceData = generateFinancialAdvice(month);

  const availableMonths = db.prepare(`
    SELECT DISTINCT strftime('%Y-%m', date) as month 
    FROM transactions 
    ORDER BY month DESC 
    LIMIT 3
  `).all() as Array<{ month: string }>;

  // Build concise, structured summary prompt context
  const contextSummary = `
DỮ LIỆU TÀI CHÍNH CÁ NHÂN THÁNG ${monthlyStats.month}:
- Tổng Thu nhập: ${monthlyStats.totalIncome.toLocaleString('vi-VN')} ₫
- Tổng Chi tiêu: ${monthlyStats.totalExpense.toLocaleString('vi-VN')} ₫
- Tiết kiệm ròng: ${monthlyStats.netSavings.toLocaleString('vi-VN')} ₫ (${monthlyStats.savingsRate}%)
- Chi tiêu trung bình ngày: ${monthlyStats.dailyAverageExpense.toLocaleString('vi-VN')} ₫/ngày
- Điểm Sức khỏe Tài chính: ${adviceData.healthScore}/100 (Mức ${adviceData.scoreLevel})

PHÂN BỔ THEO QUY TẮC 50/30/20:
- Thiết yếu (Needs): ${adviceData.rule503020.needs.actual.toLocaleString('vi-VN')} ₫ (${adviceData.rule503020.needs.actualPercent}% / Chuẩn 50%)
- Sở thích (Wants): ${adviceData.rule503020.wants.actual.toLocaleString('vi-VN')} ₫ (${adviceData.rule503020.wants.actualPercent}% / Chuẩn 30%)
- Tiết kiệm (Savings): ${adviceData.rule503020.savings.actual.toLocaleString('vi-VN')} ₫ (${adviceData.rule503020.savings.actualPercent}% / Chuẩn 20%)

HIỆU ỨNG LATTE (KHOẢN CHI NHỎ LẺ ≤ 60k):
- Số lần: ${adviceData.latteFactor.count} lần
- Tổng tiền: ${adviceData.latteFactor.totalSmallExpenses.toLocaleString('vi-VN')} ₫ (${adviceData.latteFactor.percentageOfTotalExpense}% tổng chi)

TOP CÁC DANH MỤC CHI TIÊU:
${monthlyStats.categories.slice(0, 6).map(c => `- ${c.categoryName}: ${c.amount.toLocaleString('vi-VN')} ₫ (${c.percentage}%)`).join('\n')}

${monthlyStats.peakSpendingDay ? `- Ngày chi nhiều nhất: ${monthlyStats.peakSpendingDay.date} (${monthlyStats.peakSpendingDay.amount.toLocaleString('vi-VN')} ₫)` : ''}
`;

  const apiKey = userApiKey || process.env.GEMINI_API_KEY;

  // 🛡️ STEP 2: Safe API Call with strict rate limiting & cooldown protection
  let canCallApi = Boolean(apiKey);

  if (canCallApi) {
    // Check if in cooldown period (e.g. after a 429)
    if (now < apiCooldownUntil) {
      console.warn(`[Anti-Abuse] In API cooldown mode until ${new Date(apiCooldownUntil).toISOString()}. Using offline engine.`);
      canCallApi = false;
    }

    // Check sliding window RPM (Max 10 calls per 60 seconds)
    const windowStart = now - 60000;
    while (requestTimestamps.length > 0 && requestTimestamps[0] < windowStart) {
      requestTimestamps.shift();
    }
    if (requestTimestamps.length >= MAX_RPM) {
      console.warn(`[Anti-Abuse] Rate limit threshold reached (${requestTimestamps.length}/${MAX_RPM} RPM). Using offline engine to protect quota.`);
      canCallApi = false;
    }

    // Check min interval between requests
    if (now - lastRequestTime < MIN_INTERVAL_MS) {
      // Sleep slightly to enforce spacing
      const waitMs = MIN_INTERVAL_MS - (now - lastRequestTime);
      await new Promise(res => setTimeout(res, waitMs));
    }
  }

  if (canCallApi && apiKey) {
    try {
      const client = new GoogleGenAI({ apiKey });
      const systemInstruction = `Bạn là Cố Vấn Tài Chính Cá Nhân AI (AI Financial Advisor) chuyên nghiệp, thực tế và thấu hiểu văn hóa tiêu dùng của người Việt Nam.
Hãy đọc kỹ báo cáo số liệu tài chính được cung cấp bên dưới và trả lời câu hỏi của người dùng một cách sắc bén, trung thực, kèm các bước hành động cụ thể để tiết kiệm tiền hoặc tối ưu ngân sách. Trả lời bằng tiếng Việt, định dạng Markdown gọn gàng, có icon trực quan.`;

      const prompt = `${systemInstruction}\n\n${contextSummary}\n\nCÂU HỎI CỦA NGƯỜI DÙNG: "${trimmedQ}"`;

      // Update rate limiter tracking
      lastRequestTime = Date.now();
      requestTimestamps.push(lastRequestTime);

      const response = await client.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          maxOutputTokens: 1200,
          temperature: 0.7,
        }
      });

      const responseText = response.text || 'Không nhận được phản hồi từ AI.';
      const result = {
        answer: responseText,
        modelUsed: 'gemini-3.6-flash (Google Gemini AI)'
      };

      // Save to cache
      cleanOldCache();
      responseCache.set(cacheKey, {
        answer: result.answer,
        modelUsed: result.modelUsed,
        timestamp: Date.now()
      });

      return result;
    } catch (err: any) {
      console.error('[Gemini API] Error encountered:', err.message);

      // If rate limited or quota exceeded, set cooldown to avoid spamming Google servers
      if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('quota')) {
        apiCooldownUntil = Date.now() + 60000; // 60s cooldown
        console.warn('[Anti-Abuse] 429 quota hit. Activating 60-second cooldown protection.');
      }
    }
  }

  // 🛡️ STEP 3: Fallback Offline Heuristic Engine (100% Reliable, 0 API quota)
  const qLower = normalizedQ;
  let generatedAnswer = '';

  if (qLower.includes('tiết kiệm') || qLower.includes('tiet kiem') || qLower.includes('cắt giảm')) {
    generatedAnswer = `💡 **Gợi ý tối ưu dòng tiền & tiết kiệm từ Cố vấn:**
- **Thực trạng**: Tháng ${monthlyStats.month.split('-')[1]}, bạn đang tiết kiệm được **${monthlyStats.netSavings.toLocaleString('vi-VN')}₫** (${monthlyStats.savingsRate}% thu nhập).
- **Hành động 1 (Khoản chi nhỏ)**: Bạn có **${adviceData.latteFactor.count} giao dịch nhỏ** (≤60k như cafe, đồ ăn vặt) với tổng **${adviceData.latteFactor.totalSmallExpenses.toLocaleString('vi-VN')}₫**. Nếu giảm 30% tần suất, bạn sẽ giữ lại được thêm **${Math.round(adviceData.latteFactor.totalSmallExpenses * 0.3).toLocaleString('vi-VN')}₫/tháng**.
- **Hành động 2 (Nhóm Sở thích)**: Nhóm chi tiêu mong muốn/giải trí hiện chiếm **${adviceData.rule503020.wants.actualPercent}%** (${adviceData.rule503020.wants.actual.toLocaleString('vi-VN')}₫). Áp dụng quy tắc "trì hoãn 48h trước khi chốt đơn" trên sàn thương mại điện tử để giảm thiểu mua sắm bốc đồng.`;
  } else if (qLower.includes('ăn uống') || qLower.includes('cafe') || qLower.includes('cà phê')) {
    const foodCat = monthlyStats.categories.find(c => c.categoryId === 'cat_food');
    generatedAnswer = `🍽️ **Phân tích chi tiêu Ăn uống & Cafe:**
- Tổng chi ăn uống: **${foodCat ? foodCat.amount.toLocaleString('vi-VN') + '₫' : 'Chưa ghi nhận'}** (chiếm ${foodCat ? foodCat.percentage : 0}% tổng chi cả tháng).
- Khoản chi cafe/đồ uống nhỏ lẻ cộng dồn: **${adviceData.latteFactor.totalSmallExpenses.toLocaleString('vi-VN')}₫** qua **${adviceData.latteFactor.count} lần**.
- **Lời khuyên**: Tự pha cafe 3 ngày/tuần hoặc nấu ăn tại nhà các ngày trong tuần sẽ giúp bạn vừa đảm bảo sức khỏe vừa tích lũy thêm 500.000₫ - 800.000₫/tháng!`;
  } else if (qLower.includes('ngân sách') || qLower.includes('tháng sau') || qLower.includes('thang sau')) {
    const targetBudget = Math.round(monthlyStats.totalExpense * 0.9);
    generatedAnswer = `🎯 **Đề xuất phân bổ Ngân sách Tháng Tiếp Theo:**
- **Mục tiêu tổng chi**: **${targetBudget.toLocaleString('vi-VN')}₫** (~${Math.round(targetBudget / 30).toLocaleString('vi-VN')}₫/ngày).
- **Thiết yếu (50%)**: Cố định quanh mức **${Math.round(targetBudget * 0.55).toLocaleString('vi-VN')}₫** (tiền phòng, điện nước, ăn uống cơ bản).
- **Sở thích (30%)**: Hạn mức tối đa **${Math.round(targetBudget * 0.25).toLocaleString('vi-VN')}₫**.
- **Tiết kiệm (20%)**: Trích ngay **${Math.round(monthlyStats.totalIncome * 0.2).toLocaleString('vi-VN')}₫** vào tài khoản tích lũy ngay khi nhận lương đầu tháng!`;
  } else {
    generatedAnswer = `📊 **Đánh giá tổng quan từ Cố Vấn:**
- Điểm sức khỏe tài chính tháng ${monthlyStats.month.split('-')[1]} của bạn là **${adviceData.healthScore}/100** (Mức **${adviceData.scoreLevel}**).
- Tỷ lệ phân bổ hiện tại: Thiết yếu **${adviceData.rule503020.needs.actualPercent}%** | Sở thích **${adviceData.rule503020.wants.actualPercent}%** | Tiết kiệm **${adviceData.rule503020.savings.actualPercent}%**.
- ${adviceData.keyInsights.length > 0 ? adviceData.keyInsights[0].description : 'Dòng tiền của bạn đang duy trì ổn định.'}`;
  }

  const fallbackResult = {
    answer: generatedAnswer,
    modelUsed: 'Local Financial Intelligence Engine (Offline Rule-based)'
  };

  // Cache fallback answer too so rapid clicks don't recompute
  responseCache.set(cacheKey, {
    answer: fallbackResult.answer,
    modelUsed: fallbackResult.modelUsed,
    timestamp: Date.now()
  });

  return fallbackResult;
}
