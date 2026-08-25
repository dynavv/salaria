import { db } from '../db';

export interface MonthlyStats {
  month: string; // YYYY-MM
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number; // percentage 0-100
  transactionCount: number;
  dailyAverageExpense: number;
  daysInMonth: number;
  groupBreakdown: {
    needs: number;
    wants: number;
    savings: number;
    needsPercentage: number;
    wantsPercentage: number;
    savingsPercentage: number;
  };
  categories: Array<{
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    groupType: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  dailySpending: Array<{
    date: string;
    day: number;
    amount: number;
  }>;
  peakSpendingDay: {
    date: string;
    amount: number;
    topTransactionNote?: string;
  } | null;
}

export interface FinancialHealthAnalysis {
  healthScore: number; // 0 - 100
  scoreLevel: 'Xuất sắc' | 'Tốt' | 'Trung bình' | 'Cần chú ý' | 'Báo động';
  scoreColor: string;
  month: string;
  previousMonth: string | null;
  rule503020: {
    needs: { actual: number; target: number; actualPercent: number; targetPercent: number; status: 'good' | 'warning' | 'danger' };
    wants: { actual: number; target: number; actualPercent: number; targetPercent: number; status: 'good' | 'warning' | 'danger' };
    savings: { actual: number; target: number; actualPercent: number; targetPercent: number; status: 'good' | 'warning' | 'danger' };
  };
  keyInsights: Array<{
    type: 'positive' | 'warning' | 'danger' | 'info';
    title: string;
    description: string;
    icon: string;
  }>;
  recommendations: Array<{
    title: string;
    action: string;
    potentialSavingsMonthly: number;
    priority: 'high' | 'medium' | 'low';
  }>;
  latteFactor: {
    totalSmallExpenses: number;
    count: number;
    averagePerTransaction: number;
    percentageOfTotalExpense: number;
  };
}

export interface MultiMonthComparison {
  months: MonthlyStats[];
  categoryComparison: Array<{
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    groupType: string;
    monthlyAmounts: Record<string, number>; // { '2026-07': 3000000, '2026-08': 3500000 }
    diffAmount: number; // between last 2 selected months
    diffPercentage: number;
    trend: 'up' | 'down' | 'same';
  }>;
  overallMoM: {
    incomeDiff: number;
    incomeDiffPercent: number;
    expenseDiff: number;
    expenseDiffPercent: number;
    savingsDiff: number;
    savingsRateDiff: number;
  } | null;
}

/**
 * Get stats for a specific month (format: YYYY-MM)
 */
export function getMonthlyStats(monthStr: string): MonthlyStats {
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Transactions in month
  const txRows = db.prepare(`
    SELECT t.id, t.date, t.amount, t.type, t.note, t.category_id,
           c.name as category_name, c.icon as category_icon, c.color as category_color, c.group_type
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE strftime('%Y-%m', t.date) = ?
    ORDER BY t.date ASC
  `).all(monthStr) as any[];

  let totalIncome = 0;
  let totalExpense = 0;
  let needsTotal = 0;
  let wantsTotal = 0;

  const catMap: Record<string, {
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    groupType: string;
    amount: number;
    count: number;
  }> = {};

  const dailyMap: Record<string, number> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    dailyMap[`${monthStr}-${dayStr}`] = 0;
  }

  let peakDay = { date: '', amount: 0, topTransactionNote: '' };

  for (const tx of txRows) {
    const amt = Number(tx.amount);
    if (tx.type === 'income') {
      totalIncome += amt;
    } else if (tx.type === 'expense') {
      totalExpense += amt;

      const group = tx.group_type || 'needs';
      if (group === 'needs') needsTotal += amt;
      else wantsTotal += amt;

      // Aggregate category
      const catId = tx.category_id || 'other';
      if (!catMap[catId]) {
        catMap[catId] = {
          categoryId: catId,
          categoryName: tx.category_name || 'Khác',
          categoryIcon: tx.category_icon || 'Tag',
          categoryColor: tx.category_color || '#64748b',
          groupType: group,
          amount: 0,
          count: 0
        };
      }
      catMap[catId].amount += amt;
      catMap[catId].count += 1;

      // Daily aggregation
      const txDate = tx.date.split('T')[0];
      if (dailyMap[txDate] !== undefined) {
        dailyMap[txDate] += amt;
      }
    }
  }

