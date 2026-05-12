/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Download, Sparkles, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, History, PieChart as PieChartIcon, X, Calendar as CalendarIcon, Filter, User as UserIcon, CreditCard, Briefcase, PlusCircle, FileText, BookOpen, AlertCircle, Search, Target, ChevronRight, ArrowUp, ArrowDown, Users, BrainCircuit, RefreshCw, MessageSquareQuote, Calculator, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isWithinInterval, startOfMonth, endOfMonth, parseISO, subQuarters, startOfQuarter, endOfQuarter, addMonths, differenceInDays } from 'date-fns';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { 
  formatCurrency, 
  filterAssets, 
  filterTransactions, 
  calculateTotalStats, 
  calculateReportStats,
  generateId,
  generateCSV,
  getCategorySpending,
  groupTransactionsByDate,
  calculateHealthScore,
  getUpcomingRecurring,
  getTopBeneficiaries,
  calculateSourceBalances,
  checkFDMaturities
} from './lib/financeUtils';
import { UserProfile, Transaction, Asset, AssetType, Budget, Goal, InsuranceType, FinanceSource } from './types';
import { categories, FLAT_CATEGORIES as DEFAULT_CATEGORIES } from './categories';
import { getFinancialAdvice, parseTransactionSms } from './services/geminiService';

import { TransactionsPage } from './components/TransactionsPage';

