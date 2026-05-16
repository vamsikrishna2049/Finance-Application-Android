import React from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  History, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Filter,
  Calendar as CalendarIcon,
  Download,
  Plus,
  Briefcase
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '../lib/utils';
import { 
  formatCurrency, 
  groupTransactionsByDate, 
  getCategorySpending, 
  getTopBeneficiaries 
} from '../lib/financeUtils';
import { Transaction, ReportStats, Budget } from '../types';
import { FLAT_CATEGORIES as DEFAULT_CATEGORIES } from '../categories';

interface TransactionsPageProps {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  reportStats: ReportStats;
  totalRequiredAmount: number;
  budgets: Budget[];
  currentMonthCategorySpending: Record<string, number>;
  onEditTransaction: (item: Transaction) => void;
  onAddTransaction: () => void;
  onRecordSalary: () => void;
  onExportExcel: () => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions,
  filteredTransactions,
  searchQuery,
  setSearchQuery,
  dateRange,
  setDateRange,
  reportStats,
  totalRequiredAmount,
  budgets,
  currentMonthCategorySpending,
  onEditTransaction,
  onAddTransaction,
  onRecordSalary,
  onExportExcel
}) => {
  const topBeneficiaries = getTopBeneficiaries(transactions);

  const budgetMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    budgets.forEach(b => { map[b.category] = b.amount; });
    return map;
  }, [budgets]);

  return (
    <div className="col-span-12 flex flex-col gap-8">
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex-1 w-full md:w-auto relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search transactions, categories, payees..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="flex bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm overflow-hidden min-w-[300px]">
             <input 
              type="date" 
              className="px-2 py-1 text-xs font-bold outline-none border-none bg-transparent flex-1" 
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
             />
             <div className="px-1 flex items-center text-slate-300">|</div>
             <input 
              type="date" 
              className="px-2 py-1 text-xs font-bold outline-none border-none bg-transparent flex-1" 
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
             />
          </div>
          <button 
            onClick={onExportExcel}
            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all"
          >
            <Download size={16} />
            Export XLSX
          </button>
          <button 
            onClick={onRecordSalary}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-emerald-100 transition-all"
          >
            <Briefcase size={16} />
            Record Salary
          </button>
          <button 
            onClick={onAddTransaction}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
          >
            <Plus size={16} />
            Add Transaction
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Left Column: Transactions and Payees */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
          {/* Recent Activity / History List */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-black text-2xl text-slate-900 tracking-tight">Transaction History</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Detailed Logs & Records</p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <History size={24} />
              </div>
            </div>

            <div className="space-y-8">
              {filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 opacity-40">
                    <History size={40} />
                  </div>
                  <p className="font-black uppercase tracking-widest text-xs">No transactions found</p>
                  <p className="text-[10px] font-medium mt-1">Try adjusting your filters or search query</p>
                </div>
              ) : (
                Object.entries(groupTransactionsByDate(filteredTransactions)).map(([dateLabel, txs]) => (
                  <div key={dateLabel} className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4 mb-2">{dateLabel}</h4>
                    <div className="space-y-2">
                      {txs.map((item, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.01 }}
                          key={item.id} 
                          className="flex items-center justify-between p-5 rounded-[2rem] hover:bg-slate-50 transition-all group cursor-pointer border border-transparent hover:border-slate-100"
                          onClick={() => onEditTransaction(item)}
                        >
                          <div className="flex items-center gap-5">
                            <div className={cn(
                              "w-14 h-14 rounded-3xl flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-110 transition-transform",
                              item.type === 'INCOME' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                              item.type === 'EMI' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                              item.type === 'INVESTMENT' ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                              "bg-slate-100 text-slate-500 border border-slate-200"
                            )}>
                              {DEFAULT_CATEGORIES.find(c => c.name === item.category)?.icon || '💸'}
                            </div>
                            <div>
                              <p className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">{item.title}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                <span>{item.category}</span>
                                <span className="text-slate-200">•</span>
                                <span>{item.mode}</span>
                                {item.whom && (
                                  <>
                                    <span className="text-slate-200">•</span>
                                    <span className="text-indigo-400">{item.whom}</span>
                                  </>
                                )}
                                {budgetMap[item.category] > 0 && item.type !== 'INCOME' && (
                                  <>
                                    <span className="text-slate-200 ml-1">•</span>
                                    <span className={cn(
                                      "ml-1 font-bold",
                                      (budgetMap[item.category] - (currentMonthCategorySpending[item.category] || 0)) < 0 ? "text-rose-500" : "text-emerald-500"
                                    )}>
                                      Bud. Bal: {formatCurrency(budgetMap[item.category] - (currentMonthCategorySpending[item.category] || 0))}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "text-lg font-black flex items-center justify-end gap-1 tracking-tight",
                              item.type === 'INCOME' ? "text-emerald-600" : "text-slate-900"
                            )}>
                              {item.type === 'INCOME' ? '+' : '-'}{formatCurrency(item.amount)}
                              {item.type === 'INCOME' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} className="text-slate-300" />}
                            </p>
                            {item.isRecurring && (
                              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mt-1">Recurring Bill</p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Analytics and Payees */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
          {/* Spending Analytics / Outflow Breakdown */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-xl text-slate-800 tracking-tight">Spending Mix</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Outflow Analysis</p>
              </div>
              <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                <TrendingUp size={20} />
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="h-[250px] w-full relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={getCategorySpending(filteredTransactions).slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="amount"
                    >
                      {getCategorySpending(filteredTransactions).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={[ '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e' ][index % 8]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '18px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 900, fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Spent</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(reportStats.expenses + reportStats.investments)}</p>
                </div>
              </div>

              <div className="space-y-3">
                {getCategorySpending(filteredTransactions).slice(0, 5).map((item, index) => {
                  const colors = [ '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6' ];
                  const totalOutflow = reportStats.expenses + reportStats.investments || 1;
                  const perc = (item.amount / totalOutflow) * 100;
                  
                  return (
                    <div key={item.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[index % 6] }}></div>
                        <p className="text-xs font-black text-slate-600">{item.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-900">{formatCurrency(item.amount)}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{Math.round(perc)}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Top Payees Card */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-xl text-slate-800 tracking-tight">Frequent Payees</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Network Insights</p>
              </div>
              <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                <Users size={20} />
              </div>
            </div>

            <div className="space-y-4">
              {topBeneficiaries.slice(0, 5).map((payee, index) => (
                <div key={index} className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 rounded-[1.5rem] transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-lg text-slate-400 shadow-sm group-hover:scale-110 transition-transform">
                      {payee.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{payee.name}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{payee.count} Records</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-indigo-600">{formatCurrency(payee.amount)}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full" 
                          style={{ width: `${(payee.amount / Math.max(...topBeneficiaries.map(b => b.amount))) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Widget Mini */}
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
            <TrendingUp className="absolute -right-6 -top-6 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform" />
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200 mb-2">Monthly Budget Pulse</p>
              <div className="flex items-baseline gap-2 mb-6">
                <h3 className="text-4xl font-black">{formatCurrency(reportStats.expenses)}</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-end mb-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Overall Progress</p>
                  <p className="text-sm font-black">{Math.round((reportStats.expenses / (totalRequiredAmount || 1)) * 100)}%</p>
                </div>
                <div className="h-3 bg-indigo-500/50 rounded-full overflow-hidden border border-indigo-400/30">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (reportStats.expenses / (totalRequiredAmount || 1)) * 100)}%` }}
                    className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                  />
                </div>
                <p className="text-[10px] font-bold text-indigo-100 leading-relaxed text-center">
                  Target Budget: <span className="font-black">{formatCurrency(totalRequiredAmount)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