  // Find peak day and its largest expense transaction
  for (const [date, amt] of Object.entries(dailyMap)) {
    if (amt > peakDay.amount) {
      const expensesOnDay = txRows
        .filter(t => t.date.startsWith(date) && t.type === 'expense')
        .sort((a, b) => Number(b.amount) - Number(a.amount));
      
      const topTx = expensesOnDay[0];
      peakDay = {
        date,
        amount: amt,
        topTransactionNote: topTx ? `${topTx.note || topTx.category_name || 'Chi tiêu'} (${Number(topTx.amount).toLocaleString('vi-VN')}₫)` : ''
      };
    }
  }

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;
  const dailyAverageExpense = Math.round(totalExpense / daysInMonth);

  const categories = Object.values(catMap)
    .map(c => ({
      ...c,
      percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  const dailySpending = Object.entries(dailyMap).map(([date, amount]) => ({
    date,
    day: parseInt(date.split('-')[2], 10),
    amount
  }));

  const baseForRatio = totalIncome > 0 ? totalIncome : totalExpense;
  const needsPercentage = baseForRatio > 0 ? Math.round((needsTotal / baseForRatio) * 100) : 0;
  const wantsPercentage = baseForRatio > 0 ? Math.round((wantsTotal / baseForRatio) * 100) : 0;
  const savingsPercentage = totalIncome > 0 ? savingsRate : 0;

  return {
    month: monthStr,
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    transactionCount: txRows.length,
    dailyAverageExpense,
    daysInMonth,
    groupBreakdown: {
      needs: needsTotal,
      wants: wantsTotal,
      savings: Math.max(0, netSavings),
      needsPercentage,
      wantsPercentage,
      savingsPercentage
    },
    categories,
    dailySpending,
    peakSpendingDay: peakDay.amount > 0 ? peakDay : null
  };
}

/**
 * Generate Comprehensive Financial Insights & Recommendations
 */
export function generateFinancialAdvice(currentMonthStr: string, prevMonthStr?: string): FinancialHealthAnalysis {
  const current = getMonthlyStats(currentMonthStr);
  let previous: MonthlyStats | null = null;

  if (prevMonthStr) {
    previous = getMonthlyStats(prevMonthStr);
  } else {
    // Calculate previous month string
    const [y, m] = currentMonthStr.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const calculatedPrev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevTxCount = db.prepare(`SELECT COUNT(*) as count FROM transactions WHERE strftime('%Y-%m', date) = ?`).get(calculatedPrev) as { count: number };
    if (prevTxCount && prevTxCount.count > 0) {
      previous = getMonthlyStats(calculatedPrev);
      prevMonthStr = calculatedPrev;
    }
  }

  // Calculate Health Score (0 - 100)
  let score = 50; // Base score

  // 1. Savings rate component (+/- 30 points)
  if (current.totalIncome > 0) {
    if (current.savingsRate >= 30) score += 30;
    else if (current.savingsRate >= 20) score += 25;
    else if (current.savingsRate >= 10) score += 15;
    else if (current.savingsRate >= 0) score += 5;
    else score -= 25; // deficit
  } else if (current.totalExpense > 0) {
    score -= 10; // no logged income
  }

  // 2. Needs ratio component (+/- 15 points)
  if (current.groupBreakdown.needsPercentage <= 50) score += 15;
  else if (current.groupBreakdown.needsPercentage <= 65) score += 5;
  else score -= 10;

  // 3. Wants ratio component (+/- 15 points)
  if (current.groupBreakdown.wantsPercentage <= 30) score += 15;
  else if (current.groupBreakdown.wantsPercentage <= 40) score += 5;
  else score -= 10;

  score = Math.max(10, Math.min(100, score));

  let scoreLevel: FinancialHealthAnalysis['scoreLevel'] = 'Tốt';
  let scoreColor = '#10b981';
  if (score >= 85) { scoreLevel = 'Xuất sắc'; scoreColor = '#10b981'; }
  else if (score >= 70) { scoreLevel = 'Tốt'; scoreColor = '#3b82f6'; }
  else if (score >= 50) { scoreLevel = 'Trung bình'; scoreColor = '#f59e0b'; }
  else if (score >= 35) { scoreLevel = 'Cần chú ý'; scoreColor = '#f97316'; }
  else { scoreLevel = 'Báo động'; scoreColor = '#ef4444'; }

  // 50/30/20 breakdown comparison
  const incomeOrExp = current.totalIncome > 0 ? current.totalIncome : current.totalExpense;
  const rule503020 = {
    needs: {
      actual: current.groupBreakdown.needs,
      target: incomeOrExp * 0.5,
      actualPercent: current.groupBreakdown.needsPercentage,
      targetPercent: 50,
      status: (current.groupBreakdown.needsPercentage <= 50 ? 'good' : current.groupBreakdown.needsPercentage <= 65 ? 'warning' : 'danger') as 'good' | 'warning' | 'danger'
    },
    wants: {
      actual: current.groupBreakdown.wants,
      target: incomeOrExp * 0.3,
      actualPercent: current.groupBreakdown.wantsPercentage,
      targetPercent: 30,
      status: (current.groupBreakdown.wantsPercentage <= 30 ? 'good' : current.groupBreakdown.wantsPercentage <= 40 ? 'warning' : 'danger') as 'good' | 'warning' | 'danger'
    },
    savings: {
      actual: Math.max(0, current.netSavings),
      target: incomeOrExp * 0.2,
      actualPercent: current.savingsRate,
      targetPercent: 20,
      status: (current.savingsRate >= 20 ? 'good' : current.savingsRate >= 10 ? 'warning' : 'danger') as 'good' | 'warning' | 'danger'
    }
  };

  // Latte Factor Analysis (small transactions <= 60,000 VND e.g. coffee, snacks)
  const smallTxRows = db.prepare(`
    SELECT amount, note FROM transactions
    WHERE strftime('%Y-%m', date) = ? AND type = 'expense' AND amount <= 60000
  `).all(currentMonthStr) as any[];

  const totalSmallExpenses = smallTxRows.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const latteFactor = {
    totalSmallExpenses,
    count: smallTxRows.length,
    averagePerTransaction: smallTxRows.length > 0 ? Math.round(totalSmallExpenses / smallTxRows.length) : 0,
    percentageOfTotalExpense: current.totalExpense > 0 ? Math.round((totalSmallExpenses / current.totalExpense) * 100) : 0
  };

  // Generate Observations & Insights
  const insights: FinancialHealthAnalysis['keyInsights'] = [];
  const recommendations: FinancialHealthAnalysis['recommendations'] = [];

  // Insight 1: MoM Comparison
  if (previous && previous.totalExpense > 0) {
    const diff = current.totalExpense - previous.totalExpense;
    const diffPct = Math.round((diff / previous.totalExpense) * 100);
    if (diff < 0) {
      insights.push({
        type: 'positive',
        title: `Tiết kiệm hơn ${Math.abs(diffPct)}% so với tháng trước`,
        description: `Tổng chi tiêu tháng này giảm ${Math.abs(diff).toLocaleString('vi-VN')}₫ so với tháng ${previous.month.split('-')[1]}. Bạn đang kiểm soát ngân sách rất hiệu quả!`,
        icon: 'TrendingDown'
      });
    } else if (diff > 0) {
      insights.push({
        type: diffPct > 20 ? 'danger' : 'warning',
        title: `Chi tiêu tăng ${diffPct}% so với tháng trước`,
        description: `Tháng này bạn chi nhiều hơn ${diff.toLocaleString('vi-VN')}₫ so với tháng ${previous.month.split('-')[1]}.`,
        icon: 'TrendingUp'
      });
    }
  }

  // Insight 2: Top category domination
  if (current.categories.length > 0) {
    const topCat = current.categories[0];
    if (topCat.percentage >= 35) {
      insights.push({
        type: 'warning',
        title: `Danh mục "${topCat.categoryName}" chiếm tỷ trọng lớn (${topCat.percentage}%)`,
        description: `Bạn đã chi ${topCat.amount.toLocaleString('vi-VN')}₫ cho ${topCat.categoryName}. Đây là danh mục tiêu tốn nhiều ngân sách nhất của bạn trong tháng.`,
        icon: 'PieChart'
      });
    }
  }

  // Insight 3: Peak day
  if (current.peakSpendingDay && current.peakSpendingDay.amount > current.dailyAverageExpense * 2.5) {
    insights.push({
      type: 'info',
      title: `Đỉnh chi tiêu ngày ${current.peakSpendingDay.date.split('-')[2]}/${current.peakSpendingDay.date.split('-')[1]}`,
      description: `Ngày này bạn đã chi ${current.peakSpendingDay.amount.toLocaleString('vi-VN')}₫ (gấp ${(current.peakSpendingDay.amount / (current.dailyAverageExpense || 1)).toFixed(1)} lần mức trung bình ngày). ${current.peakSpendingDay.topTransactionNote ? 'Khoản chi lớn nhất: ' + current.peakSpendingDay.topTransactionNote : ''}`,
      icon: 'AlertCircle'
    });
  }

  // Insight 4: Latte factor
  if (latteFactor.count >= 10 && latteFactor.totalSmallExpenses >= 400000) {
    insights.push({
      type: 'info',
      title: `Khoản chi nhỏ lẻ tích tụ (Hiệu ứng Latte)`,
      description: `Bạn có ${latteFactor.count} giao dịch nhỏ (≤ 60k như cafe, trà sữa, quà vặt) với tổng số tiền ${latteFactor.totalSmallExpenses.toLocaleString('vi-VN')}₫ (chiếm ${latteFactor.percentageOfTotalExpense}% tổng chi).`,
      icon: 'Coffee'
    });
  }

  // Generate Actionable Recommendations
  // Recommendation 1: Cutting Wants or Latte factor
  if (latteFactor.totalSmallExpenses >= 500000) {
    const cutPotential = Math.round(latteFactor.totalSmallExpenses * 0.35);
    recommendations.push({
      title: 'Tối ưu hóa chi tiêu cafe & ăn vặt',
      action: `Giảm tần suất mua đồ uống ngoài hoặc tự pha cafe có thể giúp bạn giữ lại khoảng ${cutPotential.toLocaleString('vi-VN')}₫/tháng cho quỹ tiết kiệm.`,
      potentialSavingsMonthly: cutPotential,
      priority: 'medium'
    });
  }

  // Recommendation 2: Target Wants group if exceeded 30%
  if (current.groupBreakdown.wantsPercentage > 30 && current.groupBreakdown.wants > 1000000) {
    const targetWants = (current.totalIncome > 0 ? current.totalIncome : current.totalExpense) * 0.3;
    const excess = Math.max(0, current.groupBreakdown.wants - targetWants);
    recommendations.push({
      title: 'Thiết lập hạn mức cho nhóm Sở thích & Mua sắm (Wants)',
      action: `Nhóm chi tiêu mua sắm/giải trí đang vượt mức chuẩn 30%. Đặt ngân sách cố định đầu tháng và áp dụng quy tắc "trì hoãn 48h" trước khi mua các món đồ không thiết yếu.`,
      potentialSavingsMonthly: Math.round(excess * 0.5),
      priority: 'high'
    });
  }

  // Recommendation 3: General budget recommendation for next month
  const suggestedNextBudget = Math.round(current.totalExpense * 0.9);
  recommendations.push({
    title: 'Mục tiêu ngân sách tháng tiếp theo',
    action: `Dựa trên phân tích dòng tiền, mục tiêu chi tiêu hợp lý cho tháng sau là ${suggestedNextBudget.toLocaleString('vi-VN')}₫ (tương đương ${Math.round(suggestedNextBudget / 30).toLocaleString('vi-VN')}₫/ngày).`,
    potentialSavingsMonthly: Math.max(0, current.totalExpense - suggestedNextBudget),
    priority: 'low'
  });

  return {
    healthScore: score,
    scoreLevel,
    scoreColor,
    month: currentMonthStr,
    previousMonth: previous ? previous.month : null,
    rule503020,
    keyInsights: insights,
    recommendations,
    latteFactor
  };
}

/**
 * Compare Multiple Selected Months (e.g. 2026-06, 2026-07, 2026-08)
 */
export function getMultiMonthComparison(monthStrings: string[]): MultiMonthComparison {
  const sortedMonths = [...monthStrings].sort();
  const monthlyStatsList = sortedMonths.map(m => getMonthlyStats(m));

  // Get all unique categories across these months
  const allCategories = db.prepare(`SELECT id, name, icon, color, group_type FROM categories WHERE type = 'expense'`).all() as any[];

  const categoryComparison = allCategories.map(cat => {
    const monthlyAmounts: Record<string, number> = {};
    for (const stats of monthlyStatsList) {
      const found = stats.categories.find(c => c.categoryId === cat.id);
      monthlyAmounts[stats.month] = found ? found.amount : 0;
    }

    let diffAmount = 0;
    let diffPercentage = 0;
    let trend: 'up' | 'down' | 'same' = 'same';

    if (monthlyStatsList.length >= 2) {
      const lastMonth = monthlyStatsList[monthlyStatsList.length - 1].month;
      const prevMonth = monthlyStatsList[monthlyStatsList.length - 2].month;
      const lastAmt = monthlyAmounts[lastMonth] || 0;
      const prevAmt = monthlyAmounts[prevMonth] || 0;
      diffAmount = lastAmt - prevAmt;
      if (prevAmt > 0) {
        diffPercentage = Math.round((diffAmount / prevAmt) * 100);
      } else if (lastAmt > 0) {
        diffPercentage = 100;
      }
      if (diffAmount > 0) trend = 'up';
      else if (diffAmount < 0) trend = 'down';
    }

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      categoryColor: cat.color,
      groupType: cat.group_type,
      monthlyAmounts,
      diffAmount,
      diffPercentage,
      trend
    };
  }).filter(c => Object.values(c.monthlyAmounts).some(amt => amt > 0));

  let overallMoM = null;
  if (monthlyStatsList.length >= 2) {
    const last = monthlyStatsList[monthlyStatsList.length - 1];
    const prev = monthlyStatsList[monthlyStatsList.length - 2];
    overallMoM = {
      incomeDiff: last.totalIncome - prev.totalIncome,
      incomeDiffPercent: prev.totalIncome > 0 ? Math.round(((last.totalIncome - prev.totalIncome) / prev.totalIncome) * 100) : 0,
      expenseDiff: last.totalExpense - prev.totalExpense,
      expenseDiffPercent: prev.totalExpense > 0 ? Math.round(((last.totalExpense - prev.totalExpense) / prev.totalExpense) * 100) : 0,
      savingsDiff: last.netSavings - prev.netSavings,
      savingsRateDiff: last.savingsRate - prev.savingsRate
    };
  }

  return {
    months: monthlyStatsList,
    categoryComparison: categoryComparison.sort((a, b) => Math.abs(b.diffAmount) - Math.abs(a.diffAmount)),
    overallMoM
  };
}