const STORAGE_KEY_USER = 'finova_user';
const STORAGE_KEY_TRANSACTIONS = 'finova_transactions';
const STORAGE_KEY_ASSETS = 'finova_assets';
const STORAGE_KEY_SOURCES = 'finova_sources';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ASSETS);
    return saved ? JSON.parse(saved) : [];
  });

  const [sources, setSources] = useState<FinanceSource[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SOURCES);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('finova_budgets');
    return saved ? JSON.parse(saved) : {};
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const saved = localStorage.getItem('finova_goals');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('finova_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('finova_goals', JSON.stringify(goals));
  }, [goals]);

  const generateAdvice = async () => {
    setIsGeneratingAdvice(true);
    try {
      const advice = await getFinancialAdvice(transactions, assets, user, totalStats);
      setAiAdvice(advice);
      setShowAiPanel(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingAdvice(false);
    }
  };

  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [activeGoalForContribution, setActiveGoalForContribution] = useState<Goal | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [isRecurringChecked, setIsRecurringChecked] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ASSETS' | 'SETTINGS' | 'BUDGETS' | 'TRANSACTIONS'>('DASHBOARD');
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>('MUTUAL_FUND');
  const [formUnitPrice, setFormUnitPrice] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<string>('');
  const [formInvestedAmount, setFormInvestedAmount] = useState<string>('');

  useEffect(() => {
    if (['STOCK', 'MUTUAL_FUND'].includes(selectedAssetType) && formUnitPrice && formQuantity) {
      const total = parseFloat(formUnitPrice) * parseFloat(formQuantity);
      setFormInvestedAmount(total.toFixed(2));
    }
  }, [formUnitPrice, formQuantity, selectedAssetType]);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSmartAdding, setIsSmartAdding] = useState(false);
  const [smartAddInput, setSmartAddInput] = useState('');
  const [isParsingSmartAdd, setIsParsingSmartAdd] = useState(false);
  const [smartAddResult, setSmartAddResult] = useState<any>(null);

  const [whomOptions, setWhomOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('finova_whom_options');
    const options = saved ? JSON.parse(saved) : [];
    return options.filter((p: string) => p && p.trim() !== '');
  });

  const [modeOptions, setModeOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('finova_mode_options');
    const options = saved ? JSON.parse(saved) : [];
    return options.filter((m: string) => m && m.trim() !== '');
  });
  const [onboardingData, setOnboardingData] = useState({ name: '', initialBalance: '' });
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingSources, setOnboardingSources] = useState<Omit<FinanceSource, 'id'>[]>([]);
  const [onboardingSourceType, setOnboardingSourceType] = useState<'BANK' | 'CREDIT_CARD' | 'WALLET' | 'OTHER' | 'FD'>('BANK');
  const [settingsSourceType, setSettingsSourceType] = useState<'BANK' | 'CREDIT_CARD' | 'WALLET' | 'OTHER' | 'FD'>('BANK');
  
  // Date Range for Reporting
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return filterAssets(assets, searchQuery);
  }, [assets, searchQuery]);

  // Filtered Transactions for Reporting
  const filteredTransactions = useMemo(() => {
    return filterTransactions(transactions, dateRange, searchQuery)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, dateRange, searchQuery]);

  // Dashboard Stats (Overall)
  const totalStats = useMemo(() => {
    return calculateTotalStats(transactions, assets, user, sources);
  }, [transactions, user, assets, sources]);

  const sourceBalances = useMemo(() => {
    return calculateSourceBalances(transactions, sources);
  }, [transactions, sources]);

  const topBeneficiaries = useMemo(() => {
    return getTopBeneficiaries(transactions);
  }, [transactions]);

   const totalRequiredAmount = useMemo(() => {
    return Object.entries(budgets).reduce((sum, [category, amount]) => {
      let monthlyAmount = Number(amount);
      if (category === 'Property Tax Yearly once' || category === 'Insurance Premiums') {
        monthlyAmount = monthlyAmount / 12;
      }
      return sum + monthlyAmount;
    }, 0);
  }, [budgets]);

  const fdMaturityAlerts = useMemo(() => {
    return checkFDMaturities(sources);
  }, [sources]);

  // Daily Stats for Chart (Aggregated into 7 buckets for the range)
  const dailyChartStats = useMemo(() => {
    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
    
    // If range is 7 days or less, show individual days
    if (diffDays <= 7) {
      const days: { label: string; income: number; expense: number }[] = [];
      for (let i = 0; i < diffDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dayStr = format(d, 'yyyy-MM-dd');
        const dayTxs = filteredTransactions.filter(t => t.date === dayStr);
        
        days.push({
          label: format(d, 'EEE').toUpperCase(),
          income: dayTxs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0),
          expense: dayTxs.filter(t => t.type !== 'INCOME').reduce((sum, t) => sum + t.amount, 0)
        });
      }
      return days;
    }

    // For ranges > 7 days, aggregate into 7 buckets
    const bucketSize = diffDays / 7;
    const buckets: { label: string; income: number; expense: number }[] = [];
    
    for (let i = 0; i < 7; i++) {
      const bucketStart = new Date(start);
      bucketStart.setDate(start.getDate() + Math.floor(i * bucketSize));
      
      const bucketEnd = new Date(start);
      bucketEnd.setDate(start.getDate() + Math.floor((i + 1) * bucketSize) - 1);
      
      const bucketTxs = filteredTransactions.filter(t => {
        const tDate = parseISO(t.date);
        return tDate >= bucketStart && tDate <= bucketEnd;
      });

      buckets.push({
        label: format(bucketStart, 'dd MMM'),
        income: bucketTxs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0),
        expense: bucketTxs.filter(t => t.type !== 'INCOME').reduce((sum, t) => sum + t.amount, 0)
      });
    }
    
    return buckets;
  }, [filteredTransactions, dateRange]);

  // Report Stats (Filtered)
  const reportStats = useMemo(() => {
    return calculateReportStats(filteredTransactions, assets);
  }, [filteredTransactions, assets]);

  const exportData = () => {
    try {
      const data = {
        user,
        transactions,
        assets,
        budgets,
        whomOptions,
        modeOptions,
        exportDate: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finova_backup_${format(new Date(), 'yyyy_MM_dd')}.json`;
      document.body.appendChild(a); // Added to body for better mobile support
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Error:", err);
      alert("Failed to export JSON backup: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const exportToCSV = () => {
    try {
      const csvContent = generateCSV(filteredTransactions, assets);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finova_transactions_${dateRange.start}_to_${dateRange.end}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV Export Error:", err);
      alert("Failed to export CSV: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const downloadReport = (start: string, end: string, label: string) => {
    try {
      const filtered = transactions.filter(t => t.date >= start && t.date <= end);
      
      if (filtered.length === 0) {
        alert(`No transactions found for ${label} (${format(parseISO(start), 'dd MMM')} - ${format(parseISO(end), 'dd MMM')})`);
        return;
      }

      const csvContent = generateCSV(filtered, assets);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finova_report_${label.toLowerCase().replace(/\s+/g, '_')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Report Export Error:", err);
    }
  };

  const reportOptions = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // YTD (Jan 1 to today)
    const ytdStart = format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd');
    
    // Last 30 Days
    const l30Start = format(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    
    // Last Quarter (Calendar Quarter)
    const lastQuarter = subQuarters(today, 1);
    const lqStart = format(startOfQuarter(lastQuarter), 'yyyy-MM-dd');
    const lqEnd = format(endOfQuarter(lastQuarter), 'yyyy-MM-dd');

    const options = [
      { id: '30d', label: 'Last 30 Days', start: l30Start, end: todayStr, icon: <History size={18} />, color: 'bg-emerald-100 text-emerald-600' },
      { id: 'quarter', label: 'Last Quarter', start: lqStart, end: lqEnd, icon: <PieChartIcon size={18} />, color: 'bg-amber-100 text-amber-600' },
      { id: 'ytd', label: 'Year To Date', start: ytdStart, end: todayStr, icon: <TrendingUp size={18} />, color: 'bg-rose-100 text-rose-600' },
    ];

    return options;
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SOURCES, JSON.stringify(sources));
  }, [sources]);

  useEffect(() => {
    localStorage.setItem('finova_whom_options', JSON.stringify(whomOptions));
  }, [whomOptions]);

  useEffect(() => {
    localStorage.setItem('finova_mode_options', JSON.stringify(modeOptions));
  }, [modeOptions]);

  // Sync sources with modeOptions
  useEffect(() => {
    const sourceNames = sources.map(s => s.name);
    setModeOptions(prev => {
      const otherOptions = prev.filter(m => !sources.some(s => s.name === m));
      // Reconstruct: sources first, then others
      const combined = Array.from(new Set([...sourceNames, ...otherOptions]));
      return combined;
    });
  }, [sources]);

  const handleOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    if (onboardingStep === 1) {
      setOnboardingStep(2);
      return;
    }

    const newUser = {
      name: onboardingData.name,
      initialBalance: 0, // We use sources now
      onboarded: true
    };
    
    const formattedSources = onboardingSources.map(s => ({
      ...s,
      id: generateId()
    }));
    
    setSources(formattedSources);
    setUser(newUser);
  };

  const [customCategory, setCustomCategory] = useState('');
  const [customMode, setCustomMode] = useState('');
  const [customWhom, setCustomWhom] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORIES[0].name);
  const [selectedMode, setSelectedMode] = useState('Add New...');
  const [selectedWhom, setSelectedWhom] = useState('Add New...');

  const [selectedSource, setSelectedSource] = useState('Add New...');

  useEffect(() => {
    if (isAddingTransaction) {
      setIsRecurringChecked(editingTransaction?.isRecurring || false);
      if (editingTransaction) {
        setSelectedCategory(editingTransaction.category);
        setSelectedMode(editingTransaction.mode);
        setSelectedWhom(editingTransaction.whom || 'Add New...');
        setSelectedSource(editingTransaction.source || (sources.length > 0 ? sources[0].name : 'Add New...'));
      } else {
        setSelectedMode(modeOptions.length > 0 ? modeOptions[0] : 'Add New...');
        setSelectedWhom(whomOptions.length > 0 ? whomOptions[0] : 'Add New...');
        setSelectedSource(sources.length > 0 ? sources[0].name : 'Add New...');
      }
    }
  }, [isAddingTransaction, editingTransaction, modeOptions, whomOptions, sources]);

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...t,
      id: generateId(),
    };
    
    // Save new whom/mode options if they don't exist
    if (t.whom && !whomOptions.includes(t.whom)) {
      const updatedWhom = [...whomOptions, t.whom];
      setWhomOptions(updatedWhom);
      localStorage.setItem('finova_whom_options', JSON.stringify(updatedWhom));
    }
    if (t.mode && !modeOptions.includes(t.mode)) {
      const updatedMode = [...modeOptions, t.mode];
      setModeOptions(updatedMode);
      localStorage.setItem('finova_mode_options', JSON.stringify(updatedMode));
    }

    setTransactions(prev => [newTransaction, ...prev]);
    setIsAddingTransaction(false);
    // Reset custom fields
    setCustomCategory('');
    setCustomMode('');
    setCustomWhom('');
  };

  const updateTransaction = (t: Transaction) => {
    // Save new whom/mode options if they don't exist
    if (t.whom && !whomOptions.includes(t.whom)) {
      const updatedWhom = [...whomOptions, t.whom];
      setWhomOptions(updatedWhom);
      localStorage.setItem('finova_whom_options', JSON.stringify(updatedWhom));
    }
    if (t.mode && !modeOptions.includes(t.mode)) {
      const updatedMode = [...modeOptions, t.mode];
      setModeOptions(updatedMode);
      localStorage.setItem('finova_mode_options', JSON.stringify(updatedMode));
    }

    setTransactions(prev => prev.map(item => item.id === t.id ? t : item));
    setEditingTransaction(null);
    setIsAddingTransaction(false);
    // Reset custom fields
    setCustomCategory('');
    setCustomMode('');
    setCustomWhom('');
  };

  const addAsset = (a: Omit<Asset, 'id' | 'lastUpdated'>) => {
    const id = generateId();
    const newAsset: Asset = {
      ...a,
      id,
      lastUpdated: new Date().toISOString(),
    };
    
    // Automatically create an investment transaction
    const transaction: Transaction = {
      id: generateId(),
      title: `Investment: ${a.name}`,
      amount: a.investedAmount,
      type: 'INVESTMENT',
      category: 'Investments',
      date: format(new Date(), 'yyyy-MM-dd'),
      whom: 'Self',
      mode: 'Linked Account',
      source: sources[0]?.name || 'Bank'
    };

    setAssets(prev => [newAsset, ...prev]);
    setTransactions(prev => [transaction, ...prev]);
    setIsAddingAsset(false);
  };

  const addGoal = (g: Omit<Goal, 'id'>) => {
    const newGoal: Goal = {
      ...g,
      id: generateId()
    };
    setGoals(prev => [newGoal, ...prev]);
    setIsAddingGoal(false);
  };

  const contributeToGoal = (amount: number) => {
    if (!activeGoalForContribution) return;
    
    setGoals(prev => prev.map(g => 
      g.id === activeGoalForContribution.id 
        ? { ...g, currentAmount: g.currentAmount + amount } 
        : g
    ));

    // Create a transaction for tracking
    const transaction: Transaction = {
      id: generateId(),
      title: `Contribution: ${activeGoalForContribution.name}`,
      amount: amount,
      type: 'INVESTMENT',
      category: 'Investments',
      date: format(new Date(), 'yyyy-MM-dd'),
      whom: 'Self',
      mode: 'Linked Account',
      source: sources[0]?.name || 'Bank'
    };
    
    setTransactions(prev => [transaction, ...prev]);
    setActiveGoalForContribution(null);
    setContributionAmount('');
  };

  const activeGoals = useMemo(() => goals.filter(g => g.currentAmount < g.targetAmount), [goals]);
  const achievedGoals = useMemo(() => goals.filter(g => g.currentAmount >= g.targetAmount), [goals]);

  if (!user || !user.onboarded) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl w-full max-w-md border border-slate-100 relative z-10"
        >
          <div className="flex justify-center mb-10 overflow-visible">
            <div className="relative">
              <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-200 dark:shadow-none animate-pulse">
                <Wallet size={36} />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-2xl border-4 border-white dark:border-slate-900 flex items-center justify-center text-white scale-110">
                <Sparkles size={16} />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-black text-center text-slate-900 dark:text-white mb-2 tracking-tighter">Finova</h1>
          <div className="flex justify-center gap-2 mb-6">
            <div className={cn("w-2 h-2 rounded-full", onboardingStep === 1 ? "bg-indigo-600" : "bg-indigo-100")} />
            <div className={cn("w-2 h-2 rounded-full", onboardingStep === 2 ? "bg-indigo-600" : "bg-indigo-100")} />
          </div>

          {onboardingStep === 1 ? (
            <>
              <p className="text-center text-slate-500 dark:text-slate-400 mb-10 font-medium leading-relaxed">
                Welcome to the future of <span className="text-indigo-600 dark:text-indigo-400 font-bold">Personal Treasury</span>. Track everything in one place.
              </p>
              
              <form onSubmit={handleOnboarding} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Identity</label>
                  <input 
                    required
                    type="text" 
                    placeholder="How shall we call you?"
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 focus:border-indigo-600 outline-none transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    value={onboardingData.name}
                    onChange={e => setOnboardingData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-3"
                >
                  Continue
                  <ChevronRight size={20} />
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Source Accounts</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Add your bank accounts, cards, and wallets.</p>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                {onboardingSources.map((source, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
                    <div>
                      <p className="text-sm font-black text-slate-800">{source.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{source.type} • {formatCurrency(source.initialBalance)}</p>
                    </div>
                    <button 
                      onClick={() => setOnboardingSources(prev => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                
                {onboardingSources.length === 0 && (
                  <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No sources added yet</p>
                  </div>
                )}
              </div>

              <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-4">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center">Add New Source</p>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('sourceName') as string;
                    const balance = parseFloat(formData.get('sourceBalance') as string) || 0;
                    const type = formData.get('sourceType') as any;
                    
                    let extraData: any = {};
                    if (type === 'CREDIT_CARD') {
                      extraData.outstandingAmount = parseFloat(formData.get('outstandingAmount') as string) || 0;
                      extraData.creditLimit = parseFloat(formData.get('creditLimit') as string) || 0;
                    } else if (type === 'FD' || type === 'RD') {
                      const tenure = parseInt(formData.get('tenureMonths') as string) || 0;
                      const initDate = (formData.get('initializationDate') as string) || format(new Date(), 'yyyy-MM-dd');
                      extraData.tenureMonths = tenure;
                      extraData.initializationDate = initDate;
                      if (tenure > 0) {
                        extraData.maturityDate = format(addMonths(parseISO(initDate), tenure), 'yyyy-MM-dd');
                      }
                    }
                    
                    if (name) {
                      setOnboardingSources(prev => [...prev, { name, initialBalance: balance, type, ...extraData }]);
                      e.currentTarget.reset();
                      setOnboardingSourceType('BANK');
                    }
                  }}
                  className="space-y-3"
                >
                  <input required name="sourceName" type="text" placeholder="Bank/Source Name" className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none ring-indigo-500/10 focus:ring-4" />
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      required 
                      name="sourceBalance" 
                      type="number" 
                      step="0.01"
                      placeholder={onboardingSourceType === 'FD' ? 'FD Amount' : 'Opening Balance'} 
                      className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none" 
                    />
                    <select 
                      name="sourceType" 
                      value={onboardingSourceType}
                      onChange={(e) => setOnboardingSourceType(e.target.value as any)}
                      className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none appearance-none"
                    >
                      <option value="BANK">Bank</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="WALLET">Wallet</option>
                      <option value="FD">Fixed Deposit (FD)</option>
                      <option value="RD">Recurring Deposit (RD)</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  {onboardingSourceType === 'CREDIT_CARD' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Balance to Pay (₹)</label>
                        <input name="outstandingAmount" type="number" step="0.01" placeholder="Current Dues" className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Credit Limit (₹)</label>
                        <input name="creditLimit" type="number" step="0.01" placeholder="Total Limit" className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none" />
                      </div>
                    </motion.div>
                  )}

                  {onboardingSourceType === 'FD' || onboardingSourceType === 'RD' ? (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3 pb-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tenure (Months)</label>
                        <input required name="tenureMonths" type="number" placeholder="Ex. 12" className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Init Date</label>
                        <input required name="initializationDate" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none" />
                      </div>
                    </motion.div>
                  ) : null}

                  <button type="submit" className="w-full py-3 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                    <Plus size={14} /> Add Source
                  </button>
                </form>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setOnboardingStep(1)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Back
                </button>
                <button 
                  disabled={onboardingSources.length === 0}
                  onClick={handleOnboarding}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  Start My Treasury
                </button>
              </div>
            </div>
          )}
        </motion.div>
        
        <p className="mt-8 text-[10px] font-black uppercase tracking-widest text-slate-400 animate-bounce">
          Secured with local encryption
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col p-4 md:p-8 max-w-7xl mx-auto overflow-hidden relative">
      {/* Background blobs for Glass effect */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/30 blur-[100px] rounded-full -z-10 no-print" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-emerald-100/30 blur-[100px] rounded-full -z-10 no-print" />
      <div className="fixed top-[20%] left-[10%] w-[20%] h-[20%] bg-rose-100/20 blur-[80px] rounded-full -z-10 no-print" />

      <div className="flex justify-between items-center mb-8 no-print gap-4 relative z-10">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit overflow-x-auto max-w-full">
          <button 
            onClick={() => setActiveTab('DASHBOARD')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap",
              activeTab === 'DASHBOARD' ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100/50" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('ASSETS')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap",
              activeTab === 'ASSETS' ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100/50" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Asset Portfolio
          </button>

          <button 
            onClick={() => setActiveTab('BUDGETS')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap",
              activeTab === 'BUDGETS' ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100/50" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Monthly Budgets
          </button>

          <button 
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap",
              activeTab === 'TRANSACTIONS' ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100/50" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Transactions
          </button>

          <button 
            onClick={() => setActiveTab('SETTINGS')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap",
              activeTab === 'SETTINGS' ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100/50" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Preferences
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={generateAdvice}
            disabled={isGeneratingAdvice}
            className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all disabled:opacity-50 group relative"
            title="AI Financial Insights"
          >
            {isGeneratingAdvice ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <BrainCircuit size={20} />
            )}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
          </button>
        </div>
      </div>

      {activeTab === 'DASHBOARD' && (
        <header className="flex flex-col gap-8 mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Net Worth (Assets + Cash)</p>
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900">{formatCurrency(totalStats.netWorth)}</h1>
              <div className="flex items-center gap-3">
                <p className="flex items-center gap-2 text-sm text-emerald-600 font-bold">
                  <TrendingUp size={16} />
                  <span>Welcome back, {user.name}</span>
                </p>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full">
                  <Sparkles size={12} className="text-indigo-600" />
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Financial Health: {calculateHealthScore(totalStats, transactions)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:flex md:gap-4 gap-3 no-print">
             <button 
                onClick={() => setActiveTab('ASSETS')}
                className="flex-1 min-w-[180px] bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all text-left group flex flex-col justify-between"
             >
                <div>
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Briefcase size={20} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Investments</p>
                </div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(totalStats.investmentsTotal)}</p>
             </button>

             <div className="flex-1 min-w-[180px] bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm text-left flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                    <Wallet size={20} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cash & Bank</p>
                </div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(totalStats.totalAssetsLiquid)}</p>
             </div>

             <div className="flex-1 min-w-[180px] bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm text-left flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-3">
                    <CreditCard size={20} />
                  </div>
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Total Credit Dues</p>
                </div>
                <p className="text-2xl font-black text-rose-600 tracking-tight">{formatCurrency(totalStats.totalLiabilities)}</p>
             </div>

             <div className="hidden xl:flex flex-1 min-w-[180px] bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 text-left flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
                    <TrendingUp size={20} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Budget</p>
                </div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(totalRequiredAmount)}</p>
             </div>
          </div>
        </header>
      )}

      <main className="grid grid-cols-12 gap-6 flex-grow pb-12">
        {activeTab === 'DASHBOARD' ? (
          <>
            {/* FD Maturity Alerts */}
            {fdMaturityAlerts.length > 0 && (
              <div className="col-span-12 mb-6">
                <div className="space-y-3">
                  {fdMaturityAlerts.map(fd => (
                    <motion.div 
                      key={fd.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-4"
                    >
                      <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                        <CalendarIcon size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-amber-900 uppercase tracking-tight">FD Maturity Alert: {fd.name}</p>
                        <p className="text-xs font-bold text-amber-600">This FD of {formatCurrency(fd.initialBalance)} is maturing on {format(parseISO(fd.maturityDate!), 'dd MMM yyyy')} ({fd.daysLeft} days left).</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Sections: Banks & FDs */}
            {sourceBalances.filter(s => s.type !== 'CREDIT_CARD').length > 0 && (
              <div className="col-span-12 mb-6 no-print overflow-x-auto scrollbar-hide px-1">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Bank Accounts & Deposits</h3>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <Wallet size={12} className="text-slate-400" />
                </div>
                <div className="flex gap-4 min-w-max pb-2">
                  {sourceBalances.filter(s => s.type !== 'CREDIT_CARD').map((s) => {
                    const isFD = s.type === 'FD';
                    let fdProgress = 0;
                    if (isFD && s.initializationDate && s.maturityDate) {
                      const total = differenceInDays(parseISO(s.maturityDate), parseISO(s.initializationDate));
                      const elapsed = differenceInDays(new Date(), parseISO(s.initializationDate));
                      fdProgress = Math.min(100, Math.max(0, (elapsed / total) * 100));
                    }

                    return (
                      <div key={s.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm min-w-[220px] group hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <div className={cn(
                            "p-2.5 rounded-xl transition-transform group-hover:scale-110",
                            s.type === 'BANK' ? "bg-blue-50 text-blue-600" :
                            s.type === 'FD' ? "bg-amber-50 text-amber-600" :
                            "bg-emerald-50 text-emerald-600"
                          )}>
                            <CreditCard size={18} />
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{s.type}</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.name}</p>
                        <p className="text-xl font-black tracking-tight text-slate-900">{formatCurrency((s as any).currentBalance || 0)}</p>
                        
                        {isFD && (
                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-[7px] font-bold uppercase tracking-widest text-slate-400">
                               <span>Maturity Progress</span>
                               <span>{Math.round(fdProgress)}%</span>
                            </div>
                            <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-amber-400 transition-all duration-700"
                                style={{ width: `${fdProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Financial Sections: Credit Cards */}
            {sourceBalances.filter(s => s.type === 'CREDIT_CARD').length > 0 && (
              <div className="col-span-12 mb-6 no-print overflow-x-auto scrollbar-hide px-1">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Credit Card Outstanding Dues</h3>
                  <div className="w-1 h-1 rounded-full bg-rose-200" />
                  <CreditCard size={12} className="text-rose-400" />
                </div>
                <div className="flex gap-4 min-w-max pb-2">
                  {sourceBalances.filter(s => s.type === 'CREDIT_CARD').map((s) => {
                    const usage = s.creditLimit && s.creditLimit > 0 ? ((s as any).currentBalance < 0 ? Math.abs((s as any).currentBalance) : 0) / s.creditLimit : 0;
                    const isHigh = usage > 0.5;
                    const isMedium = usage > 0.3;

                    return (
                      <div key={s.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm min-w-[240px] group hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <div className={cn(
                            "p-2.5 rounded-xl transition-transform group-hover:scale-110",
                            isHigh ? "bg-rose-100 text-rose-600" : isMedium ? "bg-amber-100 text-amber-600" : "bg-rose-50 text-rose-600"
                          )}>
                            <CreditCard size={18} />
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                              isHigh ? "bg-rose-100 text-rose-600" : isMedium ? "bg-amber-100 text-amber-600" : "bg-rose-50 text-rose-400"
                            )}>
                              {isHigh ? 'High Usage' : isMedium ? 'Warning' : 'Balance to Pay'}
                            </span>
                            {s.creditLimit && s.creditLimit > 0 && (
                              <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                                {Math.round(usage * 100)}% Usage
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.name}</p>
                        <p className={cn(
                          "text-xl font-black tracking-tight",
                          (s as any).currentBalance < 0 ? "text-rose-600" : "text-slate-900"
                        )}>
                          {formatCurrency((s as any).currentBalance < 0 ? Math.abs((s as any).currentBalance) : 0)}
                        </p>
                        
                        {s.creditLimit && s.creditLimit > 0 && (
                          <div className="mt-4 space-y-1.5">
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-700 ease-out",
                                  isHigh ? "bg-rose-600" : isMedium ? "bg-amber-500" : "bg-rose-400"
                                )}
                                style={{ width: `${Math.min(100, usage * 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                              <span>Available: {formatCurrency(s.creditLimit - ((s as any).currentBalance < 0 ? Math.abs((s as any).currentBalance) : 0))}</span>
                              <span>Limit: {formatCurrency(s.creditLimit)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Advanced Stats: DTI & 50/30/20 */}
            <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* DTI Guard */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Debt-to-Income Guard</h3>
                    <p className="text-2xl font-black text-slate-900">{Math.round(totalStats.dtiRatio)}%</p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl",
                    totalStats.dtiRatio > 40 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    <Scale size={24} />
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden flex">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        totalStats.dtiRatio > 40 ? "bg-rose-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(100, totalStats.dtiRatio)}%` }}
                    />
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {totalStats.dtiRatio > 40 ? "⚠️ High Risk: Keep debt below 40% of income" : "✅ Healthy: Debt is well-managed below 40%"}
                  </p>
                </div>
              </div>

              {/* 50/30/20 Breakdown */}
              <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 mb-1">Budget Allocation Analysis</h3>
                    <p className="text-lg font-black text-white italic">"Needs / Wants / Savings"</p>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl text-indigo-300">
                    <PieChartIcon size={24} />
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-3 gap-2 h-2.5">
                    <div className="bg-indigo-500 rounded-full" style={{ width: '100%' }} />
                    <div className="bg-amber-400 rounded-full" style={{ width: '100%' }} />
                    <div className="bg-emerald-400 rounded-full" style={{ width: '100%' }} />
                  </div>
                  <div className="flex justify-between items-center gap-4">
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-indigo-300">Needs (50%)</span>
                        <span className="text-sm font-black">{Math.round(totalStats.budgetRules.needs)}%</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-amber-300">Wants (30%)</span>
                        <span className="text-sm font-black text-amber-400">TBD</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-emerald-300">Savings (20%)</span>
                        <span className="text-sm font-black text-emerald-400">{Math.round(totalStats.budgetRules.savings)}%</span>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Executive Summary */}
            {aiAdvice && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-12 mb-4 no-print"
              >
                <div className="bg-white rounded-[2.5rem] p-1 shadow-xl shadow-indigo-100 border border-indigo-50">
                  <div className="bg-white rounded-[2.4rem] p-8 md:p-10">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                      <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Sparkles size={28} />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Executive Summary</h3>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">AI Financial Advisory</p>
                          </div>
                        </div>
                        <div className="markdown-body line-clamp-4 overflow-hidden relative">
                          <Markdown>{aiAdvice}</Markdown>
                          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent" />
                        </div>
                        <button 
                          onClick={() => setShowAiPanel(true)}
                          className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                        >
                          View Deep Insight
                          <ChevronRight size={16} />
                        </button>
                      </div>
                      <div className="w-full md:w-64 space-y-4">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Portfolio Net Worth</p>
                          <div className="font-black text-xl text-slate-900 tracking-tight">
                            {formatCurrency(totalStats.netWorth)}
                          </div>
                        </div>
                        <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 text-center">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Health Score</p>
                          <div className="font-black text-2xl text-indigo-600">
                            {calculateHealthScore(totalStats, transactions)}/100
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Financial Goals - Active Section */}
            <div className="col-span-12 mb-6 no-print">
               <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Active Goals</h3>
                    <Target size={12} className="text-indigo-400" />
                  </div>
                  <button 
                    onClick={() => setIsAddingGoal(true)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors bg-indigo-50 px-2 py-1 rounded-lg"
                  >
                    <Plus size={10} /> Add Target
                  </button>
               </div>
               
               {activeGoals.length === 0 ? (
                 <div className="bg-slate-50 rounded-[2rem] p-10 border border-slate-100 text-center">
                    <Sparkles size={32} className="text-indigo-100 mx-auto mb-3" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Active Goals</p>
                    <p className="text-[10px] font-bold text-slate-300 mt-1">All milestones achieved or none set.</p>
                 </div>
               ) : (
                 <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                    {activeGoals.map((goal, i) => {
                      const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                      return (
                        <motion.div
                          key={goal.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="min-w-[280px] bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group shrink-0"
                        >
                           <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform overflow-hidden shrink-0">
                                   {typeof goal.icon === 'string' && goal.icon.length > 2 ? <Briefcase size={20} className="text-slate-600" /> : goal.icon}
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-slate-900">{goal.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{goal.category}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-xs font-black text-indigo-600">{Math.round(progress)}%</p>
                                 <p className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">Needs {formatCurrency(goal.targetAmount - goal.currentAmount)}</p>
                              </div>
                           </div>
                           <div className="space-y-4">
                              <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${progress}%` }}
                                   className="h-full bg-indigo-500 rounded-full relative shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                                 />
                              </div>
                              <div className="flex justify-between items-end">
                                 <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target</p>
                                    <p className="text-xs font-black text-slate-900">{formatCurrency(goal.targetAmount)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Saved</p>
                                    <p className="text-xs font-black text-emerald-600">{formatCurrency(goal.currentAmount)}</p>
                                  </div>
                              </div>
                              <button 
                                onClick={() => setActiveGoalForContribution(goal)}
                                className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md group-hover:scale-[1.02] active:scale-[0.98]"
                              >
                                Add Money
                              </button>
                           </div>
                        </motion.div>
                      );
                    })}
                 </div>
               )}
            </div>

            {/* Achieved Goals Section */}
            {achievedGoals.length > 0 && (
              <div className="col-span-12 mb-6 no-print">
                 <div className="flex items-center gap-2 mb-4 px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">🏆 Achieved Milestones</h3>
                 </div>
                 <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                    {achievedGoals.map((goal, i) => (
                      <motion.div
                        key={goal.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="min-w-[240px] bg-emerald-50/30 p-5 rounded-[2rem] border border-emerald-100 shadow-inner group shrink-0 relative overflow-hidden"
                      >
                         <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-100 rounded-full opacity-50 group-hover:scale-125 transition-transform" />
                         <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm shrink-0 overflow-hidden">
                               {typeof goal.icon === 'string' && goal.icon.length > 2 ? <Briefcase size={24} className="text-emerald-600" /> : goal.icon}
                            </div>
                            <div>
                               <p className="text-xs font-black text-slate-900">{goal.name}</p>
                               <div className="flex items-center gap-1.5 mt-0.5">
                                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                 <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Achieved!</p>
                               </div>
                            </div>
                         </div>
                         <div className="mt-4 pt-4 border-t border-emerald-100/50">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Saved</p>
                            <p className="text-sm font-black text-slate-900">{formatCurrency(goal.currentAmount)}</p>
                         </div>
                      </motion.div>
                    ))}
                 </div>
              </div>
            )}

            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
               {/* Dashboard Space */}
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-6">
               <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                  <TrendingUp className="absolute -right-4 -top-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform" />
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Portfolio surplus</p>
                    <div className="flex items-baseline gap-2 mb-6">
                      <h3 className="text-3xl font-black text-white">{formatCurrency(reportStats.income - reportStats.expenses)}</h3>
                    </div>
                  </div>
               </div>

               <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between h-full bg-slate-50/50">
                  <div>
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                      <BrainCircuit size={24} className="text-indigo-600" />
                    </div>
                    <h3 className="font-black text-xl text-slate-900 tracking-tight mb-2">Executive Summary</h3>
                    <p className="text-slate-500 text-sm leading-relaxed font-medium mb-6">
                      Based on current activity, you are maintaining a healthy reserve. 
                      Detailed breakdowns of your spending, payees, and history have been consolidated in the Transactions tab.
                    </p>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Savings Rate</p>
                       <p className="text-xl font-black text-emerald-800">
                          {reportStats.income > 0 ? Math.round(((reportStats.income - reportStats.expenses) / reportStats.income) * 100) : 0}%
                       </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setActiveTab('TRANSACTIONS')}
                    className="w-full mt-8 py-4 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-2"
                  >
                    View All Transactions
                    <ChevronRight size={14} />
                  </button>
               </div>
            </div>
          </>
        ) : activeTab === 'ASSETS' ? (
      <div className="col-span-12 flex flex-col gap-8">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm min-h-[500px]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                          <h2 className="font-bold text-2xl text-slate-800">Asset Portfolio</h2>
                          <div className="flex items-center gap-2 mt-1">
                             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Growth:</p>
                             <div className={cn(
                               "px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1",
                               totalStats.portfolioPerformance.gain >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                             )}>
                               {totalStats.portfolioPerformance.gain >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                               {formatCurrency(Math.abs(totalStats.portfolioPerformance.gain))}
                             </div>
                          </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto no-print">
                          <div className="relative flex-1 md:w-64">
                            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text" 
                              placeholder="Search assets..."
                              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-indigo-50 outline-none"
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                            />
                          </div>
                          <button 
                            onClick={() => setIsAddingAsset(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all"
                          >
                            <PlusCircle size={20} />
                            Add
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAssets.length === 0 ? (
                          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300">
                             <Briefcase size={80} strokeWidth={1} className="mb-4 opacity-20" />
                             <p className="text-lg font-bold">No assets found</p>
                             <p className="text-xs uppercase tracking-widest font-black mt-2">Try a different search or add a new one</p>
                          </div>
                        ) : (
                            filteredAssets.map(asset => (
                            <motion.div 
                              layout
                              key={asset.id}
                              className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2rem] p-4 shadow-xl shadow-slate-200/40 hover:shadow-2xl transition-all group relative overflow-hidden"
                            >
                              {/* Decorative corner element */}
                              <div className={cn(
                                "absolute -right-6 -top-6 w-20 h-20 rotate-45 transform transition-transform group-hover:scale-110 opacity-10",
                                asset.type === 'MUTUAL_FUND' ? "bg-teal-500" :
                                asset.type === 'STOCK' ? "bg-indigo-500" :
                                asset.type === 'FD' ? "bg-amber-600" :
                                asset.type === 'INSURANCE' ? "bg-rose-500" : 
                                asset.type === 'GOLD' ? "bg-amber-400" :
                                asset.type === 'SILVER' ? "bg-slate-400" :
                                "bg-slate-700"
                              )} />

                              <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg",
                                    asset.type === 'MUTUAL_FUND' ? "bg-teal-500" :
                                    asset.type === 'STOCK' ? "bg-indigo-500" :
                                    asset.type === 'FD' ? "bg-amber-600" :
                                    asset.type === 'INSURANCE' ? "bg-rose-500" : 
                                    asset.type === 'GOLD' ? "bg-amber-400" :
                                    asset.type === 'SILVER' ? "bg-slate-400" :
                                    "bg-slate-700"
                                  )}>
                                    {asset.type === 'INSURANCE' ? <FileText size={20} /> : <Briefcase size={20} />}
                                  </div>
                                  <div>
                                    <h3 className="font-black text-slate-900 tracking-tight text-sm">{asset.name}</h3>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                        {asset.type.replace('_', ' ')} {asset.insuranceType ? `• ${asset.insuranceType}` : ''}
                                      </p>
                                      {asset.platform && (
                                        <p className="px-1.5 py-0.5 bg-indigo-50 text-indigo-500 text-[7px] font-black uppercase tracking-widest rounded-md">
                                          {asset.platform}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setAssets(prev => prev.filter(a => a.id !== asset.id))}
                                  className="p-1.5 text-slate-300 hover:text-rose-500 transition-all rounded-full hover:bg-rose-50 group-hover:bg-white/50"
                                >
                                  <X size={14} />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
                                <div className="bg-white/30 rounded-xl p-3 border border-white/50">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                                    {asset.type === 'INSURANCE' ? 'Sum Assured' : 'Investment'}
                                  </p>
                                  <p className="text-md font-black text-slate-900 tracking-tight">
                                    {formatCurrency(asset.type === 'INSURANCE' && asset.sumAssured ? asset.sumAssured : asset.investedAmount)}
                                  </p>
                                </div>
                                {asset.type === 'INSURANCE' ? (
                                  <div className="flex gap-2">
                                    <div className="flex-1 bg-white/30 rounded-xl p-3 border border-white/50">
                                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Premium Paid</p>
                                      <p className="text-md font-black text-slate-900 tracking-tight">{formatCurrency(asset.investedAmount)}</p>
                                      {asset.premiumFrequency && (
                                        <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">({asset.premiumFrequency.replace('_', ' ')})</p>
                                      )}
                                    </div>
                                    {asset.premiumFrequency && asset.premiumFrequency !== 'MONTHLY' && (
                                       <div className="flex-1 bg-white/30 rounded-xl p-3 border border-white/50">
                                          <p className="text-[8px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">Monthly Share</p>
                                          <p className="text-md font-black text-indigo-600 tracking-tight">
                                            {formatCurrency(
                                              asset.premiumFrequency === 'YEARLY' ? asset.investedAmount / 12 :
                                              asset.premiumFrequency === 'HALF_YEARLY' ? asset.investedAmount / 6 :
                                              asset.premiumFrequency === 'QUARTERLY' ? asset.investedAmount / 3 :
                                              asset.investedAmount
                                            )}
                                          </p>
                                       </div>
                                    )}
                                  </div>
                                ) : (
                                  asset.currentValue !== undefined && (
                                    <div className="bg-white/30 rounded-xl p-3 border border-white/50">
                                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Current Value</p>
                                      <div className="flex items-center gap-1.5">
                                         <p className="text-md font-black text-slate-900 tracking-tight">{formatCurrency(asset.currentValue)}</p>
                                         <span className={cn(
                                           "px-1 py-0.5 rounded-md text-[7px] font-black",
                                           (asset.currentValue - asset.investedAmount) >= 0 ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                                         )}>
                                           {Math.round(((asset.currentValue - asset.investedAmount) / asset.investedAmount) * 100)}%
                                         </span>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>

                              {['FD', 'RD'].includes(asset.type) && asset.startDate && asset.endDate && (
                                <div className="mb-4 space-y-1.5 relative z-10 bg-white/30 p-3 rounded-xl border border-white/50">
                                  <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-widest text-slate-500">
                                    <span>Maturity Timeline</span>
                                    <span>
                                      {differenceInDays(parseISO(asset.endDate), parseISO(asset.startDate)) > 0 
                                        ? Math.round(Math.min(100, Math.max(0, (differenceInDays(new Date(), parseISO(asset.startDate)) / differenceInDays(parseISO(asset.endDate), parseISO(asset.startDate))) * 100)))
                                        : 0}%
                                    </span>
                                  </div>
                                  <div className="w-full h-1 bg-slate-200/50 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-amber-500 transition-all duration-1000" 
                                      style={{ width: `${differenceInDays(parseISO(asset.endDate), parseISO(asset.startDate)) > 0 
                                        ? Math.min(100, Math.max(0, (differenceInDays(new Date(), parseISO(asset.startDate)) / differenceInDays(parseISO(asset.endDate), parseISO(asset.startDate))) * 100))
                                        : 0}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[7px] font-bold text-slate-400">
                                    <span>{format(parseISO(asset.startDate), 'MMM dd, yyyy')}</span>
                                    <span>{format(parseISO(asset.endDate), 'MMM dd, yyyy')}</span>
                                  </div>
                                  {asset.maturityAmount && (
                                    <div className="mt-2 pt-2 border-t border-slate-100/30 flex justify-between items-center">
                                      <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Est. Maturity Amount</span>
                                      <span className="text-[9px] font-black text-amber-600">{formatCurrency(asset.maturityAmount)}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {['STOCK', 'MUTUAL_FUND', 'GOLD', 'SILVER'].includes(asset.type) && asset.quantity && (
                                <div className="mb-4 flex gap-2 relative z-10">
                                   <div className="flex-1 bg-white/30 rounded-xl p-2 border border-white/50">
                                      <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                                        {['GOLD', 'SILVER'].includes(asset.type) ? 'Quantity' : 'Units'}
                                      </p>
                                      <p className="text-[10px] font-black text-slate-700">
                                        {asset.quantity.toLocaleString()} {['GOLD', 'SILVER'].includes(asset.type) ? 'g' : ''}
                                      </p>
                                   </div>
                                   <div className="flex-1 bg-white/30 rounded-xl p-2 border border-white/50">
                                      <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Avg Price</p>
                                      <p className="text-[10px] font-black text-slate-700">
                                        {formatCurrency(asset.unitPrice || (asset.investedAmount / (asset.quantity || 1)))}
                                      </p>
                                   </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-3 border-t border-white/30 relative z-10">
                                <div className="flex items-center gap-1.5">
                                   <CalendarIcon size={10} className="text-slate-400" />
                                   <p className="text-[8px] font-bold tracking-tight text-slate-500">
                                     Updated {format(parseISO(asset.lastUpdated), 'MMM dd')}
                                   </p>
                                </div>
                                {asset.unitPrice && asset.type === 'MUTUAL_FUND' && (
                                  <div className="flex items-center gap-1.5 bg-white/40 px-2 py-0.5 rounded-full border border-white/50">
                                    <span className="w-1 h-1 rounded-full bg-teal-500" />
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">NAV {formatCurrency(asset.unitPrice)}</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                   </div>
                </div>

                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                   <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                       <h3 className="font-black text-lg mb-6 text-slate-800 tracking-tight">Asset Distribution</h3>
                       
                       <div className="h-[200px] w-full mb-8 relative">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                               <Pie
                                 data={['MUTUAL_FUND', 'STOCK', 'FD', 'INSURANCE', 'GOLD', 'SILVER', 'OTHER'].map(type => ({
                                   name: type.replace('_', ' '),
                                   value: assets.filter(a => a.type === type).reduce((s, a) => s + a.investedAmount, 0)
                                 })).filter(d => d.value > 0)}
                                 cx="50%"
                                 cy="50%"
                                 innerRadius={50}
                                 outerRadius={75}
                                 paddingAngle={4}
                                 dataKey="value"
                               >
                                  {assets.map((_, index) => (
                                     <Cell key={`cell-${index}`} fill={[ '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'][index % 8]} />
                                  ))}
                               </Pie>
                               <RechartsTooltip 
                                 contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 700 }}
                               />
                            </PieChart>
                         </ResponsiveContainer>
                       </div>

                       <div className="space-y-6">
                         {['STOCK', 'MUTUAL_FUND', 'FD', 'RD', 'INSURANCE', 'GOLD', 'SILVER', 'OTHER'].map(type => {
                           const value = assets.filter(a => a.type === type).reduce((s, a) => s + a.investedAmount, 0);
                           const total = assets.reduce((s, a) => s + a.investedAmount, 0);
                           const perc = total > 0 ? (value / total) * 100 : 0;
                           
                           if(total === 0 || value === 0) return null;

                           return (
                             <div key={type}>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{type.replace('_', ' ')}</span>
                                  <span className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency(value)}</span>
                                </div>
                                <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                  <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${perc}%` }}
                                   className={cn(
                                     "h-full rounded-full transition-all duration-500",
                                     type === 'MUTUAL_FUND' ? "bg-teal-500" :
                                     type === 'STOCK' ? "bg-indigo-500" :
                                     type === 'FD' ? "bg-amber-600" : 
                                     type === 'RD' ? "bg-amber-700" :
                                     type === 'INSURANCE' ? "bg-rose-500" :
                                     type === 'GOLD' ? "bg-amber-400" :
                                     type === 'SILVER' ? "bg-slate-400" :
                                     type === 'OTHER' ? "bg-slate-600" :
                                     "bg-slate-700"
                                   )}
                                  />
                                </div>
                             </div>
                           )
                         })}
                       </div>

                       <div className="mt-10 p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                        {/* Rebalancing Strategy */}
                        <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2 mb-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Rebalancing Mode</h4>
                            <Sparkles size={12} className="text-indigo-400" />
                          </div>
                          <div className="space-y-4">
                            {[
                              { name: 'Equity (High Growth)', key: 'equity', color: 'bg-indigo-500', target: 60 },
                              { name: 'Stability (Debt/FD)', key: 'debt', color: 'bg-amber-500', target: 30 },
                              { name: 'Safety (Gold/Cash)', key: 'safe', color: 'bg-emerald-500', target: 10 }
                            ].map(cat => {
                              const totalVal = assets.reduce((s, a) => s + (a.currentValue || a.investedAmount), 0);
                              const eq = assets.filter(a => ['STOCK', 'MUTUAL_FUND', 'CRYPTO'].includes(a.type)).reduce((s, a) => s + (a.currentValue || a.investedAmount), 0);
                              const dbt = assets.filter(a => ['FD', 'PPF_EPF'].includes(a.type)).reduce((s, a) => s + (a.currentValue || a.investedAmount), 0);
                              const sf = totalStats.totalAssetsLiquid + assets.filter(a => ['GOLD', 'SILVER'].includes(a.type)).reduce((s, a) => s + (a.currentValue || a.investedAmount), 0);
                              const whl = totalVal + totalStats.totalAssetsLiquid;
                              const cP = whl > 0 ? (cat.key === 'equity' ? eq : cat.key === 'debt' ? dbt : sf) / whl * 100 : 0;
                              const d = cP - cat.target;
                              return (
                                <div key={cat.key} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                                  <div className="flex justify-between items-center mb-2">
                                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">{cat.name}</span>
                                     <span className="text-[10px] font-black text-indigo-600">{cat.target}%</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                       <div className={cn("h-full transition-all duration-1000", cat.color)} style={{ width: `${Math.min(100, cP)}%` }} />
                                    </div>
                                    <span className={cn("text-[7px] font-black px-1.5 py-0.5 rounded", Math.abs(d) < 5 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                                      {d > 5 ? `SELL` : d < -5 ? `BUY` : 'OK'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 text-center">Portfolio Valuation</p>
                          <p className="text-3xl font-black text-center text-indigo-900">{formatCurrency(assets.reduce((sum, a) => sum + a.investedAmount, 0))}</p>
                       </div>
                     </div>
              </div>
           </div>
        </div>
        ) : activeTab === 'BUDGETS' ? (
          <div className="col-span-12 flex flex-col gap-8 max-w-4xl mx-auto w-full">
            <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-slate-100 shadow-sm w-full">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Monthly Budgets</h2>
                    <p className="text-slate-500 font-medium tracking-tight">Set spending limits for each category to track your financial health.</p>
                  </div>
                  <div className="flex flex-col items-center md:items-end bg-indigo-50 p-4 rounded-2xl border border-indigo-100 min-w-[180px]">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Monthly Budget</p>
                    <p className="text-2xl font-black text-indigo-600">{formatCurrency(totalRequiredAmount)}</p>
                  </div>
               </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {DEFAULT_CATEGORIES.filter(c => c.type === 'EXPENSE' || c.type === 'EMI' || c.name === 'RD (Recurring Deposit)' || c.name === 'Insurance Premiums').map(cat => (
                    <div key={cat.name} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group relative overflow-hidden">
                       {(cat.name === 'Property Tax Yearly once' || cat.name === 'Insurance Premiums') && (
                         <div className="absolute top-0 right-0 bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-bl-lg text-[8px] font-black uppercase tracking-widest">
                           Yearly Prorated
                         </div>
                       )}
                      <div className="flex flex-col gap-4">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">
                              {cat.icon}
                            </div>
                            <span className="text-sm font-black text-slate-700">{cat.name}</span>
                         </div>
                         <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                            <input 
                             type="number" 
                             placeholder={(cat.name === 'Property Tax Yearly once' || cat.name === 'Insurance Premiums') ? "Annual Amount" : "0.00"} 
                             className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all"
                             value={budgets[cat.name] || ''}
                             onChange={(e) => setBudgets(prev => ({ ...prev, [cat.name]: parseFloat(e.target.value) || 0 }))}
                            />
                         </div>
                         {(cat.name === 'Property Tax Yearly once' || cat.name === 'Insurance Premiums') && budgets[cat.name] > 0 && (
                           <div className="flex items-center justify-between px-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Monthly Share:</span>
                              <span className="text-xs font-black text-indigo-500">{formatCurrency(budgets[cat.name] / 12)}</span>
                           </div>
                         )}
                      </div>
                   </div>
                 ))}
               </div>
               
               <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                  <Sparkles size={20} className="text-indigo-500 mt-1" />
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    Set realistic budgets for your core expenses. Your <span className="font-bold text-slate-700">Financial Health Score</span> and the <span className="font-bold text-slate-700">Budget Usage</span> gauges on your dashboard will reflect these limits helping you stay on track.
                  </p>
               </div>
            </div>
          </div>
        ) : activeTab === 'SETTINGS' ? (
          <div className="col-span-12 flex flex-col gap-8">
            <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-slate-100 shadow-sm max-w-4xl mx-auto w-full">
              <h2 className="text-3xl font-black text-slate-800 mb-2">App Settings</h2>
              <p className="text-slate-500 mb-10 font-medium tracking-tight">Personalize your tracking options, payment modes, and profile.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Payment Modes */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <CreditCard size={20} />
                    </div>
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Payment Modes</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {modeOptions.map(mode => (
                      <div key={mode} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                        <span className="text-sm font-bold text-slate-700">{mode}</span>
                        <button 
                          onClick={() => setModeOptions(prev => prev.filter(m => m !== mode))}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = (e.currentTarget.elements.namedItem('newMode') as HTMLInputElement);
                      const val = input.value.trim();
                      if (val && !modeOptions.includes(val)) {
                        setModeOptions(prev => [...prev, val]);
                        input.value = '';
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input 
                      name="newMode"
                      placeholder="Add Bank/Card/UPI..." 
                      className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-semibold focus:ring-4 focus:ring-indigo-50"
                    />
                    <button type="submit" className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                      <Plus size={20} />
                    </button>
                  </form>
                </div>

                {/* Whom (Recipients) */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <UserIcon size={20} />
                    </div>
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Linked People</h3>
                  </div>

                  <div className="space-y-2">
                    {whomOptions.map(person => (
                      <div key={person} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                        <span className="text-sm font-bold text-slate-700">{person}</span>
                        <button 
                          onClick={() => setWhomOptions(prev => prev.filter(p => p !== person))}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = (e.currentTarget.elements.namedItem('newWhom') as HTMLInputElement);
                      const val = input.value.trim();
                      if (val && !whomOptions.includes(val)) {
                        setWhomOptions(prev => [...prev, val]);
                        input.value = '';
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input 
                      name="newWhom"
                      placeholder="Add Family/Friend..." 
                      className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-semibold focus:ring-4 focus:ring-indigo-50"
                    />
                    <button type="submit" className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                      <Plus size={20} />
                    </button>
                  </form>
                </div>
              </div>

              {/* Financial Sources (Banks/Cards) */}
              <div className="col-span-12 pt-8 border-t border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <CreditCard size={20} />
                  </div>
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Financial Sources (Banks & Cards)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sources.map(source => (
                    <div key={source.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
                      <div>
                        <p className="text-sm font-black text-slate-800">{source.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {source.type} • Initial: {formatCurrency(source.initialBalance)}
                        </p>
                        {source.type === 'CREDIT_CARD' && (
                          <div className="mt-1 space-y-0.5">
                            {source.outstandingAmount && (
                              <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">To Pay: {formatCurrency(source.outstandingAmount)}</p>
                            )}
                            {source.creditLimit && (
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Limit: {formatCurrency(source.creditLimit)}</p>
                            )}
                          </div>
                        )}
                        {(source.type === 'FD' || source.type === 'RD') && source.maturityDate && (
                          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-1">Matures: {format(parseISO(source.maturityDate), 'dd MMM yyyy')}</p>
                        )}
                      </div>
                      <button 
                        onClick={() => setSources(prev => prev.filter(s => s.id !== source.id))}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 border-dashed">
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const name = formData.get('sourceName') as string;
                        const balance = parseFloat(formData.get('sourceBalance') as string) || 0;
                        const type = formData.get('sourceType') as any;
                        
                        let extraData: any = {};
                        if (type === 'CREDIT_CARD') {
                          extraData.outstandingAmount = parseFloat(formData.get('outstandingAmount') as string) || 0;
                          extraData.creditLimit = parseFloat(formData.get('creditLimit') as string) || 0;
                        } else if (type === 'FD' || type === 'RD') {
                          const tenure = parseInt(formData.get('tenureMonths') as string) || 0;
                          const initDate = (formData.get('initializationDate') as string) || format(new Date(), 'yyyy-MM-dd');
                          extraData.tenureMonths = tenure;
                          extraData.initializationDate = initDate;
                          if (tenure > 0) {
                            extraData.maturityDate = format(addMonths(parseISO(initDate), tenure), 'yyyy-MM-dd');
                          }
                        }

                        if (name) {
                          setSources(prev => [...prev, { id: generateId(), name, initialBalance: balance, type, ...extraData }]);
                          e.currentTarget.reset();
                          setSettingsSourceType('BANK');
                        }
                      }}
                      className="space-y-3"
                    >
                      <input required name="sourceName" type="text" placeholder="Bank/Source Name" className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none" />
                      <div className="flex gap-2">
                        <input required name="sourceBalance" type="number" step="0.01" placeholder="Initial Bal" className="w-1/2 px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none" />
                        <select 
                          name="sourceType" 
                          value={settingsSourceType}
                          onChange={(e) => setSettingsSourceType(e.target.value as any)}
                          className="w-1/2 px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none"
                        >
                          <option value="BANK">Bank</option>
                          <option value="CREDIT_CARD">Credit Card</option>
                          <option value="WALLET">Wallet</option>
                          <option value="FD">Fixed Deposit (FD)</option>
                          <option value="RD">Recurring Deposit (RD)</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      {settingsSourceType === 'CREDIT_CARD' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Balance to Pay (₹)</label>
                            <input name="outstandingAmount" type="number" step="0.01" placeholder="Current Dues" className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Limit (₹)</label>
                            <input name="creditLimit" type="number" step="0.01" placeholder="Total Limit" className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none" />
                          </div>
                        </div>
                      )}

                      {(settingsSourceType === 'FD' || settingsSourceType === 'RD') && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tenure (Mos)</label>
                            <input required name="tenureMonths" type="number" placeholder="12" className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Init Date</label>
                            <input required name="initializationDate" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none" />
                          </div>
                        </div>
                      )}

                      <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                        <Plus size={14} /> Add Source
                      </button>
                    </form>
                  </div>
                </div>
              </div>

                {/* Danger Zone */}
                <div className="col-span-12 space-y-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <Download size={20} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Download Reports</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Select a timeframe to export your transactions, investments and assets</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {reportOptions.map(opt => (
                      <button 
                        key={opt.id}
                        onClick={() => downloadReport(opt.start, opt.end, opt.label)}
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/20 transition-all group"
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border border-transparent transition-all ${opt.color}`}>
                          {opt.icon}
                        </div>
                        <div className="text-center">
                          <p className="font-black text-slate-800 tracking-tight text-sm">{opt.label}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            {format(parseISO(opt.start), 'dd MMM')} - {format(parseISO(opt.end), 'dd MMM')}
                          </p>
                        </div>
                        <div className="mt-2 px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                          Export CSV
                        </div>
                      </button>
                    ))}

                    {/* Custom Range Picker Card */}
                    <div className="flex flex-col gap-3 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] sm:col-span-2 lg:col-span-2">
                       <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                             <CalendarIcon size={18} />
                          </div>
                          <p className="font-black text-slate-800 tracking-tight text-sm">Custom Range Export</p>
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">From</label>
                             <input 
                              type="date" 
                              id="export-start"
                              defaultValue={dateRange.start}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-50"
                             />
                          </div>
                          <div className="flex flex-col gap-1">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">To</label>
                             <input 
                              type="date" 
                              id="export-end"
                              defaultValue={dateRange.end}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-50"
                             />
                          </div>
                       </div>
                       <button 
                        onClick={() => {
                          const s = (document.getElementById('export-start') as HTMLInputElement).value;
                          const e = (document.getElementById('export-end') as HTMLInputElement).value;
                          downloadReport(s, e, 'Custom Range');
                        }}
                        className="mt-2 w-full py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.99] transition-all"
                       >
                         Download Custom Report
                       </button>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 space-y-6 pt-12 border-t border-slate-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Danger Zone</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Resetting your data will permanently delete all your financial history</p>
                    </div>
                  </div>

                  <div className="bg-rose-50 rounded-[2rem] p-8 border border-rose-100 flex flex-col items-center gap-6">
                    <div className="text-center space-y-2">
                       <p className="text-sm font-bold text-rose-800">Ready for a fresh start?</p>
                       <p className="text-xs text-rose-600/70 max-w-sm">This action cannot be undone. All your transactions, assets, budgets and profile settings will be cleared from this device.</p>
                    </div>
                    <button 
                      onClick={() => setShowResetConfirm(true)}
                      className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-rose-100 hover:bg-rose-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Reset All App Data
                    </button>
                  </div>
                </div>

              </div>
            </div>
        ) : activeTab === 'TRANSACTIONS' ? (
          <div className="col-span-12">
            <TransactionsPage 
              transactions={transactions}
              filteredTransactions={filteredTransactions}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              dateRange={dateRange}
              setDateRange={setDateRange}
              reportStats={reportStats}
              totalRequiredAmount={totalRequiredAmount}
              onEditTransaction={(item) => {
                setEditingTransaction(item);
                setIsAddingTransaction(true);
                setSelectedCategory(item.category);
                setSelectedMode(item.mode);
              }}
              onAddTransaction={() => {
                setIsAddingTransaction(true);
                setEditingTransaction(null);
                setSmartAddResult(null); // Clear any previous smart add result
                setSelectedCategory(DEFAULT_CATEGORIES[0].name);
                setSelectedMode(modeOptions[0] || 'Other');
              }}
              onSmartAdd={() => setIsSmartAdding(true)}
              onExportCSV={() => downloadReport(dateRange.start, dateRange.end, 'Transactions Export')}
            />
          </div>
        ) : null}
      </main>

      {/* Smart Add Modal */}
      <AnimatePresence>
        {isSmartAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl border border-white/20 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50" />
              
              <div className="relative">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Smart Add</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Paste Bank SMS or Alert</p>
                  </div>
                  <button onClick={() => { setIsSmartAdding(false); setSmartAddInput(''); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">SMS Text</label>
                    <textarea 
                      value={smartAddInput}
                      onChange={(e) => setSmartAddInput(e.target.value)}
                      placeholder="Paste your bank message here (e.g., 'Debited by Rs. 500 for Swiggy...')"
                      className="w-full h-32 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-semibold focus:ring-4 focus:ring-indigo-100 transition-all resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => { setIsSmartAdding(false); setSmartAddInput(''); }}
                      className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      disabled={!smartAddInput.trim() || isParsingSmartAdd}
                      onClick={async () => {
                        setIsParsingSmartAdd(true);
                        try {
                          const result = await parseTransactionSms(smartAddInput);
                          if (result) {
                            setSmartAddResult(result);
                            setIsAddingTransaction(true);
                            setEditingTransaction(null);
                            setSelectedCategory(result.category || DEFAULT_CATEGORIES[0].name);
                            setSelectedMode(result.mode || modeOptions[0] || 'Add New...');
                            setSelectedWhom(result.whom || whomOptions[0] || 'Add New...');
                            setIsSmartAdding(false);
                            setSmartAddInput('');
                          } else {
                            alert("Could not parse transaction. Please try a different message or add manually.");
                          }
                        } catch (err) {
                          alert("Error parsing message. Please try again.");
                        } finally {
                          setIsParsingSmartAdd(false);
                        }
                      }}
                      className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isParsingSmartAdd ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          Analyze & Add
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Transaction Modal */}
      <AnimatePresence>
        {isAddingTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              key={editingTransaction?.id || (smartAddResult ? 'smart' : 'new')}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden my-auto"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-800">{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setIsAddingTransaction(false);
                        setEditingTransaction(null);
                        // Reset defaults for next time
                        setSelectedCategory(DEFAULT_CATEGORIES[0].name);
                        setSelectedMode(modeOptions[0] || 'Other');
                      }}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X size={24} className="text-slate-400" />
                    </button>
                  </div>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const cat = formData.get('category') as string;
                  const mod = formData.get('mode') as string;
                  
                  const transactionData = {
                    title: formData.get('title') as string,
                    amount: parseFloat(formData.get('amount') as string),
                    type: formData.get('type') as any,
                    category: cat === 'Other Expense' ? (formData.get('customCategory') as string || cat) : cat,
                    whom: selectedWhom === 'Add New...' ? (formData.get('customWhom') as string || selectedWhom) : selectedWhom,
                    mode: selectedMode === 'Add New...' ? (formData.get('customMode') as string || selectedMode) : selectedMode,
                    source: selectedSource === 'Add New...' ? (formData.get('customSource') as string || selectedSource) : selectedSource,
                    date: formData.get('date') as string,
                    isRecurring: formData.get('isRecurring') === 'on',
                    recurringEndDate: formData.get('recurringEndDate') as string || undefined,
                  };

                  if (editingTransaction) {
                    updateTransaction({ ...transactionData, id: editingTransaction.id });
                  } else {
                    addTransaction(transactionData);
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      { val: 'EXPENSE', label: 'Expense', color: 'peer-checked:border-rose-500 peer-checked:text-rose-600' },
                      { val: 'INCOME', label: 'Income', color: 'peer-checked:border-emerald-500 peer-checked:text-emerald-600' },
                      { val: 'EMI', label: 'EMI', color: 'peer-checked:border-amber-500 peer-checked:text-amber-600' },
                      { val: 'INVESTMENT', label: 'Invest', color: 'peer-checked:border-indigo-500 peer-checked:text-indigo-600' },
                    ].map(opt => (
                      <label key={opt.val} className="flex flex-col cursor-pointer group">
                        <input 
                          type="radio" 
                          name="type" 
                          value={opt.val} 
                          defaultChecked={editingTransaction ? editingTransaction.type === opt.val : (smartAddResult ? smartAddResult.type === opt.val : opt.val === 'EXPENSE')} 
                          className="sr-only peer" 
                        />
                        <div className={cn(
                          "py-2.5 text-center rounded-xl border-2 border-slate-100 font-bold text-slate-400 transition-all text-[10px] uppercase tracking-wider",
                          opt.color
                        )}>
                          {opt.label}
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 px-1">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="isRecurring" 
                        checked={isRecurringChecked}
                        onChange={(e) => setIsRecurringChecked(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ms-3 text-xs font-bold text-slate-500">Recurring Monthly?</span>
                    </label>

                    {isRecurringChecked && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                      >
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">End Date (Optional)</label>
                        <input 
                          name="recurringEndDate"
                          type="date" 
                          defaultValue={editingTransaction?.recurringEndDate}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all"
                        />
                      </motion.div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Description</label>
                    <input 
                      required
                      name="title"
                      type="text" 
                      defaultValue={editingTransaction?.title || smartAddResult?.title || ''}
                      placeholder="Ex. Starbucks Coffee"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-semibold text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Amount (₹)</label>
                      <input 
                        required
                        name="amount"
                        type="number" 
                        step="0.01"
                        defaultValue={editingTransaction?.amount || smartAddResult?.amount || ''}
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-semibold text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Date</label>
                      <input 
                        required
                        name="date"
                        type="date" 
                        defaultValue={editingTransaction?.date || smartAddResult?.date || format(new Date(), 'yyyy-MM-dd')}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-semibold text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Category</label>
                    <select 
                      name="category"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-semibold appearance-none text-sm"
                    >
                      {categories.map(group => (
                        <optgroup key={group.mainCategory} label={group.mainCategory}>
                          {group.subCategories.map(c => (
                            <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {selectedCategory === 'Other Expense' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1"
                    >
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Specify Category</label>
                      <input 
                        required
                        name="customCategory"
                        type="text"
                        defaultValue={editingTransaction?.category === 'Other Expense' ? editingTransaction.category : ''}
                        placeholder="Ex. Subscription, Gift etc."
                        className="w-full px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none font-semibold text-sm"
                      />
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">For Whom</label>
                      <select 
                        name="whom"
                        value={selectedWhom}
                        onChange={(e) => setSelectedWhom(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-semibold appearance-none text-sm"
                      >
                        {whomOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        <option value="Add New...">+ Add New...</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Payment Mode</label>
                      <select 
                        name="mode"
                        value={selectedMode}
                        onChange={(e) => setSelectedMode(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-semibold appearance-none text-sm"
                      >
                        {modeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        <option value="Add New...">+ Add New...</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Source (Bank/Card)</label>
                    <select 
                      name="source"
                      value={selectedSource}
                      onChange={(e) => setSelectedSource(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-semibold appearance-none text-sm"
                    >
                      {sources.map(s => <option key={s.id} value={s.name}>{s.name} ({s.type})</option>)}
                      <option value="Add New...">+ Add New...</option>
                    </select>
                  </div>

                  {(selectedWhom === 'Add New...' || selectedMode === 'Add New...' || selectedSource === 'Add New...') && (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedWhom === 'Add New...' && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-1"
                        >
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">New Person</label>
                          <input 
                            required
                            name="customWhom"
                            type="text"
                            placeholder="Ex. Self, Mother, etc."
                            className="w-full px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none font-semibold text-sm"
                          />
                        </motion.div>
                      )}
                      {selectedMode === 'Add New...' && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-1"
                        >
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">New Mode</label>
                          <input 
                            required
                            name="customMode"
                            type="text"
                            placeholder="Ex. GPay, Cash, etc."
                            className="w-full px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none font-semibold text-sm"
                          />
                        </motion.div>
                      )}
                      {selectedSource === 'Add New...' && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-1 col-span-2"
                        >
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">New Source Name</label>
                          <input 
                            required
                            name="customSource"
                            type="text"
                            placeholder="Ex. Axis Bank, SBI, etc."
                            className="w-full px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none font-semibold text-sm"
                          />
                        </motion.div>
                      )}
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all mt-2"
                  >
                    {editingTransaction ? 'Update Transaction' : 'Confirm Transaction'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Asset Modal */}
      <AnimatePresence>
        {isAddingAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-800">Add Asset</h2>
                  <button 
                    onClick={() => {setIsAddingAsset(false); setFormUnitPrice(''); setFormQuantity(''); setFormInvestedAmount('');}}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={24} className="text-slate-400" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const investedAmount = parseFloat(formData.get('investedAmount') as string) || 0;
                  const unitPrice = formData.get('unitPrice') ? parseFloat(formData.get('unitPrice') as string) : undefined;
                  const quantity = formData.get('quantity') ? parseFloat(formData.get('quantity') as string) : (unitPrice && unitPrice > 0 ? investedAmount / unitPrice : undefined);
                  
                  addAsset({
                    name: formData.get('name') as string,
                    type: formData.get('type') as AssetType,
                    investedAmount,
                    unitPrice,
                    quantity,
                    platform: formData.get('platform') as string,
                    details: selectedAssetType === 'OTHER' ? formData.get('details') as string : undefined,
                    insuranceType: formData.get('insuranceType') as InsuranceType || undefined,
                    insuranceCompany: formData.get('insuranceCompany') as string || undefined,
                    sumAssured: formData.get('sumAssured') ? parseFloat(formData.get('sumAssured') as string) : undefined,
                    dateOfIssue: formData.get('dateOfIssue') as string || undefined,
                    paymentDuration: formData.get('paymentDuration') ? parseInt(formData.get('paymentDuration') as string) : undefined,
                    yearsPaid: formData.get('yearsPaid') ? parseInt(formData.get('yearsPaid') as string) : undefined,
                    startDate: formData.get('startDate') as string || undefined,
                    endDate: formData.get('endDate') as string || undefined,
                    tenureMonths: formData.get('tenureMonths') ? parseInt(formData.get('tenureMonths') as string) : undefined,
                    maturityAmount: formData.get('maturityAmount') ? parseFloat(formData.get('maturityAmount') as string) : undefined,
                    premiumFrequency: formData.get('premiumFrequency') as any || undefined,
                  });
                  setIsAddingAsset(false);
                  setFormUnitPrice('');
                  setFormQuantity('');
                  setFormInvestedAmount('');
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Asset Type*</label>
                      <select 
                        required
                        name="type" 
                        value={selectedAssetType}
                        onChange={(e) => {
                          setSelectedAssetType(e.target.value as AssetType);
                          setFormUnitPrice('');
                          setFormQuantity('');
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm focus:border-indigo-300 transition-colors"
                      >
                        <option value="MUTUAL_FUND">Mutual Fund</option>
                        <option value="STOCK">Stock</option>
                        <option value="GOLD">Gold</option>
                        <option value="SILVER">Silver</option>
                        <option value="ULIPS">ULIPS</option>
                        <option value="FD">Fixed Deposit (FD)</option>
                        <option value="RD">Recurring Deposit (RD)</option>
                        <option value="INSURANCE">Insurance</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Asset Name*</label>
                      <input required name="name" type="text" placeholder={selectedAssetType === 'STOCK' ? "Ex. Reliance Industries" : "Ex. Nifty 50 Index Fund"} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm focus:border-indigo-300 transition-colors" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Platform / Broker*</label>
                      <input required name="platform" type="text" placeholder="Ex. Groww, Zerodha, Bank" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm focus:border-indigo-300 transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Total Amount Invested (₹)*</label>
                      <input 
                        required 
                        name="investedAmount" 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        value={formInvestedAmount}
                        onChange={(e) => setFormInvestedAmount(e.target.value)}
                        readOnly={['STOCK', 'MUTUAL_FUND'].includes(selectedAssetType)}
                        className={cn(
                          "w-full px-4 py-3 border rounded-xl outline-none font-semibold text-sm transition-colors",
                          ['STOCK', 'MUTUAL_FUND'].includes(selectedAssetType) ? "bg-indigo-50 border-indigo-100 text-indigo-700" : "bg-slate-50 border-slate-200 focus:border-indigo-300"
                        )} 
                      />
                    </div>
                  </div>

                  {['STOCK', 'MUTUAL_FUND', 'GOLD', 'SILVER'].includes(selectedAssetType) && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-2 gap-3 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100"
                    >
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">
                          {['GOLD', 'SILVER'].includes(selectedAssetType) ? 'Quantity (Grams)*' : 'Number of Units*'}
                        </label>
                        <input 
                          required 
                          name="quantity" 
                          type="number" 
                          step="0.001" 
                          placeholder={['GOLD', 'SILVER'].includes(selectedAssetType) ? "Ex. 10.5" : "Ex. 10"} 
                          value={formQuantity}
                          onChange={(e) => setFormQuantity(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl outline-none font-semibold text-sm focus:border-indigo-300 transition-colors" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Avg. Unit Price (₹)*</label>
                        <input 
                          required 
                          name="unitPrice" 
                          type="number" 
                          step="0.01" 
                          placeholder={selectedAssetType === 'STOCK' ? "Ex. 2500" : "Ex. 5000"} 
                          value={formUnitPrice}
                          onChange={(e) => setFormUnitPrice(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl outline-none font-semibold text-sm focus:border-indigo-300 transition-colors" 
                        />
                      </div>
                    </motion.div>
                  )}

                  {selectedAssetType === 'INSURANCE' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pt-2 p-4 bg-rose-50/30 rounded-2xl border border-rose-100"
                    >
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Insurance Type*</label>
                        <select required name="insuranceType" className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none font-semibold text-sm focus:border-rose-300 transition-colors">
                          <option value="HEALTH">Health Insurance</option>
                          <option value="TERM">Term Insurance</option>
                          <option value="BIKE">Bike Insurance</option>
                          <option value="CAR">Car Insurance</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Company Name*</label>
                          <input required name="insuranceCompany" type="text" placeholder="Ex. LIC, HDFC Ergo" className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none font-semibold text-sm focus:border-rose-300 transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Sum Assured (₹)*</label>
                          <input required name="sumAssured" type="number" step="0.01" placeholder="Ex. 50,00,000" className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none font-semibold text-sm focus:border-rose-300 transition-colors" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Date of Issue*</label>
                          <input required name="dateOfIssue" type="date" className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none font-semibold text-sm focus:border-rose-300 transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <div className="grid grid-cols-2 gap-2">
                             <div>
                               <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1 whitespace-nowrap">Pay Term (Yrs)*</label>
                               <input required name="paymentDuration" type="number" placeholder="10" className="w-full px-3 py-3 bg-white border border-rose-200 rounded-xl outline-none font-semibold text-sm focus:border-rose-300 transition-colors" />
                             </div>
                             <div>
                               <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1 whitespace-nowrap">Paid (Yrs)*</label>
                               <input required name="yearsPaid" type="number" placeholder="3" className="w-full px-3 py-3 bg-white border border-rose-200 rounded-xl outline-none font-semibold text-sm focus:border-rose-300 transition-colors" />
                             </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Premium Frequency*</label>
                        <select required name="premiumFrequency" className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none font-semibold text-sm focus:border-rose-300 transition-colors">
                          <option value="YEARLY">Yearly</option>
                          <option value="HALF_YEARLY">Half-Yearly</option>
                          <option value="QUARTERLY">Quarterly</option>
                          <option value="MONTHLY">Monthly</option>
                        </select>
                      </div>
                    </motion.div>
                  )}

                  {['FD', 'RD'].includes(selectedAssetType) && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pt-2 p-4 bg-amber-50/30 rounded-2xl border border-amber-100"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Start Date*</label>
                          <input required name="startDate" type="date" className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl outline-none font-semibold text-sm focus:border-amber-300 transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Maturity Date*</label>
                          <input required name="endDate" type="date" className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl outline-none font-semibold text-sm focus:border-amber-300 transition-colors" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Tenure (Months)</label>
                          <input name="tenureMonths" type="number" placeholder="Ex. 12" className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl outline-none font-semibold text-sm focus:border-amber-300 transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Maturity Amount (₹)</label>
                          <input name="maturityAmount" type="number" step="0.01" placeholder="Ex. 1,05,000" className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl outline-none font-semibold text-sm focus:border-amber-300 transition-colors" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {['MUTUAL_FUND', 'STOCK', 'GOLD', 'SILVER', 'ULIPS'].includes(selectedAssetType) && selectedAssetType !== 'STOCK' && selectedAssetType !== 'MUTUAL_FUND' && selectedAssetType !== 'GOLD' && selectedAssetType !== 'SILVER' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Unit Price (₹)*</label>
                      <input required name="unitPrice" type="number" step="0.0001" placeholder="Ex. 9.98" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm focus:border-indigo-300 transition-colors" />
                    </div>
                  )}

                  {selectedAssetType === 'OTHER' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1"
                    >
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Specify Asset Details*</label>
                      <input 
                        required
                        name="details"
                        type="text"
                        placeholder="Ex. Land, Private Equity, etc."
                        className="w-full px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none font-semibold text-sm focus:border-indigo-300 transition-colors"
                      />
                    </motion.div>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all mt-4"
                  >
                    Save Asset
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add Goal Modal */}
      <AnimatePresence>
        {isAddingGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-800">Add Savings Target</h2>
                  <button 
                    onClick={() => setIsAddingGoal(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={24} className="text-slate-400" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  addGoal({
                    name: formData.get('name') as string,
                    targetAmount: parseFloat(formData.get('targetAmount') as string) || 0,
                    currentAmount: parseFloat(formData.get('currentAmount') as string) || 0,
                    deadline: formData.get('deadline') as string,
                    category: formData.get('category') as string,
                    icon: formData.get('icon') as string,
                  });
                }} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Goal Name</label>
                    <input required name="name" type="text" placeholder="Ex. New Car, Emergency Fund" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Target Amount (₹)</label>
                      <input required name="targetAmount" type="number" placeholder="0" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Initial Savings (₹)</label>
                      <input name="currentAmount" type="number" defaultValue={0} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Target Date</label>
                      <input required name="deadline" type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Category</label>
                      <select name="category" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm">
                        <option value="Savings">General Savings</option>
                        <option value="Travel">Travel</option>
                        <option value="Health">Health</option>
                        <option value="Education">Education</option>
                        <option value="Home">Home</option>
                        <option value="Electronics">Electronics</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Icon</label>
                    <select name="icon" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm">
                      <option value="🎯">🎯 Target</option>
                      <option value="🚗">🚗 Vehicle</option>
                      <option value="🏠">🏠 Home</option>
                      <option value="✈️">✈️ Travel</option>
                      <option value="❤️">❤️ Life</option>
                      <option value="💼">💼 Career</option>
                      <option value="🛡️">🛡️ Security</option>
                      <option value="🎓">🎓 Education</option>
                    </select>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all mt-4"
                  >
                    Create Goal
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAiPanel && (
          <div className="fixed inset-0 z-[100] flex justify-end no-print">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowAiPanel(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-600 dark:bg-indigo-900">
                <div className="flex items-center gap-4 text-white">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Executive Summary</h2>
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">AI Financial Advisory</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAiPanel(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-900/50">
                {aiAdvice ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="prose prose-slate dark:prose-invert max-w-none"
                  >
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm markdown-body">
                      <Markdown>{aiAdvice}</Markdown>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center animate-pulse">
                      <Sparkles size={32} />
                    </div>
                    <p className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px]">Generating Executive Summary...</p>
                  </div>
                )}

                <div className="mt-8 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Tips</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                      <div className="flex gap-3">
                        <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Try saving 20% of your income this month for better long-term growth.</p>
                      </div>
                    </div>
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                      <div className="flex gap-3">
                        <MessageSquareQuote size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <p className="text-xs font-bold text-indigo-800 dark:text-indigo-200">Analyze your subscription costs. Even small ₹500 saves add up!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={generateAdvice}
                  disabled={isGeneratingAdvice}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  {isGeneratingAdvice ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                  Refresh AI Insights
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contribution Modal */}
      <AnimatePresence>
        {activeGoalForContribution && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl border border-white/20 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50" />
              
              <div className="relative">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Add Money</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Goal: {activeGoalForContribution.name}</p>
                  </div>
                  <button onClick={() => setActiveGoalForContribution(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount to Add (₹)</label>
                    <div className="relative">
                       <input 
                         autoFocus
                         type="number"
                         value={contributionAmount}
                         onChange={(e) => setContributionAmount(e.target.value)}
                         placeholder="0.00"
                         className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-black text-xl text-indigo-600"
                       />
                       <div className="absolute right-6 top-1/2 -translate-y-1/2">
                          <TrendingUp size={24} className="text-indigo-200" />
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setActiveGoalForContribution(null)}
                      className="py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => contributeToGoal(Number(contributionAmount))}
                      disabled={!contributionAmount || Number(contributionAmount) <= 0}
                      className="py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl border border-white/20 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 opacity-50" />
              
              <div className="relative">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Reset All Data?</h2>
                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-1">Danger Zone</p>
                  </div>
                  <button onClick={() => setShowResetConfirm(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
                    <p className="text-[10px] font-bold text-rose-700 leading-relaxed text-center">
                      Are you absolutely sure? This action is permanent and cannot be reversed. All your transactions, assets, budgets, and settings will be cleared.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setShowResetConfirm(false)}
                      className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all font-sans"
                    >
                      Keep Data
                    </button>
                    <button 
                      onClick={() => {
                        // 1. Clear storage first
                        localStorage.clear();
                        
                        // 2. Explicit clear
                        const keys = [
                          'finova_user', 
                          'finova_transactions', 
                          'finova_assets', 
                          'finova_budgets', 
                          'finova_goals', 
                          'finova_whom_options', 
                          'finova_mode_options'
                        ];
                        keys.forEach(k => localStorage.removeItem(k));
                        
                        // 3. Clear session storage too just in case
                        sessionStorage.clear();
                        
                        // 4. Force a hard redirect to the home page for a complete fresh start
                        window.location.replace(window.location.origin);
                      }}
                      className="py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                    >
                      Yes, Reset
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
