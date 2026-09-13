/**
 * 💎 SALARIA BACKEND — ANALYTICS & AI ADVISOR ROUTE HANDLER
 */

import { Env } from '../types';
import { jsonResponse } from '../utils/response';
import { WorkersAIAdapter } from '../ai/workers_ai';
import { getVietnamDateString, getVietnamMonthString } from '../utils/date';

export async function handleAnalytics(request: Request, env: Env, url: URL): Promise<Response | null> {
  const AI_ADVISOR_MODEL = env?.AI_ADVISOR_MODEL || '@cf/google/gemma-4-26b-a4b-it';

  // 1. Available Months
  if (url.pathname === '/api/analytics/available-months' && request.method === 'GET') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const monthsRes = await env.DB.prepare("SELECT DISTINCT substr(date, 1, 7) as month FROM transactions ORDER BY month DESC").all();
    const months = (monthsRes.results || []).map((r: any) => r.month).filter(Boolean);
    return jsonResponse({ success: true, data: months.length > 0 ? months : [getVietnamMonthString()] });
  }

  // 2. Monthly Analytics
  if (url.pathname === '/api/analytics/monthly' && request.method === 'GET') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const startDate = url.searchParams.get('start_date') || url.searchParams.get('startDate');
    const endDate = url.searchParams.get('end_date') || url.searchParams.get('endDate');
    const month = url.searchParams.get('month') || getVietnamMonthString();

    let txsRes: any;
    if (startDate && endDate) {
      txsRes = await env.DB.prepare(`
        SELECT t.*, c.name as category_name, c.group_type as category_group_type, c.color as category_color, c.icon as category_icon, c.budget_monthly
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.date >= ? AND t.date <= ?
        ORDER BY t.date ASC
      `).bind(startDate, endDate).all();
    } else {
      txsRes = await env.DB.prepare(`
        SELECT t.*, c.name as category_name, c.group_type as category_group_type, c.color as category_color, c.icon as category_icon, c.budget_monthly
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE substr(t.date, 1, 7) = ?
        ORDER BY t.date ASC
      `).bind(month).all();
    }

    const txs = txsRes.results || [];

    let totalIncome = 0;
    let totalExpense = 0;
    let needsExpense = 0;
    let wantsExpense = 0;

    const categoryMap = new Map<string, any>();
    const dailyMap = new Map<string, number>();

    for (const t of txs) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        totalIncome += amt;
      } else if (t.type === 'expense') {
        totalExpense += amt;
        const grp = t.category_group_type || 'needs';
        if (grp === 'needs') needsExpense += amt;
        else if (grp === 'wants') wantsExpense += amt;

        const catId = t.category_id || 'uncategorized';
        const catName = t.category_name || 'Chưa phân loại';
        const catColor = t.category_color || '#94a3b8';
        const catIcon = t.category_icon || 'Tag';
        const catBudget = Number(t.budget_monthly) || 0;

        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, {
            categoryId: catId,
            categoryName: catName,
            categoryColor: catColor,
            categoryIcon: catIcon,
            color: catColor,
            icon: catIcon,
            groupType: grp,
            amount: 0,
            budget: catBudget,
            count: 0
          });
        }
        const catEntry = categoryMap.get(catId);
        catEntry.amount += amt;
        catEntry.count += 1;

        const d = t.date;
        if (!dailyMap.has(d)) dailyMap.set(d, 0);
        dailyMap.set(d, (dailyMap.get(d) || 0) + amt);
      }
    }

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    const categories = Array.from(categoryMap.values()).map(c => ({
      ...c,
      percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);

    const dailySpending: any[] = [];
    let totalDays = 30;

    if (startDate && endDate) {
      let cur = new Date(startDate);
      const end = new Date(endDate);
      while (cur <= end) {
        const dayStr = cur.toISOString().split('T')[0];
        const amt = dailyMap.get(dayStr) || 0;
        const parts = dayStr.split('-');
        dailySpending.push({
          date: dayStr,
          day: `${parts[2]}/${parts[1]}`,
          amount: amt
        });
        cur.setDate(cur.getDate() + 1);
      }
      totalDays = Math.max(dailySpending.length, 1);
    } else {
      const [yearStr, monthStr] = month.split('-');
      const daysInMonth = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
      totalDays = daysInMonth;
      for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = `${month}-${String(i).padStart(2, '0')}`;
        const amt = dailyMap.get(dayStr) || 0;
        dailySpending.push({
          date: dayStr,
          day: i,
          amount: amt
        });
      }
    }

    const dailyAvg = totalDays > 0 ? Math.round(totalExpense / totalDays) : 0;

    let peakSpendingDay: any = null;
    let maxDayAmt = 0;
    for (const [d, amt] of dailyMap.entries()) {
      if (amt > maxDayAmt) {
        maxDayAmt = amt;
        const topTx = txs.filter((t: any) => t.date === d && t.type === 'expense').sort((a: any, b: any) => b.amount - a.amount)[0];
        peakSpendingDay = {
          date: d,
          amount: amt,
          topTransactionNote: topTx?.note || 'Chi tiêu'
        };
      }
    }

    const needsPercent = totalIncome > 0 ? Math.round((needsExpense / totalIncome) * 100) : (totalExpense > 0 ? Math.round((needsExpense / totalExpense) * 100) : 0);
    const wantsPercent = totalIncome > 0 ? Math.round((wantsExpense / totalIncome) * 100) : (totalExpense > 0 ? Math.round((wantsExpense / totalExpense) * 100) : 0);
    const savingsPercent = totalIncome > 0 ? Math.max(0, savingsRate) : 0;

    return jsonResponse({
      success: true,
      data: {
        month,
        startDate: startDate || null,
        endDate: endDate || null,
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        transactionCount: txs.length,
        dailyAverageExpense: dailyAvg,
        daysInMonth: totalDays,
        groupBreakdown: {
          needs: needsExpense,
          wants: wantsExpense,
          savings: Math.max(0, netSavings),
          needsPercentage: needsPercent,
          wantsPercentage: wantsPercent,
          savingsPercentage: savingsPercent
        },
        categories,
        dailySpending,
        peakSpendingDay
      }
    });
  }

  // 3. Comparison Analytics (MoM Multi-Month)
  if (url.pathname === '/api/analytics/comparison' && request.method === 'GET') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const monthsParam = url.searchParams.get('months');
    let monthsList = monthsParam ? monthsParam.split(',') : [];

    if (monthsList.length === 0) {
      const monthsRes = await env.DB.prepare("SELECT DISTINCT substr(date, 1, 7) as month FROM transactions ORDER BY month DESC LIMIT 6").all();
      monthsList = (monthsRes.results || []).map((r: any) => r.month).filter(Boolean);
    }

    const monthsData: any[] = [];
    for (const m of monthsList) {
      const mRes = await env.DB.prepare(`
        SELECT t.*, c.name as category_name, c.group_type as category_group_type, c.color as category_color, c.icon as category_icon
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE substr(t.date, 1, 7) = ?
      `).bind(m).all();

      const txs = mRes.results || [];
      let inc = 0, exp = 0;
      const catMap = new Map<string, any>();

      for (const t of txs) {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') {
          inc += amt;
        } else if (t.type === 'expense') {
          exp += amt;
          const cId = t.category_id || 'uncategorized';
          const cName = t.category_name || 'Chưa phân loại';
          const cIcon = t.category_icon || 'Tag';
          const cColor = t.category_color || '#94a3b8';
          const cGroup = t.category_group_type || 'needs';

          if (!catMap.has(cId)) {
            catMap.set(cId, {
              categoryId: cId,
              categoryName: cName,
              categoryIcon: cIcon,
              categoryColor: cColor,
              groupType: cGroup,
              amount: 0,
              count: 0
            });
          }
          const item = catMap.get(cId);
          item.amount += amt;
          item.count += 1;
        }
      }

      const monthCategories = Array.from(catMap.values()).map(c => ({
        ...c,
        percentage: exp > 0 ? Math.round((c.amount / exp) * 100) : 0
      })).sort((a, b) => b.amount - a.amount);

      monthsData.push({
        month: m,
        totalIncome: inc,
        totalExpense: exp,
        netSavings: inc - exp,
        savingsRate: inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0,
        transactionCount: txs.length,
        dailyAverageExpense: Math.round(exp / 30),
        daysInMonth: 30,
        groupBreakdown: { needs: exp, wants: 0, savings: Math.max(0, inc - exp), needsPercentage: 100, wantsPercentage: 0, savingsPercentage: 0 },
        categories: monthCategories,
        dailySpending: [],
        peakSpendingDay: null
      });
    }

    // 1. Tổng hợp bảng so sánh từng danh mục giữa các tháng (categoryComparison)
    const allCatMap = new Map<string, any>();
    for (const mObj of monthsData) {
      for (const c of mObj.categories) {
        if (!allCatMap.has(c.categoryId)) {
          allCatMap.set(c.categoryId, {
            categoryId: c.categoryId,
            categoryName: c.categoryName,
            categoryIcon: c.categoryIcon,
            categoryColor: c.categoryColor,
            groupType: c.groupType,
            monthlyAmounts: {}
          });
        }
        const globalCat = allCatMap.get(c.categoryId);
        globalCat.monthlyAmounts[mObj.month] = c.amount;
      }
    }

    const sortedMonths = [...monthsData].sort((a, b) => a.month.localeCompare(b.month));
    const latestMonth = sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1].month : null;
    const prevMonth = sortedMonths.length > 1 ? sortedMonths[sortedMonths.length - 2].month : null;

    const categoryComparison = Array.from(allCatMap.values()).map(cat => {
      const prevAmt = prevMonth ? (cat.monthlyAmounts[prevMonth] || 0) : 0;
      const latestAmt = latestMonth ? (cat.monthlyAmounts[latestMonth] || 0) : 0;
      const diffAmount = latestAmt - prevAmt;
      const diffPercentage = prevAmt > 0 ? Math.round((diffAmount / prevAmt) * 100) : (latestAmt > 0 ? 100 : 0);
      const trend = diffAmount > 0 ? 'up' : (diffAmount < 0 ? 'down' : 'same');

      return {
        ...cat,
        diffAmount,
        diffPercentage,
        trend
      };
    }).sort((a, b) => {
      const aLatest = latestMonth ? (a.monthlyAmounts[latestMonth] || 0) : 0;
      const bLatest = latestMonth ? (b.monthlyAmounts[latestMonth] || 0) : 0;
      return bLatest - aLatest;
    });

    // 2. Tính toán chênh lệch tổng quan toàn diện (overallMoM)
    let overallMoM: any = null;
    if (sortedMonths.length >= 2) {
      const prev = sortedMonths[sortedMonths.length - 2];
      const curr = sortedMonths[sortedMonths.length - 1];

      const incDiff = curr.totalIncome - prev.totalIncome;
      const expDiff = curr.totalExpense - prev.totalExpense;
      const savDiff = curr.netSavings - prev.netSavings;
      const rateDiff = curr.savingsRate - prev.savingsRate;

      overallMoM = {
        incomeDiff: incDiff,
        incomeDiffPercent: prev.totalIncome > 0 ? Math.round((incDiff / prev.totalIncome) * 100) : (curr.totalIncome > 0 ? 100 : 0),
        expenseDiff: expDiff,
        expenseDiffPercent: prev.totalExpense > 0 ? Math.round((expDiff / prev.totalExpense) * 100) : (curr.totalExpense > 0 ? 100 : 0),
        savingsDiff: savDiff,
        savingsRateDiff: rateDiff
      };
    }

    return jsonResponse({
      success: true,
      data: {
        months: monthsData,
        categoryComparison,
        overallMoM
      }
    });
  }

  // 4. Financial Advisor
  if (url.pathname === '/api/analytics/advisor' && request.method === 'GET') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const month = url.searchParams.get('month') || getVietnamMonthString();

    let txsRes: any;
    if (startDate && endDate) {
      txsRes = await env.DB.prepare(`
        SELECT t.*, c.name as category_name, c.group_type as category_group_type
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.date >= ? AND t.date <= ?
      `).bind(startDate, endDate).all();
    } else {
      txsRes = await env.DB.prepare(`
        SELECT t.*, c.name as category_name, c.group_type as category_group_type
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE substr(t.date, 1, 7) = ?
      `).bind(month).all();
    }

    const txs = txsRes.results || [];
    const expenseTxs = txs.filter((t: any) => t.type === 'expense');
    const smallExpenses = expenseTxs.filter((t: any) => (Number(t.amount) || 0) <= 60000);
    const totalSmall = smallExpenses.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
    const totalExpense = expenseTxs.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
    const totalIncome = txs.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

    const needsAmt = expenseTxs.filter((t: any) => t.category_group_type === 'needs').reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
    const wantsAmt = expenseTxs.filter((t: any) => t.category_group_type === 'wants').reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
    const netSavings = totalIncome - totalExpense;

    let score = 75;
    if (totalExpense > 0 && totalSmall / totalExpense > 0.2) score -= 15;
    score = Math.max(20, Math.min(95, score));

    let level = 'Tốt';
    let color = '#10b981';
    if (score >= 85) { level = 'Xuất sắc'; color = '#10b981'; }
    else if (score >= 70) { level = 'Tốt'; color = '#3b82f6'; }
    else if (score >= 50) { level = 'Trung bình'; color = '#f59e0b'; }
    else { level = 'Cần chú ý'; color = '#ef4444'; }

    const hasIncome = totalIncome > 0;
    let needsPercent = 0;
    let wantsPercent = 0;
    let savingsPercent = 0;
    let savingsActual = 0;
    let needsStatus = 'good';
    let wantsStatus = 'good';
    let savingsStatus = 'good';

    if (hasIncome) {
      needsPercent = Math.round((needsAmt / totalIncome) * 100);
      wantsPercent = Math.round((wantsAmt / totalIncome) * 100);
      savingsActual = Math.max(0, netSavings);
      savingsPercent = Math.max(0, Math.round((savingsActual / totalIncome) * 100));

      needsStatus = needsPercent <= 50 ? 'good' : 'warning';
      wantsStatus = wantsPercent <= 30 ? 'good' : 'warning';
      savingsStatus = savingsPercent >= 20 ? 'good' : 'warning';
    } else {
      if (totalExpense > 0) {
        needsPercent = Math.round((needsAmt / totalExpense) * 100);
        wantsPercent = Math.round((wantsAmt / totalExpense) * 100);
      }
      savingsActual = 0;
      savingsPercent = 0;
      needsStatus = 'no_income';
      wantsStatus = 'no_income';
      savingsStatus = 'no_income';
    }

    const keyInsights = [
      {
        type: 'info',
        title: 'Hiệu ứng Chi tiêu Nhỏ lẻ (Latte Factor)',
        description: `Bạn có ${smallExpenses.length} khoản chi nhỏ (<= 60.000₫) với tổng số tiền ${new Intl.NumberFormat('vi-VN').format(totalSmall)}₫`,
        icon: 'Coffee'
      }
    ];

    if (!hasIncome) {
      keyInsights.push({
        type: 'warning',
        title: 'Chưa ghi nhận thu nhập tháng này',
        description: 'Hãy gõ nhanh khoản thu nhập (ví dụ: +15tr lương) để AI kích hoạt chuẩn xác tỷ lệ tích lũy và quy tắc 50/30/20!',
        icon: 'TrendingUp'
      });
    } else if (savingsPercent >= 20) {
      keyInsights.push({
        type: 'success',
        title: 'Tỷ lệ tích lũy xuất sắc',
        description: `Bạn đang giữ lại được ${savingsPercent}% thu nhập (${new Intl.NumberFormat('vi-VN').format(savingsActual)}₫), vượt mục tiêu chuẩn 20%. Tiếp tục phát huy!`,
        icon: 'Savings'
      });
    } else {
      keyInsights.push({
        type: 'warning',
        title: 'Cần gia tăng tỷ lệ tích lũy',
        description: `Tỷ lệ tích lũy hiện tại là ${savingsPercent}% (mục tiêu chuẩn là 20%). Cân nhắc cắt giảm bớt các khoản chi sở thích.`,
        icon: 'Warning'
      });
    }

    if (wantsPercent > 30) {
      keyInsights.push({
        type: 'warning',
        title: 'Chi tiêu Sở thích vượt 30%',
        description: `Khoản chi sở thích đang chiếm ${wantsPercent}%. Nên rà soát lại các khoản ăn ngoài, cà phê và mua sắm.`,
        icon: 'ShoppingCart'
      });
    }

    return jsonResponse({
      success: true,
      data: {
        healthScore: score,
        scoreLevel: level,
        scoreColor: color,
        month,
        previousMonth: null,
        hasIncome,
        rule503020: {
          needs: { actual: needsAmt, target: totalIncome * 0.5, actualPercent: needsPercent, targetPercent: 50, status: needsStatus },
          wants: { actual: wantsAmt, target: totalIncome * 0.3, actualPercent: wantsPercent, targetPercent: 30, status: wantsStatus },
          savings: { actual: savingsActual, target: totalIncome * 0.2, actualPercent: savingsPercent, targetPercent: 20, status: savingsStatus }
        },
        keyInsights,
        recommendations: [
          { title: 'Tối ưu hóa chi tiêu nhỏ lẻ', action: 'Gộp các đơn mua sắm và hạn chế gọi đồ uống ngoài giờ', potentialSavingsMonthly: totalSmall * 0.3, priority: 'high' }
        ],
        latteFactor: {
          totalSmallExpenses: totalSmall,
          count: smallExpenses.length,
          averagePerTransaction: smallExpenses.length > 0 ? Math.round(totalSmall / smallExpenses.length) : 0,
          percentageOfTotalExpense: totalExpense > 0 ? Math.round((totalSmall / totalExpense) * 100) : 0
        }
      }
    });
  }

  // 5. AI Financial Advisor Ask
  if (url.pathname === '/api/analytics/ai-ask' && request.method === 'POST') {
    if (!env.DB) return jsonResponse({ success: false, error: 'Database not bound' }, 500);
    const body: any = await request.json();
    const question = body.question || 'Làm sao để tối ưu chi tiêu?';
    const selectedMonth = body.month;

    const today = getVietnamDateString();
    let endDateStr = today;
    if (selectedMonth && /^\d{4}-\d{2}$/.test(selectedMonth)) {
      const currentMonthStr = today.substring(0, 7);
      if (selectedMonth < currentMonthStr) {
        const [y, m] = selectedMonth.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        endDateStr = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      }
    }

    const endDateObj = new Date(endDateStr);
    const startDateObj = new Date(endDateObj.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDateStr = startDateObj.toISOString().split('T')[0];

    const txsRes = await env.DB.prepare(`
      SELECT t.date, t.amount, t.type, t.note, c.name as category_name, c.group_type as category_group_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.date >= ? AND t.date <= ?
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 100
    `).bind(startDateStr, endDateStr).all();

    const txs = txsRes.results || [];

    let totalIncome = 0;
    let totalExpense = 0;
    let smallExpenseTotal = 0;
    let smallExpenseCount = 0;

    for (const t of txs) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        totalIncome += amt;
      } else if (t.type === 'expense') {
        totalExpense += amt;
        if (amt <= 60000) {
          smallExpenseTotal += amt;
          smallExpenseCount += 1;
        }
      }
    }

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
    const formattedIncome = new Intl.NumberFormat('vi-VN').format(totalIncome) + ' ₫';
    const formattedExpense = new Intl.NumberFormat('vi-VN').format(totalExpense) + ' ₫';
    const formattedSavings = new Intl.NumberFormat('vi-VN').format(netSavings) + ' ₫';
    const formattedSmall = new Intl.NumberFormat('vi-VN').format(smallExpenseTotal) + ' ₫';

    const summaryList = txs.slice(0, 50).map((t: any) => `- ${t.date}: ${t.type === 'income' ? '+' : '-'}${new Intl.NumberFormat('vi-VN').format(t.amount)} ₫ (${t.category_name || 'Khác'}) - ${t.note}`).join('\n');

    let answer = 'Bạn nên theo dõi sát quy tắc 50/30/20 và hạn chế các khoản chi lặt vặt dưới 60.000₫ hàng ngày.';
    let modelUsed = 'Workers AI Heuristic';

    if (env.AI) {
      const sysPrompt = `Bạn là Cố Vấn Tài Chính Cá Nhân AI (AI Financial Advisor) của ứng dụng Salaria.
Dữ liệu tài chính 30 ngày gần nhất (từ ${startDateStr} đến ${endDateStr}):
• Thu nhập: ${formattedIncome} | Chi tiêu: ${formattedExpense} | Tiết kiệm: ${formattedSavings} (${savingsRate}%)
• Chi nhỏ lẻ (≤60k - Hiệu ứng Latte): ${formattedSmall} (${smallExpenseCount} lần)
• Tổng giao dịch: ${txs.length} giao dịch

Top giao dịch gần nhất:
${summaryList || '(Chưa có giao dịch)'}

QUY TẮC PHẢN HỒI (BẮT BUỘC):
1. NGẮN GỌN, ĐI THẲNG VÀO TRỌNG TÂM: Trình bày từ 3 - 5 gạch đầu dòng súc tích (tối đa 150 từ).
2. DỄ ĐỌC: Dùng gạch đầu dòng (•), in đậm số tiền/tỷ lệ quan trọng, kèm emoji trực quan (💡, 📊, 🎯, ⚠️).
3. HÀNH ĐỘNG CỤ THỂ: Đưa ra 1 - 2 hành động/khuyến nghị thực tế ngay thay vì phân tích lan man.`;

      const candidateAdvisorModels = [
        AI_ADVISOR_MODEL,
        '@cf/google/gemma-4-26b-a4b-it',
        '@cf/meta/llama-3.2-3b-instruct'
      ];

      const aiResult = await WorkersAIAdapter.run({
        aiBinding: env.AI,
        candidateModels: candidateAdvisorModels,
        systemPrompt: sysPrompt,
        userPrompt: question,
        taskType: 'deep_reasoning',
        db: env.DB
      });

      if (aiResult && aiResult.text) {
        answer = aiResult.text;
        let shortName = aiResult.model_used.replace('@cf/google/', '').replace('@cf/meta/', '').replace('@cf/qwen/', '').replace('@cf/', '');
        if (shortName.includes('gemma-4-26b')) shortName = 'Gemma 4 26B';
        else if (shortName.includes('qwen3.8-27b')) shortName = 'Qwen 3.8 27B';
        else if (shortName.includes('qwen3-30b')) shortName = 'Qwen 3 30B';
        else if (shortName.includes('llama-3.3-70b')) shortName = 'Llama 3.3 70B';
        else if (shortName.includes('llama-3.2-3b')) shortName = 'Llama 3.2 3B';
        modelUsed = `Workers AI (${shortName})`;
      }
    }

    return jsonResponse({
      success: true,
      data: { answer, modelUsed }
    });
  }

  return null;
}
