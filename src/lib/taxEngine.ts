import { TaxCalculationResult, TaxProfile, Deduction } from '../types';

// Configuration-driven tax rules to avoid hardcoding
const TAX_RULES = {
  '2026-27': {
    NEW: {
      standardDeduction: 75000,
      slabs: [
        { limit: 400000, rate: 0 },
        { limit: 400000, rate: 5 },
        { limit: 400000, rate: 10 },
        { limit: 400000, rate: 15 },
        { limit: 400000, rate: 20 },
        { limit: 400000, rate: 25 },
        { limit: Infinity, rate: 30 },
      ],
      rebateLimit: 1200000,
      maxRebate: 60000,
    },
    OLD: {
      standardDeduction: 50000,
      slabs: [
        { limit: 250000, rate: 0 },
        { limit: 250000, rate: 5 },
        { limit: 500000, rate: 20 },
        { limit: Infinity, rate: 30 },
      ],
      rebateLimit: 500000,
      maxRebate: 12500,
    }
  }
};

export const calculateTax = (profile: TaxProfile): { old: TaxCalculationResult; newRegime: TaxCalculationResult } => {
  const { annualIncome, otherIncome, deductions } = profile;
  const grossIncome = Number(annualIncome) + Number(otherIncome);
  const rules = TAX_RULES['2026-27'];

  // New Regime Calculation
  const newTaxableIncome = Math.max(0, grossIncome - rules.NEW.standardDeduction);
  const newResult = computeRegimeTax(newTaxableIncome, rules.NEW, 'NEW');

  // Old Regime Calculation
  const categoryLimits: Record<string, number> = {
    '80C': 150000,
    '80CCD_1B': 50000,
    '80D': 75000,
    '80TTA': 10000,
    '80TTB': 50000,
    'SECTION_24': 200000,
  };

  const aggregatedDeductions = deductions.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + Number(d.amount);
    return acc;
  }, {} as Record<string, number>);

  const totalDeductions = Object.entries(aggregatedDeductions).reduce((sum, [cat, amt]) => {
    const limit = categoryLimits[cat];
    return sum + (limit !== undefined ? Math.min(amt, limit) : amt);
  }, 0);

  const oldTaxableIncome = Math.max(0, grossIncome - rules.OLD.standardDeduction - totalDeductions);
  const oldResult = computeRegimeTax(oldTaxableIncome, rules.OLD, 'OLD');

  return { old: oldResult, newRegime: newResult };
};

const computeRegimeTax = (income: number, config: any, regime: 'OLD' | 'NEW'): TaxCalculationResult => {
  let remaining = income;
  let slabTax = 0;
  const slabBreakdown: { slab: string; rate: string; tax: number }[] = [];

  let lowerLimit = 0;
  for (const s of config.slabs) {
    const chunk = Math.min(remaining, s.limit);
    if (chunk <= 0) break;
    
    const taxOnChunk = (chunk * s.rate) / 100;
    slabTax += taxOnChunk;
    
    const upperLimit = s.limit === Infinity ? 'Above' : formatLakh(lowerLimit + s.limit);
    slabBreakdown.push({ 
      slab: `${formatLakh(lowerLimit)} - ${upperLimit}`, 
      rate: `${s.rate}%`, 
      tax: taxOnChunk 
    });

    remaining -= chunk;
    lowerLimit += s.limit;
  }

  // 2. Apply Rebate u/s 87A
  let rebate = 0;
  if (income <= config.rebateLimit) {
    rebate = Math.min(slabTax, config.maxRebate);
  }

  let taxAfterRebate = Math.max(0, slabTax - rebate);

  // 3. Marginal Relief (Specifically for New Regime near 12L)
  // Logic: Tax cannot exceed (Income - Threshold)
  if (regime === 'NEW' && income > config.rebateLimit) {
    const incomeExceedingThreshold = income - config.rebateLimit;
    if (taxAfterRebate > incomeExceedingThreshold) {
      taxAfterRebate = incomeExceedingThreshold;
    }
  }

  // 4. Apply Cess (4%)
  const cess = taxAfterRebate * 0.04;
  const totalTax = taxAfterRebate + cess;

  return {
    regime,
    taxableIncome: income,
    taxAmount: taxAfterRebate, // This is tax before cess
    cess,
    totalTax,
    slabs: slabBreakdown,
    effectiveRate: income > 0 ? (totalTax / income) * 100 : 0
  };
};

const formatLakh = (num: number) => {
  if (num === 0) return '0';
  if (num >= 100000) return `${num / 100000}L`;
  return num.toString();
};

