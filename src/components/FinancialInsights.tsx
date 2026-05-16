import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Info, 
  AlertCircle, 
  TrendingUp, 
  Zap, 
  Wallet,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatCurrency } from '../lib/financeUtils';

interface FinancialInsightsProps {
  metrics: {
    healthScore: number;
    safeToSpend: number;
    emergencyFundMonths: number;
    savingsRate: number;
    totalRecurringMonthly: number;
    totalBudgetLimit: number;
  };
}

export const FinancialInsights: React.FC<FinancialInsightsProps> = ({ metrics }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-indigo-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getScoreCategory = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'At Risk';
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Health Score */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col justify-between"
      >
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={12} className={getScoreColor(metrics.healthScore)} />
          <h3 className="text-[8px] font-black uppercase tracking-widest text-slate-400">Health</h3>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-black tracking-tighter", getScoreColor(metrics.healthScore))}>
            {metrics.healthScore}
          </span>
          <span className="text-[9px] font-black text-slate-800 uppercase tracking-tighter">{getScoreCategory(metrics.healthScore)}</span>
        </div>
      </motion.div>

      {/* 2. Savings Rate */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col justify-between"
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={12} className="text-emerald-500" />
          <h3 className="text-[8px] font-black uppercase tracking-widest text-slate-400">Savings</h3>
        </div>
        <div>
          <span className="text-2xl font-black text-slate-900 tracking-tighter">
            {Math.round(metrics.savingsRate)}%
          </span>
          <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
             <div 
               className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
               style={{ width: `${Math.min(100, Math.max(0, metrics.savingsRate))}%` }}
             />
          </div>
        </div>
      </motion.div>

      {/* 3. Emergency Buffer */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col justify-between"
      >
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={12} className="text-indigo-500" />
          <h3 className="text-[8px] font-black uppercase tracking-widest text-slate-400">Reserve</h3>
        </div>
        <div>
          <span className="text-2xl font-black text-slate-900 tracking-tighter">
            {metrics.emergencyFundMonths.toFixed(1)}<span className="text-[10px] ml-1 text-slate-400">mo</span>
          </span>
          <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
             <div 
               className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
               style={{ width: `${Math.min(100, (metrics.emergencyFundMonths / 6) * 100)}%` }}
             />
          </div>
        </div>
      </motion.div>

      {/* 4. Safe to Spend */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-900 p-4 rounded-3xl flex flex-col justify-between relative overflow-hidden group shadow-2xl shadow-indigo-900/20"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wallet size={12} className="text-indigo-400" />
            <h3 className="text-[8px] font-black uppercase tracking-widest text-slate-400">Buffer</h3>
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-white tracking-tighter">
            ₹{formatCurrency(metrics.safeToSpend)}
          </span>
          <p className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Avail. Safe-to-Spend</p>
        </div>
      </motion.div>
    </div>
  );
};
