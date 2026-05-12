export type TransactionType = 'INCOME' | 'EXPENSE' | 'EMI' | 'INVESTMENT';
export type AssetType = 'MUTUAL_FUND' | 'STOCK' | 'FD' | 'RD' | 'INSURANCE' | 'GOLD' | 'SILVER' | 'ULIPS' | 'OTHER';
export type InsuranceType = 'HEALTH' | 'TERM' | 'BIKE' | 'CAR' | 'OTHER';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  investedAmount: number;
  currentValue?: number; // Kept for logic but removed from UI Add Asset per request
  unitPrice?: number;
  quantity?: number;
  details?: string;
  platform?: string;
  lastUpdated: string;
  // FD/RD specific fields
  startDate?: string;
  endDate?: string;
  maturityAmount?: number;
  tenureMonths?: number;
  // Insurance specific fields
  insuranceType?: InsuranceType;
  insuranceCompany?: string;
  sumAssured?: number;
  dateOfIssue?: string;
  paymentDuration?: number; // How many years need to pay
  yearsPaid?: number; // How many years paid
  premiumFrequency?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category: string;
  icon: string;
}

export interface Deduction {
  id: string;
  name: string;
  category: '80C' | '80D' | '80CCD_1B' | '80E' | '80G' | '80TTA' | '80TTB' | 'HRA' | 'SECTION_24' | 'OTHER';
  amount: number;
}

export interface TaxProfile {
  id: string;
  userId: string;
  assessmentYear: string;
  annualIncome: number;
  otherIncome: number;
  deductions: Deduction[];
  standardDeduction: number;
  lastUpdated: string;
}

export interface TaxCalculationResult {
  regime: 'OLD' | 'NEW';
  taxableIncome: number;
  taxAmount: number;
  cess: number;
  totalTax: number;
  slabs: { slab: string; rate: string; tax: number }[];
  effectiveRate: number;
}

export interface ReportStats {
  income: number;
  expenses: number;
  investments: number;
  assetSummary: {
    totalCurrent: number;
    totalInvested: number;
    gain: number;
  };
  totalOutflow: number;
}

export interface Budget {
  category: string;
  amount: number;
  period: 'MONTHLY';
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
  source: string;
  isRecurring?: boolean;
  recurringEndDate?: string;
}

export interface FinanceSource {
  id: string;
  name: string;
  type: 'BANK' | 'CREDIT_CARD' | 'WALLET' | 'OTHER' | 'FD' | 'RD';
  initialBalance: number;
  // FD specific
  tenureMonths?: number;
  initializationDate?: string;
  maturityDate?: string;
  // Credit Card specific
  outstandingAmount?: number;
  creditLimit?: number;
}

export interface UserProfile {
  name: string;
  initialBalance: number; // Overall legacy balance - might deprecate or use as aggregate
  onboarded: boolean;
}
