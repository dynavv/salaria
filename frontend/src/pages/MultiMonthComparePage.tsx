import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { 
  GitCompare, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Calendar,
  Layers
} from 'lucide-react';
import { MultiMonthComparison } from '../types';
import { api } from '../api/client';
import { IconRenderer } from '../components/IconRenderer';

interface MultiMonthComparePageProps {
  availableMonths: string[];
}

export const MultiMonthComparePage: React.FC<MultiMonthComparePageProps> = ({ availableMonths }) => {
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [data, setData] = useState<MultiMonthComparison | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize selected months (take up to 3 most recent)
  useEffect(() => {
    if (availableMonths.length > 0) {
      const initial = availableMonths.slice(0, 3).reverse();
      setSelectedMonths(initial);
    }
  }, [availableMonths]);

  // Fetch comparison data when selected months change
  useEffect(() => {
    if (selectedMonths.length > 0) {
      loadComparison();
    }
  }, [selectedMonths]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      const res = await api.getComparison(selectedMonths);
      setData(res);
    } catch (err) {
      console.error('Failed to load comparison', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMonth = (m: string) => {
    if (selectedMonths.includes(m)) {
      if (selectedMonths.length > 1) {
        setSelectedMonths(selectedMonths.filter((item) => item !== m));
      }
    } else {
      if (selectedMonths.length < 4) {
        setSelectedMonths([...selectedMonths, m].sort());
      }
    }
  };

  // Prepare chart data: each category with amount per month
  const chartData = (data?.categoryComparison || []).slice(0, 8).map((cat) => {
    const item: any = { name: cat.categoryName };
    for (const m of selectedMonths) {
      item[m] = cat.monthlyAmounts[m] || 0;
    }
    return item;
  });

  const monthColors = ['#38bdf8', '#10b981', '#f59e0b', '#ec4899'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <GitCompare className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-100">So sánh Biến động Chi tiêu giữa các Tháng</h2>
          </div>
          <p className="text-xs text-slate-400">
            Theo dõi xu hướng tăng giảm chi tiêu theo từng danh mục và đánh giá mức độ tiết kiệm theo thời gian.
          </p>
        </div>

        {/* Month selector chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Chọn tháng so sánh:</span>
          {availableMonths.map((m) => {
            const isSelected = selectedMonths.includes(m);
            return (
              <button
                key={m}
                onClick={() => handleToggleMonth(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
                }`}
              >
                Tháng {m.split('-')[1]}/{m.split('-')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Đang tổng hợp dữ liệu so sánh các tháng...</div>
      ) : !data || data.months.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
          Chưa có đủ dữ liệu giao dịch ở các tháng để so sánh. Hãy thêm hoặc import giao dịch từ Telegram!
        </div>
      ) : (
        <>
          {/* Overview Metric Cards across selected months */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.months.map((mStats, idx) => (
              <div
                key={mStats.month}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 relative overflow-hidden shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-800 text-sky-400 border border-slate-700">
                    Tháng {mStats.month.split('-')[1]}/{mStats.month.split('-')[0]}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {mStats.transactionCount} giao dịch
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">Tổng Chi:</span>
                    <span className="text-base font-extrabold text-rose-400">
                      {mStats.totalExpense.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-400">Tổng Thu:</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      {mStats.totalIncome.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
                    <span className="text-xs text-slate-400">Tiết kiệm ròng:</span>
                    <span className={`text-sm font-bold ${mStats.netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {mStats.netSavings.toLocaleString('vi-VN')} ₫ ({mStats.savingsRate}%)
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline text-[11px] text-slate-500">
                    <span>Trung bình ngày:</span>
                    <span>{mStats.dailyAverageExpense.toLocaleString('vi-VN')} ₫/ngày</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Side-by-Side Category Chart */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Biểu đồ So sánh Chi tiêu theo Danh mục qua các Tháng</span>
            </h3>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val) => `${(val / 1000).toLocaleString()}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    formatter={(val: any) => [`${Number(val).toLocaleString('vi-VN')} ₫`]}
                  />
                  <Legend />
                  {selectedMonths.map((m, idx) => (
                    <Bar
                      key={m}
                      dataKey={m}
                      name={`Tháng ${m.split('-')[1]}/${m.split('-')[0]}`}
                      fill={monthColors[idx % monthColors.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Category Variance Table */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Chi tiết Biến động theo từng Danh mục</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700/60">
                  <tr>
                    <th className="py-3 px-4">Danh mục</th>
                    <th className="py-3 px-3">Nhóm (50/30/20)</th>
                    {selectedMonths.map((m) => (
                      <th key={m} className="py-3 px-3 text-right">
                        Tháng {m.split('-')[1]}
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right">Biến động (MoM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.categoryComparison.map((cat) => (
                    <tr key={cat.categoryId} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 flex items-center space-x-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: cat.categoryColor }}
                        >
                          <IconRenderer name={cat.categoryIcon} className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-slate-200">{cat.categoryName}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cat.groupType === 'needs'
                              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                              : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {cat.groupType === 'needs' ? 'Thiết yếu' : 'Sở thích'}
                        </span>
                      </td>

                      {selectedMonths.map((m) => (
                        <td key={m} className="py-3 px-3 text-right font-medium text-slate-300">
                          {(cat.monthlyAmounts[m] || 0).toLocaleString('vi-VN')} ₫
                        </td>
                      ))}

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {cat.diffAmount > 0 ? (
                            <span className="flex items-center text-rose-400 font-bold">
                              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                              +{cat.diffAmount.toLocaleString('vi-VN')} ₫ (+{cat.diffPercentage}%)
                            </span>
                          ) : cat.diffAmount < 0 ? (
                            <span className="flex items-center text-emerald-400 font-bold">
                              <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                              {cat.diffAmount.toLocaleString('vi-VN')} ₫ ({cat.diffPercentage}%)
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium">Không đổi</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
