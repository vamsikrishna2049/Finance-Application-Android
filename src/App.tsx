/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Download, Sparkles, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, History, PieChart as PieChartIcon, X, Calendar as CalendarIcon, Filter, User as UserIcon, CreditCard, Briefcase, PlusCircle, BrainCircuit, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isWithinInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from './lib/utils';
import { UserProfile, Transaction, Asset, AssetType } from './types';

const STORAGE_KEY_USER = 'lumina_user';
const STORAGE_KEY_TRANSACTIONS = 'lumina_transactions';
const STORAGE_KEY_ASSETS = 'lumina_assets';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const DEFAULT_CATEGORIES = [
  // Income
  { name: 'Salary / Income', type: 'INCOME', icon: '💰' },
  { name: 'Other Income', type: 'INCOME', icon: '🎁' },
  
  // Expenses
  { name: 'House Rent', type: 'EXPENSE', icon: '🏠' },
  { name: 'Home Loan EMI', type: 'EXPENSE', icon: '🏛️' },
  { name: 'Home Utilities', type: 'EXPENSE', icon: '⚡' },
  { name: 'Groceries', type: 'EXPENSE', icon: '🛒' },
  { name: 'Home Maintenance', type: 'EXPENSE', icon: '🛠️' },
  { name: 'Maid', type: 'EXPENSE', icon: '🧹' },
  { name: 'Food / Dining', type: 'EXPENSE', icon: '🍱' },
  { name: 'Travel Bus', type: 'EXPENSE', icon: '🚌' },
  { name: 'Travel Train', type: 'EXPENSE', icon: '🚆' },
  { name: 'Travel Bike', type: 'EXPENSE', icon: '🏍️' },
  { name: 'Travel Cab', type: 'EXPENSE', icon: '🚕' },
  { name: 'Travel Others', type: 'EXPENSE', icon: '🚶' },
  { name: 'Fuel', type: 'EXPENSE', icon: '⛽' },
  { name: 'Vehicle Maintenance', type: 'EXPENSE', icon: '🔧' },
  { name: 'Vehicle Toll', type: 'EXPENSE', icon: '🛣️' },
  { name: 'Accommodation', type: 'EXPENSE', icon: '🏨' },
  { name: 'Doctor / Hospital', type: 'EXPENSE', icon: '👨‍⚕️' },
  { name: 'Pharmacy / Medicine', type: 'EXPENSE', icon: '💊' },
  { name: 'Health Insurance', type: 'EXPENSE', icon: '🛡️' },
  { name: 'Term Insurance', type: 'EXPENSE', icon: '📄' },
  { name: 'LIC Insurance', type: 'EXPENSE', icon: '📁' },
  { name: 'Grooming', type: 'EXPENSE', icon: '✂️' },
  { name: 'Shopping - Clothes', type: 'EXPENSE', icon: '👕' },
  { name: 'Shopping - Shoes', type: 'EXPENSE', icon: '👟' },
  { name: 'Subscriptions', type: 'EXPENSE', icon: '📺' },
  { name: 'Devotional', type: 'EXPENSE', icon: '🙏' },
  { name: 'Mobile Purchase', type: 'EXPENSE', icon: '📱' },
  { name: 'Mobile - Internet', type: 'EXPENSE', icon: '🌐' },
  { name: 'Electronics', type: 'EXPENSE', icon: '💻' },
  { name: 'Other EMI', type: 'EXPENSE', icon: '💳' },
  { name: 'Bank Charges / Fees', type: 'EXPENSE', icon: '🏦' },
  { name: 'Late Fees / Penalty', type: 'EXPENSE', icon: '⚠️' },
  { name: 'Investment Account', type: 'EXPENSE', icon: '📈' },
  { name: 'Fixed Deposit (FD)', type: 'EXPENSE', icon: '🔒' },
  { name: 'Recurring Deposit (RD)', type: 'EXPENSE', icon: '🔄' },
  { name: 'Education / Courses', type: 'EXPENSE', icon: '🎓' },
  { name: 'Other Expense', type: 'EXPENSE', icon: '💸' },
];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    return saved ? JSON.parse(saved) : null;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return saved ? JSON.parse(saved) : [];
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ASSETS);
    return saved ? JSON.parse(saved) : [];
  });

  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('lumina_budgets');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('lumina_budgets', JSON.stringify(budgets));
  }, [budgets]);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [isAIExtracting, setIsAIExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ASSETS' | 'SETTINGS'>('DASHBOARD');

  const [whomOptions, setWhomOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('lumina_whom_options');
    return saved ? JSON.parse(saved) : ['Self', 'Father', 'Mother', 'Family', 'Other'];
  });

  const [modeOptions, setModeOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('lumina_mode_options');
    return saved ? JSON.parse(saved) : [
      'Axis UPI', 
      'Axis - Credit Card UPI', 
      'SBI Credit Card', 
      'ICICI Amazon Pay', 
      'AXIS My Zone', 
      'SBI UPI', 
      'ICICI UPI', 
      'ICICI HPCL', 
      'Other'
    ];
  });
  const [onboardingData, setOnboardingData] = useState({ name: '', initialBalance: '' });
  
  // Date Range for Reporting
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const exportData = () => {
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
    a.download = `lumina_backup_${format(new Date(), 'yyyy_MM_dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Title', 'Amount', 'Type', 'Category', 'Whom', 'Mode'];
    const rows = filteredTransactions.map(t => [
      t.date,
      `"${t.title.replace(/"/g, '""')}"`,
      t.amount,
      t.type,
      t.category,
      t.whom,
      t.mode
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lumina_transactions_${dateRange.start}_to_${dateRange.end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printToPDF = () => {
    window.print();
  };

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    if (!searchQuery) return assets;
    const q = searchQuery.toLowerCase();
    return assets.filter(a => 
      a.name.toLowerCase().includes(q) || 
      a.institution.toLowerCase().includes(q) || 
      a.type.toLowerCase().includes(q)
    );
  }, [assets, searchQuery]);

  // Filtered Transactions for Reporting
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = parseISO(t.date);
      const inDateRange = isWithinInterval(tDate, {
        start: parseISO(dateRange.start),
        end: parseISO(dateRange.end)
      });
      const matchesSearch = searchQuery === '' || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.whom.toLowerCase().includes(searchQuery.toLowerCase());
      
      return inDateRange && matchesSearch;
    });
  }, [transactions, dateRange, searchQuery]);

  // Dashboard Stats (Overall)
  const totalStats = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Total expenses that are NOT investments (FD/RD/Investments)
    const activeExpenses = transactions
      .filter(t => t.type === 'EXPENSE' && !['Fixed Deposit (FD)', 'Recurring Deposit (RD)', 'Investment Account'].includes(t.category))
      .reduce((sum, t) => sum + t.amount, 0);

    // Total money moved to investments via transactions
    const txInvestments = transactions
      .filter(t => t.type === 'EXPENSE' && ['Fixed Deposit (FD)', 'Recurring Deposit (RD)', 'Investment Account'].includes(t.category))
      .reduce((sum, t) => sum + t.amount, 0);

    // Total current value of tracked assets
    const assetValue = assets.reduce((sum, a) => sum + a.currentValue, 0);

    const liquidBalance = (user?.initialBalance || 0) + income - activeExpenses - txInvestments;
    const totalInvestments = txInvestments + assetValue;
    const netWorth = liquidBalance + totalInvestments;

    return { 
      income, 
      expenses: activeExpenses + txInvestments, 
      liquidBalance, 
      netWorth, 
      investmentsTotal: totalInvestments 
    };
  }, [transactions, user, assets]);

  // Report Stats (Filtered)
  const reportStats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expenses };
  }, [filteredTransactions]);

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
    localStorage.setItem('lumina_whom_options', JSON.stringify(whomOptions));
  }, [whomOptions]);

  useEffect(() => {
    localStorage.setItem('lumina_mode_options', JSON.stringify(modeOptions));
  }, [modeOptions]);

  const handleOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser = {
      name: onboardingData.name,
      initialBalance: parseFloat(onboardingData.initialBalance) || 0,
      onboarded: true
    };
    setUser(newUser);
  };

  const [customCategory, setCustomCategory] = useState('');
  const [customMode, setCustomMode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORIES[0].name);
  const [selectedMode, setSelectedMode] = useState('Other');

  useEffect(() => {
    if (modeOptions.length > 0) {
      setSelectedMode(modeOptions[0]);
    }
  }, [modeOptions]);

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...t,
      id: crypto.randomUUID(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
    setIsAddingTransaction(false);
    // Reset custom fields
    setCustomCategory('');
    setCustomMode('');
  };

  const addAsset = (a: Omit<Asset, 'id' | 'lastUpdated'>) => {
    const newAsset: Asset = {
      ...a,
      id: crypto.randomUUID(),
      lastUpdated: new Date().toISOString(),
    };
    setAssets(prev => [newAsset, ...prev]);
    setIsAddingAsset(false);
  };

  const extractTransactionData = async (text: string) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract transaction details from this text: "${text}". 
        Be strict with Whom, Mode, and Category.
        Valid Whom: ${whomOptions.join(', ')}.
        Valid Mode: ${modeOptions.join(', ')}.
        Valid Categories: ${DEFAULT_CATEGORIES.map(c => c.name).join(', ')}.
        Return ONLY valid JSON with keys: title, amount, type (INCOME/EXPENSE), category, date (YYYY-MM-DD), whom, mode.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              type: { type: Type.STRING },
              category: { type: Type.STRING },
              date: { type: Type.STRING },
              whom: { type: Type.STRING },
              mode: { type: Type.STRING },
            },
            required: ['title', 'amount', 'type', 'category', 'date', 'whom', 'mode']
          }
        }
      });
      return JSON.parse(response.text);
    } catch (err) {
      console.error("AI Extraction Error:", err);
      return null;
    }
  };

  if (!user || !user.onboarded) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100"
        >
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Wallet size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-center text-slate-900 mb-2">Welcome to Lumina</h1>
          <p className="text-center text-slate-500 mb-8 font-medium">Let's set up your personal treasury</p>
          
          <form onSubmit={handleOnboarding} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Your Name</label>
              <input 
                required
                type="text" 
                placeholder="Ex. Vamsi Krishna"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-semibold"
                value={onboardingData.name}
                onChange={e => setOnboardingData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Initial Balance (₹)</label>
              <input 
                required
                type="number" 
                placeholder="Ex. 50000"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-semibold"
                value={onboardingData.initialBalance}
                onChange={e => setOnboardingData(prev => ({ ...prev, initialBalance: e.target.value }))}
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Start Tracking
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col p-4 md:p-8 max-w-7xl mx-auto overflow-hidden">
      {/* Print-only Header */}
      <div className="print-only mb-8 text-center border-b pb-4">
        <h1 className="text-2xl font-black text-slate-900">Lumina Financial Report</h1>
        <p className="text-sm font-bold text-slate-500">Statement for: {user?.name}</p>
        <p className="text-xs font-medium text-slate-400 italic">Range: {format(parseISO(dateRange.start), 'dd MMM yyyy')} to {format(parseISO(dateRange.end), 'dd MMM yyyy')}</p>
      </div>

      <div className="flex justify-between items-center mb-8 bg-slate-100 p-1.5 rounded-2xl w-fit no-print">
        <button 
          onClick={() => setActiveTab('DASHBOARD')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-bold text-xs transition-all",
            activeTab === 'DASHBOARD' ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100/50" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('ASSETS')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-bold text-xs transition-all",
            activeTab === 'ASSETS' ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100/50" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Portfolio
        </button>
        <button 
          onClick={() => setActiveTab('SETTINGS')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-bold text-xs transition-all",
            activeTab === 'SETTINGS' ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100/50" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Preferences
        </button>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Net Worth (Assets + Cash)</p>
          <div className="flex items-baseline gap-3">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">{formatCurrency(totalStats.netWorth)}</h1>
            <p className="text-sm font-bold text-slate-400">Cash: {formatCurrency(totalStats.liquidBalance)}</p>
          </div>
          <p className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
            <TrendingUp size={16} />
            <span>Welcome back, {user.name}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 font-normal">Real-time Balance</span>
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto no-print">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => {
                const now = new Date();
                setDateRange({
                  start: format(startOfMonth(now), 'yyyy-MM-dd'),
                  end: format(endOfMonth(now), 'yyyy-MM-dd')
                });
              }}
              className="px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider text-slate-500 hover:bg-white hover:text-indigo-600 transition-all"
            >
              This Month
            </button>
            <button 
              onClick={() => {
                const now = new Date();
                const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                setDateRange({
                  start: format(startOfMonth(last), 'yyyy-MM-dd'),
                  end: format(endOfMonth(last), 'yyyy-MM-dd')
                });
              }}
              className="px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider text-slate-500 hover:bg-white hover:text-indigo-600 transition-all"
            >
              Last Month
            </button>
          </div>
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm overflow-hidden min-w-[280px]">
             <input 
              type="date" 
              className="px-2 py-1 text-xs font-bold outline-none border-none bg-transparent flex-1" 
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
             />
             <div className="px-1 flex items-center text-slate-300">|</div>
             <input 
              type="date" 
              className="px-2 py-1 text-xs font-bold outline-none border-none bg-transparent flex-1" 
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
             />
          </div>
          <button 
            onClick={() => setIsAddingTransaction(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer no-print"
          >
            <Plus size={18} />
            Add Transaction
          </button>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-6 flex-grow pb-12">
        {activeTab === 'DASHBOARD' ? (
          <>
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col min-h-[320px]">
            <div className="flex justify-between items-center mb-8">
              <div className="flex flex-col">
                <h2 className="font-bold text-xl text-slate-800">Range Report</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{format(parseISO(dateRange.start), 'dd MMM')} - {format(parseISO(dateRange.end), 'dd MMM yyyy')}</p>
              </div>
              <div className="flex gap-3">
                <span className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  {formatCurrency(reportStats.income)}
                </span>
                <span className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                  {formatCurrency(reportStats.expenses)}
                </span>
              </div>
            </div>
            
            <div className="flex items-end gap-3 h-48 mt-auto px-2">
              {[60, 85, 45, 90, 65, 30, 50].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col gap-1 items-center group">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    className={cn(
                      "w-full rounded-t-xl transition-all duration-500",
                      i === 3 ? "bg-emerald-500 shadow-lg shadow-emerald-200" : "bg-emerald-100 group-hover:bg-emerald-200"
                    )}
                  />
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h/3}%` }}
                    className={cn(
                      "w-full rounded-b-xl transition-all duration-500",
                      i === 3 ? "bg-rose-400 shadow-lg shadow-rose-200" : "bg-rose-100 group-hover:bg-rose-200"
                    )}
                  />
                  <span className={cn("text-[10px] font-bold mt-2", i === 3 ? "text-slate-900" : "text-slate-400")}>
                    {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex-grow">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="font-bold text-xl text-slate-800">Range Activity</h2>
              <div className="flex gap-4 items-center w-full md:w-auto no-print">
                <div className="relative flex-1 md:w-64">
                   <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                    type="text" 
                    placeholder="Search transactions..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-indigo-50 outline-none"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                   />
                </div>
                <button 
                  onClick={() => {
                    if(confirm('Are you sure you want to clear all transactions?')) {
                      setTransactions([]);
                    }
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors no-print"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <History size={48} className="mb-4 opacity-20" />
                  <p className="font-medium">No activity in this range</p>
                </div>
              ) : (
                filteredTransactions.slice(0, 10).map((item, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={item.id} 
                    className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg",
                        item.type === 'INCOME' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {DEFAULT_CATEGORIES.find(c => c.name === item.category)?.icon || '💸'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                          <span>{format(parseISO(item.date), 'dd MMM')} • {item.category}</span>
                          <span className="text-slate-200">|</span>
                          <span className="flex items-center gap-1"><UserIcon size={10} /> {item.whom}</span>
                          <span className="text-slate-200">|</span>
                          <span className="flex items-center gap-1"><CreditCard size={10} /> {item.mode}</span>
                        </div>
                      </div>
                    </div>
                    <p className={cn(
                      "text-sm font-black flex items-center gap-1",
                      item.type === 'INCOME' ? "text-emerald-600" : "text-rose-500"
                    )}>
                      {item.type === 'INCOME' ? '+' : '-'}{formatCurrency(item.amount)}
                      {item.type === 'INCOME' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <h2 className="font-bold text-lg mb-6 text-slate-800">Top Categories</h2>
            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <PieChartIcon size={40} className="mb-4 opacity-20" />
                <p className="text-xs font-bold text-center">Charts will appear once you add transactions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from(new Set(filteredTransactions.map(t => t.category)))
                  .slice(0, 5)
                  .map((cat, idx) => {
                    const amount = filteredTransactions.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0);
                    const budget = budgets[cat] || 0;
                    const overBudget = budget > 0 && amount > budget;

                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-transparent">
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                            <div className={cn(
                              "w-2.5 h-2.5 rounded-full",
                              overBudget ? "bg-rose-500" : "bg-emerald-500"
                            )}></div>
                            {cat}
                            {budget > 0 && (
                              <span className={cn(
                                "text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter",
                                overBudget ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                              )}>
                                {overBudget ? 'Over' : 'Safe'}
                              </span>
                            )}
                          </span>
                          <span className="text-xs font-black text-slate-900">{formatCurrency(amount)}</span>
                        </div>
                        {budget > 0 && (
                          <div className="px-1">
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full transition-all duration-500", overBudget ? "bg-rose-500" : "bg-emerald-500")}
                                style={{ width: `${Math.min((amount / budget) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>

          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
            <h2 className="font-bold text-lg mb-4 text-slate-800">Locked Assets</h2>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total in FD/RD</span>
                  <span className="text-xs font-black text-indigo-600">{formatCurrency(totalStats.investmentsTotal)}</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((totalStats.investmentsTotal / totalStats.netWorth) * 100 || 0, 100)}%` }}
                    className="h-full bg-indigo-600 rounded-full"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  {((totalStats.investmentsTotal / totalStats.netWorth) * 100 || 0).toFixed(1)}% of your total net worth
                </p>
              </div>
            </div>
          </div>

          <div className="bg-indigo-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles size={120} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-start gap-4 mb-8">
                <div className="w-10 h-10 bg-indigo-400/20 rounded-xl flex items-center justify-center text-indigo-100 border border-indigo-400/20">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Smart Insight</h3>
                  <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mt-1">Lumina Intelligence</p>
                </div>
              </div>
              
              <p className="text-base leading-relaxed text-indigo-50 mb-8 font-medium">
                Your current total balance is <span className="font-bold text-emerald-400">{formatCurrency(totalStats.netWorth)}</span>. 
                {reportStats.expenses > reportStats.income ? " You're spending more than your range income." : " You're maintaining a healthy surplus this month!"}
              </p>
              
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                <p className="text-[10px] uppercase font-bold text-indigo-300 mb-2 tracking-widest">Initial Capital</p>
                <p className="text-3xl font-black">{formatCurrency(user.initialBalance)}</p>
                <p className="text-[10px] text-indigo-300/70 mt-2 font-medium">Locked in Lumina</p>
              </div>
            </div>
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
                          <p className="text-sm text-slate-400 font-medium">Stocks, FDs, and Insurance Holdings</p>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                              className="bg-slate-50 border border-slate-100 rounded-3xl p-6 hover:shadow-md transition-all group relative"
                            >
                              <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center text-white",
                                    asset.type === 'MUTUAL_FUND' ? "bg-teal-500" :
                                    asset.type === 'STOCK' ? "bg-indigo-500" :
                                    asset.type === 'FD' ? "bg-amber-600" :
                                    asset.type === 'INSURANCE' ? "bg-rose-500" : "bg-slate-700"
                                  )}>
                                    {asset.type === 'INSURANCE' ? <ScanLine size={24} /> : <Briefcase size={24} />}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-slate-900">{asset.name}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{asset.institution} • {asset.type}</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setAssets(prev => prev.filter(a => a.id !== asset.id))}
                                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all rounded-full hover:bg-rose-50"
                                >
                                  <X size={16} />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Invested</p>
                                  <p className="text-md font-bold text-slate-700">{formatCurrency(asset.investedAmount)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 text-right">Current</p>
                                  <p className="text-md font-black text-emerald-600 text-right">{formatCurrency(asset.currentValue)}</p>
                                </div>
                              </div>

                              <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">Performance</span>
                                <span className={cn(
                                  asset.currentValue >= asset.investedAmount ? "text-emerald-500" : "text-rose-500"
                                )}>
                                  {asset.currentValue >= asset.investedAmount ? '+' : ''}
                                  {assets.length > 0 && asset.investedAmount > 0 ? (((asset.currentValue - asset.investedAmount) / asset.investedAmount) * 100).toFixed(2) : 0}%
                                </span>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                   </div>
                </div>

                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                   <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                      <h3 className="font-bold text-lg mb-6 text-slate-800">Asset Distribution</h3>
                      <div className="space-y-6">
                        {['STOCK', 'MUTUAL_FUND', 'FD', 'INSURANCE'].map(type => {
                          const value = assets.filter(a => a.type === type).reduce((s, a) => s + a.currentValue, 0);
                          const total = assets.reduce((s, a) => s + a.currentValue, 0);
                          const perc = total > 0 ? (value / total) * 100 : 0;
                          
                          if(total === 0) return null;

                          return (
                            <div key={type}>
                               <div className="flex justify-between items-center mb-2">
                                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{type}</span>
                                 <span className="text-xs font-black text-slate-900">{formatCurrency(value)}</span>
                               </div>
                               <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                 <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${perc}%` }}
                                  className={cn(
                                    "h-full rounded-full",
                                    type === 'MUTUAL_FUND' ? "bg-teal-500" :
                                    type === 'STOCK' ? "bg-indigo-500" :
                                    type === 'FD' ? "bg-amber-600" : "bg-rose-500"
                                  )}
                                 />
                               </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="mt-10 p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                         <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 text-center">Portfolio Valuation</p>
                         <p className="text-3xl font-black text-center text-indigo-900">{formatCurrency(assets.reduce((sum, a) => sum + a.currentValue, 0))}</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        ) : (
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
                        {mode !== 'Other' && (
                          <button 
                            onClick={() => setModeOptions(prev => prev.filter(m => m !== mode))}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = (e.currentTarget.elements.namedItem('newMode') as HTMLInputElement);
                      if (input.value && !modeOptions.includes(input.value)) {
                        setModeOptions(prev => [...prev.filter(m => m !== 'Other'), input.value, 'Other']);
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
                        {person !== 'Other' && (
                          <button 
                            onClick={() => setWhomOptions(prev => prev.filter(p => p !== person))}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = (e.currentTarget.elements.namedItem('newWhom') as HTMLInputElement);
                      if (input.value && !whomOptions.includes(input.value)) {
                        setWhomOptions(prev => [...prev.filter(p => p !== 'Other'), input.value, 'Other']);
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

                {/* Monthly Budgets */}
                <div className="col-span-12 space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <TrendingUp size={20} />
                    </div>
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Monthly Category Budgets</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DEFAULT_CATEGORIES.filter(c => c.type === 'EXPENSE').slice(0, 12).map(cat => (
                      <div key={cat.name} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
                         <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600">{cat.icon} {cat.name}</span>
                            <div className="relative">
                               <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">₹</span>
                               <input 
                                type="number" 
                                placeholder="Set budget" 
                                className="w-24 pl-5 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                                value={budgets[cat.name] || ''}
                                onChange={(e) => setBudgets(prev => ({ ...prev, [cat.name]: parseFloat(e.target.value) || 0 }))}
                               />
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic text-center">Set budgets to track spending progress on your dashboard.</p>
                </div>

              <div className="mt-16 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div className="flex flex-col gap-1">
                   <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">App Data & Ownership</h3>
                   <p className="text-xs text-slate-400 font-medium tracking-tight">Your financial data is encrypted and stored locally on your device.</p>
                   <div className="flex flex-wrap gap-4 mt-4">
                     <button 
                      onClick={exportToCSV}
                      className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-800 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"
                     >
                       <Download size={14} />
                       Export Excel (CSV)
                     </button>
                     <button 
                      onClick={printToPDF}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-800 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"
                     >
                       <ScanLine size={14} />
                       Save as PDF
                     </button>
                     <button 
                      onClick={exportData}
                      className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
                     >
                       <Download size={14} />
                       JSON Backup
                     </button>
                   </div>
                 </div>
                 <button 
                  onClick={() => {
                    if(confirm("DANGER: This will wipe EVERYTHING (transactions, assets, profile). Are you absolutely sure?")) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="px-6 py-3 border border-rose-100 text-rose-500 font-bold text-sm rounded-xl hover:bg-rose-50 transition-all"
                 >
                   Reset All App Data
                 </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isAddingTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden my-auto"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-800">Add Transaction</h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsAIExtracting(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all border border-indigo-100"
                    >
                      <BrainCircuit size={14} />
                      Smart Paste
                    </button>
                    <button 
                      onClick={() => setIsAddingTransaction(false)}
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
                  
                  addTransaction({
                    title: formData.get('title') as string,
                    amount: parseFloat(formData.get('amount') as string),
                    type: formData.get('type') as any,
                    category: cat === 'Other Expense' ? (formData.get('customCategory') as string || cat) : cat,
                    whom: formData.get('whom') as string,
                    mode: mod === 'Other' ? (formData.get('customMode') as string || mod) : mod,
                    date: formData.get('date') as string,
                  });
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col cursor-pointer group">
                      <input type="radio" name="type" value="EXPENSE" defaultChecked className="sr-only peer" />
                      <div className="py-3 text-center rounded-2xl border-2 border-slate-100 font-bold text-slate-400 peer-checked:border-indigo-600 peer-checked:text-indigo-600 transition-all text-xs">
                        Expense
                      </div>
                    </label>
                    <label className="flex flex-col cursor-pointer group">
                      <input type="radio" name="type" value="INCOME" className="sr-only peer" />
                      <div className="py-3 text-center rounded-2xl border-2 border-slate-100 font-bold text-slate-400 peer-checked:border-indigo-600 peer-checked:text-indigo-600 transition-all text-xs">
                        Income
                      </div>
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Description</label>
                    <input 
                      required
                      name="title"
                      type="text" 
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
                        defaultValue={format(new Date(), 'yyyy-MM-dd')}
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
                      {DEFAULT_CATEGORIES.map(c => (
                        <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-semibold appearance-none text-sm"
                      >
                        {whomOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
                      </select>
                    </div>
                  </div>

                  {selectedMode === 'Other' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1"
                    >
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Specify Payment Mode</label>
                      <input 
                        required
                        name="customMode"
                        type="text"
                        placeholder="Ex. Cash, GPay, etc."
                        className="w-full px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none font-semibold text-sm"
                      />
                    </motion.div>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all mt-2"
                  >
                    Confirm Transaction
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Smart Paste AI Modal */}
      <AnimatePresence>
        {isAIExtracting && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-indigo-950/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                    <BrainCircuit size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Smart Paste</h2>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Lumina AI Extraction</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAIExtracting(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-slate-300" />
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-sm text-slate-500 font-medium">Paste your bank SMS, email notification, or transaction msg here. Lumina will automatically extract the details.</p>
                <textarea 
                  id="ai-paste-area"
                  className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium text-sm text-slate-700 resize-none"
                  placeholder="Ex: HDFC Bank: ₹1,500.00 spent at Starbucks on 12-Feb. Your account balance is..."
                />
                <button 
                  onClick={async () => {
                    const text = (document.getElementById('ai-paste-area') as HTMLTextAreaElement).value;
                    if(!text) return;
                    
                    const btn = document.getElementById('ai-extract-btn');
                    if(btn) {
                      btn.innerText = 'Extracting...';
                      btn.classList.add('opacity-50', 'pointer-events-none');
                    }

                    const result = await extractTransactionData(text);
                    
                    if(result) {
                      addTransaction(result);
                      setIsAIExtracting(false);
                      setIsAddingTransaction(false);
                    } else {
                      alert("Could not extract details. Please try again or enter manually.");
                      if(btn) {
                        btn.innerText = 'Try Again';
                        btn.classList.remove('opacity-50', 'pointer-events-none');
                      }
                    }
                  }}
                  id="ai-extract-btn"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <ScanLine size={18} />
                  Extract Details
                </button>
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
                    onClick={() => setIsAddingAsset(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={24} className="text-slate-400" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  addAsset({
                    name: formData.get('name') as string,
                    type: formData.get('type') as AssetType,
                    investedAmount: parseFloat(formData.get('investedAmount') as string),
                    currentValue: parseFloat(formData.get('currentValue') as string),
                    institution: formData.get('institution') as string,
                  });
                }} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Asset Name</label>
                    <input required name="name" type="text" placeholder="Ex. Nifty 50 Index Fund" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Asset Type</label>
                      <select name="type" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm">
                        <option value="MUTUAL_FUND">Mutual Fund</option>
                        <option value="STOCK">Stock</option>
                        <option value="FD">Fixed Deposit (FD)</option>
                        <option value="RD">Recurring Deposit (RD)</option>
                        <option value="INSURANCE">Insurance</option>
                        <option value="GOLD">Gold</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Institution</label>
                      <input required name="institution" type="text" placeholder="Ex. Zerodha / HDFC" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Amount Invested (₹)</label>
                      <input required name="investedAmount" type="number" placeholder="0.00" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Current Value (₹)</label>
                      <input required name="currentValue" type="number" placeholder="0.00" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm" />
                    </div>
                  </div>

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
    </div>
  );
}
