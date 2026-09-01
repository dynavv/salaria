import { 
  Account, 
  Category, 
  Transaction, 
  TelegramParseResult, 
  MonthlyStats, 
  FinancialHealthAnalysis, 
  MultiMonthComparison 
} from '../types';

const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, '')}/api` : '/api';

function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const apiKey = localStorage.getItem('salaria_api_key') || 'salaria_secret_2026';
  return {
    'x-api-key': apiKey,
    ...customHeaders,
  };
}

export const api = {
  // Accounts
  async getAccounts(): Promise<Account[]> {
    const res = await fetch(`${API_BASE}/accounts`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    return data.data || [];
  },

  async createAccount(payload: Partial<Account>): Promise<Account> {
    const res = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    return (await res.json()).data;
  },

  async updateAccount(id: string, payload: Partial<Account>): Promise<void> {
    await fetch(`${API_BASE}/accounts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
  },

  async deleteAccount(id: string): Promise<void> {
    await fetch(`${API_BASE}/accounts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  },

  // Categories
  async getCategories(type?: 'expense' | 'income'): Promise<Category[]> {
    const url = type ? `${API_BASE}/categories?type=${type}` : `${API_BASE}/categories`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    const data = await res.json();
    return data.data || [];
  },

  async createCategory(payload: Partial<Category>): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    return (await res.json()).data;
  },

  // Transactions
  async getTransactions(params?: {
    month?: string;
    date?: string;
    category_id?: string;
    account_id?: string;
    type?: string;
    group_type?: string;
    max_amount?: number;
    search?: string;
    sort_by?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: Transaction[]; availableMonths: string[] }> {
    const query = new URLSearchParams();
    if (params?.month) query.set('month', params.month);
    if (params?.date) query.set('date', params.date);
    if (params?.category_id) query.set('category_id', params.category_id);
    if (params?.account_id) query.set('account_id', params.account_id);
    if (params?.type) query.set('type', params.type);
    if (params?.group_type) query.set('group_type', params.group_type);
    if (params?.max_amount !== undefined) query.set('max_amount', String(params.max_amount));
    if (params?.search) query.set('search', params.search);
    if (params?.sort_by) query.set('sort_by', params.sort_by);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));

    const res = await fetch(`${API_BASE}/transactions?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return {
      transactions: json.data || [],
      availableMonths: json.availableMonths || []
    };
  },

  async createTransaction(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async updateTransaction(id: string, payload: any): Promise<void> {
    await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
  },

  async deleteTransaction(id: string): Promise<void> {
    await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  },

  async clearAllTransactions(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/transactions/clear-all`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return await res.json();
  },

  // Telegram Import
  async parseTelegramFile(file: File, defaultAccountId: string = 'acc_cash'): Promise<TelegramParseResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('defaultAccountId', defaultAccountId);

    const res = await fetch(`${API_BASE}/import/telegram-html`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Lỗi khi parse file');
    return json.data;
  },

  async parseTelegramText(htmlContent: string, defaultAccountId: string = 'acc_cash'): Promise<TelegramParseResult> {
    const res = await fetch(`${API_BASE}/import/telegram-html`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ htmlContent, defaultAccountId })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Lỗi khi parse nội dung');
    return json.data;
  },

  async confirmImport(transactions: any[]): Promise<{ savedCount: number; message: string }> {
    const res = await fetch(`${API_BASE}/import/confirm`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ transactions })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Lỗi khi lưu giao dịch');
    return json;
  },

  async getSampleTelegramHtml(): Promise<string> {
    const res = await fetch(`${API_BASE}/import/sample-html`, {
      headers: getAuthHeaders()
    });
    return await res.text();
  },

  // Analytics & Insights
  async getMonthlyStats(month: string): Promise<MonthlyStats> {
    const res = await fetch(`${API_BASE}/analytics/monthly?month=${month}`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.data;
  },

  async getComparison(months?: string[]): Promise<MultiMonthComparison> {
    const url = months && months.length > 0
      ? `${API_BASE}/analytics/comparison?months=${months.join(',')}`
      : `${API_BASE}/analytics/comparison`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.data;
  },

  async getAdvisor(month: string, prevMonth?: string): Promise<FinancialHealthAnalysis> {
    let url = `${API_BASE}/analytics/advisor?month=${month}`;
    if (prevMonth) url += `&prevMonth=${prevMonth}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    const json = await res.json();
    return json.data;
  },

  async getAvailableMonths(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/analytics/available-months`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.data || [];
  },

  async askAiAdvisor(question: string, month: string, apiKey?: string): Promise<{ answer: string; modelUsed: string }> {
    const res = await fetch(`${API_BASE}/analytics/ai-ask`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ question, month, apiKey })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Lỗi khi gọi AI');
    return json.data;
  },

  // Telegram Bot Auto-Sync
  async getTelegramConfig(): Promise<{
    configured: boolean;
    botUsername?: string;
    autoSync: boolean;
    replyEnabled: boolean;
    lastSyncTime?: string;
    maskedToken: string;
  }> {
    const res = await fetch(`${API_BASE}/telegram/config`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    return json.data;
  },

  async saveTelegramConfig(config: {
    botToken?: string;
    autoSync?: boolean;
    replyEnabled?: boolean;
  }): Promise<{ message: string; botUsername?: string }> {
    const res = await fetch(`${API_BASE}/telegram/config`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(config)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Lỗi khi lưu cấu hình Telegram');
    return json;
  },

  async testTelegramBot(botToken: string): Promise<{ success: boolean; botName?: string; username?: string; message?: string }> {
    const res = await fetch(`${API_BASE}/telegram/test`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ botToken })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Kiểm tra Token thất bại');
    return json;
  },

  async syncTelegram(): Promise<{ syncedCount: number; transactions: any[]; message: string }> {
    const res = await fetch(`${API_BASE}/telegram/sync`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Lỗi khi đồng bộ Telegram');
    return json.data;
  },

  // Backup & Restore
  async exportBackup(): Promise<void> {
    window.location.href = `${API_BASE}/backup/export-json`;
  },

  async importBackup(data: any): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/backup/import-json`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ data })
    });
    return await res.json();
  }
};
