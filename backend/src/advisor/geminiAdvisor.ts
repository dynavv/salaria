import { GoogleGenAI } from '@google/genai';
import { getMonthlyStats, generateFinancialAdvice, getMultiMonthComparison } from './financialAdvisor';
import { db } from '../db';

export async function askGeminiAdvisor(
  question: string,
  month: string,
  userApiKey?: string
): Promise<{ answer: string; modelUsed: string }> {
  // 1. Gather rich context from local SQLite database for this month
  const monthlyStats = getMonthlyStats(month);
  const adviceData = generateFinancialAdvice(month);

  // Available months for comparison
  const availableMonths = db.prepare(`
    SELECT DISTINCT strftime('%Y-%m', date) as month 
    FROM transactions 
    ORDER BY month DESC 
    LIMIT 3
  `).all() as Array<{ month: string }>;

  const comparison = availableMonths.length >= 2 
    ? getMultiMonthComparison(availableMonths.map(m => m.month).reverse())
    : null;

  // Build structured summary prompt context
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

${adviceData.peakSpendingDay ? `- Ngày chi nhiều nhất: ${adviceData.peakSpendingDay.date} (${adviceData.peakSpendingDay.amount.toLocaleString('vi-VN')} ₫)` : ''}
`;

  const apiKey = userApiKey || process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const client = new GoogleGenAI({ apiKey });
      const systemInstruction = `Bạn là Cố Vấn Tài Chính Cá Nhân AI (AI Financial Advisor) chuyên nghiệp, thực tế và thấu hiểu văn hóa tiêu dùng của người Việt Nam. 
Hãy đọc kỹ báo cáo số liệu tài chính được cung cấp bên dưới và trả lời câu hỏi của người dùng một cách sắc bén, trung thực, kèm các bước hành động cụ thể để tiết kiệm tiền hoặc tối ưu ngân sách. Trả lời bằng tiếng Việt, định dạng Markdown gọn gàng, có icon trực quan.`;

      const prompt = `${systemInstruction}\n\n${contextSummary}\n\nCÂU HỎI CỦA NGƯỜI DÙNG: "${question}"`;

      const interaction = await client.interactions.create({
        model: 'gemini-3.6-flash',
        input: prompt,
      });

      const responseText = interaction.output_text || 'Không nhận được phản hồi từ AI.';
      return {
        answer: responseText,
        modelUsed: 'gemini-3.6-flash (Google Gemini AI)'
      };
    } catch (err: any) {
      console.error('Gemini API Error, falling back to heuristic engine:', err.message);
    }
  }

  // Fallback heuristic engine if no API key is set or API failed
  const qLower = question.toLowerCase();
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
- ${adviceData.keyInsights.length > 0 ? adviceData.keyInsights[0].description : 'Dòng tiền của bạn đang duy trì ổn định.'}

*(Mẹo: Bạn có thể cài đặt GEMINI_API_KEY trong file .env hoặc nhập trực tiếp để kích hoạt model AI Gemini 3.6 Flash phân tích chi tiết hơn nữa!)*`;
  }

  return {
    answer: generatedAnswer,
    modelUsed: 'Local Financial Intelligence Engine (Offline Rule-based)'
  };
}
