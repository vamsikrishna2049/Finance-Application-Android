/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Download, Zap, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, History, PieChart as PieChartIcon, X, Calendar as CalendarIcon, Filter, User as UserIcon, CreditCard, Briefcase, PlusCircle, FileText, BookOpen, AlertCircle, Search, Target, ChevronRight, ArrowUp, ArrowDown, Users, RefreshCw, Calculator, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isWithinInterval, startOfMonth, endOfMonth, parseISO, subQuarters, startOfQuarter, endOfQuarter, addMonths, differenceInDays, differenceInMonths } from 'date-fns';
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
import * as XLSX from 'xlsx';
import { 
  formatCurrency, 
  filterAssets, 
  filterTransactions, 
  calculateTotalStats, 
  calculateReportStats,
  generateId,
  generateExcelBlob,
  getCategorySpending,
  groupTransactionsByDate,
  calculateHealthScore,
  getUpcomingRecurring,
  getTopBeneficiaries,
  calculateSourceBalances,
  checkFDMaturities,
  checkInsuranceRenewals,
  getLastWorkingDayOfMonth,
  getRecurringDateInMonth
} from './lib/financeUtils';
import { UserProfile, Transaction, TransactionType, Asset, AssetType, Budget, Goal, InsuranceType, FinanceSource } from './types';
import { categories, FLAT_CATEGORIES as DEFAULT_CATEGORIES } from './categories';

