import { format, isWithinInterval, parseISO } from 'date-fns';
import { Transaction, Asset, UserProfile } from '../types';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const filterAssets = (assets: Asset[], searchQuery: string) => {
  if (!searchQuery) return assets;
  const q = searchQuery.toLowerCase();
  return assets.filter(a => 
    a.name.toLowerCase().includes(q) || 
    a.institution.toLowerCase().includes(q) || 
    a.type.toLowerCase().includes(q)
  );
};

export const filterTransactions = (transactions: Transaction[], dateRange: { start: string; end: string }, searchQuery: string) => {
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
};

export const calculateTotalStats = (transactions: Transaction[], assets: Asset[], user: UserProfile | null) => {
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
};

export const calculateReportStats = (filteredTransactions: Transaction[]) => {
  const income = filteredTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = filteredTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  return { income, expenses };
};

export const generateCSV = (transactions: Transaction[]) => {
  const headers = ['Date', 'Title', 'Amount', 'Type', 'Category', 'Whom', 'Mode'];
  const rows = transactions.map(t => [
    t.date,
    `"${t.title.replace(/"/g, '""')}"`,
    t.amount,
    t.type,
    t.category,
    t.whom,
    t.mode
  ]);

  return [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');
};

export const generateId = () => {
  return typeof crypto.randomUUID === 'function' 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2) + Date.now().toString(36);
};
