import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  TrendingDown, 
  TrendingUp, 
  Info, 
  ShieldCheck, 
  PiggyBank, 
  Landmark, 
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Scale,
  Zap
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TaxProfile, Deduction, TaxCalculationResult } from '../types';
import { calculateTax } from '../lib/taxEngine';
import { cn } from '../lib/utils';

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

const DEDUCTION_CATEGORIES = [
  { id: '80C', label: '80C (PPF, ELSS, Insurance, EPF)', limit: 150000 },
  { id: '80D', label: '80D (Health Insurance - Self/Family)', limit: 25000 },
  { id: '80D_PARENTS', label: '80D (Parents Senior Citizens)', limit: 50000 },
  { id: '80CCD_1B', label: '80CCD(1B) (NPS Extra)', limit: 50000 },
  { id: '80CCD_2', label: '80CCD(2) (Employer NPS - Both Regimes)', limit: 0 },
  { id: 'SECTION_24', label: 'Section 24(b) (Home Loan Interest)', limit: 200000 },
  { id: '80E', label: '80E (Education Loan Interest)', limit: 0 },
  { id: '80G', label: '80G (Donations)', limit: 0 },
  { id: '80TTA', label: '80TTA (Savings Interest - Non Senior)', limit: 10000 },
  { id: '80TTB', label: '80TTB (Savings Interest - Senior)', limit: 50000 },
  { id: 'HRA', label: 'HRA (House Rent Allowance)', limit: 0 },
  { id: '80GG', label: '80GG (Rent Paid - No HRA)', limit: 0 },
  { id: 'OTHER', label: 'Other Exemptions / LTA / Reimbursements', limit: 0 }
];

