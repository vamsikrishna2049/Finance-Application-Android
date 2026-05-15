import { format, isWithinInterval, parseISO, startOfDay, addMonths, differenceInDays } from 'date-fns';
import * as XLSX from 'xlsx';
import { Transaction, Asset, UserProfile, FinanceSource } from '../types';
import { FLAT_CATEGORIES } from '../categories';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
};

export const filterAssets = (assets: Asset[], searchQuery: string) => {
  if (!searchQuery) return assets;
  const q = searchQuery.toLowerCase();
  return assets.filter(a => 
    a.name.toLowerCase().includes(q) || 
    a.type.toLowerCase().includes(q) ||
    (a.details && a.details.toLowerCase().includes(q))
  );
};

export const filterTransactions = (transactions: Transaction[], dateRange: { start: string; end: string }, searchQuery: string) => {
  return transactions.filter(t => {
    // String comparison is safer for yyyy-MM-dd format to avoid offset/time issues
    const inDateRange = t.date >= dateRange.start && t.date <= dateRange.end;
    
    const matchesSearch = searchQuery === '' || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.whom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.source && t.source.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return inDateRange && matchesSearch;
  });
};

export const calculateTotalStats = (transactions: Transaction[], assets: Asset[], user: UserProfile | null, sources: FinanceSource[] = []) => {
  const income = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Total expenses are EXPENSE + EMI
  const activeExpenses = transactions
    .filter(t => t.type === 'EXPENSE' || t.type === 'EMI')
    .reduce((sum, t) => sum + t.amount, 0);

  // Total money moved to investments via transactions
  const txInvestments = transactions
    .filter(t => t.type === 'INVESTMENT')
    .reduce((sum, t) => sum + t.amount, 0);

  // Source balances (Liquid Cash/Bank/Debt)
  const sourceBalances = calculateSourceBalances(transactions, sources);
  
  const totalAssetsLiquid = sourceBalances
    .filter(s => s.currentBalance > 0)
    .reduce((sum, s) => sum + s.currentBalance, 0);

  const cashOnHand = sourceBalances
    .filter(s => (s.type === 'BANK' || s.type === 'WALLET') && s.currentBalance > 0)
    .reduce((sum, s) => sum + s.currentBalance, 0);
    
  const totalLiabilities = sourceBalances
    .filter(s => s.currentBalance < 0)
    .reduce((sum, s) => sum + Math.abs(s.currentBalance), 0);

  const liquidBalance = totalAssetsLiquid - totalLiabilities;

  // Total current value of tracked assets
  const assetValue = assets.reduce((sum, a) => sum + (a.currentValue || a.investedAmount), 0);
  
  const netWorth = liquidBalance + assetValue;

  return { 
    income, 
    expenses: activeExpenses, 
    liquidBalance, 
    totalLiabilities,
    totalAssetsLiquid,
    cashOnHand,
    netWorth, 
    investmentsTotal: assetValue,
    monthlyInvestments: txInvestments,
    taxEstimated: estimateTax(income * 12), // Annualized tax estimate
    dtiRatio: income > 0 ? (totalLiabilities / income) * 100 : 0,
    budgetRules: {
      needs: income > 0 ? (transactions.filter(t => {
        const catInfo = FLAT_CATEGORIES.find(c => c.name === t.category);
        return (t.type === 'EMI') || (t.type === 'EXPENSE' && (catInfo?.mainCategory === 'Essential Expenses' || catInfo?.mainCategory === 'Health & Security'));
      }).reduce((sum, t) => sum + t.amount, 0) / income) * 100 : 0,
      wants: income > 0 ? (transactions.filter(t => {
        const catInfo = FLAT_CATEGORIES.find(c => c.name === t.category);
        return (t.type === 'EXPENSE' && (catInfo?.mainCategory === 'Lifestyle & Travel' || catInfo?.mainCategory === 'Others' || !catInfo));
      }).reduce((sum, t) => sum + t.amount, 0) / income) * 100 : 0,
      savings: income > 0 ? (txInvestments / income) * 100 : 0
    },
    portfolioPerformance: assets.reduce((acc, a) => {
      const invested = a.investedAmount;
      const current = a.currentValue || invested;
      return {
        totalInvested: acc.totalInvested + invested,
        totalCurrent: acc.totalCurrent + current,
        gain: acc.gain + (current - invested)
      };
    }, { totalInvested: 0, totalCurrent: 0, gain: 0 })
  };
};

