import { getMonthlyStats, generateFinancialAdvice } from './financialAdvisor';

interface CacheEntry {
  answer: string;
  modelUsed: string;
  timestamp: number;
}

// In-memory response cache to eliminate redundant calculations (TTL: 1 hour)
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function cleanOldCache() {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      responseCache.delete(key);
    }
  }
}

export async function askAiAdvisor(
  question: string,
  month: string
): Promise<{ answer: string; modelUsed: string }> {
  const trimmedQ = (question || '').trim();
  const normalizedQ = trimmedQ.toLowerCase();
  const cacheKey = `${month}:${normalizedQ}`;
  const now = Date.now();

  // Check In-Memory Cache first
  const cached = responseCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return {
      answer: cached.answer,
      modelUsed: `${cached.modelUsed} (Cached)`
    };
  }

  // Gather context from local database for the target month
  const monthlyStats = getMonthlyStats(month);
  const adviceData = generateFinancialAdvice(month);

  let generatedAnswer = '';

  if (normalizedQ.includes('tiết kiệm') || normalizedQ.includes('tiet kiem') || normalizedQ.includes('cắt giảm')) {
    generatedAnswer = `💡 **Gợi ý tối ưu dòng tiền & tiết kiệm từ Cố vấn:**
- **Thực trạng**: Tháng ${monthlyStats.month.split('-')[1]}, bạn đang tiết kiệm được **${monthlyStats.netSavings.toLocaleString('vi-VN')}₫** (${monthlyStats.savingsRate}% thu nhập).
- **Hành động 1 (Khoản chi nhỏ)**: Bạn có **${adviceData.latteFactor.count} giao dịch nhỏ** (≤60k như cafe, đồ ăn vặt) với tổng **${adviceData.latteFactor.totalSmallExpenses.toLocaleString('vi-VN')}₫**. Nếu giảm 30% tần suất, bạn sẽ giữ lại được thêm **${Math.round(adviceData.latteFactor.totalSmallExpenses * 0.3).toLocaleString('vi-VN')}₫/tháng**.
- **Hành động 2 (Nhóm Sở thích)**: Nhóm chi tiêu mong muốn/giải trí hiện chiếm **${adviceData.rule503020.wants.actualPercent}%** (${adviceData.rule503020.wants.actual.toLocaleString('vi-VN')}₫). Áp dụng quy tắc "trì hoãn 48h trước khi chốt đơn" trên sàn thương mại điện tử để giảm thiểu mua sắm bốc đồng.`;
  } else if (normalizedQ.includes('ăn uống') || normalizedQ.includes('cafe') || normalizedQ.includes('cà phê')) {
    const foodCat = monthlyStats.categories.find(c => c.categoryId === 'cat_food');
    generatedAnswer = `🍽️ **Phân tích chi tiêu Ăn uống & Cafe:**
- Tổng chi ăn uống: **${foodCat ? foodCat.amount.toLocaleString('vi-VN') + '₫' : 'Chưa ghi nhận'}** (chiếm ${foodCat ? foodCat.percentage : 0}% tổng chi cả tháng).
- Khoản chi cafe/đồ uống nhỏ lẻ cộng dồn: **${adviceData.latteFactor.totalSmallExpenses.toLocaleString('vi-VN')}₫** qua **${adviceData.latteFactor.count} lần**.
- **Lời khuyên**: Tự pha cafe 3 ngày/tuần hoặc nấu ăn tại nhà các ngày trong tuần sẽ giúp bạn vừa đảm bảo sức khỏe vừa tích lũy thêm 500.000₫ - 800.000₫/tháng!`;
  } else if (normalizedQ.includes('ngân sách') || normalizedQ.includes('tháng sau') || normalizedQ.includes('thang sau')) {
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

  const result = {
    answer: generatedAnswer,
    modelUsed: 'Smart Advisor'
  };

  cleanOldCache();
  responseCache.set(cacheKey, {
    answer: result.answer,
    modelUsed: result.modelUsed,
    timestamp: Date.now()
  });

  return result;
}