import { TransactionsPage } from './components/TransactionsPage';
import { TaxEngine } from './components/TaxEngine';

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

  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [activeGoalForContribution, setActiveGoalForContribution] = useState<Goal | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [isRecurringChecked, setIsRecurringChecked] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedAssetSource, setSelectedAssetSource] = useState('');
  const [selectedInsuranceCompany, setSelectedInsuranceCompany] = useState('');
  const [customInsuranceCompany, setCustomInsuranceCompany] = useState('');
  const [assetStartDate, setAssetStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [assetEndDate, setAssetEndDate] = useState('');
  const [assetTenureMonths, setAssetTenureMonths] = useState('');
  const [assetROI, setAssetROI] = useState('');
  const [formMaturityAmount, setFormMaturityAmount] = useState('');

  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isToppingUpAsset, setIsToppingUpAsset] = useState<Asset | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupDate, setTopupDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ASSETS' | 'SETTINGS' | 'BUDGETS' | 'TRANSACTIONS' | 'TAX_PLANNING'>('DASHBOARD');
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>('MUTUAL_FUND');
  const [formUnitPrice, setFormUnitPrice] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<string>('');
  const [formInvestedAmount, setFormInvestedAmount] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [whomOptions, setWhomOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('finova_whom_options');
    const options = saved ? JSON.parse(saved) : ['Self', 'Family', 'Friends'];
    return options.filter((p: string) => p && p.trim() !== '');
  });

  const [modeOptions, setModeOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('finova_mode_options');
    const options = saved ? JSON.parse(saved) : ['Cash', 'GPay', 'PhonePe', 'Bank Transfer', 'Credit Card'];
    return options.filter((m: string) => m && m.trim() !== '');
  });

  const [insuranceCompanyOptions, setInsuranceCompanyOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('finova_insurance_options');
    const options = saved ? JSON.parse(saved) : ['LIC', 'HDFC Ergo', 'ICICI Lombard', 'Star Health', 'Niva Bupa', 'Tata AIG', 'SBI General'];
    return options.filter((c: string) => c && c.trim() !== '');
  });

  const [onboardingData, setOnboardingData] = useState({ name: '', initialBalance: '' });
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingSources, setOnboardingSources] = useState<Omit<FinanceSource, 'id'>[]>([]);
  const [onboardingSourceType, setOnboardingSourceType] = useState<'BANK' | 'CREDIT_CARD' | 'WALLET' | 'OTHER' | 'FD' | 'RD'>('BANK');
  const [onboardingAssetType, setOnboardingAssetType] = useState<AssetType>('VEHICLE');
  const [settingsSourceType, setSettingsSourceType] = useState<'BANK' | 'CREDIT_CARD' | 'WALLET' | 'OTHER' | 'FD' | 'RD'>('BANK');
  const [onboardingBudgets, setOnboardingBudgets] = useState<Budget[]>([]);
  const [onboardingAssets, setOnboardingAssets] = useState<Omit<Asset, 'id' | 'lastUpdated'>[]>([]);

  useEffect(() => {
    if (isAddingAsset || editingAsset) {
      setAssetStartDate(editingAsset?.startDate || format(new Date(), 'yyyy-MM-dd'));
      setAssetEndDate(editingAsset?.endDate || '');
      setAssetTenureMonths(editingAsset?.tenureMonths?.toString() || '');
      setAssetROI(editingAsset?.roi?.toString() || '');
      setFormMaturityAmount(editingAsset?.maturityAmount?.toString() || '');
      setSelectedAssetSource(editingAsset?.source || (sources.length > 0 ? sources[0].name : ''));
      setSelectedInsuranceCompany(editingAsset?.insuranceCompany || (insuranceCompanyOptions.length > 0 ? insuranceCompanyOptions[0] : ''));
      setSelectedAssetType(editingAsset?.type || 'MUTUAL_FUND');
      setFormInvestedAmount(editingAsset?.investedAmount?.toString() || '');
      setFormUnitPrice(editingAsset?.unitPrice?.toString() || '');
      setFormQuantity(editingAsset?.quantity?.toString() || '');
    }
  }, [isAddingAsset, editingAsset, sources, insuranceCompanyOptions]);

  // Auto-calculate Maturity Date and Amount based on ROI
  useEffect(() => {
    if (assetStartDate && assetTenureMonths) {
      const months = parseInt(assetTenureMonths);
      if (months > 0) {
        const end = addMonths(parseISO(assetStartDate), months);
        setAssetEndDate(format(end, 'yyyy-MM-dd'));
        
        // Maturity amount calculation (Compound Interest assuming quarterly compounding for FD)
        const principal = parseFloat(formInvestedAmount) || 0;
        const roi = parseFloat(assetROI) || 0;
        if (principal > 0 && roi > 0) {
          if (selectedAssetType === 'FD') {
            const timeYears = months / 12;
            const compoundFrequency = 4; // Quarterly
            const amount = principal * Math.pow((1 + (roi / 100) / compoundFrequency), compoundFrequency * timeYears);
            setFormMaturityAmount(Math.round(amount).toString());
          } else if (selectedAssetType === 'RD') {
            // RD maturity calculation: P * [(1+i)^n - 1] / (1 - (1+i)^-1/3) etc... simplified formula:
            const r = roi / 1200;
            const n = months;
            const amount = principal * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
            setFormMaturityAmount(Math.round(amount).toString());
          }
        }
      }
    }
  }, [assetStartDate, assetTenureMonths, assetROI, formInvestedAmount, selectedAssetType]);

  const handleInvestedAmountChange = (val: string) => {
    setFormInvestedAmount(val);
    const amt = parseFloat(val) || 0;
    if (amt > 0) {
      const q = parseFloat(formQuantity) || 0;
      const p = parseFloat(formUnitPrice) || 0;
      if (q > 0) {
        setFormUnitPrice((amt / q).toFixed(2));
      } else if (p > 0) {
        setFormQuantity((amt / p).toFixed(3));
      }
    }
  };

  const handleQuantityChange = (val: string) => {
    setFormQuantity(val);
    const q = parseFloat(val) || 0;
    const amt = parseFloat(formInvestedAmount) || 0;
    const p = parseFloat(formUnitPrice) || 0;
    
    if (q > 0 && amt > 0) {
      setFormUnitPrice((amt / q).toFixed(2));
    } else if (q > 0 && p > 0 && amt === 0) {
      setFormInvestedAmount((q * p).toFixed(2));
    }
  };

  const handleUnitPriceChange = (val: string) => {
    setFormUnitPrice(val);
    const p = parseFloat(val) || 0;
    const amt = parseFloat(formInvestedAmount) || 0;
    const q = parseFloat(formQuantity) || 0;

    if (p > 0 && amt > 0) {
      setFormQuantity((amt / p).toFixed(3));
    } else if (p > 0 && q > 0 && amt === 0) {
      setFormInvestedAmount((p * q).toFixed(2));
    }
  };

  useEffect(() => {
    if (['STOCK', 'MUTUAL_FUND', 'GOLD', 'SILVER', 'ULIPS'].includes(selectedAssetType)) {
      // Logic handled in onChange for better user control
    }
  }, [selectedAssetType]);

  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // Sync RD transactions automatically
  useEffect(() => {
    const syncRDTransactions = () => {
      const rdAssets = assets.filter(a => a.type === 'RD' && a.startDate);
      if (rdAssets.length === 0) return;

      const today = new Date();
      let newTxs: Transaction[] = [];

      rdAssets.forEach(asset => {
        const start = parseISO(asset.startDate!);
        const preferredDay = start.getDate();
        
        // Calculate number of installments due until now using year/month math
        const totalMonthsDue = (today.getFullYear() * 12 + today.getMonth()) - (start.getFullYear() * 12 + start.getMonth()) + 1;
        
        for (let i = 0; i < totalMonthsDue; i++) {
          const targetMonthDate = addMonths(start, i);
          // If the installment is in the future, don't log it yet
          if (targetMonthDate > today && i > 0) continue; 
          
          const txDate = getRecurringDateInMonth(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), preferredDay);
          
          // Verify it's not in the future (for the edge case where targetMonthDate is today but txDate is tomorrow)
          if (txDate > format(today, 'yyyy-MM-dd')) continue;

          // Check if transaction already exists
          // We look for any transaction for this asset on this date
          const alreadyExists = transactions.some(t => 
            t.date === txDate && 
            t.title.includes(asset.name) && 
            (t.type === 'INVESTMENT' || t.mode === 'Auto-Debit')
          );

          if (!alreadyExists) {
            newTxs.push({
              id: generateId(),
              title: `RD Installment: ${asset.name}`,
              amount: asset.investedAmount,
              type: 'INVESTMENT',
              category: 'Investments',
              date: txDate,
              whom: 'Self',
              mode: 'Auto-Debit',
              source: asset.source || (sources.length > 0 ? sources[0].name : 'Bank')
            });
          }
        }
      });

      if (newTxs.length > 0) {
        setTransactions(prev => [...newTxs, ...prev]);
        // Update total invested amount of assets if it's supposed to be cumulative
        // Actually, in this app, investedAmount seems to be the PER-MONTH for RD
        // and we might need to update the Asset's 'investedAmount' to reflect cumulative?
        // No, current logic in dashboard seems to use investedAmount as the fixed principal for FDs/RDs.
        // But for RD, usually we track cumulative. 
        // For now, I'll stick to logging transactions as requested.
      }
    };

    // Run sync on mount and when assets/transactions change (with caution)
    syncRDTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]); // Run when assets change (including edits)

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

  const currentMonthCategorySpending = useMemo(() => {
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    
    // Filter transactions for the current month that are expenses or EMIs
    const currentMonthTxs = transactions.filter(t => t.date >= start && t.date <= end && (t.type === 'EXPENSE' || t.type === 'EMI'));
    
    const spending: Record<string, number> = {};
    currentMonthTxs.forEach(t => {
      spending[t.category] = (spending[t.category] || 0) + t.amount;
    });
    return spending;
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

  const fdMaturityAlerts = useMemo(() => checkFDMaturities(sources), [sources]);
  const insuranceRenewalAlerts = useMemo(() => checkInsuranceRenewals(assets), [assets]);
  const allAlerts = useMemo(() => [
    ...fdMaturityAlerts.map(a => ({ ...a, alertType: 'FD_MATURITY' as const })),
    ...insuranceRenewalAlerts.map(a => ({ ...a, alertType: 'INSURANCE_RENEWAL' as const }))
  ].sort((a, b) => a.daysLeft - b.daysLeft), [fdMaturityAlerts, insuranceRenewalAlerts]);

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

  const exportToExcel = () => {
    try {
      const blob = generateExcelBlob(filteredTransactions, assets, sources);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finova_data_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Error:", err);
      alert("Failed to export Excel data: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const downloadReport = (start: string, end: string, label: string) => {
    try {
      const filtered = transactions.filter(t => t.date >= start && t.date <= end);
      
      if (filtered.length === 0 && assets.length === 0 && sources.length === 0) {
        alert(`No transactions found for ${label} (${format(parseISO(start), 'dd MMM')} - ${format(parseISO(end), 'dd MMM')})`);
        return;
      }

      const blob = generateExcelBlob(filtered, assets, sources);
      const fileName = `finova_report_${label.toLowerCase().replace(/\s+/g, '_')}.xlsx`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 200);
    } catch (err) {
      console.error("Report Export Error:", err);
      alert("Failed to export Excel report: " + (err instanceof Error ? err.message : String(err)));
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
    
    if (onboardingStep === 2) {
      setOnboardingStep(3);
      return;
    }

    if (onboardingStep === 3) {
      setOnboardingStep(4);
      return;
    }

    if (onboardingStep === 4) {
      setOnboardingStep(5);
      return;
    }

    const newUser: UserProfile = {
      name: onboardingData.name,
      initialBalance: 0, // We use sources now
      onboarded: true,
      employmentType: (onboardingData as any).employmentType || 'SALARIED',
      salaryBankName: (onboardingData as any).salaryBankName || ''
    };
    
    const formattedSources = onboardingSources.map(s => ({
      ...s,
      id: generateId()
    }));
    
    const formattedAssets = onboardingAssets.map(a => ({
      ...a,
      id: generateId(),
      lastUpdated: new Date().toISOString()
    }));

    const budgetRecord: Record<string, number> = {};
    onboardingBudgets.forEach(b => {
      budgetRecord[b.category] = b.amount;
    });

    setSources(formattedSources);
    setAssets(formattedAssets);
    setBudgets(budgetRecord);
    setUser(newUser);
  };

  const [customCategory, setCustomCategory] = useState('');
  const [customMode, setCustomMode] = useState('');
  const [customWhom, setCustomWhom] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORIES[0].name);
  const [selectedType, setSelectedType] = useState<TransactionType>('EXPENSE');
  const [selectedMode, setSelectedMode] = useState('Add New...');
  const [selectedWhom, setSelectedWhom] = useState('Add New...');

  const [selectedSource, setSelectedSource] = useState('Add New...');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (isAddingTransaction) {
      setIsRecurringChecked(editingTransaction?.isRecurring || false);
      if (editingTransaction) {
        setSelectedType(editingTransaction.type);
        setSelectedCategory(editingTransaction.category);
        setSelectedMode(editingTransaction.mode);
        setSelectedWhom(editingTransaction.whom || 'Add New...');
        setSelectedSource(editingTransaction.source || (sources.length > 0 ? sources[0].name : 'Add New...'));
        setFormTitle(editingTransaction.title);
        setFormDate(editingTransaction.date);
      } else {
        setSelectedType('EXPENSE');
        setSelectedCategory(DEFAULT_CATEGORIES[0].name);
        setSelectedMode(modeOptions.length > 0 ? modeOptions[0] : 'Add New...');
        setSelectedWhom(whomOptions.length > 0 ? whomOptions[0] : 'Add New...');
        setSelectedSource(sources.length > 0 ? sources[0].name : 'Add New...');
        setFormTitle('');
        setFormDate(format(new Date(), 'yyyy-MM-dd'));
      }
    }
  }, [isAddingTransaction, editingTransaction, modeOptions, whomOptions, sources]);

  useEffect(() => {
    if (selectedCategory === 'Salary') {
      setFormTitle('Salary');
      const now = new Date();
      setFormDate(getLastWorkingDayOfMonth(now.getFullYear(), now.getMonth()));
    }
  }, [selectedCategory]);

  const handleRecordSalary = () => {
    const now = new Date();
    const lwd = getLastWorkingDayOfMonth(now.getFullYear(), now.getMonth());
    setFormTitle('Salary');
    setFormDate(lwd);
    setIsAddingTransaction(true);
    setEditingTransaction(null);
    setSelectedType('INCOME');
    setSelectedCategory('Salary');
    setSelectedWhom('Self');
  };

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...t,
      id: generateId(),
    };
    
    // Save new whom/mode options if they don't exist and aren't "Add New..."
    if (t.whom && t.whom !== 'Add New...' && !whomOptions.includes(t.whom)) {
      setWhomOptions(prev => {
        const updated = [...prev, t.whom];
        localStorage.setItem('finova_whom_options', JSON.stringify(updated));
        return updated;
      });
    }
    if (t.mode && t.mode !== 'Add New...' && !modeOptions.includes(t.mode)) {
      setModeOptions(prev => {
        const updated = [...prev, t.mode];
        localStorage.setItem('finova_mode_options', JSON.stringify(updated));
        return updated;
      });
    }

    setTransactions(prev => [newTransaction, ...prev]);
    setIsAddingTransaction(false);
    // Reset custom fields
    setCustomCategory('');
    setCustomMode('');
    setCustomWhom('');
    setSelectedWhom(whomOptions[0] || 'Self');
    setSelectedMode(modeOptions[0] || 'Other');
  };

  const updateTransaction = (t: Transaction) => {
    // Save new whom/mode options if they don't exist and aren't "Add New..."
    if (t.whom && t.whom !== 'Add New...' && !whomOptions.includes(t.whom)) {
      setWhomOptions(prev => {
        const updated = [...prev, t.whom];
        localStorage.setItem('finova_whom_options', JSON.stringify(updated));
        return updated;
      });
    }
    if (t.mode && t.mode !== 'Add New...' && !modeOptions.includes(t.mode)) {
      setModeOptions(prev => {
        const updated = [...prev, t.mode];
        localStorage.setItem('finova_mode_options', JSON.stringify(updated));
        return updated;
      });
    }

    setTransactions(prev => prev.map(item => item.id === t.id ? t : item));
    setEditingTransaction(null);
    setIsAddingTransaction(false);
    // Reset custom fields
    setCustomCategory('');
    setCustomMode('');
    setCustomWhom('');
    setSelectedWhom(whomOptions[0] || 'Self');
    setSelectedMode(modeOptions[0] || 'Other');
  };

  const addAsset = (a: Omit<Asset, 'id' | 'lastUpdated'>) => {
    const id = generateId();
    const newAsset: Asset = {
      ...a,
      id,
      lastUpdated: new Date().toISOString(),
    };
    
    // Save new insurance options
    if (a.insuranceCompany && a.insuranceCompany !== 'Add New...' && !insuranceCompanyOptions.includes(a.insuranceCompany)) {
      setInsuranceCompanyOptions(prev => {
        const updated = [...prev, a.insuranceCompany!];
        localStorage.setItem('finova_insurance_options', JSON.stringify(updated));
        return updated;
      });
    }

    // Automatically create an investment transaction
    const transactionDate = (a.type === 'RD' || a.type === 'FD') && a.startDate ? a.startDate : format(new Date(), 'yyyy-MM-dd');
    
    // For RD, the sync useEffect will handle transaction generation if we skip it here,
    // but adding the first one (or starting the sync) is good.
    // If it's an RD, let the sync logic handle it to avoid duplicate logic.
    if (a.type !== 'RD') {
      const transaction: Transaction = {
        id: generateId(),
        title: `Investment: ${a.name}`,
        amount: a.investedAmount,
        type: 'INVESTMENT',
        category: 'Investments',
        date: transactionDate,
        whom: 'Self',
        mode: a.type === 'FD' ? 'Fixed Deposit' : 'Asset Purchase',
        source: a.source || sources[0]?.name || 'Bank'
      };
      setTransactions(prev => [transaction, ...prev]);
    }

    setAssets(prev => [newAsset, ...prev]);
    setIsAddingAsset(false);
  };

  const updateAsset = (a: Asset) => {
    // Save new insurance options
    if (a.insuranceCompany && a.insuranceCompany !== 'Add New...' && !insuranceCompanyOptions.includes(a.insuranceCompany)) {
      setInsuranceCompanyOptions(prev => {
        const updated = [...prev, a.insuranceCompany!];
        localStorage.setItem('finova_insurance_options', JSON.stringify(updated));
        return updated;
      });
    }

    setAssets(prev => prev.map(item => item.id === a.id ? { ...a, lastUpdated: new Date().toISOString() } : item));
    setEditingAsset(null);
    setIsAddingAsset(false);
  };

  const addTopUp = (assetId: string, amount: number, date: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    const topup = { amount, date };
    const updatedTopups = [...(asset.topups || []), topup];
    
    // Recalculate maturity amount for FD/RD if ROI is known
    let newMaturityAmount = asset.maturityAmount;
    if ((asset.type === 'FD' || asset.type === 'RD') && asset.roi && asset.endDate) {
      const maturityDate = parseISO(asset.endDate);
      const topupDateObj = parseISO(date);
      const monthsRemaining = differenceInMonths(maturityDate, topupDateObj);
      
      if (monthsRemaining > 0) {
        const r = asset.roi / 1200;
        const n = monthsRemaining;
        const extraInterest = amount * (Math.pow(1 + r, n) - 1);
        newMaturityAmount = (newMaturityAmount || 0) + amount + extraInterest;
      }
    }

    const updatedAsset: Asset = {
      ...asset,
      investedAmount: asset.investedAmount + amount,
      maturityAmount: newMaturityAmount,
      topups: updatedTopups,
      lastUpdated: new Date().toISOString()
    };

    // Add transaction for the top-up
    const transaction: Transaction = {
      id: generateId(),
      title: `Top-up: ${asset.name}`,
      amount: amount,
      type: 'INVESTMENT',
      category: 'Investments',
      date: date,
      whom: 'Self',
      mode: 'Top-up',
      source: asset.source || sources[0]?.name || 'Bank'
    };

    setAssets(prev => prev.map(item => item.id === assetId ? updatedAsset : item));
    setTransactions(prev => [transaction, ...prev]);
    setIsToppingUpAsset(null);
    setTopupAmount('');
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
                <Zap size={16} />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-black text-center text-slate-900 dark:text-white mb-2 tracking-tighter">Finova</h1>
          <div className="flex justify-center gap-2 mb-6">
            <div className={cn("w-2 h-2 rounded-full", onboardingStep === 1 ? "bg-indigo-600" : "bg-indigo-100")} />
            <div className={cn("w-2 h-2 rounded-full", onboardingStep === 2 ? "bg-indigo-600" : "bg-indigo-100")} />
            <div className={cn("w-2 h-2 rounded-full", onboardingStep === 3 ? "bg-indigo-600" : "bg-indigo-100")} />
            <div className={cn("w-2 h-2 rounded-full", onboardingStep === 4 ? "bg-indigo-600" : "bg-indigo-100")} />
            <div className={cn("w-2 h-2 rounded-full", onboardingStep === 5 ? "bg-indigo-600" : "bg-indigo-100")} />
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
          ) : onboardingStep === 2 ? (
            <form onSubmit={handleOnboarding} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Professional Profile</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOnboardingData(prev => ({ ...prev, employmentType: 'SALARIED' } as any))}
                    className={cn(
                      "py-4 rounded-2xl border font-bold text-sm transition-all",
                      (onboardingData as any).employmentType === 'SALARIED' ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-500 border-slate-100"
                    )}
                  >
                    Salaried
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardingData(prev => ({ ...prev, employmentType: 'BUSINESS' } as any))}
                    className={cn(
                      "py-4 rounded-2xl border font-bold text-sm transition-all",
                      (onboardingData as any).employmentType === 'BUSINESS' ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-500 border-slate-100"
                    )}
                  >
                    Business
                  </button>
                </div>
              </div>

              {(onboardingData as any).employmentType === 'SALARIED' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Salary Credit Bank</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Enter Bank Name (e.g. HDFC, SBI)"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-bold text-slate-900"
                    value={(onboardingData as any).salaryBankName || ''}
                    onChange={e => setOnboardingData(prev => ({ ...prev, salaryBankName: e.target.value } as any))}
                  />
                </motion.div>
              )}

              <button 
                type="submit"
                className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all cursor-pointer flex items-center justify-center gap-3"
              >
                Continue
                <ChevronRight size={20} />
              </button>
            </form>
          ) : onboardingStep === 3 ? (
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
                      if (type === 'RD') {
                        extraData.monthlyInstallment = parseFloat(formData.get('monthlyInstallment') as string) || 0;
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

                  {onboardingSourceType === 'RD' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1 pb-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Monthly Installment (₹)</label>
                      <input required name="monthlyInstallment" type="number" step="0.01" placeholder="Ex. 5000" className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none" />
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
                  onClick={() => setOnboardingStep(2)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Back
                </button>
                <button 
                  onClick={handleOnboarding}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : onboardingStep === 4 ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Insurances & EMIs</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Setup your recurring monthly bills.</p>
              </div>

              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-hide">
                {onboardingBudgets.map((budget, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-black text-slate-800">{budget.category}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatCurrency(budget.amount)} / month</p>
                    </div>
                    <button onClick={() => setOnboardingBudgets(prev => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-rose-500">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {onboardingBudgets.length === 0 && (
                   <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No recurring bills added</p>
                   </div>
                )}
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const type = formData.get('billType') as string;
                  const name = formData.get('billName') as string;
                  const amount = parseFloat(formData.get('billAmount') as string) || 0;
                  const finalCategory = type === 'Other EMI' ? (name || 'Other EMI') : type;
                  
                  if (amount > 0) {
                    setOnboardingBudgets(prev => [...prev, { category: finalCategory, amount, period: 'MONTHLY' }]);
                    (e.target as HTMLFormElement).reset();
                  }
                }}
                className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-3"
              >
                    <select 
                      name="billType" 
                      defaultValue=""
                      className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none"
                    >
                      <option value="" disabled>Select Type</option>
                  <optgroup label="Insurance">
                    <option value="LIC">LIC Insurance Premiums</option>
                    <option value="Bike Insurance">Bike Insurance</option>
                    <option value="Health insurance">Health Insurance</option>
                    <option value="Term Insurance">Term Insurance</option>
                  </optgroup>
                  <optgroup label="EMIs">
                    <option value="Bike EMI">Bike EMI</option>
                    <option value="Car EMI">Car EMI</option>
                    <option value="House EMI">House EMI</option>
                    <option value="Other EMI">Other EMI</option>
                  </optgroup>
                </select>
                <input name="billName" type="text" placeholder="Bill Name (if Other)" className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none" />
                <input required name="billAmount" type="number" step="0.01" placeholder="Monthly Amount (₹)" className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none" />
                <button type="submit" className="w-full py-3 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                   <Plus size={14} /> Add Bill
                </button>
              </form>

              <div className="flex gap-4">
                <button onClick={() => setOnboardingStep(3)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200">Back</button>
                <button onClick={handleOnboarding} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100">Continue</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Physical Assets</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Add your Bike, Car, House, or other assets.</p>
              </div>

              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-hide">
                {onboardingAssets.map((asset, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-black text-slate-800">{asset.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{asset.type} • {formatCurrency(asset.investedAmount)}</p>
                    </div>
                    <button onClick={() => setOnboardingAssets(prev => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-rose-500">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {onboardingAssets.length === 0 && (
                   <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No assets added yet</p>
                   </div>
                )}
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const name = formData.get('assetName') as string;
                  const type = formData.get('assetType') as AssetType;
                  const quantity = formData.get('goldWeight') || formData.get('silverWeight') ? parseFloat((formData.get('goldWeight') || formData.get('silverWeight')) as string) : undefined;
                  const unitPrice = formData.get('goldPrice') || formData.get('silverPrice') ? parseFloat((formData.get('goldPrice') || formData.get('silverPrice')) as string) : undefined;
                  const amount = quantity && unitPrice ? quantity * unitPrice : parseFloat(formData.get('assetVal') as string) || 0;
                  const source = formData.get('assetSource') as string;
                  
                  if (name && (amount > 0 || (quantity && unitPrice))) {
                    const assetData: Partial<Asset> = { 
                      name, 
                      type, 
                      investedAmount: amount, 
                      currentValue: amount,
                      quantity,
                      unitPrice,
                      source
                    };

                    setOnboardingAssets(prev => [...prev, assetData as Asset]);
                    (e.target as HTMLFormElement).reset();
                  }
                }}
                className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <select 
                    name="assetType" 
                    value={onboardingAssetType}
                    onChange={(e) => setOnboardingAssetType(e.target.value as AssetType)}
                    className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none"
                  >
                    <option value="VEHICLE">Bike / Car (Vehicle)</option>
                    <option value="REAL_ESTATE">House (Real Estate)</option>
                    <option value="GOLD">Gold</option>
                    <option value="SILVER">Silver</option>
                    <option value="OTHER">Other Asset</option>
                  </select>
                  <select 
                    required 
                    name="assetSource" 
                    defaultValue=""
                    className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none"
                  >
                    <option value="" disabled>Select Source Account*</option>
                    {onboardingSources.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <input name="assetName" type="text" placeholder="Asset Name (e.g. My Bike)" className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none" />
                
                {onboardingAssetType === 'GOLD' || onboardingAssetType === 'SILVER' ? (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-3">
                    <input required name={onboardingAssetType === 'GOLD' ? "goldWeight" : "silverWeight"} type="number" step="0.001" placeholder="Weight (Grams)" className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none" />
                    <input required name={onboardingAssetType === 'GOLD' ? "goldPrice" : "silverPrice"} type="number" step="0.01" placeholder="Price (per Gram)" className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none" />
                  </motion.div>
                ) : (
                  <input required name="assetVal" type="number" step="0.01" placeholder="Current Value (₹)" className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold outline-none" />
                )}
                <button type="submit" className="w-full py-3 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                   <Plus size={14} /> Add Asset
                </button>
              </form>

              <div className="flex gap-4">
                <button onClick={() => setOnboardingStep(4)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200">Back</button>
                <button onClick={handleOnboarding} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100">Finish Setup</button>
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
            onClick={() => setActiveTab('TAX_PLANNING')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2",
              activeTab === 'TAX_PLANNING' ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100/50" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Scale size={14} className={activeTab === 'TAX_PLANNING' ? "text-indigo-600" : "text-slate-400"} />
            Tax Planning
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
                  <Zap size={12} className="text-indigo-600" />
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Financial Health: {calculateHealthScore(totalStats, transactions)}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handleRecordSalary}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all no-print"
              >
                <Briefcase size={16} />
                Record Salary
              </button>
              <button 
                onClick={() => {
                  setIsAddingTransaction(true);
                  setEditingTransaction(null);
                  setSelectedCategory(DEFAULT_CATEGORIES[0].name);
                }}
                className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-100 hover:bg-slate-800 transition-all no-print"
              >
                <Plus size={16} />
                New Entry
              </button>
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
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cash on Hand</p>
                 </div>
                 <div>
                   <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(totalStats.cashOnHand)}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Liquid: {formatCurrency(totalStats.totalAssetsLiquid)}</p>
                 </div>
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

             <div className="flex-1 min-w-[180px] bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm text-left flex flex-col justify-between group cursor-pointer" onClick={() => setActiveTab('TAX_PLANNING')}>
                <div>
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Scale size={20} />
                  </div>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Income Tax Est.</p>
                </div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(totalStats.taxEstimated / 12)} <span className="text-[10px] text-slate-400">/mo</span></p>
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
            {/* Monthly Budget Progress Section */}
            <div className="col-span-12 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
                  <TrendingUp className="absolute -right-6 -top-6 w-48 h-48 text-white/10 group-hover:scale-110 transition-all duration-700" />
                  <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center shrink-0 border border-white/20">
                    <Calculator size={36} />
                  </div>
                  <div className="flex-1 w-full relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="w-2 h-2 bg-indigo-300 rounded-full animate-pulse" />
                       <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Executive Budget Pulse</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                       <div>
                          <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Target</p>
                          <p className="text-2xl font-black">{formatCurrency(totalRequiredAmount)}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Completed</p>
                          <p className="text-2xl font-black">{formatCurrency(reportStats.expenses + reportStats.investments)}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Available</p>
                          <p className="text-2xl font-black">{formatCurrency(Math.max(0, totalRequiredAmount - (reportStats.expenses + reportStats.investments)))}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Usage</p>
                          <p className="text-2xl font-black">{Math.min(100, Math.round(((reportStats.expenses + reportStats.investments) / (totalRequiredAmount || 1)) * 100))}%</p>
                       </div>
                    </div>
                    <div className="mt-8 bg-indigo-500/50 h-2.5 rounded-full overflow-hidden border border-indigo-400">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, ((reportStats.expenses + reportStats.investments) / (totalRequiredAmount || 1)) * 100)}%` }}
                        className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                       />
                    </div>
                  </div>
               </div>
            </div>

            {/* Asset Reminders & Maturity Alerts */}
            {allAlerts.length > 0 && (
              <div className="col-span-12 mb-6">
                <div className="space-y-3">
                  {allAlerts.map(alert => (
                    <motion.div 
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "p-4 border rounded-2xl flex items-center gap-4",
                        alert.alertType === 'FD_MATURITY' ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        alert.alertType === 'FD_MATURITY' ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"
                      )}>
                        {alert.alertType === 'FD_MATURITY' ? <CalendarIcon size={20} /> : <FileText size={20} />}
                      </div>
                      <div className="flex-1">
                        <p className={cn(
                          "text-sm font-black uppercase tracking-tight",
                          alert.alertType === 'FD_MATURITY' ? "text-amber-900" : "text-rose-900"
                        )}>
                          {alert.alertType === 'FD_MATURITY' ? 'FD Maturity Alert' : 'Insurance Renewal Alert'}: {alert.name}
                        </p>
                        <p className={cn(
                          "text-xs font-bold",
                          alert.alertType === 'FD_MATURITY' ? "text-amber-600" : "text-rose-600"
                        )}>
                          {alert.alertType === 'FD_MATURITY' 
                            ? `This FD is maturing on ${format(parseISO((alert as any).maturityDate!), 'dd MMM yyyy')} (${(alert as any).daysLeft} days left).` 
                            : `The policy renewal for ${(alert as any).insuranceCompany || alert.name} is due on ${format(parseISO((alert as any).renewalDate!), 'dd MMM yyyy')} (${(alert as any).daysLeft} days left).`}
                        </p>
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
                    <div className="bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          totalStats.budgetRules.needs > 50 ? "bg-rose-500" : "bg-indigo-500"
                        )}
                        style={{ width: `${Math.min(100, (totalStats.budgetRules.needs / 50) * 100)}%` }}
                      />
                    </div>
                    <div className="bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          totalStats.budgetRules.wants > 30 ? "bg-rose-500" : "bg-amber-400"
                        )}
                        style={{ width: `${Math.min(100, (totalStats.budgetRules.wants / 30) * 100)}%` }}
                      />
                    </div>
                    <div className="bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-400 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(100, (totalStats.budgetRules.savings / 20) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-indigo-300">Needs (50%)</span>
                        <span className="text-sm font-black">{Math.round(totalStats.budgetRules.needs)}%</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-amber-300">Wants (30%)</span>
                        <span className={cn(
                          "text-sm font-black",
                          totalStats.budgetRules.wants > 30 ? "text-rose-400" : "text-amber-400"
                        )}>{Math.round(totalStats.budgetRules.wants)}%</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-emerald-300">Savings (20%)</span>
                        <span className="text-sm font-black text-emerald-400">{Math.round(totalStats.budgetRules.savings)}%</span>
                     </div>
                  </div>
                </div>
              </div>
            </div>

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
                    <Zap size={32} className="text-indigo-100 mx-auto mb-3" />
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
                      <Wallet size={24} className="text-indigo-600" />
                    </div>
                    <h3 className="font-black text-xl text-slate-900 tracking-tight mb-2">Portfolio Overview</h3>
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
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => setEditingAsset(asset)}
                                    className="p-1.5 text-slate-300 hover:text-indigo-500 transition-all rounded-full hover:bg-indigo-50 group-hover:bg-white/50"
                                  >
                                    <History size={14} />
                                  </button>
                                  <button 
                                    onClick={() => setAssets(prev => prev.filter(a => a.id !== asset.id))}
                                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-all rounded-full hover:bg-rose-50 group-hover:bg-white/50"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
                                <div className="bg-white/30 rounded-xl p-3 border border-white/50">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                                    {asset.type === 'INSURANCE' ? 'Sum Assured' : (asset.type === 'RD' ? 'Monthly Installment' : 'Investment')}
                                  </p>
                                  <p className="text-md font-black text-slate-900 tracking-tight">
                                    {formatCurrency(asset.type === 'INSURANCE' && asset.sumAssured ? asset.sumAssured : asset.investedAmount)}
                                  </p>
                                </div>
                                {asset.type === 'INSURANCE' ? (
                                  <div className="flex gap-2">
                                    <div className="flex-1 bg-white/30 rounded-xl p-3 border border-white/50">
                                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Total amount paid as a premium</p>
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

                              {/* Asset specific timelines */}
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
                                    <div className="mt-2 pt-2 border-t border-slate-100/30 space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Est. Maturity Amount</span>
                                        <span className="text-[9px] font-black text-amber-600">{formatCurrency(asset.maturityAmount)}</span>
                                      </div>
                                      {['RD', 'FD'].includes(asset.type) && (
                                        <button 
                                          onClick={() => setIsToppingUpAsset(asset)}
                                          className="w-full py-1.5 bg-amber-100/50 hover:bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-1"
                                        >
                                          <Plus size={10} />
                                          Top-up RD/FD
                                        </button>
                                      )}
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

                              {/* Policy Details & Notes */}
                              {(asset.policyNumber || asset.renewalDate || asset.notes) && (
                                <div className="mb-4 pt-4 border-t border-white/30 space-y-2 relative z-10">
                                  <div className="grid grid-cols-2 gap-2">
                                    {asset.policyNumber && (
                                      <div className="bg-white/40 rounded-lg p-2 border border-white/60">
                                        <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Policy No.</p>
                                        <p className="text-[9px] font-black text-slate-800 tracking-tighter truncate">{asset.policyNumber}</p>
                                      </div>
                                    )}
                                    {asset.renewalDate && (
                                      <div className="bg-rose-50/40 rounded-lg p-2 border border-rose-100/60">
                                        <p className="text-[7px] font-black uppercase tracking-widest text-rose-400 mb-0.5">Next Renewal</p>
                                        <p className="text-[9px] font-black text-rose-600 tracking-tighter">
                                          {format(parseISO(asset.renewalDate), 'dd MMM yy')}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  {asset.notes && (
                                    <div className="bg-slate-50/40 rounded-xl p-2 border border-slate-100/60">
                                      <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Notes</p>
                                      <p className="text-[9px] font-medium text-slate-600 leading-tight italic line-clamp-2">"{asset.notes}"</p>
                                    </div>
                                  )}
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
                         <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                               <Pie
                                 data={['MUTUAL_FUND', 'STOCK', 'FD', 'RD', 'INSURANCE', 'GOLD', 'SILVER', 'OTHER'].map(type => ({
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
                            <Zap size={12} className="text-indigo-400" />
                          </div>
                          <div className="space-y-4">
                            {[
                              { name: 'Equity (High Growth)', key: 'equity', color: 'bg-indigo-500', target: 50 },
                              { name: 'Stability (Debt/FD)', key: 'debt', color: 'bg-amber-500', target: 30 },
                              { name: 'Safety (Gold/Cash)', key: 'safe', color: 'bg-emerald-500', target: 20 }
                            ].map(cat => {
                              const totalVal = assets.reduce((s, a) => s + (a.currentValue || a.investedAmount), 0);
                              const eq = assets.filter(a => ['STOCK', 'MUTUAL_FUND', 'CRYPTO'].includes(a.type)).reduce((s, a) => s + (a.currentValue || a.investedAmount), 0);
                              const dbt = assets.filter(a => ['FD', 'PPF_EPF'].includes(a.type)).reduce((s, a) => s + (a.currentValue || a.investedAmount), 0);
                              const sf = totalStats.cashOnHand + assets.filter(a => ['GOLD', 'SILVER'].includes(a.type)).reduce((s, a) => s + (a.currentValue || a.investedAmount), 0);
                              const whl = totalVal + totalStats.cashOnHand;
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
                                       <div className={cn("h-full transition-all duration-1000", cat.color)} style={{ width: `${Math.min(100, (cP / Math.max(100, cP)) * 100)}%` }} />
                                    </div>
                                    <span className={cn(
                                      "text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                      Math.abs(d) < 5 ? "bg-emerald-50 text-emerald-600" : 
                                      d > 5 ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"
                                    )}>
                                      {d > 5 ? `SELL` : d < -5 ? `BUY` : 'OK'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 text-center">Portfolio Valuation</p>
                          <p className="text-3xl font-black text-center text-indigo-900">{formatCurrency(assets.reduce((sum, a) => sum + (a.currentValue || a.investedAmount), 0) + totalStats.cashOnHand)}</p>
                       </div>
                     </div>
              </div>
           </div>
        </div>
        ) : activeTab === 'BUDGETS' ? (
          <div className="col-span-12 flex flex-col gap-8 max-w-5xl mx-auto w-full">
            {/* Live Tracking Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="md:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                  <div className="relative z-10 flex flex-col h-full justify-between">
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 mb-1">Current Month Progress</p>
                        <h2 className="text-3xl font-black mb-6">Budget Analytics</h2>
                     </div>
                     <div className="space-y-4">
                        <div className="flex justify-between items-end">
                           <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Spent (Budgeted Categories)</p>
                              <p className="text-2xl font-black text-white">{formatCurrency(Object.entries(currentMonthCategorySpending).filter(([cat]) => budgets[cat] > 0).reduce((s, [, a]) => s + a, 0))}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Monthly Limit</p>
                              <p className="text-lg font-black text-indigo-300">{formatCurrency(totalRequiredAmount)}</p>
                           </div>
                        </div>
                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${Math.min(100, (Object.entries(currentMonthCategorySpending).filter(([cat]) => budgets[cat] > 0).reduce((s, [, a]) => s + a, 0) / (totalRequiredAmount || 1)) * 100)}%` }}
                             className={cn(
                               "h-full rounded-full transition-all duration-1000",
                               (Object.entries(currentMonthCategorySpending).filter(([cat]) => budgets[cat] > 0).reduce((s, [, a]) => s + a, 0) / (totalRequiredAmount || 1)) > 1 ? "bg-rose-500" : "bg-indigo-500"
                             )}
                           />
                        </div>
                     </div>
                  </div>
               </div>
               
               <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                       <Target size={24} />
                    </div>
                    <h3 className="font-black text-lg text-slate-800 tracking-tight">Financial Shield</h3>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed mt-2">
                       You've budgeted for {Object.keys(budgets).filter(k => budgets[k] > 0).length} categories. Tracking these helps prevent lifestyle inflation.
                    </p>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-50">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Accountability Score</span>
                     <p className="text-xl font-black text-slate-900 mt-1">
                        {Math.max(0, 100 - Math.round((Object.entries(currentMonthCategorySpending).filter(([cat]) => budgets[cat] > 0).reduce((s, [, a]) => s + a, 0) / (totalRequiredAmount || 1)) * 50))}%
                     </p>
                  </div>
               </div>
            </div>

            {/* Category Performance */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
               <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                  <PieChartIcon size={20} className="text-indigo-600" />
                  Live Spending vs Budget
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DEFAULT_CATEGORIES.filter(c => budgets[c.name] > 0).map(cat => {
                    const spent = currentMonthCategorySpending[cat.name] || 0;
                    let budget = budgets[cat.name];
                    if (cat.name === 'Property Tax Yearly once' || cat.name === 'Insurance Premiums') {
                      budget = budget / 12;
                    }
                    const perc = (spent / (budget || 1)) * 100;
                    const isOver = spent > budget;

                    return (
                      <div key={cat.name} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all">
                         <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                               <span className="text-xl">{cat.icon}</span>
                               <div>
                                  <p className="text-xs font-black text-slate-700">{cat.name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                     {formatCurrency(spent)} of {formatCurrency(budget)}
                                  </p>
                               </div>
                            </div>
                            <span className={cn(
                               "text-[10px] font-black px-2 py-0.5 rounded-lg",
                               isOver ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                            )}>
                               {isOver ? `Over by ${formatCurrency(spent - budget)}` : `${Math.round(100 - perc)}% Left`}
                            </span>
                         </div>
                         <div className="w-full h-1.5 bg-white/50 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, perc)}%` }}
                              className={cn(
                                "h-full rounded-full",
                                isOver ? "bg-rose-500" : perc > 80 ? "bg-amber-400" : "bg-indigo-500"
                              )}
                            />
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>

            {/* Manage Budget Limits (Original UI) */}
            <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-slate-100 shadow-sm w-full">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                     <Calculator size={20} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Budget Planner</h3>
                    <p className="text-slate-500 text-xs font-medium">Fine-tune your monthly allocations and yearly prorations.</p>
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
               
               <div className="mt-12 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shrink-0 shadow-sm border border-emerald-100">
                     <TrendingDown size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-800 mb-1">Tax Optimized Budgets</p>
                    <p className="text-xs text-emerald-600/80 leading-relaxed font-medium">
                      Budgets marked with <span className="font-bold">Yearly Prorated</span> help you save exactly for large annual dues like Property Tax and Insurances. You can also plan your 80C investments in the <span className="font-black underline cursor-pointer" onClick={() => setActiveTab('TAX_PLANNING')}>Tax Planning</span> section.
                    </p>
                  </div>
               </div>
            </div>
          </div>
        ) : activeTab === 'TAX_PLANNING' ? (
          <div className="col-span-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <TaxEngine />
          </div>
        ) : activeTab === 'SETTINGS' ? (
          <div className="col-span-12 flex flex-col gap-8">
            <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-slate-100 shadow-sm max-w-4xl mx-auto w-full">
              <h2 className="text-3xl font-black text-slate-800 mb-2">App Settings</h2>
              <p className="text-slate-500 mb-10 font-medium tracking-tight">Personalize your tracking options, payment modes, and profile.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* My Income Source (Renamed from Payment Modes) */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <CreditCard size={20} />
                    </div>
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">My Income Source</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {modeOptions.map(mode => (
                      <div key={mode} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                        <span className="text-sm font-bold text-slate-700">{mode}</span>
                        <button 
                          onClick={() => setModeOptions(prev => prev.filter(m => m !== mode))}
                          className="p-1 text-slate-300 hover:text-rose-500 transition-all"
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
                          className="p-1 text-slate-300 hover:text-rose-500 transition-all"
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
                          if (type === 'RD') {
                            extraData.monthlyInstallment = parseFloat(formData.get('monthlyInstallment') as string) || 0;
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

                      {settingsSourceType === 'RD' && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Monthly Installment (₹)</label>
                          <input required name="monthlyInstallment" type="number" step="0.01" placeholder="Ex. 5000" className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none" />
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
                          Export XLSX
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
              budgets={budgets}
              currentMonthCategorySpending={currentMonthCategorySpending}
              onEditTransaction={(item) => {
                setEditingTransaction(item);
                setIsAddingTransaction(true);
                setSelectedCategory(item.category);
                setSelectedMode(item.mode);
              }}
              onAddTransaction={() => {
                setIsAddingTransaction(true);
                setEditingTransaction(null);
                setSelectedCategory(DEFAULT_CATEGORIES[0].name);
                setSelectedMode(modeOptions[0] || 'Other');
              }}
              onRecordSalary={handleRecordSalary}
              onExportExcel={() => downloadReport(dateRange.start, dateRange.end, 'Transactions Export')}
            />
          </div>
        ) : null}
      </main>


      {/* Add/Edit Transaction Modal */}
      <AnimatePresence>
        {isAddingTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              key={editingTransaction?.id || 'new'}
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
                  const type = formData.get('type') as TransactionType;
                  
                  // Logic for specific categories
                  let category = (cat === 'Other Expense' || cat === 'Other EMI') ? (formData.get('customCategory') as string || formData.get('details') as string || cat) : cat;
                  let title = formData.get('title') as string;
                  let date = formData.get('date') as string;
                  const details = formData.get('details') as string || '';
                  const whom = selectedWhom === 'Add New...' ? (formData.get('customWhom') as string || selectedWhom) : selectedWhom;
                  const mode = selectedMode === 'Add New...' ? (formData.get('customMode') as string || selectedMode) : selectedMode;
                  const source = selectedSource === 'Add New...' ? (formData.get('customSource') as string || selectedSource) : selectedSource;

                  if (category === 'Salary') {
                    title = 'Salary';
                    const now = new Date();
                    date = getLastWorkingDayOfMonth(now.getFullYear(), now.getMonth());
                  }

                  const transactionData = {
                    title,
                    amount: parseFloat(formData.get('amount') as string),
                    type,
                    category,
                    whom,
                    mode,
                    source,
                    date,
                    isRecurring: false,
                    details
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
                          checked={selectedType === opt.val}
                          onChange={() => {
                            setSelectedType(opt.val as any);
                            const firstMatch = DEFAULT_CATEGORIES.find(c => c.type === opt.val);
                            if (firstMatch) setSelectedCategory(firstMatch.name);
                          }}
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

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Description</label>
                      <input 
                        required
                        name="title"
                        type="text" 
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Ex. Starbucks Coffee"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-semibold text-sm"
                      />
                    </div>

                    {selectedCategory === 'Other EMI' && (
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">EMI Details</label>
                         <input 
                          required
                          name="details"
                          type="text" 
                          defaultValue={editingTransaction?.details || ''}
                          placeholder="Ex. Laptop Loan"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-semibold text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Amount (₹)</label>
                      <input 
                        required
                        name="amount"
                        type="number" 
                        step="0.01"
                        defaultValue={editingTransaction?.amount || ''}
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
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
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
                      {categories.map(group => {
                        const filteredSubs = group.subCategories.filter(c => c.type === selectedType);
                        if (filteredSubs.length === 0) return null;
                        return (
                          <optgroup key={group.mainCategory} label={group.mainCategory}>
                            {filteredSubs.map(c => (
                              <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
                            ))}
                          </optgroup>
                        );
                      })}
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
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Payment Mode</label>
                      <select 
                        name="mode"
                        value={selectedMode}
                        onChange={(e) => setSelectedMode(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-semibold appearance-none text-sm"
                      >
                        {modeOptions.map(m => <option key={m} value={m}>{m}</option>)}
                        <option value="Add New...">+ Add New...</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">To / Whom</label>
                      <select 
                        name="whom"
                        value={selectedWhom}
                        onChange={(e) => setSelectedWhom(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-semibold appearance-none text-sm"
                      >
                         {whomOptions.map(p => <option key={p} value={p}>{p}</option>)}
                        <option value="Add New...">+ Add New...</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Source Account</label>
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

      {/* Add/Edit Asset Modal */}
      <AnimatePresence>
        {(isAddingAsset || editingAsset) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-800">{editingAsset ? 'Edit Asset' : 'Add Asset'}</h2>
                  <button 
                    onClick={() => {setIsAddingAsset(false); setEditingAsset(null); setFormUnitPrice(''); setFormQuantity(''); setFormInvestedAmount('');}}
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
                  
                  const assetData: Omit<Asset, 'id' | 'lastUpdated'> = {
                    name: formData.get('name') as string,
                    type: formData.get('type') as AssetType,
                    investedAmount,
                    currentValue: investedAmount,
                    unitPrice,
                    quantity,
                    platform: formData.get('platform') as string,
                    source: selectedAssetSource,
                    details: selectedAssetType === 'OTHER' ? formData.get('details') as string : undefined,
                    insuranceType: formData.get('insuranceType') as InsuranceType || undefined,
                    insuranceCompany: selectedInsuranceCompany === 'Add New...' ? (formData.get('customInsurance') as string || selectedInsuranceCompany) : selectedInsuranceCompany,
                    sumAssured: formData.get('sumAssured') ? parseFloat(formData.get('sumAssured') as string) : undefined,
                    dateOfIssue: formData.get('dateOfIssue') as string || undefined,
                    paymentDuration: formData.get('paymentDuration') ? parseInt(formData.get('paymentDuration') as string) : undefined,
                    yearsPaid: formData.get('yearsPaid') ? parseInt(formData.get('yearsPaid') as string) : undefined,
                    startDate: assetStartDate || undefined,
                    endDate: assetEndDate || undefined,
                    tenureMonths: assetTenureMonths ? parseInt(assetTenureMonths) : undefined,
                    roi: assetROI ? parseFloat(assetROI) : undefined,
                    maturityAmount: formMaturityAmount ? parseFloat(formMaturityAmount) : (formData.get('maturityAmount') ? parseFloat(formData.get('maturityAmount') as string) : undefined),
                    premiumFrequency: formData.get('premiumFrequency') as any || undefined,
                    policyNumber: formData.get('policyNumber') as string || undefined,
                    renewalDate: formData.get('renewalDate') as string || undefined,
                    notes: formData.get('notes') as string || undefined,
                  };

                  if (editingAsset) {
                    updateAsset({ ...assetData, id: editingAsset.id, lastUpdated: new Date().toISOString(), topups: editingAsset.topups });
                  } else {
                    addAsset(assetData);
                  }

                  setIsAddingAsset(false);
                  setEditingAsset(null);
                  setFormUnitPrice('');
                  setFormQuantity('');
                  setFormInvestedAmount('');
                }} className="space-y-4">
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

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Asset Name*</label>
                      <input required name="name" type="text" placeholder={selectedAssetType === 'STOCK' ? "Ex. Reliance Industries" : "Ex. Nifty 50 Index Fund"} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm focus:border-indigo-300 transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Source Account*</label>
                      <select 
                        required 
                        name="source" 
                        value={selectedAssetSource}
                        onChange={(e) => setSelectedAssetSource(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm focus:border-indigo-300 transition-colors"
                      >
                        <option value="" disabled>Select Source Account*</option>
                        {sources.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Platform / Broker*</label>
                      <input required name="platform" type="text" placeholder="Ex. Groww, Zerodha, Bank" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm focus:border-indigo-300 transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">
                        {selectedAssetType === 'INSURANCE' ? "Total amount paid as a premium (₹)*" : "Total Amount Invested (₹)*"}
                      </label>
                      <input 
                        required 
                        name="investedAmount" 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        value={formInvestedAmount}
                        onChange={(e) => handleInvestedAmountChange(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm focus:border-indigo-300 transition-colors"
                      />
                    </div>
                  </div>


                  {['STOCK', 'MUTUAL_FUND', 'GOLD', 'SILVER', 'ULIPS'].includes(selectedAssetType) && (
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
                          onChange={(e) => handleQuantityChange(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl outline-none font-semibold text-sm focus:border-indigo-300 transition-colors" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">
                          {['GOLD', 'SILVER'].includes(selectedAssetType) ? "Price (per Gram) (₹)*" : "Avg. Unit Price (₹)*"}
                        </label>
                        <input 
                          required 
                          name="unitPrice" 
                          type="number" 
                          step="0.01" 
                          placeholder={['GOLD', 'SILVER'].includes(selectedAssetType) ? "Ex. 7500" : (selectedAssetType === 'STOCK' || selectedAssetType === 'ULIPS' ? "Ex. 2500" : "Ex. 5000")} 
                          value={formUnitPrice}
                          onChange={(e) => handleUnitPriceChange(e.target.value)}
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
                        <select 
                          required 
                          name="insuranceType" 
                          defaultValue="HEALTH"
                          className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none font-semibold text-sm focus:border-rose-300 transition-colors text-slate-900"
                        >
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
                          <select 
                            required 
                            name="insuranceCompany" 
                            value={selectedInsuranceCompany}
                            onChange={(e) => setSelectedInsuranceCompany(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none font-semibold text-sm focus:border-rose-300 transition-colors text-slate-900"
                          >
                            {insuranceCompanyOptions.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="Add New...">+ Add New...</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Sum Assured (₹)*</label>
                          <input required name="sumAssured" type="number" step="0.01" placeholder="Ex. 50,00,000" className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none font-semibold text-sm focus:border-rose-300 transition-colors" />
                        </div>
                      </div>

                      {selectedInsuranceCompany === 'Add New...' && (
                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Company Name*</label>
                          <input 
                            required 
                            name="customInsurance" 
                            type="text" 
                            value={customInsuranceCompany}
                            onChange={(e) => setCustomInsuranceCompany(e.target.value)}
                            placeholder="Ex. LIC, HDFC Ergo" 
                            className="w-full px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl outline-none font-semibold text-sm focus:border-rose-300 transition-colors" 
                          />
                        </motion.div>
                      )}

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
                        <select 
                          required 
                          name="premiumFrequency" 
                          defaultValue="YEARLY"
                          className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none font-semibold text-sm focus:border-rose-300 transition-colors text-slate-900"
                        >
                          <option value="YEARLY">Yearly</option>
                          <option value="HALF_YEARLY">Half-Yearly</option>
                          <option value="QUARTERLY">Quarterly</option>
                          <option value="MONTHLY">Monthly</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Policy Number</label>
                          <input name="policyNumber" type="text" placeholder="Ex. POL12345678" className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none font-semibold text-sm focus:border-rose-300 transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Renewal/Expiry Date</label>
                          <input name="renewalDate" type="date" className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none font-semibold text-sm focus:border-rose-300 transition-colors" />
                        </div>
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
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Tenure (Mos)</label>
                          <input 
                            name="tenureMonths" 
                            type="number" 
                            placeholder="Ex. 12" 
                            value={assetTenureMonths}
                            onChange={(e) => setAssetTenureMonths(e.target.value)}
                            className="w-full px-2 py-3 bg-white border border-amber-200 rounded-xl outline-none font-semibold text-xs focus:border-amber-300 transition-colors" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Interest Rate (% ROI)</label>
                          <input 
                            name="roi" 
                            type="number" 
                            step="0.01"
                            placeholder="Ex. 7.1" 
                            value={assetROI}
                            onChange={(e) => setAssetROI(e.target.value)}
                            className="w-full px-2 py-3 bg-white border border-amber-200 rounded-xl outline-none font-semibold text-xs focus:border-amber-300 transition-colors" 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Start Date*</label>
                          <input 
                            required 
                            name="startDate" 
                            type="date" 
                            value={assetStartDate}
                            onChange={(e) => setAssetStartDate(e.target.value)}
                            className="w-full px-2 py-3 bg-white border border-amber-200 rounded-xl outline-none font-semibold text-xs focus:border-amber-300 transition-colors" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Maturity Date*</label>
                          <input 
                            required 
                            name="endDate" 
                            type="date" 
                            value={assetEndDate}
                            onChange={(e) => setAssetEndDate(e.target.value)}
                            className="w-full px-2 py-3 bg-white border border-amber-200 rounded-xl outline-none font-semibold text-xs focus:border-amber-300 transition-colors" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Maturity Amount (₹)</label>
                          <input 
                            name="maturityAmount" 
                            type="number" 
                            step="0.01" 
                            placeholder="Amount at end" 
                            value={formMaturityAmount}
                            onChange={(e) => setFormMaturityAmount(e.target.value)}
                            className="w-full px-2 py-3 bg-white border border-amber-200 rounded-xl outline-none font-semibold text-xs focus:border-amber-300 transition-colors" 
                          />
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

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Notes / Policy Ref (Optional)</label>
                    <textarea 
                      name="notes" 
                      rows={2}
                      placeholder="Ex. Stored in blue folder, Policy Ref: 123-ABC" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm focus:border-indigo-300 transition-colors resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all mt-4"
                  >
                    {editingAsset ? 'Update Asset' : 'Save Asset'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top-up Modal */}
      <AnimatePresence>
        {isToppingUpAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Top-up Asset</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{isToppingUpAsset.name}</p>
                  </div>
                  <button 
                    onClick={() => setIsToppingUpAsset(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={24} className="text-slate-400" />
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (topupAmount) {
                    addTopUp(isToppingUpAsset.id, parseFloat(topupAmount), topupDate);
                  }
                }} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Top-up Amount (₹)*</label>
                    <input 
                      required 
                      type="number" 
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="0.00" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-lg focus:border-indigo-300 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Top-up Date*</label>
                    <input 
                      required 
                      type="date" 
                      value={topupDate}
                      onChange={(e) => setTopupDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm focus:border-indigo-300 transition-colors"
                    />
                  </div>

                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <div className="flex gap-3">
                      <AlertCircle size={18} className="text-amber-600 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Calculation Note</p>
                        <p className="text-[10px] font-medium text-amber-700 leading-relaxed">
                          The extra interest will be calculated from the top-up date until the maturity date ({isToppingUpAsset.endDate}) at the current ROI ({isToppingUpAsset.roi}%).
                        </p>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                  >
                    Confirm Top-up
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
