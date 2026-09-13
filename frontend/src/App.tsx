import React, { useState, useEffect } from 'react';
import { Sidebar, TabType } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { QuickAddModal } from './components/QuickAddModal';
import { PinLockScreen } from './components/PinLockScreen';
import { DashboardPage } from './pages/DashboardPage';
import { MultiMonthComparePage } from './pages/MultiMonthComparePage';
import { FinancialAdvisorPage } from './pages/FinancialAdvisorPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AccountsPage } from './pages/AccountsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { Account, Category } from './types';
import { api } from './api/client';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(sessionStorage.getItem('salaria_api_key'));
  });
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [currentMonth, setCurrentMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const [accs, cats, months] = await Promise.all([
        api.getAccounts(),
        api.getCategories(),
        api.getAvailableMonths(),
      ]);
      setAccounts(accs);
      setCategories(cats);

      if (months.length > 0) {
        setAvailableMonths(months);
        // Default to the latest month if current month has no data
        if (!months.includes(currentMonth)) {
          setCurrentMonth(months[0]);
        }
      } else {
        setAvailableMonths([currentMonth]);
      }
    } catch (err) {
      console.error('Failed to initialize app data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadInitialData();
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleLockApp = () => {
    sessionStorage.removeItem('salaria_api_key');
    localStorage.removeItem('salaria_api_key');
    setIsAuthenticated(false);
  };

  const totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance ?? a.balance ?? 0), 0);

  if (!isAuthenticated) {
    return <PinLockScreen onUnlocked={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalBalance={totalBalance}
        onLockApp={handleLockApp}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          availableMonths={availableMonths}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onRefresh={handleRefresh}
          loading={loading}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardPage
              currentMonth={currentMonth}
              refreshTrigger={refreshTrigger}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              onNavigateToAdvisor={() => setActiveTab('advisor')}
              onNavigateToTransactions={() => setActiveTab('transactions')}
            />
          )}

          {activeTab === 'compare' && (
            <MultiMonthComparePage availableMonths={availableMonths} />
          )}

          {activeTab === 'advisor' && (
            <FinancialAdvisorPage currentMonth={currentMonth} refreshTrigger={refreshTrigger} />
          )}

          {activeTab === 'transactions' && (
            <TransactionsPage
              currentMonth={currentMonth}
              refreshTrigger={refreshTrigger}
              accounts={accounts}
              categories={categories}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsPage accounts={accounts} onRefresh={handleRefresh} />
          )}

          {activeTab === 'categories' && (
            <CategoriesPage categories={categories} onRefresh={handleRefresh} />
          )}
        </main>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        accounts={accounts}
        categories={categories}
        onSuccess={handleRefresh}
      />
    </div>
  );
}

export default App;
