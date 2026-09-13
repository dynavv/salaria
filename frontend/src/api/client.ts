import { 
  Account, 
  Category, 
  Transaction, 
  MonthlyStats, 
  FinancialHealthAnalysis, 
  MultiMonthComparison 
} from '../types';

const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, '')}/api` : '/api';

function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  let apiKey = sessionStorage.getItem('salaria_api_key') || localStorage.getItem('salaria_api_key');
  if (!apiKey || apiKey === 'salaria_secret_2026' || apiKey === 'salarini_secret_2026') {
    apiKey = import.meta.env.VITE_API_KEY || 'sal_sec_demo_key_2026';
    localStorage.setItem('salaria_api_key', apiKey);
  }
  return {
    'x-api-key': apiKey,
    ...customHeaders,
  };
}

export const api = {
  // Auth & PIN Verification
  async verifyPin(pin: string): Promise<{ success: boolean; token?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/auth/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    return await res.json();
  },

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
    startDate?: string;
    endDate?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ transactions: Transaction[]; availableMonths: string[] }> {
    const query = new URLSearchParams();
    if (params?.month) query.set('month', params.month);
    if (params?.date) query.set('date', params.date);
    if (params?.startDate || params?.start_date) query.set('start_date', params.startDate || params.start_date || '');
    if (params?.endDate || params?.end_date) query.set('end_date', params.endDate || params.end_date || '');
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

  // Analytics & Insights
  async getMonthlyStats(params: string | { month?: string; startDate?: string; endDate?: string }): Promise<MonthlyStats> {
    let query = '';
    if (typeof params === 'string') {
      query = `month=${encodeURIComponent(params)}`;
    } else {
      const q = new URLSearchParams();
      if (params.month) q.set('month', params.month);
      if (params.startDate) q.set('start_date', params.startDate);
      if (params.endDate) q.set('end_date', params.endDate);
      query = q.toString();
    }
    const res = await fetch(`${API_BASE}/analytics/monthly?${query}`, {
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
  }
};