export const TaxEngine: React.FC = () => {
  const [profile, setProfile] = useState<TaxProfile>({
    id: '1',
    userId: 'default',
    assessmentYear: '2027-28',
    annualIncome: 0,
    otherIncome: 0,
    deductions: [],
    standardDeduction: 0, // This is now logic driven from engine
    lastUpdated: new Date().toISOString(),
  });

  const [activeRegimeTab, setActiveRegimeTab] = useState<'OLD' | 'NEW'>('NEW');

  const results = useMemo(() => calculateTax(profile), [profile]);
  
  const betterRegime = results.newRegime.totalTax <= results.old.totalTax ? 'NEW' : 'OLD';
  const savings = Math.abs(results.old.totalTax - results.newRegime.totalTax);

  const addDeduction = () => {
    const newDeduction: Deduction = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      category: '80C',
      amount: 0
    };
    setProfile(prev => ({
      ...prev,
      deductions: [...prev.deductions, newDeduction]
    }));
  };

  const removeDeduction = (id: string) => {
    setProfile(prev => ({
      ...prev,
      deductions: prev.deductions.filter(d => d.id !== id)
    }));
  };

  const updateDeduction = (id: string, updates: Partial<Deduction>) => {
    setProfile(prev => ({
      ...prev,
      deductions: prev.deductions.map(d => d.id === id ? { ...d, ...updates } : d)
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const currentResult = activeRegimeTab === 'NEW' ? results.newRegime : results.old;

  const [expandedOptimization, setExpandedOptimization] = useState<string | null>(null);

  const optimizationItems = [
    { 
      id: '80C', 
      title: 'Section 80C (EPF, PPF, ELSS, Insurance)', 
      description: 'Limit: ₹1.5L. Includes Tuition fees, Home loan principal, NSC, ULIPs.', 
      category: '80C',
      limit: 150000,
      icon: <PiggyBank size={18} />
    },
    { 
      id: '80CCD_1B', 
      title: 'Section 80CCD(1B) (Extra NPS)', 
      description: 'Extra ₹50,000 for NPS. Over and above 80C limit.', 
      category: '80CCD_1B',
      limit: 50000,
      icon: <TrendingUp size={18} />
    },
    { 
      id: '80CCD_2', 
      title: 'Employer NPS Contribution', 
      description: 'Up to 10% of salary. Available in BOTH regimes.', 
      category: '80CCD_2',
      limit: 0,
      icon: <TrendingUp size={18} />
    },
    { 
      id: 'HRA', 
      title: 'HRA (House Rent Allowance)', 
      description: 'Exemption for rent paid. Requires proof if rent > ₹1L.', 
      category: 'HRA',
      limit: 0,
      icon: <Landmark size={18} />
    },
    { 
      id: 'SECTION_24', 
      title: 'Section 24(b) (Home Loan Interest)', 
      description: 'Up to ₹2L for self-occupied properties.', 
      category: 'SECTION_24',
      limit: 200000,
      icon: <TrendingUp size={18} />
    },
    { 
      id: '80D', 
      title: 'Section 80D (Health Insurance)', 
      description: 'Self/Family (₹25k) + Parents (₹25k/₹50k).', 
      category: '80D',
      limit: 75000,
      icon: <ShieldCheck size={18} />
    },
    { 
      id: '80E', 
      title: 'Section 80E (Education Loan)', 
      description: 'Interest paid on Higher Education loan. No upper limit.', 
      category: '80E',
      limit: 0,
      icon: <TrendingUp size={18} />
    },
    { 
      id: '80G', 
      title: 'Section 80G (Donations)', 
      description: 'Donations to approved charities/funds.', 
      category: '80G',
      limit: 0,
      icon: <TrendingUp size={18} />
    },
    { 
      id: '80TTA', 
      title: 'Section 80TTA/B (Savings Interest)', 
      description: '₹10k (Non-senior) / ₹50k (Senior citizens).', 
      category: '80TTA',
      limit: 10000,
      icon: <TrendingDown size={18} />
    },
    { 
      id: 'PROF_TAX', 
      title: 'Professional Tax', 
      description: 'Limit: ₹2,500. Deductible if paid to state govt.', 
      category: 'OTHER',
      limit: 2500,
      icon: <Calculator size={18} />
    },
    { 
      id: '80GG', 
      title: 'Section 80GG (Rent - No HRA)', 
      description: 'Deduction for rent paid if HRA is not part of salary.', 
      category: '80GG',
      limit: 60000,
      icon: <Landmark size={18} />
    },
    { 
      id: 'LTA', 
      title: 'LTA & Reimbursements', 
      description: 'Leave Travel, Internet, Food, Fuel etc.', 
      category: 'OTHER',
      limit: 0,
      icon: <TrendingDown size={18} />
    }
  ];

  const handleOptimizationUpdate = (category: string, amount: number) => {
    setProfile(prev => {
      const existing = prev.deductions.find(d => d.category === category);
      if (existing) {
        return {
          ...prev,
          deductions: prev.deductions.map(d => d.category === category ? { ...d, amount } : d)
        };
      } else {
        return {
          ...prev,
          deductions: [...prev.deductions, { id: Math.random().toString(36).substr(2, 9), name: category, category: category as any, amount }]
        };
      }
    });
  };

  const getDeductionAmount = (category: string) => {
    return profile.deductions.find(d => d.category === category)?.amount || 0;
  };

  const chartData = currentResult.slabs.map(s => ({
    name: s.slab,
    value: s.tax
  })).filter(s => s.value > 0);

  const comparisonData = [
    { name: 'Old Regime', tax: results.old.totalTax },
    { name: 'New Regime', tax: results.newRegime.totalTax },
  ];

  return (
    <div className="grid grid-cols-12 gap-8 max-w-5xl mx-auto">
      {/* Recommendation Section */}
      <div className="col-span-12 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="bg-emerald-50 rounded-[2.5rem] p-8 border border-emerald-100 flex flex-col md:flex-row items-center gap-8 shadow-sm relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-emerald-600 shadow-xl shadow-emerald-200/40 shrink-0 border border-emerald-50 relative z-10">
            {betterRegime === 'NEW' ? <TrendingDown size={36} /> : <TrendingUp size={36} />}
          </div>
          
          <div className="flex-1 text-center md:text-left relative z-10">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em]">Personalized Recommendation</p>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
              Opt for the <span className="text-emerald-600 underline underline-offset-8 decoration-[6px] decoration-emerald-200/60 uppercase">{betterRegime} REGIME</span>
            </h3>
            <div className="flex flex-col md:flex-row md:items-center gap-4 mt-3">
              <p className="text-sm md:text-base font-bold text-slate-600">
                You'll save <span className="text-emerald-600 font-extrabold bg-emerald-100/50 px-2 py-0.5 rounded-lg">{formatCurrency(savings)}</span> every year.
              </p>
              <div className="hidden md:block w-1.5 h-1.5 bg-slate-200 rounded-full" />
              <p className="text-sm font-bold text-slate-500 italic">
                Calculated for FY 2026-27
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center md:items-end relative z-10">
            <div className="px-6 py-4 bg-white rounded-[1.5rem] border border-emerald-100 shadow-sm text-center min-w-[140px]">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Effective Tax Rate</p>
              <div className="flex flex-col">
                <p className="text-3xl font-black text-emerald-600 leading-none">
                  {(betterRegime === 'NEW' ? results.newRegime : results.old).effectiveRate.toFixed(2)}%
                </p>
                <p className="text-[9px] font-bold text-slate-400 mt-2 border-t border-slate-50 pt-2">
                  of your total income
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Section (Now at Top) */}
      <div className="col-span-12 flex flex-col gap-6">
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <Calculator size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Tax Inputs</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AY 2027-28 (FY 2026-27)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Annual Salary Income</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input 
                    type="number"
                    value={profile.annualIncome}
                    onChange={e => setProfile(prev => ({ ...prev, annualIncome: Number(e.target.value) }))}
                    className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Deduction Section */}
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deductions & Benefits</label>
                <button 
                  onClick={addDeduction}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                >
                  <Plus size={14} /> Add New
                </button>
              </div>

              <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                {profile.deductions.length === 0 ? (
                  <div className="p-6 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No deductions added yet</p>
                  </div>
                ) : (
                  profile.deductions.map(d => (
                    <div key={d.id} className="flex gap-2 items-start animate-in fade-in zoom-in-95 duration-300">
                      <select 
                        value={d.category}
                        onChange={e => updateDeduction(d.id, { category: e.target.value as any })}
                        className="flex-1 px-3 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-[10px] uppercase tracking-wider focus:border-indigo-300 transition-colors"
                      >
                        {DEDUCTION_CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                      </select>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">₹</span>
                        <input 
                          type="number"
                          value={d.amount}
                          onChange={e => updateDeduction(d.id, { amount: Number(e.target.value) })}
                          className="w-full pl-6 pr-3 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm focus:border-indigo-300 transition-colors"
                          placeholder="Amount"
                        />
                      </div>
                      <button 
                        onClick={() => removeDeduction(d.id)}
                        className="p-3 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Section (Now Below) */}
      <div className="col-span-12 flex flex-col gap-6">
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-slate-800">Detailed Analysis</h2>
              <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-widest">FY 2026-27</span>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveRegimeTab('NEW')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeRegimeTab === 'NEW' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                New Regime
              </button>
              <button 
                onClick={() => setActiveRegimeTab('OLD')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeRegimeTab === 'OLD' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                Old Regime
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Summary Numbers */}
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Tax Liability</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
                    {formatCurrency(currentResult.totalTax)}
                  </h3>
                  {currentResult.totalTax === 0 && (
                    <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Zero Tax
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Income</p>
                  <p className="text-sm font-black text-slate-800">{formatCurrency(profile.annualIncome + profile.otherIncome)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Taxable Income</p>
                  <p className="text-sm font-black text-slate-800">{formatCurrency(currentResult.taxableIncome)}</p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-3">Tax Summary</p>
                
                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                  <span>Standard Deduction</span>
                  <span className="text-rose-500">-{formatCurrency(activeRegimeTab === 'NEW' ? 75000 : 50000)}</span>
                </div>

                {activeRegimeTab === 'OLD' && (
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                    <span>Investment Deductions</span>
                    <span className="text-rose-500">-{formatCurrency(Math.max(0, (profile.annualIncome + profile.otherIncome - 50000) - currentResult.taxableIncome))}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs font-bold text-slate-600 pt-2 border-t border-slate-100">
                  <span>Slab Tax</span>
                  <span className="text-slate-800">{formatCurrency(currentResult.slabs.reduce((s, b) => s + b.tax, 0))}</span>
                </div>

                {currentResult.taxAmount === 0 && currentResult.slabs.reduce((s, b) => s + b.tax, 0) > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-600">
                    <span>Section 87A Rebate</span>
                    <span>-{formatCurrency(currentResult.slabs.reduce((s, b) => s + b.tax, 0))}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                  <span>Education Cess (4%)</span>
                  <span className="text-slate-800">{formatCurrency(currentResult.cess)}</span>
                </div>
              </div>
            </div>

            {/* Middle: Visualization */}
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              {chartData.length > 0 ? (
                <>
                  <div className="w-full h-full relative">
                    <ResponsiveContainer width="100%" height={300} minWidth={0}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cess (4%)</p>
                      <p className="text-xs font-black text-slate-800">{formatCurrency(currentResult.cess)}</p>
                    </div>
                  </div>

                  <div className="w-full space-y-2 mt-4 px-4 overflow-y-auto max-h-[150px]">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Slab Breakdown</p>
                    {currentResult.slabs.map((s, i) => (
                      <div key={i} className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-100 last:border-0 group">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-[10px] font-bold text-slate-500">{s.slab}</span>
                          <span className="text-[10px] font-black text-indigo-400 text-[8px]">{s.rate}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-700">{formatCurrency(s.tax)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 text-slate-300">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                    <TrendingDown size={32} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest">No Tax Liability</p>
                </div>
              )}
            </div>

            {/* Right: Bar Comparison */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={20} className="text-indigo-500" />
                <h3 className="font-black text-slate-800 tracking-tight">Regime Comparison</h3>
              </div>
              
              <div className="w-full h-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={comparisonData}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar 
                      dataKey="tax" 
                      radius={[12, 12, 0, 0]}
                      barSize={60}
                    >
                      {comparisonData.map((entry, index) => (
                        <Cell 
                           key={`cell-${index}`} 
                          fill={entry.tax === Math.min(...comparisonData.map(d => d.tax)) ? '#10b981' : '#6366f1'} 
                          fillOpacity={entry.tax === Math.min(...comparisonData.map(d => d.tax)) ? 1 : 0.6}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Deep Optimization Inputs for Old Regime */}
          {activeRegimeTab === 'OLD' && (
            <div className="mt-12 pt-12 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Max Impact Optimization</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configure your old regime benefits for precise results</p>
                </div>
                <div className="bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 flex items-center gap-2">
                  <Zap size={16} className="text-indigo-600" />
                  <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Strategy Engine Active</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {optimizationItems.map(item => (
                  <div 
                    key={item.id} 
                    className={cn(
                      "group p-6 rounded-[2rem] border transition-all duration-300",
                      expandedOptimization === item.id ? "bg-white border-indigo-200 shadow-xl shadow-indigo-100/50" : "bg-slate-50 border-slate-100 hover:border-indigo-100"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                          expandedOptimization === item.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white text-indigo-400 group-hover:text-indigo-600 shadow-sm"
                        )}>
                          {item.icon}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-sm tracking-tight">{item.title}</h4>
                          <p className="text-[10px] font-bold text-slate-400 leading-tight mt-0.5">{item.description}</p>
                        </div>
                      </div>
                      <div className="relative w-28 shrink-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">₹</span>
                        <input 
                          type="number"
                          value={getDeductionAmount(item.category)}
                          onChange={e => handleOptimizationUpdate(item.category, Number(e.target.value))}
                          onFocus={() => setExpandedOptimization(item.id)}
                          className="w-full pl-6 pr-3 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm focus:border-indigo-600 transition-all text-right"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Optimization Guide Section */}
      <div className="col-span-12 space-y-8 mt-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Full Tax Optimization Map</h2>
          <p className="text-slate-500 font-medium max-w-2xl">Beyond standard deductions: A complete strategy guide for Indian salaried professionals to legally minimize tax liability.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Regime Strategy */}
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
              <Scale size={80} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-200 mb-4 flex items-center gap-2">
              <ShieldCheck size={16} /> Strategy Phase 1
            </h3>
            <h4 className="text-2xl font-black mb-4 leading-tight">Old vs New Regime Selection</h4>
            <div className="space-y-4 text-sm font-medium text-indigo-100 leading-relaxed">
              <p>• <span className="text-white font-bold">Old Regime:</span> Better if you have HRA, Home Loan Interest, or total deductions exceeding ₹3.75L - ₹4.5L (varies by slab).</p>
              <p>• <span className="text-white font-bold">New Regime:</span> Better for high earners with zero home loan/HRA, offering lower rates but zero deductions.</p>
              <p className="bg-white/10 p-3 rounded-xl border border-white/20 text-xs italic">"Always switch regimes yearly based on your actual investments and salary structure."</p>
            </div>
          </div>

          {/* 80C Mix */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm transition-all hover:shadow-lg">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
              <PiggyBank size={24} />
            </div>
            <h4 className="text-xl font-black text-slate-800 mb-3 tracking-tight">Section 80C Mix (₹1.5L)</h4>
            <p className="text-slate-500 text-sm font-medium mb-6 leading-relaxed">Don't just dump money; choose high-impact vehicles.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">High Return</p>
                <p className="text-[10px] font-bold text-slate-700 leading-tight">ELSS Mutual Funds (3yr lock-in)</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Safe/Long</p>
                <p className="text-[10px] font-bold text-slate-700 leading-tight">PPF (Tax-free interest)</p>
              </div>
            </div>
            <p className="text-[10px] font-bold text-rose-500 mt-4 leading-tight">Avoid: Expensive ULIPs or endowment plans with poor returns.</p>
          </div>

          {/* NPS Power */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm transition-all hover:shadow-lg">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
              <TrendingUp size={24} />
            </div>
            <h4 className="text-xl font-black text-slate-800 mb-3 tracking-tight">NPS: The Secret Weapon</h4>
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                <p className="text-[9px] font-black text-amber-700 uppercase mb-1">80CCD(1B)</p>
                <p className="text-xs font-bold text-slate-700 leading-tight">Extra ₹50,000 deduction on top of 80C.</p>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <p className="text-[9px] font-black text-emerald-700 uppercase mb-1">80CCD(2)</p>
                <p className="text-xs font-bold text-slate-700 leading-tight">Employer NPS contribution is deductible in BOTH regimes (up to 10% salary).</p>
              </div>
            </div>
          </div>

          {/* HRA Strategy */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute bottom-0 right-0 p-4 opacity-5">
              <Landmark size={120} />
            </div>
            <h4 className="text-2xl font-black mb-4 leading-tight tracking-tight">Smart HRA Optimization</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 shrink-0 mt-1">✓</span>
                <span>Pay rent to parents if living with them (requires legal rent agreement + transfers).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 shrink-0 mt-1">✓</span>
                <span>Claim HRA even if you have a Home Loan in a different city.</span>
              </li>
              <li className="flex items-start gap-2 text-slate-500 italic">
                <span>* PAN of landlord required if annual rent exceeds ₹1 Lakh.</span>
              </li>
            </ul>
          </div>

          {/* Reimbursements */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm transition-all hover:shadow-lg">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
              <Info size={24} />
            </div>
            <h4 className="text-xl font-black text-slate-800 mb-3 tracking-tight text-center">Benefit Reimbursements</h4>
            <p className="text-slate-500 text-sm font-medium mb-4 text-center">Items that can transform taxable salary into tax-free benefits:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Broadband', 'Mobile Bill', 'Food Coupons', 'LTA', 'Gadgets', 'Fuel', 'Books'].map(tag => (
                <span key={tag} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Advanced Tips */}
          <div className="bg-rose-50 rounded-[2.5rem] p-8 border border-rose-100 shadow-sm relative group overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
              <Zap size={100} className="text-rose-600" />
            </div>
            <h4 className="text-xl font-black text-rose-800 mb-4 flex items-center gap-2">
              <Info size={18} /> Advanced Planning
            </h4>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">Family Arbitrage</p>
                <p className="text-xs font-bold text-rose-900/70 leading-relaxed">Gift money to non-working parents or spouse and invest in their name to utilize their tax slabs.</p>
              </div>
              <div className="pt-4 border-t border-rose-200/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">Gain Harvesting</p>
                <p className="text-xs font-bold text-rose-900/70 leading-relaxed">Book ₹1.25L of Equity LTCG annually to reset cost basis and save future taxes.</p>
              </div>
              <div className="pt-4 border-t border-rose-200/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">The HUF Hack</p>
                <p className="text-xs font-bold text-rose-900/70 leading-relaxed">Create a separate HUF entity to gain an additional tax exemption slab and deductions.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Checklist */}
        <div className="bg-rose-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <AlertCircle size={200} />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-rose-300 mb-2">The Do's & Don'ts</h3>
            <h4 className="text-3xl font-black mb-8 tracking-tight">Avoid These Common Tax Traps</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-rose-800 flex items-center justify-center shrink-0">
                    <span className="font-bold text-white">1</span>
                  </div>
                  <div>
                    <h5 className="font-black text-rose-100 uppercase tracking-widest text-xs mb-2">Poor Documentation</h5>
                    <p className="text-sm font-medium text-rose-200/70 leading-relaxed">Always maintain receipts, agreements, and bank proof. Rent payments without bank trails are often scrutinized.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-rose-800 flex items-center justify-center shrink-0">
                    <span className="font-bold text-white">2</span>
                  </div>
                  <div>
                    <h5 className="font-black text-rose-100 uppercase tracking-widest text-xs mb-2">Last-Minute Scramble</h5>
                    <p className="text-sm font-medium text-rose-200/70 leading-relaxed">Don't wait until March. Start SIPs early to build wealth while saving tax.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-rose-800 flex items-center justify-center shrink-0">
                    <span className="font-bold text-white">3</span>
                  </div>
                  <div>
                    <h5 className="font-black text-rose-100 uppercase tracking-widest text-xs mb-2">Insurance Misstep</h5>
                    <p className="text-sm font-medium text-rose-200/70 leading-relaxed">Agents push ULIPs for commission. Prefer Term Life Insurance + ELSS for better protection and wealth.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-rose-800 flex items-center justify-center shrink-0">
                    <span className="font-bold text-white">4</span>
                  </div>
                  <div>
                    <h5 className="font-black text-rose-100 uppercase tracking-widest text-xs mb-2">NPS Oversight</h5>
                    <p className="text-sm font-medium text-rose-200/70 leading-relaxed">Corporate NPS is one of the only ways to save tax beyond ₹50L+ salaries under the New Regime.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 bg-white/10 p-6 rounded-3xl border border-white/20 text-center">
              <p className="text-rose-100 font-black uppercase tracking-widest text-xs mb-4">Ready to optimize?</p>
              <div className="flex flex-wrap justify-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-sm font-bold">Standard Deduction Claimed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-sm font-bold">Old vs New Comparison Done</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
