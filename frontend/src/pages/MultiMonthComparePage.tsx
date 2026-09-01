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
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight
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

  // Format Month title (e.g. 2026-08 -> T08/26)
  const formatMonthShort = (mStr: string) => {
    const [y, m] = mStr.split('-');
    return `T${m}/${y.slice(-2)}`;
  };

  // Prepare chart data: each category with amount per month
  const chartData = (data?.categoryComparison || []).slice(0, 8).map((cat) => {
    const item: any = { name: cat.categoryName };
    for (const m of selectedMonths) {
      item[m] = cat.monthlyAmounts[m] || 0;
    }
    return item;
  });

  const monthColors = ['#10b981', '#38bdf8', '#f59e0b', '#ec4899'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-20">
      
      {/* 🌟 Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-800/80 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <GitCompare className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-100">So Sánh Biến Động Giữa Các Tháng</h2>
          </div>
          <p className="text-xs text-slate-400">
            Theo dõi xu hướng dòng tiền tăng/giảm qua các tháng và đánh giá hiệu quả tiết kiệm dài hạn.
          </p>
        </div>

        {/* Month Picker Chips */}
        <div className="flex items-center flex-wrap gap-2">
          {availableMonths.map((m) => {
            const isSelected = selectedMonths.includes(m);
            return (
              <button
                key={m}
                onClick={() => handleToggleMonth(m)}
                className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all shadow-sm ${
                  isSelected
                    ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400">Đang đối chiếu dữ liệu giữa các tháng...</span>
        </div>
      ) : !data ? null : (
        <>
          {/* 📊 Month-over-Month Highlight Cards */}
          {data.overallMoM && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Expense Diff */}
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
                <span className="text-xs font-bold text-slate-400">Biến động Chi tiêu MoM</span>
                <div className="flex items-center space-x-2 mt-2">
                  {data.overallMoM.expenseDiff <= 0 ? (
                    <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-xl bg-rose-500/15 text-rose-400">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  )}
                  <p className={`text-xl font-black ${data.overallMoM.expenseDiff <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {data.overallMoM.expenseDiff > 0 ? '+' : ''}{data.overallMoM.expenseDiff.toLocaleString('vi-VN')} ₫
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {data.overallMoM.expenseDiff <= 0 ? 'Giảm chi tiêu so với tháng trước' : 'Tăng chi tiêu so với tháng trước'}
                </p>
              </div>

              {/* Income Diff */}
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
                <span className="text-xs font-bold text-slate-400">Biến động Thu nhập MoM</span>
                <div className="flex items-center space-x-2 mt-2">
                  {data.overallMoM.incomeDiff >= 0 ? (
                    <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-400">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                  )}
                  <p className={`text-xl font-black ${data.overallMoM.incomeDiff >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {data.overallMoM.incomeDiff > 0 ? '+' : ''}{data.overallMoM.incomeDiff.toLocaleString('vi-VN')} ₫
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {data.overallMoM.incomeDiff >= 0 ? 'Thu nhập tăng trưởng' : 'Thu nhập giảm so với tháng trước'}
                </p>
              </div>

              {/* Savings Diff */}
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
                <span className="text-xs font-bold text-slate-400">Mức thay đổi Tiết kiệm</span>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="p-1.5 rounded-xl bg-sky-500/15 text-sky-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <p className={`text-xl font-black ${data.overallMoM.savingsDiff >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                    {data.overallMoM.savingsDiff > 0 ? '+' : ''}{data.overallMoM.savingsDiff.toLocaleString('vi-VN')} ₫
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Chênh lệch dòng tiền thặng dư
                </p>
              </div>

            </div>
          )}

          {/* 📈 Grouped Comparison Chart */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200">Đối Chiếu Chi Tiêu Theo Từng Danh Mục</h3>
              <div className="flex items-center space-x-3 text-xs">
                {selectedMonths.map((m, idx) => (
                  <div key={m} className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: monthColors[idx % monthColors.length] }}></span>
                    <span className="font-semibold text-slate-300">{m}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}k`} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(51, 65, 85, 0.2)', radius: 8 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-3 rounded-2xl shadow-2xl text-xs space-y-1.5">
                            <p className="font-bold text-slate-200">{label}</p>
                            {payload.map((p: any, i) => (
                              <div key={i} className="flex items-center justify-between space-x-3">
                                <span className="text-slate-400">{p.dataKey}:</span>
                                <span className="font-bold" style={{ color: p.fill }}>
                                  {Number(p.value).toLocaleString('vi-VN')} ₫
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {selectedMonths.map((m, idx) => (
                    <Bar 
                      key={m} 
                      dataKey={m} 
                      fill={monthColors[idx % monthColors.length]} 
                      radius={[6, 6, 0, 0]} 
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 📋 Comparison Detail Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800">
              <h4 className="text-xs font-bold text-slate-300">Bảng Chi Tiết Tăng / Giảm Theo Danh Mục</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Danh mục</th>
                    {selectedMonths.map((m) => (
                      <th key={m} className="py-3.5 px-4 text-right">{m}</th>
                    ))}
                    <th className="py-3.5 px-4 text-right">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.categoryComparison.map((cat) => (
                    <tr key={cat.categoryId} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: cat.categoryColor || '#64748b' }}
                          >
                            <IconRenderer name={cat.categoryIcon || 'Tag'} className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-slate-200">{cat.categoryName}</span>
                        </div>
                      </td>

                      {selectedMonths.map((m) => (
                        <td key={m} className="py-3.5 px-4 text-right font-medium text-slate-300">
                          {(cat.monthlyAmounts[m] || 0).toLocaleString('vi-VN')} ₫
                        </td>
                      ))}

                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-black ${
                            cat.diffAmount < 0 ? 'text-emerald-400' : cat.diffAmount > 0 ? 'text-rose-400' : 'text-slate-400'
                          }`}
                        >
                          {cat.diffAmount > 0 ? '+' : ''}{cat.diffAmount.toLocaleString('vi-VN')} ₫
                        </span>
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
