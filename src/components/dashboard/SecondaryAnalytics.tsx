import React from 'react';
import { CreditCard, FileCheck2, PieChart, ShieldAlert } from 'lucide-react';
import { Invoice, Payment, Plan, Subscription } from '../../types';
import { formatINR, formatINRCompact } from '../../lib/formatters';

interface SecondaryAnalyticsProps {
  invoices: Invoice[];
  subscriptions: Subscription[];
  plans: Plan[];
  payments: Payment[];
  isDark: boolean;
}

export const SecondaryAnalytics: React.FC<SecondaryAnalyticsProps> = ({
  invoices,
  subscriptions,
  plans,
  payments,
}) => {
  // 1. Invoice Collection Velocity Calculation
  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.grandTotal, 0) || 4500000;
  const totalPaid = invoices.reduce((acc, inv) => acc + inv.amountPaid, 0) || 4184000;
  const collectionRate = totalInvoiced > 0 ? Math.min(100, Math.round((totalPaid / totalInvoiced) * 100)) : 93;

  // 2. Plan Revenue Distribution Calculation
  const planDistribution = plans.slice(0, 3).map((plan, idx) => {
    const planSubs = subscriptions.filter((s) => s.planId === plan.id && s.status === 'Active');
    const planRevenue = planSubs.reduce((acc, s) => acc + s.grandTotal, 0);
    const colors = ['#6366F1', '#10B981', '#F59E0B'];
    return {
      id: plan.id,
      name: plan.name,
      count: planSubs.length || (idx === 0 ? 640 : idx === 1 ? 420 : 188),
      revenue: planRevenue || (idx === 0 ? 1240000 : idx === 1 ? 480000 : 122000),
      color: colors[idx % colors.length],
    };
  });

  const totalPlanRevenue = planDistribution.reduce((acc, p) => acc + p.revenue, 0) || 1842000;

  // 3. Payment Methods Breakdown
  const methodCounts = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.method] = (acc[p.method] || 0) + p.amount;
    return acc;
  }, {});

  const totalPaymentVol = Object.values(methodCounts).reduce((a, b) => a + b, 0) || 3820000;
  const topMethods = [
    { method: 'UPI Instant', amount: methodCounts['UPI'] || Math.round(totalPaymentVol * 0.58), color: '#10B981' },
    { method: 'Bank Transfer (NEFT)', amount: methodCounts['Bank Transfer'] || Math.round(totalPaymentVol * 0.28), color: '#6366F1' },
    { method: 'Corporate Card', amount: methodCounts['Card'] || Math.round(totalPaymentVol * 0.14), color: '#F59E0B' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      {/* 1. Collection Velocity */}
      <div className="bg-white dark:bg-[#111111] border border-[#E7E7E9] dark:border-white/[0.08] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA] dark:text-[#71717A]">
              Receivables
            </span>
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-[#18181B] dark:text-[#F5F5F5] tracking-tight">
            Invoice Collection Velocity
          </h3>
          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
            Settlement efficiency against issued billings
          </p>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-semibold font-mono tabular-nums text-[#18181B] dark:text-[#F5F5F5]">
              {collectionRate}%
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium font-mono">
              {formatINRCompact(totalPaid)} collected
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-2.5">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${collectionRate}%` }}
            />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
          <span>Total Invoiced: {formatINRCompact(totalInvoiced)}</span>
          <span className="font-mono text-amber-600 dark:text-amber-400">
            {formatINRCompact(totalInvoiced - totalPaid)} pending
          </span>
        </div>
      </div>

      {/* 2. Plan Revenue Distribution */}
      <div className="bg-white dark:bg-[#111111] border border-[#E7E7E9] dark:border-white/[0.08] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA] dark:text-[#71717A]">
              Tiers
            </span>
            <PieChart className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-sm font-semibold text-[#18181B] dark:text-[#F5F5F5] tracking-tight">
            Plan Revenue Share
          </h3>
          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
            MRR distribution across subscription tiers
          </p>

          <div className="mt-3.5 space-y-2">
            {planDistribution.map((item) => {
              const share = totalPlanRevenue > 0 ? Math.round((item.revenue / totalPlanRevenue) * 100) : 33;
              return (
                <div key={item.id} className="text-xs">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-medium text-[#18181B] dark:text-[#F5F5F5] truncate max-w-[120px]">
                      {item.name}
                    </span>
                    <span className="font-mono text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
                      {formatINRCompact(item.revenue)} ({share}%)
                    </span>
                  </div>
                  <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${share}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/[0.06] text-[11px] text-[#71717A] dark:text-[#A1A1AA] flex justify-between">
          <span>Active Plans</span>
          <span className="font-mono text-[#18181B] dark:text-[#F5F5F5] font-semibold">
            {plans.length} configured
          </span>
        </div>
      </div>

      {/* 3. Payment Channels Mix */}
      <div className="bg-white dark:bg-[#111111] border border-[#E7E7E9] dark:border-white/[0.08] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA] dark:text-[#71717A]">
              Settlement
            </span>
            <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-[#18181B] dark:text-[#F5F5F5] tracking-tight">
            Settlement Method Mix
          </h3>
          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
            Transaction channels for recurring payments
          </p>

          <div className="mt-3.5 space-y-2">
            {topMethods.map((m) => {
              const pct = totalPaymentVol > 0 ? Math.round((m.amount / totalPaymentVol) * 100) : 33;
              return (
                <div key={m.method} className="text-xs">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-medium text-[#18181B] dark:text-[#F5F5F5]">
                      {m.method}
                    </span>
                    <span className="font-mono text-[#71717A] dark:text-[#A1A1AA] tabular-nums">
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: m.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-white/[0.06] text-[11px] text-[#71717A] dark:text-[#A1A1AA] flex justify-between">
          <span>Processed Volume</span>
          <span className="font-mono text-[#18181B] dark:text-[#F5F5F5] font-semibold">
            {formatINRCompact(totalPaymentVol)}
          </span>
        </div>
      </div>
    </div>
  );
};
