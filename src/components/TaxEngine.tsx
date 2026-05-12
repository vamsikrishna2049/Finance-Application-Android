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
  AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TaxProfile, Deduction, TaxCalculationResult } from '../types';
import { calculateTax } from '../lib/taxEngine';

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

const DEDUCTION_CATEGORIES = [
  { id: '80C', label: '80C (PPF, ELSS, Insurance, EPF)', limit: 150000 },
  { id: '80D', label: '80D (Health Insurance - Self/Family)', limit: 25000 },
  { id: '80D_PARENTS', label: '80D (Parents Senior Citizens)', limit: 50000 },
  { id: '80CCD_1B', label: '80CCD(1B) (NPS Extra)', limit: 50000 },
  { id: 'SECTION_24', label: 'Section 24(b) (Home Loan Interest)', limit: 200000 },
  { id: '80E', label: '80E (Education Loan Interest)', limit: 0 },
  { id: '80G', label: '80G (Donations)', limit: 0 },
  { id: '80TTA', label: '80TTA (Savings Interest - Non Senior)', limit: 10000 },
  { id: '80TTB', label: '80TTB (Savings Interest - Senior)', limit: 50000 },
  { id: 'HRA', label: 'HRA (House Rent Allowance)', limit: 0 },
  { id: 'OTHER', label: 'Other Deductions', limit: 0 }
];

export const TaxEngine: React.FC = () => {
  const [profile, setProfile] = useState<TaxProfile>({
    id: '1',
    userId: 'default',
    assessmentYear: '2027-28',
    annualIncome: 1275000,
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
                    <ResponsiveContainer width="100%" height={300}>
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
                <ResponsiveContainer width="100%" height="100%">
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
        </div>
      </div>
    </div>
  );
};
