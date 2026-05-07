import { describe, it, expect } from 'vitest';
import { 
  formatCurrency, 
  filterAssets, 
  filterTransactions, 
  calculateTotalStats, 
  calculateReportStats,
  generateCSV,
  generateId
} from './financeUtils';
import { Transaction, Asset, UserProfile } from '../types';

describe('financeUtils', () => {
  const mockUser: UserProfile = {
    name: 'Test User',
    initialBalance: 1000,
    onboarded: true
  };

  const mockTransactions: Transaction[] = [
    {
      id: '1',
      title: 'Salary',
      amount: 5000,
      type: 'INCOME',
      category: 'Salary / Income',
      date: '2026-05-01',
      whom: 'Self',
      mode: 'SBI UPI'
    },
    {
      id: '2',
      title: 'Rent',
      amount: 2000,
      type: 'EXPENSE',
      category: 'House Rent',
      date: '2026-05-05',
      whom: 'Self',
      mode: 'Axis UPI'
    },
    {
      id: '3',
      title: 'Investment',
      amount: 1000,
      type: 'EXPENSE',
      category: 'Fixed Deposit (FD)',
      date: '2026-05-10',
      whom: 'Self',
      mode: 'SBI UPI'
    }
  ];

  const mockAssets: Asset[] = [
    {
      id: 'a1',
      name: 'Google Stock',
      institution: 'Zerodha',
      type: 'STOCK',
      currentValue: 3000,
      lastUpdated: '2026-05-01'
    }
  ];

  describe('formatCurrency', () => {
    it('formats numbers to INR correctly', () => {
      // Note: format results can vary slightly by environment, so we check for currency symbol and rounded value
      const result = formatCurrency(1234);
      expect(result).toContain('1,234');
      expect(result).toContain('₹');
    });
  });

  describe('filterAssets', () => {
    it('returns all assets when query is empty', () => {
      expect(filterAssets(mockAssets, '')).toHaveLength(1);
    });

    it('filters assets by name', () => {
      expect(filterAssets(mockAssets, 'google')).toHaveLength(1);
      expect(filterAssets(mockAssets, 'apple')).toHaveLength(0);
    });
  });

  describe('filterTransactions', () => {
    const range = { start: '2026-05-01', end: '2026-05-06' };

    it('filters transactions by date range', () => {
      const filtered = filterTransactions(mockTransactions, range, '');
      expect(filtered).toHaveLength(2); // Salary and Rent
    });

    it('filters transactions by search query', () => {
      const filtered = filterTransactions(mockTransactions, range, 'Rent');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Rent');
    });
  });

  describe('calculateTotalStats', () => {
    it('calculates total stats correctly', () => {
      const stats = calculateTotalStats(mockTransactions, mockAssets, mockUser);
      
      // Income: 5000
      // Active Expenses (Rent): 2000
      // Tx Investments (FD): 1000
      // Asset Value: 3000
      // User Initial: 1000
      
      // Liquid Balance = 1000 + 5000 - 2000 - 1000 = 3000
      expect(stats.liquidBalance).toBe(3000);
      
      // Total Investments = 1000 (FD) + 3000 (Asset) = 4000
      expect(stats.investmentsTotal).toBe(4000);
      
      // Net Worth = 3000 (Liquid) + 4000 (Investments) = 7000
      expect(stats.netWorth).toBe(7000);
    });
  });

  describe('calculateReportStats', () => {
    it('calculates filtered report stats', () => {
      const stats = calculateReportStats(mockTransactions.slice(0, 2));
      expect(stats.income).toBe(5000);
      expect(stats.expenses).toBe(2000);
    });
  });

  describe('generateCSV', () => {
    it('generates a valid CSV string', () => {
      const csv = generateCSV(mockTransactions.slice(0, 1));
      expect(csv).toContain('Date,Title,Amount,Type,Category,Whom,Mode');
      expect(csv).toContain('2026-05-01,"Salary",5000,INCOME,Salary / Income,Self,SBI UPI');
    });
  });

  describe('generateId', () => {
    it('generates a string ID', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(5);
    });
  });
});
