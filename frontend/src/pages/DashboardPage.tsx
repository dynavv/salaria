import React, { useState, useEffect } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Percent, 
  Receipt, 
  Calendar, 
  Sparkles, 
  Layers, 
  ChevronRight, 
  X, 
  Wallet, 
  ArrowDownWideNarrow,
  CalendarDays,
  Tag,
  ShieldCheck,
  Flame,
  Clock,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { MonthlyStats, Transaction } from '../types';
import { api } from '../api/client';
import { IconRenderer } from '../components/IconRenderer';

interface DashboardPageProps {
  currentMonth: string;
  refreshTrigger?: number;
  onOpenQuickAdd: () => void;
  onNavigateToAdvisor: () => void;
  onNavigateToTransactions: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentMonth,
  refreshTrigger,
  onOpenQuickAdd,
  onNavigateToAdvisor,
  onNavigateToTransactions,
}) => {
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [recentTxSort, setRecentTxSort] = useState<'date_desc' | 'amount_desc'>('date_desc');
  const [loading, setLoading] = useState<boolean>(true);

  // Sorting mode for daily spending chart
  const [dailySortMode, setDailySortMode] = useState<'date' | 'amount_desc'>('date');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Selected Day Modal state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayTransactions, setDayTransactions] = useState<Transaction[]>([]);
  const [daySortMode, setDaySortMode] = useState<'amount_desc' | 'default'>('amount_desc');
  const [loadingDayTx, setLoadingDayTx] = useState<boolean>(false);

  // Selected Category Modal state
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
    color: string;
    amount: number;
    percentage: number;
  } | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([]);
  const [loadingCategoryTx, setLoadingCategoryTx] = useState<boolean>(false);

  useEffect(() => {
    loadDashboardData();
  }, [currentMonth, recentTxSort, refreshTrigger]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, txRes] = await Promise.all([
        api.getMonthlyStats(currentMonth),
        api.getTransactions({ 
          month: currentMonth, 
          sort_by: recentTxSort,
          type: recentTxSort === 'amount_desc' ? 'expense' : undefined,
          limit: 8 
        }),
      ]);
      setStats(statsRes);
      setRecentTx(txRes.transactions);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDayModal = async (dateStr: string) => {
    try {
      setSelectedDate(dateStr);
      setLoadingDayTx(true);
      const res = await api.getTransactions({ date: dateStr, limit: 100 });
      setDayTransactions(res.transactions);
    } catch (err) {
      console.error('Failed to fetch day transactions', err);
    } finally {
      setLoadingDayTx(false);
    }
  };

  const handleOpenCategoryModal = async (cat: { id: string; name: string; color: string; amount: number; percentage: number }) => {
    try {
      setSelectedCategory(cat);
      setLoadingCategoryTx(true);
      const res = await api.getTransactions({ month: currentMonth, category_id: cat.id, limit: 100 });
      setCategoryTransactions(res.transactions);
    } catch (err) {
      console.error('Failed to fetch category transactions', err);
    } finally {
      setLoadingCategoryTx(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-400">Đang tổng hợp dữ liệu tài chính...</p>
      </div>
    );
  }

  if (!stats) return null;

  // Compute Days and Burn Rate Projection
  const [yearStr, monthStr] = currentMonth.split('-');
  const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.toISOString().substring(0, 7) === currentMonth;
  const currentDay = isCurrentMonth ? Math.min(today.getDate(), daysInMonth) : daysInMonth;
  const daysRemaining = Math.max(daysInMonth - currentDay, 1);

  const projectedTotalExpense = currentDay > 0 ? (stats.totalExpense / currentDay) * daysInMonth : stats.totalExpense;
  const safeDailyBudget = stats.totalIncome > stats.totalExpense 
    ? Math.max(0, (stats.totalIncome * 0.8 - stats.totalExpense) / daysRemaining)
    : 0;

  // Financial Health Score Calculation (0 to 100)
  let healthScore = 50;
  if (stats.totalIncome > 0) {
    const savingsRatio = stats.savingsRate;
    if (savingsRatio >= 30) healthScore += 35;
    else if (savingsRatio >= 20) healthScore += 25;
    else if (savingsRatio >= 10) healthScore += 15;
    else if (savingsRatio > 0) healthScore += 5;
    else healthScore -= 20;

    const needsRatio = (stats.groupBreakdown.needs / stats.totalIncome) * 100;
    if (needsRatio <= 50) healthScore += 15;
    else if (needsRatio <= 65) healthScore += 5;
    else healthScore -= 10;
  } else if (stats.totalExpense === 0) {
    healthScore = 75;
  } else {
    healthScore = 30;
  }
  healthScore = Math.min(100, Math.max(10, Math.round(healthScore)));

  // Format month title
  const monthTitle = `Tháng ${monthStr}/${yearStr}`;

  // Process category chart data
  const pieColors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#64748b'];
  const categoryChartData = (stats.categories || []).slice(0, 6).map((c, i) => ({
    id: c.categoryId,
    name: c.categoryName,
    amount: c.amount,
    percentage: c.percentage,
    color: c.categoryColor || pieColors[i % pieColors.length],
    icon: c.categoryIcon
  }));

  const rawDailySpending = stats.dailySpending || [];
  const displayDailySpending = dailySortMode === 'amount_desc'
    ? [...rawDailySpending].filter((d) => d.amount > 0).sort((a, b) => b.amount - a.amount)
    : rawDailySpending;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      
      {/* 🌟 1. SIGNATURE HERO BAR: Financial Health Score & Burn Rate */}
      <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-slate-800/80 border border-slate-700/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-sky-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Health Score Monogram */}
          <div className="lg:col-span-4 flex items-center space-x-4 border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-5 lg:pb-0 lg:pr-6">
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="32" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                <circle 
                  cx="40" 
                  cy="40" 
                  r="32" 
                  stroke={healthScore >= 75 ? '#10b981' : healthScore >= 50 ? '#f59e0b' : '#ef4444'} 
                  strokeWidth="6" 
                  strokeDasharray={200}
                  strokeDashoffset={200 - (200 * healthScore) / 100}
                  strokeLinecap="round"
                  fill="transparent" 
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-slate-100">{healthScore}</span>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">/ 100</span>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className={`w-4 h-4 ${healthScore >= 75 ? 'text-emerald-400' : healthScore >= 50 ? 'text-amber-400' : 'text-rose-400'}`} />
                <h2 className="text-sm font-bold text-slate-100">
                  {healthScore >= 80 ? 'Sức Khỏe Tài Chính Xuất Sắc' : healthScore >= 60 ? 'Tài Chính Ổn Định' : 'Cần Tối Ưu Chi Tiêu'}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {stats.savingsRate >= 20 
                  ? `Đang tích lũy vượt trội (${stats.savingsRate.toFixed(1)}% thu nhập).` 
                  : stats.savingsRate >= 0 
                  ? `Dòng tiền dương. Mục tiêu tiếp theo là tiết kiệm 20%.` 
                  : `Đang bội chi tháng này. Hãy kiểm tra các khoản phát sinh!`}
              </p>
            </div>
          </div>

          {/* Burn Rate & Projection Metrics */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
            
            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Tốc độ chi tiêu / ngày</span>
              </div>
              <p className="text-base font-black text-slate-100 mt-1.5">
                {Math.round(stats.dailyAverageExpense).toLocaleString('vi-VN')} ₫
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Đã trôi qua {currentDay}/{daysInMonth} ngày
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Dự báo chi cả tháng</span>
              </div>
              <p className={`text-base font-black mt-1.5 ${projectedTotalExpense > stats.totalIncome && stats.totalIncome > 0 ? 'text-rose-400' : 'text-sky-300'}`}>
                {Math.round(projectedTotalExpense).toLocaleString('vi-VN')} ₫
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {stats.totalIncome > 0 ? `Chiếm ${(projectedTotalExpense / stats.totalIncome * 100).toFixed(0)}% thu nhập` : 'Ước tính theo chu kỳ'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 col-span-2 sm:col-span-1">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hạn mức chi an toàn / ngày</span>
              </div>
              <p className="text-base font-black text-emerald-400 mt-1.5">
                {Math.round(safeDailyBudget).toLocaleString('vi-VN')} ₫
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Cho {daysRemaining} ngày còn lại
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* 📊 2. 4 CORE METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Expense */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tổng Chi Tiêu</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400 mt-2 tracking-tight">
            {stats.totalExpense.toLocaleString('vi-VN')} ₫
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/80">
            <span>Trung bình / ngày:</span>
            <span className="font-semibold text-slate-300">{Math.round(stats.dailyAverageExpense).toLocaleString('vi-VN')} ₫</span>
          </div>
        </div>

        {/* Total Income */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tổng Thu Nhập</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2 tracking-tight">
            {stats.totalIncome.toLocaleString('vi-VN')} ₫
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/80">
            <span>Số giao dịch:</span>
            <span className="font-semibold text-slate-300">{stats.transactionCount} bản ghi</span>
          </div>
        </div>

        {/* Net Savings */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tiết Kiệm Ròng</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-black mt-2 tracking-tight ${stats.netSavings >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
            {stats.netSavings.toLocaleString('vi-VN')} ₫
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/80">
            <span>Trạng thái:</span>
            <span className={`font-semibold ${stats.netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.netSavings >= 0 ? 'Thặng dư dòng tiền' : 'Thâm hụt tháng'}
            </span>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md hover:border-slate-700/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tỷ Lệ Tiết Kiệm</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-400 mt-2 tracking-tight">
            {stats.savingsRate.toFixed(1)}%
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-800/80">
            <span>Mục tiêu chuẩn:</span>
            <span className="font-semibold text-amber-400">≥ 20% thu nhập</span>
          </div>
        </div>

      </div>

      {/* 📈 3. CHARTS ROW: Daily Spending Bar Chart & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Daily Spending Chart (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                  <CalendarDays className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Biến Động Chi Tiêu Hàng Ngày</h3>
                  <p className="text-[11px] text-slate-500">Bấm vào bất kỳ cột nào để xem chi tiết các khoản chi ngày đó</p>
                </div>
              </div>

              {/* Sort Switcher */}
              <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
                <button
                  onClick={() => setDailySortMode('date')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    dailySortMode === 'date' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Theo ngày
                </button>
                <button
                  onClick={() => setDailySortMode('amount_desc')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center space-x-1 ${
                    dailySortMode === 'amount_desc' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowDownWideNarrow className="w-3 h-3" />
                  <span>Nhiều nhất</span>
                </button>
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayDailySpending} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}k`} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(51, 65, 85, 0.2)', radius: 8 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs">
                            <p className="font-bold text-slate-200">{d.date}</p>
                            <p className="text-rose-400 font-extrabold text-sm mt-1">
                              {Number(d.amount).toLocaleString('vi-VN')} ₫
                            </p>
                            <p className="text-[10px] text-emerald-400 mt-1">👉 Bấm để xem chi tiết ngày</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine 
                    y={stats.dailyAverageExpense} 
                    stroke="#f59e0b" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                    label={{ value: 'TB Ngày', fill: '#f59e0b', fontSize: 10, position: 'right' }} 
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="#10b981" 
                    radius={[6, 6, 0, 0]}
                    onClick={(data) => handleOpenDayModal(data.date)}
                    className="cursor-pointer transition-all hover:opacity-80"
                  >
                    {displayDailySpending.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.amount > stats.dailyAverageExpense * 1.5 ? '#f43f5e' : entry.amount > stats.dailyAverageExpense ? '#fb923c' : '#10b981'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-800">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Dưới mức TB</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Vượt TB</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Chi tiêu đột biến</span>
              </span>
            </div>
            <span className="text-slate-400 font-medium">TB: {Math.round(stats.dailyAverageExpense).toLocaleString('vi-VN')} ₫/ngày</span>
          </div>
        </div>

        {/* Category Breakdown (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                  <Tag className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Cơ Cấu Chi Tiêu Theo Nhóm</h3>
                  <p className="text-[11px] text-slate-500">Bấm vào từng nhóm để xem danh sách chi</p>
                </div>
              </div>
            </div>

            {/* Donut Chart & Category List */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center mt-2">
              <div className="sm:col-span-5 h-44 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="amount"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs">
                              <p className="font-bold text-slate-200">{d.name}</p>
                              <p className="font-black text-rose-400">{Number(d.amount).toLocaleString('vi-VN')} ₫</p>
                              <p className="text-slate-400 text-[10px]">{d.percentage.toFixed(1)}% tổng chi</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Top Chi</span>
                  <span className="text-xs font-bold text-slate-200">
                    {categoryChartData[0] ? `${categoryChartData[0].percentage.toFixed(0)}%` : '0%'}
                  </span>
                </div>
              </div>

              {/* Category Mini Rows */}
              <div className="sm:col-span-7 space-y-2">
                {categoryChartData.slice(0, 4).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleOpenCategoryModal(cat)}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/30 transition text-left text-xs group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></div>
                      <span className="font-semibold text-slate-200 truncate">{cat.name}</span>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <span className="font-bold text-slate-200">{Number(cat.amount).toLocaleString('vi-VN')} ₫</span>
                      <span className="text-[10px] text-slate-500 ml-1.5">({cat.percentage.toFixed(0)}%)</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-center">
            <button 
              onClick={onNavigateToTransactions}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center justify-center space-x-1 mx-auto transition"
            >
              <span>Xem chi tiết tất cả danh mục</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* ⚖️ 4. 50/30/20 BUDGET RULE TRACKER */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Đo Lường Quy Tắc Tài Chính 50/30/20</h3>
              <p className="text-[11px] text-slate-500">Mô hình phân bổ tài chính chuẩn: 50% Thiết yếu • 30% Linh hoạt • 20% Tích lũy</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Needs (50%) */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-sky-400">1. Thiết Yếu (Needs ≤ 50%)</span>
              <span className="font-black text-slate-200">{Number(stats.groupBreakdown.needs).toLocaleString('vi-VN')} ₫</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
              <div 
                className="bg-sky-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, stats.groupBreakdown.needsPercentage)}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Thực tế: <b className="text-slate-200">{stats.groupBreakdown.needsPercentage.toFixed(1)}%</b></span>
              <span className="text-[10px] text-slate-500">Ăn uống, Nhà cửa, Đi lại</span>
            </div>
          </div>

          {/* Wants (30%) */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-amber-400">2. Linh Hoạt (Wants ≤ 30%)</span>
              <span className="font-black text-slate-200">{Number(stats.groupBreakdown.wants).toLocaleString('vi-VN')} ₫</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
              <div 
                className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, stats.groupBreakdown.wantsPercentage)}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Thực tế: <b className="text-slate-200">{stats.groupBreakdown.wantsPercentage.toFixed(1)}%</b></span>
              <span className="text-[10px] text-slate-500">Mua sắm, Cafe, Giải trí</span>
            </div>
          </div>

          {/* Savings (20%) */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-emerald-400">3. Tích Lũy (Savings ≥ 20%)</span>
              <span className="font-black text-slate-200">{Number(stats.groupBreakdown.savings).toLocaleString('vi-VN')} ₫</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(0, stats.groupBreakdown.savingsPercentage))}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Thực tế: <b className="text-slate-200">{stats.groupBreakdown.savingsPercentage.toFixed(1)}%</b></span>
              <span className="text-[10px] text-slate-500">Tiết kiệm & Đầu tư</span>
            </div>
          </div>

        </div>
      </div>

      {/* 📜 5. RECENT / TOP TRANSACTIONS */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <Receipt className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">
                {recentTxSort === 'amount_desc' ? 'Top Khoản Chi Lớn Nhất Trong Tháng' : 'Giao Dịch Gần Đây Trong Tháng'}
              </h3>
              <p className="text-[11px] text-slate-500">Danh sách các khoản thu chi phát sinh trong {monthTitle}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
              <button
                onClick={() => setRecentTxSort('date_desc')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  recentTxSort === 'date_desc' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mới nhất
              </button>
              <button
                onClick={() => setRecentTxSort('amount_desc')}
                className={`px-3 py-1 rounded-lg font-semibold transition flex items-center space-x-1 ${
                  recentTxSort === 'amount_desc' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownWideNarrow className="w-3 h-3" />
                <span>Chi nhiều nhất ↓</span>
              </button>
            </div>

            <button
              onClick={onNavigateToTransactions}
              className="text-xs font-semibold text-slate-400 hover:text-emerald-400 flex items-center space-x-1 transition pl-2"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {recentTx.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Chưa có giao dịch nào trong tháng này. Bạn có thể nhắn tin cho Bot Telegram hoặc bấm "Thêm Giao Dịch"!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentTx.map((tx, idx) => (
              <div
                key={tx.id}
                onClick={() => handleOpenDayModal(tx.date.split('T')[0])}
                className="p-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 flex items-center justify-between text-xs transition cursor-pointer group"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  {recentTxSort === 'amount_desc' && (
                    <span className="w-5 text-center font-black text-slate-500 text-xs shrink-0">#{idx + 1}</span>
                  )}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: tx.category_color || '#3b82f6' }}
                  >
                    <IconRenderer name={tx.category_icon || 'Tag'} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-200 break-words line-clamp-1 leading-snug group-hover:text-emerald-400 transition">
                      {tx.note || tx.category_name || 'Chi tiêu'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {tx.date} • {tx.account_name} {tx.source === 'bank_notification' ? '• Ngân hàng' : tx.source === 'telegram_bot' ? '• Telegram' : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`font-black text-sm ${
                      tx.type === 'income' ? 'text-emerald-400' : tx.type === 'transfer' ? 'text-sky-400' : 'text-rose-400'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    {Number(tx.amount).toLocaleString('vi-VN')} ₫
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">{tx.category_name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 📅 MODAL XEM CHI TIẾT NGÀY */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Chi Tiết Ngày: {selectedDate}</h3>
                  <p className="text-[11px] text-slate-400">Danh sách các khoản phát sinh</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDate(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loadingDayTx ? (
                <div className="py-12 text-center text-xs text-slate-400">Đang tải...</div>
              ) : dayTransactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">Không có giao dịch nào trong ngày này.</div>
              ) : (
                dayTransactions.map((tx) => (
                  <div key={tx.id} className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: tx.category_color || '#3b82f6' }}
                      >
                        <IconRenderer name={tx.category_icon || 'Tag'} className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">{tx.note || tx.category_name}</p>
                        <p className="text-[10px] text-slate-400">{tx.account_name} • {tx.category_name}</p>
                      </div>
                    </div>
                    <span className={`font-black text-sm ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🏷️ MODAL XEM CHI TIẾT DANH MỤC */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: selectedCategory.color }}>
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{selectedCategory.name}</h3>
                  <p className="text-[11px] text-slate-400">
                    Tổng chi: <b className="text-rose-400">{Number(selectedCategory.amount).toLocaleString('vi-VN')} ₫</b> ({selectedCategory.percentage.toFixed(1)}%)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCategory(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loadingCategoryTx ? (
                <div className="py-12 text-center text-xs text-slate-400">Đang tải...</div>
              ) : categoryTransactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">Không có giao dịch nào trong danh mục này.</div>
              ) : (
                categoryTransactions.map((tx) => (
                  <div key={tx.id} className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-200">{tx.note || 'Chi tiêu'}</p>
                      <p className="text-[10px] text-slate-400">{tx.date} • {tx.account_name}</p>
                    </div>
                    <span className="font-black text-rose-400 text-sm">
                      -{Number(tx.amount).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
