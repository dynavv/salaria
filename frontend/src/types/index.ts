export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'credit' | 'e-wallet' | 'investment';
  balance: number;
  initial_balance: number;
  currency: string;
  icon: string;
  color: string;
  is_default: number;
  current_balance?: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  group_type: 'needs' | 'wants' | 'savings' | 'income';
  icon: string;
  color: string;
  keywords: string;
  budget_monthly: number;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'expense' | 'income' | 'transfer';
  category_id: string | null;
  account_id: string;
  destination_account_id?: string | null;
  note?: string;
  source: 'manual' | 'telegram_html' | 'telegram_bot' | 'bank_notification' | 'csv' | 'backup';
  raw_telegram_text?: string | null;
  created_at: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  group_type?: 'needs' | 'wants' | 'savings' | 'income';
  account_name?: string;
  account_icon?: string;
  account_color?: string;
  destination_account_name?: string;
}

export interface ParsedTransaction {
  id: string;
  rawText: string;
  date: string;
  time?: string;
  amount: number;
  type: 'expense' | 'income' | 'transfer';
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  accountId: string;
  note: string;
  confidence: number;
  selected?: boolean;
}

export interface TelegramParseResult {
  transactions: ParsedTransaction[];
  unparsedMessages: Array<{
    date: string;
    text: string;
    reason: string;
  }>;
  totalParsed: number;
  totalAmountExpense: number;
  totalAmountIncome: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface MonthlyStats {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
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
  healthScore: number;
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
    monthlyAmounts: Record<string, number>;
    diffAmount: number;
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
