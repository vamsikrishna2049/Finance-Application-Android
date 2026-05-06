export type TransactionType = 'INCOME' | 'EXPENSE';
export type AssetType = 'MUTUAL_FUND' | 'STOCK' | 'FD' | 'RD' | 'INSURANCE' | 'GOLD' | 'CASH' | 'OTHER';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  investedAmount: number;
  currentValue: number;
  institution: string;
  lastUpdated: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  whom: string;
  mode: string;
}

export interface UserProfile {
  name: string;
  initialBalance: number;
  onboarded: boolean;
}
