import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Coffee, 
  Target, 
  PieChart, 
  Lightbulb, 
  Send, 
  Bot, 
  CheckCircle2, 
  HelpCircle,
  Flame,
  ChevronRight,
  X,
  Wallet,
  MousePointerClick,
  Layers,
  Calendar,
  Tag
} from 'lucide-react';
import { FinancialHealthAnalysis, Transaction } from '../types';
import { api } from '../api/client';
import { IconRenderer } from '../components/IconRenderer';

interface FinancialAdvisorPageProps {
  currentMonth: string;
  refreshTrigger?: number;
}

interface DrillDownModalState {
  title: string;
  subtitle: string;
  badge: string;
  iconName: string;
  accentColor: string;
  fetchParams: {
    month?: string;
    date?: string;
    category_id?: string;
    group_type?: string;
    max_amount?: number;
    type?: string;
    sort_by?: string;
  };
}

export const FinancialAdvisorPage: React.FC<FinancialAdvisorPageProps> = ({ currentMonth, refreshTrigger }) => {
  const [data, setData] = useState<FinancialHealthAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [aiAnswers, setAiAnswers] = useState<Array<{ q: string; a: string; time: string; model: string }>>([]);
  const [answering, setAnswering] = useState<boolean>(false);

  // Drill down modal state
  const [modalState, setModalState] = useState<DrillDownModalState | null>(null);
  const [modalTransactions, setModalTransactions] = useState<Transaction[]>([]);
  const [loadingModalTx, setLoadingModalTx] = useState<boolean>(false);

  useEffect(() => {
    loadAdvisorData();
  }, [currentMonth, refreshTrigger]);

  const loadAdvisorData = async () => {
    try {
      setLoading(true);
      const res = await api.getAdvisor(currentMonth);
      setData(res);
    } catch (err) {
      console.error('Failed to load advisor data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrillDownModal = async (state: DrillDownModalState) => {
    setModalState(state);
    try {
      setLoadingModalTx(true);
      const res = await api.getTransactions({
        ...state.fetchParams,
        sort_by: state.fetchParams.sort_by || 'amount_desc',
        limit: 100,
      });
      setModalTransactions(res.transactions);
    } catch (err) {
      console.error('Failed to load drill down transactions', err);
    } finally {
      setLoadingModalTx(false);
    }
  };

  const handleCloseModal = () => {
    setModalState(null);
    setModalTransactions([]);
  };

  // Quick Open Handlers
  const handleOpenLatteModal = () => {
    handleOpenDrillDownModal({
      title: 'Chi tiết Các Khoản Chi Nhỏ Lẻ (Hiệu Ứng Latte)',
      subtitle: `Các giao dịch nhỏ ≤ 60.000₫ tích tụ trong Tháng ${currentMonth.split('-')[1]}/${currentMonth.split('-')[0]}`,
      badge: '≤ 60.000₫',
      iconName: 'Coffee',
      accentColor: '#f59e0b',
      fetchParams: {
        month: currentMonth,
        max_amount: 60000,
        type: 'expense',
        sort_by: 'amount_desc',
      },
    });
  };

  const handleOpenGroupModal = (groupType: 'needs' | 'wants' | 'savings') => {
    const groupTitles = {
      needs: { title: 'Nhóm Nhu Cầu Thiết Yếu (Needs - Chuẩn 50%)', color: '#3b82f6', icon: 'Target', badge: 'Thiết yếu' },
      wants: { title: 'Nhóm Sở Thích & Mua Sắm (Wants - Chuẩn 30%)', color: '#ec4899', icon: 'ShoppingBag', badge: 'Sở thích' },
      savings: { title: 'Khoản Thu Nhập & Tiết Kiệm Tích Lũy (Savings)', color: '#10b981', icon: 'TrendingUp', badge: 'Tích lũy' },
    };
    const info = groupTitles[groupType];
    handleOpenDrillDownModal({
      title: info.title,
      subtitle: `Danh sách các khoản giao dịch trong Tháng ${currentMonth.split('-')[1]}/${currentMonth.split('-')[0]}`,
      badge: info.badge,
      iconName: info.icon,
      accentColor: info.color,
      fetchParams: {
        month: currentMonth,
        group_type: groupType,
        type: groupType === 'savings' ? 'income' : 'expense',
        sort_by: 'amount_desc',
      },
    });
  };

  const handleOpenRecommendationModal = (rec: any) => {
    const titleLower = rec.title.toLowerCase();
    if (titleLower.includes('cafe') || titleLower.includes('ăn vặt') || titleLower.includes('latte')) {
      handleOpenLatteModal();
    } else if (titleLower.includes('wants') || titleLower.includes('sở thích') || titleLower.includes('mua sắm')) {
      handleOpenGroupModal('wants');
    } else {
      handleOpenDrillDownModal({
        title: 'Toàn Bộ Chi Tiêu Trong Tháng ' + currentMonth.split('-')[1] + '/' + currentMonth.split('-')[0],
        subtitle: 'Sắp xếp theo thứ tự khoản chi lớn nhất đầu tiên',
        badge: 'Toàn bộ',
        iconName: 'Receipt',
        accentColor: '#38bdf8',
        fetchParams: {
          month: currentMonth,
          type: 'expense',
          sort_by: 'amount_desc',
        },
      });
    }
  };

  const handleOpenInsightModal = (insight: any) => {
    const titleLower = insight.title.toLowerCase();
    if (titleLower.includes('đỉnh chi tiêu')) {
      // Extract date if present e.g. "Đỉnh chi tiêu ngày 22/08"
      const match = insight.title.match(/(\d{1,2})\/(\d{1,2})/);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const dateStr = `${currentMonth.split('-')[0]}-${month}-${day}`;
        handleOpenDrillDownModal({
          title: `Chi Tiết Giao Dịch Ngày Đỉnh Điểm ${day}/${month}`,
          subtitle: `Toàn bộ các khoản chi tiêu ghi nhận vào ngày ${day}/${month}/${currentMonth.split('-')[0]}`,
          badge: `Ngày ${day}/${month}`,
          iconName: 'Calendar',
          accentColor: '#f43f5e',
          fetchParams: {
            date: dateStr,
            sort_by: 'amount_desc',
          },
        });
        return;
      }
    }

    if (titleLower.includes('latte') || titleLower.includes('nhỏ lẻ')) {
      handleOpenLatteModal();
      return;
    }

    // Default to top transactions
    handleOpenDrillDownModal({
      title: insight.title,
      subtitle: `Các giao dịch liên quan trong Tháng ${currentMonth.split('-')[1]}/${currentMonth.split('-')[0]}`,
      badge: 'Chi tiết',
      iconName: insight.icon || 'Lightbulb',
      accentColor: '#38bdf8',
      fetchParams: {
        month: currentMonth,
        type: 'expense',
        sort_by: 'amount_desc',
      },
    });
  };

  const handleAskAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() || !data) return;

    const q = customQuestion.trim();
    setCustomQuestion('');
    setAnswering(true);

    try {
      const res = await api.askAiAdvisor(q, currentMonth);
      setAiAnswers((prev) => [
        ...prev,
        {
          q,
          a: res.answer,
          model: res.modelUsed,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setAiAnswers((prev) => [
        ...prev,
        {
          q,
          a: '❌ Có lỗi xảy ra khi kết nối Cố Vấn: ' + err.message,
          model: 'Error',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setAnswering(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Đang phân tích sức khỏe tài chính và tổng hợp lời khuyên...</div>;
  }

  if (!data) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
        Chưa có đủ dữ liệu để tạo báo cáo cố vấn. Hãy ghi nhận thêm giao dịch!
      </div>
    );
  }

  const modalTotalAmount = modalTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Top Banner: Financial Health Score & 50/30/20 Rule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Health Score Gauge (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col items-center justify-between relative overflow-hidden">
          <div className="w-full flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Điểm Sức Khỏe Tài Chính</span>
            </h3>
            <span className="text-[11px] text-slate-400">Tháng {currentMonth.split('-')[1]}</span>
          </div>

          {/* Radial Score Gauge */}
          <div className="my-4 flex flex-col items-center">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  strokeDasharray={`${data.healthScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke={data.scoreColor}
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-slate-100">{data.healthScore}</span>
                <span className="text-[11px] text-slate-400 font-semibold">/ 100 điểm</span>
              </div>
            </div>

            <div className="mt-3">
              <span
                className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ backgroundColor: `${data.scoreColor}20`, color: data.scoreColor, border: `1px solid ${data.scoreColor}50` }}
              >
                Mức {data.scoreLevel}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center border-t border-slate-800/80 pt-3">
            {data.healthScore >= 70
              ? 'Tuyệt vời! Bạn đang duy trì dòng tiền rất tốt và có dư địa tích lũy.'
              : 'Hãy chú ý cắt giảm các khoản chi sở thích ngoài kế hoạch để cải thiện dòng tiền.'}
          </p>
        </div>

        {/* 50/30/20 Rule Balance (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <Target className="w-4 h-4 text-sky-400" />
                <span>Cân đối theo Mô hình 50 / 30 / 20</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Nhấp vào từng thanh để xem danh sách chi tiết</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Phân bổ dòng tiền theo: Thiết yếu (≤ 50%) • Sở thích (≤ 30%) • Tiết kiệm / Đầu tư (≥ 20%)
            </p>
          </div>

          <div className="space-y-4 my-4">
            {/* Needs Bar */}
            <div 
              onClick={() => handleOpenGroupModal('needs')}
              className="space-y-1.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition group"
              title="Nhấp để xem toàn bộ giao dịch Nhu cầu thiết yếu"
            >
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300 group-hover:text-blue-400 flex items-center space-x-1.5 transition">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>1. Nhu cầu Thiết yếu (Needs)</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                </span>
                <span className="text-slate-200">
                  {data.rule503020.needs.actual.toLocaleString('vi-VN')} ₫ (
                  <strong className={data.rule503020.needs.actualPercent > 65 ? 'text-rose-400' : 'text-blue-400'}>
                    {data.rule503020.needs.actualPercent}%
                  </strong>{' '}
                  / Chuẩn 50%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    data.rule503020.needs.actualPercent > 65 ? 'bg-rose-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, data.rule503020.needs.actualPercent)}%` }}
                ></div>
              </div>
            </div>

            {/* Wants Bar */}
            <div 
              onClick={() => handleOpenGroupModal('wants')}
              className="space-y-1.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition group"
              title="Nhấp để xem toàn bộ giao dịch Sở thích & Mua sắm"
            >
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300 group-hover:text-purple-400 flex items-center space-x-1.5 transition">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span>2. Sở thích & Mua sắm (Wants)</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                </span>
                <span className="text-slate-200">
                  {data.rule503020.wants.actual.toLocaleString('vi-VN')} ₫ (
                  <strong className={data.rule503020.wants.actualPercent > 40 ? 'text-rose-400' : 'text-purple-400'}>
                    {data.rule503020.wants.actualPercent}%
                  </strong>{' '}
                  / Chuẩn 30%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    data.rule503020.wants.actualPercent > 40 ? 'bg-rose-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min(100, data.rule503020.wants.actualPercent)}%` }}
                ></div>
              </div>
            </div>

            {/* Savings Bar */}
            <div 
              onClick={() => handleOpenGroupModal('savings')}
              className="space-y-1.5 p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition group"
              title="Nhấp để xem toàn bộ giao dịch Thu nhập & Tích lũy"
            >
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300 group-hover:text-emerald-400 flex items-center space-x-1.5 transition">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>3. Tiết kiệm & Tích lũy (Savings)</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                </span>
                <span className="text-slate-200">
                  {data.rule503020.savings.actual.toLocaleString('vi-VN')} ₫ (
                  <strong className={data.rule503020.savings.actualPercent >= 20 ? 'text-emerald-400' : 'text-amber-400'}>
                    {data.rule503020.savings.actualPercent}%
                  </strong>{' '}
                  / Chuẩn ≥ 20%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, data.rule503020.savings.actualPercent)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              {data.rule503020.wants.actualPercent > 35
                ? '⚠️ Nhóm Sở thích đang vượt ngưỡng 30% khuyến nghị.'
                : '✅ Nhóm chi tiêu của bạn đang duy trì trong mức cân đối an toàn.'}
            </span>
          </div>
        </div>
      </div>

      {/* Actionable Recommendations for Next Month (Clickable Drill-Down) */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Lời Khuyên Hành Động Cụ Thể Cho Tháng Tới</span>
          </h3>
          <p className="text-[11px] text-slate-400 flex items-center space-x-1">
            <MousePointerClick className="w-3 h-3 text-sky-400" />
            <span>Nhấp vào thẻ bất kỳ để xem danh sách chi tiết các khoản chi.</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.recommendations.map((rec, idx) => (
            <div
              key={idx}
              onClick={() => handleOpenRecommendationModal(rec)}
              className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-800/90 transition-all duration-200 flex flex-col justify-between space-y-3 cursor-pointer group shadow-lg"
              title="Nhấp để xem danh sách chi tiết giao dịch liên quan"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      rec.priority === 'high'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : rec.priority === 'medium'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}
                  >
                    Ưu tiên {rec.priority === 'high' ? 'Cao' : rec.priority === 'medium' ? 'Vừa' : 'Đề xuất'}
                  </span>
                  {rec.potentialSavingsMonthly > 0 && (
                    <span className="text-xs font-black text-emerald-400">
                      +{rec.potentialSavingsMonthly.toLocaleString('vi-VN')}₫/tháng
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-sm text-slate-100 group-hover:text-emerald-400 transition">
                  {rec.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">{rec.action}</p>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-emerald-400 transition">
                <span>Xem danh sách chi tiết</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Observations & Latte Factor (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Key Observations (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Nhận Xét Nổi Bật Trong Tháng</span>
            </h3>
            <span className="text-[11px] text-slate-400">Bấm vào nhận xét để xem chi tiết</span>
          </div>

          <div className="space-y-3">
            {data.keyInsights.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">Chưa phát hiện biến động bất thường nào.</p>
            ) : (
              data.keyInsights.map((insight, idx) => (
                <div
                  key={idx}
                  onClick={() => handleOpenInsightModal(insight)}
                  className={`p-4 rounded-xl border flex items-start justify-between space-x-3 text-xs cursor-pointer transition hover:opacity-90 group ${
                    insight.type === 'positive'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 hover:border-emerald-400'
                      : insight.type === 'danger'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-200 hover:border-rose-400'
                      : insight.type === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 hover:border-amber-400'
                      : 'bg-sky-500/10 border-sky-500/30 text-sky-200 hover:border-sky-400'
                  }`}
                  title="Nhấp để xem danh sách giao dịch liên quan"
                >
                  <div className="flex items-start space-x-3">
                    <IconRenderer name={insight.icon} className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-100">{insight.title}</h4>
                      <p className="text-slate-300 leading-relaxed">{insight.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-100 shrink-0 self-center transition transform group-hover:translate-x-0.5" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latte Factor Spotlight (5 cols) */}
        <div 
          onClick={handleOpenLatteModal}
          className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between cursor-pointer group hover:border-amber-500/50 transition"
          title="Nhấp để xem toàn bộ danh sách các khoản chi cafe, ăn vặt nhỏ lẻ"
        >
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <Coffee className="w-4 h-4 text-amber-400" />
                <span className="group-hover:text-amber-400 transition">Hiệu Ứng Latte (Khoản Chi Nhỏ Lẻ)</span>
              </h3>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Phân tích các giao dịch nhỏ (≤ 60.000₫) như cafe, trà sữa, đồ ăn vặt.
            </p>
          </div>

          <div className="my-5 p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3 group-hover:border-slate-600 transition">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Số lần giao dịch nhỏ:</span>
              <span className="font-extrabold text-slate-200">{data.latteFactor.count} lần</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Trung bình mỗi lần:</span>
              <span className="font-extrabold text-slate-200">
                {data.latteFactor.averagePerTransaction.toLocaleString('vi-VN')} ₫
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-700/80">
              <span className="text-slate-300 font-bold">Tổng chi nhỏ lẻ tích tụ:</span>
              <span className="text-sm font-black text-amber-400">
                {data.latteFactor.totalSmallExpenses.toLocaleString('vi-VN')} ₫
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-amber-400 transition">
            <span>Bấm để xem chi tiết từng khoản ≤ 60k</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* AI Financial Advisor Chat Box */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">Hỏi Cố Vấn Tài Chính AI (Workers AI & Smart Advisor)</h3>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            Edge AI Active
          </span>
        </div>

        {/* AI Answer Conversation History */}
        {aiAnswers.length > 0 && (
          <div className="space-y-3 pt-2 max-h-96 overflow-y-auto">
            {aiAnswers.map((item, idx) => (
              <div key={idx} className="space-y-2 p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-700/60 pb-1.5">
                  <span className="font-bold text-slate-200">❓ Bạn: "{item.q}"</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-emerald-400 border border-slate-700">
                      {item.model}
                    </span>
                    <span>{item.time}</span>
                  </div>
                </div>
                <div className="text-slate-200 whitespace-pre-wrap leading-relaxed pt-1">
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Prompt Input Form */}
        <form onSubmit={handleAskAdvisor} className="flex items-center space-x-2 pt-2">
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Đặt câu hỏi, ví dụ: 'Tôi có thể tiết kiệm thêm bằng cách nào?', 'Tháng sau nên chi bao nhiêu cho ăn uống?'..."
            disabled={answering}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
          <button
            type="submit"
            disabled={answering || !customQuestion.trim()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-1.5 transition active:scale-95 shadow-md shadow-emerald-600/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{answering ? 'Đang suy nghĩ...' : 'Hỏi Cố Vấn'}</span>
          </button>
        </form>
      </div>

      {/* Itemized Drill Down Modal for Advisor Cards */}
      {modalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md"
                  style={{ backgroundColor: modalState.accentColor || '#10b981' }}
                >
                  <IconRenderer name={modalState.iconName || 'Receipt'} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">{modalState.title}</h3>
                  <p className="text-xs text-slate-400">{modalState.subtitle}</p>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Ribbon */}
            <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Tổng số tiền:</span>
                <p className="text-lg font-extrabold text-rose-400 mt-0.5">
                  {modalTotalAmount.toLocaleString('vi-VN')} ₫
                </p>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Số lượng giao dịch:</span>
                <p className="text-base font-bold text-slate-200 mt-0.5">
                  {modalTransactions.length} khoản chi
                </p>
              </div>
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loadingModalTx ? (
                <div className="py-8 text-center text-xs text-slate-400">Đang tải danh sách giao dịch chi tiết...</div>
              ) : modalTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Không tìm thấy giao dịch nào phù hợp với điều kiện này.
                </div>
              ) : (
                modalTransactions.map((tx, idx) => (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 hover:border-slate-600 transition flex items-center justify-between space-x-3 text-xs"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="w-5 text-center font-bold text-slate-500 text-xs shrink-0">#{idx + 1}</span>
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: tx.category_color || '#64748b' }}
                      >
                        <IconRenderer name={tx.category_icon || 'Tag'} className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-100 truncate text-xs">
                          {tx.note || tx.category_name || 'Chi tiêu'}
                        </h4>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                          <span>📅 Ngày {tx.date.split('-')[2]}/{tx.date.split('-')[1]}</span>
                          <span>•</span>
                          <span>{tx.category_name}</span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <Wallet className="w-3 h-3 text-slate-500" />
                            <span>{tx.account_name}</span>
                          </span>
                        </div>
                        {tx.raw_telegram_text && (
                          <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                            Gốc: "{tx.raw_telegram_text}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-black ${
                          tx.type === 'income' ? 'text-emerald-400' : tx.type === 'transfer' ? 'text-sky-400' : 'text-rose-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {Number(tx.amount).toLocaleString('vi-VN')} ₫
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {tx.source === 'telegram_bot' ? 'Telegram' : 'Sổ'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