export const calculateSourceBalances = (transactions: Transaction[], sources: FinanceSource[]) => {
  return sources.map(source => {
    const sourceTxs = transactions.filter(t => t.source === source.name);
    const income = sourceTxs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const outflow = sourceTxs.filter(t => t.type !== 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    
    // For credit cards, balance is negative (debt) or adjusted by outstanding
    let currentBalance = source.initialBalance + income - outflow;
    if (source.type === 'CREDIT_CARD' && source.outstandingAmount) {
      currentBalance -= source.outstandingAmount;
    }

    return {
      ...source,
      currentBalance
    };
  });
};

export const checkFDMaturities = (sources: FinanceSource[]) => {
  const fds = sources.filter(s => s.type === 'FD' && s.maturityDate);
  const now = new Date();
  
  return fds.map(fd => {
    const maturity = parseISO(fd.maturityDate!);
    const daysLeft = differenceInDays(maturity, now);
    
    return {
      ...fd,
      daysLeft,
      isExpiringSoon: daysLeft >= 0 && daysLeft <= 30
    };
  }).filter(fd => fd.isExpiringSoon);
};

export const checkInsuranceRenewals = (assets: Asset[]) => {
  const insurances = assets.filter(a => a.type === 'INSURANCE' && a.renewalDate);
  const now = new Date();
  
  return insurances.map(ins => {
    const renewal = parseISO(ins.renewalDate!);
    const daysLeft = differenceInDays(renewal, now);
    
    return {
      ...ins,
      daysLeft,
      isExpiringSoon: daysLeft >= 0 && daysLeft <= 30
    };
  }).filter(ins => ins.isExpiringSoon);
};

export const getTopBeneficiaries = (transactions: Transaction[]) => {
  const beneficiaryMap: Record<string, { amount: number; count: number }> = {};
  
  transactions
    .filter(t => t.type !== 'INCOME' && t.whom !== 'Self')
    .forEach(t => {
      if (!beneficiaryMap[t.whom]) {
        beneficiaryMap[t.whom] = { amount: 0, count: 0 };
      }
      beneficiaryMap[t.whom].amount += t.amount;
      beneficiaryMap[t.whom].count += 1;
    });

  return Object.entries(beneficiaryMap)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
};

export const calculateReportStats = (filteredTransactions: Transaction[], assets: Asset[] = []) => {
  const income = filteredTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = filteredTransactions
    .filter(t => t.type === 'EXPENSE' || t.type === 'EMI')
    .reduce((sum, t) => sum + t.amount, 0);
  const investments = filteredTransactions
    .filter(t => t.type === 'INVESTMENT')
    .reduce((sum, t) => sum + t.amount, 0);

  // Total current value of tracked assets
  const assetValue = assets.reduce((sum, a) => sum + (a.currentValue || a.investedAmount), 0);
  const initialInvested = assets.reduce((sum, a) => sum + a.investedAmount, 0);

  return { 
    income, 
    expenses, 
    investments,
    assetSummary: {
      totalCurrent: assetValue,
      totalInvested: initialInvested,
      gain: assetValue - initialInvested
    },
    totalOutflow: expenses + investments
  };
};

export const getCategorySpending = (transactions: Transaction[]) => {
  const spendingMap: Record<string, number> = {};
  
  transactions
    .filter(t => t.type !== 'INCOME')
    .forEach(t => {
      spendingMap[t.category] = (spendingMap[t.category] || 0) + t.amount;
    });

  return Object.entries(spendingMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
};

export const generateExcelBlob = (transactions: Transaction[], assets: Asset[], sources: FinanceSource[]): Blob => {
  const wb = XLSX.utils.book_new();

  // 1. Transactions Sheet
  const txData = (transactions || []).map(t => ({
    Date: t.date || '',
    Title: t.title || '',
    Amount: t.amount || 0,
    Type: t.type || '',
    Category: t.category || '',
    Whom: t.whom || '',
    Mode: t.mode || '',
    Source: t.source || '',
    Details: t.details || ''
  }));
  const txSheet = XLSX.utils.json_to_sheet(txData);
  XLSX.utils.book_append_sheet(wb, txSheet, 'Transactions');

  // 2. Assets & Investments Sheet
  if (assets && assets.length > 0) {
    const assetData = assets.map(a => ({
      Name: a.name || '',
      Type: a.type || '',
      'Invested Amount': a.investedAmount || 0,
      'Current Value': a.currentValue || a.investedAmount || 0,
      'Last Updated': a.lastUpdated || '',
      Source: a.source || '',
      Details: a.details || ''
    }));
    const assetSheet = XLSX.utils.json_to_sheet(assetData);
    XLSX.utils.book_append_sheet(wb, assetSheet, 'Investments');
  }

  // 3. Accounts & Sources Sheet
  if (sources && sources.length > 0) {
    const sourceBalances = calculateSourceBalances(transactions || [], sources);
    const sourceData = sourceBalances.map(s => ({
      Name: s.name || '',
      Type: s.type || '',
      'Initial Balance': s.initialBalance || 0,
      'Current Balance': s.currentBalance || 0,
      'Outstanding (if CC)': s.outstandingAmount || 0,
      'Maturity (if FD)': s.maturityDate || ''
    }));
    const sourceSheet = XLSX.utils.json_to_sheet(sourceData);
    XLSX.utils.book_append_sheet(wb, sourceSheet, 'Accounts');
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const estimateTax = (annualIncome: number) => {
  // New Tax Regime Estimation (Standard basic approach)
  if (annualIncome <= 300000) return 0;
  let tax = 0;
  if (annualIncome > 1500000) {
    tax += (annualIncome - 1500000) * 0.30;
    tax += 300000 * 0.20;
    tax += 300000 * 0.15;
    tax += 300000 * 0.10;
    tax += 300000 * 0.05;
  } else if (annualIncome > 1200000) {
    tax += (annualIncome - 1200000) * 0.20;
    tax += 300000 * 0.15;
    tax += 300000 * 0.10;
    tax += 300000 * 0.05;
  } else if (annualIncome > 900000) {
    tax += (annualIncome - 900000) * 0.15;
    tax += 300000 * 0.10;
    tax += 300000 * 0.05;
  } else if (annualIncome > 600000) {
    tax += (annualIncome - 600000) * 0.10;
    tax += 300000 * 0.05;
  } else {
    tax += (annualIncome - 300000) * 0.05;
  }
  
  // Tax rebate for income up to 7L in new regime
  if (annualIncome <= 700000) return 0;
  
  // Health & Education Cess
  return tax * 1.04;
};

export const generateId = () => {
  return typeof crypto.randomUUID === 'function' 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const getLastWorkingDayOfMonth = (year: number, month: number, holidays: string[] = []) => {
  const lastDay = new Date(year, month + 1, 0);
  let result = lastDay;

  // Move back until it's a weekday and not a holiday
  while (true) {
    const day = result.getDay();
    const dateStr = format(result, 'yyyy-MM-dd');
    const isWeekend = day === 0 || day === 6;
    const isHoliday = holidays.includes(dateStr);

    if (!isWeekend && !isHoliday) {
      break;
    }
    result.setDate(result.getDate() - 1);
  }
  
  return format(result, 'yyyy-MM-dd');
};

export const getRecurringDateInMonth = (year: number, month: number, preferredDay: number) => {
  // preferredDay is 1-31
  // Create a date for the preferred day in that month
  // month is 0-indexed (Jan=0)
  const date = new Date(year, month, preferredDay);
  
  // If the object's month is the requested month, preferredDay exists
  if (date.getMonth() === month) {
    return format(date, 'yyyy-MM-dd');
  }
  
  // If not (e.g. Feb 30), get the last day of the target month
  const lastDay = new Date(year, month + 1, 0);
  return format(lastDay, 'yyyy-MM-dd');
};

export const groupTransactionsByDate = (transactions: Transaction[]) => {
  const groups: Record<string, Transaction[]> = {};
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');

  transactions.forEach(t => {
    let key = t.date;
    if (t.date === today) key = 'Today';
    else if (t.date === yesterday) key = 'Yesterday';
    else key = format(parseISO(t.date), 'dd MMM yyyy');

    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  return groups;
};

export const calculateHealthScore = (stats: any, transactions: Transaction[]) => {
  let score = 35; // Base stability score

  // 1. Savings Rate (Income vs Core Expenses) - Max 35 points
  // Target: 30%+ is excellent
  const savingsRate = stats.income > 0 ? ((stats.income - stats.expenses) / stats.income) : 0;
  if (savingsRate > 0) {
    score += Math.min(35, savingsRate * 100); 
  } else if (stats.income > 0) {
    score -= Math.min(30, Math.abs(savingsRate) * 50); // Significant penalty for deficit
  }

  // 2. Investment Discipline (Monthly Investment vs Income) - Max 25 points
  // Target: 15% of monthly income to investments
  // Note: we use monthlyInvestments calculated in calculateTotalStats or passed stats
  const monthlyInv = stats.monthlyInvestments || 0;
  const investmentRatio = stats.income > 0 ? (monthlyInv / stats.income) : 0;
  score += Math.min(25, investmentRatio * 100 * 1.6); // 15% = ~24 points

  // 3. Emergency Buffer (Liquid cash vs core monthly expenses) - Max 20 points
  // Target: 6 months coverage
  const monthlyExpense = stats.expenses || 5000;
  const coverageMonths = stats.liquidBalance / Math.max(monthlyExpense, 1);
  score += Math.min(20, coverageMonths * 3.33); // 6 months = 20 points

  // 4. Asset Diversification & Activity - Max 20 points
  const categoriesCount = new Set(transactions.map(t => t.category)).size;
  const assetTypesCount = typeof stats.investmentsTotal === 'number' && stats.investmentsTotal > 0 ? 10 : 0; // Simple check if they have assets
  
  if (categoriesCount > 8) score += 10;
  else if (categoriesCount > 4) score += 5;
  
  score += assetTypesCount; // Bonus for having a portfolio

  return Math.min(100, Math.max(0, Math.round(score)));
};

export const getNetWorthProjection = (currentNetWorth: number, monthlyIncome: number, monthlySavings: number, years: number = 10) => {
  const annualGrowthRate = 0.08; // Average 8% conservative growth
  const monthlyRate = annualGrowthRate / 12;
  const data = [];
  
  let balance = currentNetWorth;
  
  for (let month = 0; month <= years * 12; month++) {
    if (month % 12 === 0 || month === years * 12) {
      data.push({
        year: month / 12,
        netWorth: Math.round(balance),
        label: `${month / 12}y`
      });
    }
    balance = balance * (1 + monthlyRate) + monthlySavings;
  }
  
  return data;
};

export const simulateDebtPayoff = (debtName: string, principal: number, emi: number, extraPayment: number = 2000) => {
  const annualRate = 0.12; // Assuming average interest rate 12% for simulation if not provided
  const monthlyRate = annualRate / 12;
  
  const calculateMonths = (p: number, e: number) => {
    let balance = p;
    let months = 0;
    while (balance > 0 && months < 600) { // Safety break at 50 years
      const interest = balance * monthlyRate;
      if (interest >= e && e > 0) balance = balance + interest - e;
      else if (e > 0) balance = balance + interest - e;
      else return Infinity;
      
      if (balance <= 0) return months + 1;
      months++;
      if (months >= 600) return Infinity;
    }
    return months;
  };

  const standardMonths = calculateMonths(principal, emi);
  const acceleratedMonths = calculateMonths(principal, emi + extraPayment);
  
  const monthsSaved = (standardMonths !== Infinity && acceleratedMonths !== Infinity) ? standardMonths - acceleratedMonths : 0;
  const interestSaved = monthsSaved > 0 ? monthsSaved * emi : 0; // Rough interest saving estimate

  return {
    debtName,
    standardMonths,
    acceleratedMonths,
    monthsSaved,
    interestSaved
  };
};

export const getUpcomingRecurring = (transactions: Transaction[]) => {
  const recurring = transactions.filter(t => t.isRecurring);
  const now = startOfDay(new Date());
  
  const upcoming: (Transaction & { predictedDate: string; daysLeft: number })[] = [];

  recurring.forEach(t => {
    const txDate = parseISO(t.date);
    const dayOfMonth = txDate.getDate();
    
    // Check the next 14 days (wider window)
    for (let i = 0; i <= 14; i++) {
      const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      if (checkDate.getDate() === dayOfMonth) {
        upcoming.push({
          ...t,
          predictedDate: format(checkDate, 'yyyy-MM-dd'),
          daysLeft: i
        });
        break;
      }
    }
  });

  return upcoming.sort((a, b) => a.daysLeft - b.daysLeft);
};
