/**
 * 💎 SALARIA BACKEND — TYPESCRIPT TYPE DEFINITIONS
 */

export interface Env {
  DB: any;
  AI: any;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  AI_MODEL?: string;
  AI_ADVISOR_MODEL?: string;
  API_KEY?: string;
  MASTER_PIN?: string;
  SECRET_TOKEN?: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  initial_balance: number;
  currency?: string;
  icon?: string;
  color?: string;
  is_default?: number;
  created_at?: string;
  current_balance?: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income' | string;
  group_type: 'needs' | 'wants' | 'savings' | 'income' | string;
  icon?: string;
  color?: string;
  keywords?: string;
  budget_monthly?: number;
  created_at?: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'expense' | 'income' | 'transfer' | string;
  category_id?: string | null;
  account_id: string;
  destination_account_id?: string | null;
  note?: string;
  source?: string;
  raw_telegram_text?: string;
  telegram_message_id?: number | null;
  telegram_chat_id?: string | null;
  created_at?: string;
  // Join fields
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  category_group_type?: string | null;
  account_name?: string | null;
  account_icon?: string | null;
  account_color?: string | null;
  destination_account_name?: string | null;
}

export interface FinancialHealth {
  cycleDisplay: string;
  cycleExpense: number;
  cycleIncome: number;
  safeToSpendPerDay: number;
  daysRemaining: number;
  usedPercentage: number;
  savingsGoal?: number;
  reservedHousing?: number;
}

export interface PaycheckCycle {
  startDate: string;
  endDate: string;
  shortDisplay: string;
  daysRemaining: number;
  totalDays: number;
}

export interface ParsedMoney {
  amount: number;
  type: 'income' | 'expense';
  note: string;
}

export interface SystemLog {
  id: string;
  timestamp: number;
  level: string;
  tag: string;
  source?: string;
  message: string;
  metadata?: string | null;
}

export interface DailySummaryRecord {
  id: string;
  date: string;
  today_expense: number;
  safe_to_spend: number;
  days_remaining: number;
  status_note?: string;
  created_at?: string;
}
