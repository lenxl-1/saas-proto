import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import {
  get_aging_report,
  get_churn_risk_customers,
  get_kpis,
  get_overdue_invoices,
} from '../../lib/analytics';
import { formatINR } from '../../lib/formatters';

interface AiSummaryCardProps {
  onNavigateToInsights?: () => void;
  onNavigateToOverdue?: () => void;
}

export const AiSummaryCard: React.FC<AiSummaryCardProps> = ({
  onNavigateToInsights,
  onNavigateToOverdue,
}) => {
  const { user } = useAuth();

  // Scoped to Admin/Staff
  if (user?.role === 'customer') {
    return null;
  }

  const kpis = useMemo(() => get_kpis(user) as any, [user]);
  const overdueList = useMemo(() => get_overdue_invoices(user), [user]);
  const churnRisks = useMemo(() => get_churn_risk_customers(user), [user]);
  const highRiskAccount = churnRisks.find((r) => r.riskScore >= 50);

  const totalOverdue = overdueList.reduce((acc, i) => acc + i.balanceDue, 0);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-indigo-950 text-white p-5 sm:p-6 shadow-sm border border-neutral-800">
      {/* Background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/80 border border-indigo-400/30 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4 text-indigo-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm tracking-tight text-white">
                  Daily AI Executive Pulse
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                  Realtime
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Deterministic synthesis of recurring subscriptions, receivables, and retention signals.
              </p>
            </div>
          </div>

          {onNavigateToInsights && (
            <button
              onClick={onNavigateToInsights}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white transition-colors self-start sm:self-auto font-medium"
            >
              <span>Explore AI Insights & Forecasts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 3 Scannable Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Revenue & Growth */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>MRR Velocity</span>
              </span>
              <span className="font-mono text-emerald-400 font-semibold">+4.5% MoM</span>
            </div>
            <p className="text-white font-mono font-bold text-base">
              {formatINR(kpis.mrr)} <span className="text-neutral-400 font-sans text-xs font-normal">/ mo</span>
            </p>
            <p className="text-[11px] text-neutral-400 leading-tight">
              Annualized run-rate sits at {formatINR(kpis.arr)} with {kpis.activeSubscriptions} live subscriber agreements.
            </p>
          </div>

          {/* Overdue Receivables Alert */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Aging Receivables</span>
              </span>
              <span className="font-mono text-amber-400 font-semibold">{overdueList.length} Invoices</span>
            </div>
            <p className="text-white font-mono font-bold text-base">
              {formatINR(totalOverdue)}
            </p>
            <p className="text-[11px] text-neutral-400 leading-tight">
              {overdueList.length > 0
                ? `${overdueList[0]?.customerName} has ${formatINR(overdueList[0]?.balanceDue)} overdue by ${overdueList[0]?.daysOverdue} days.`
                : 'All billing statements are currently settled within due dates.'}
            </p>
          </div>

          {/* Retention & Risk Flag */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Retention Health</span>
              </span>
              <span className="font-mono text-indigo-300 font-semibold">{kpis.churnRatePercent}% Churn</span>
            </div>
            <p className="text-white font-mono font-bold text-base">
              {highRiskAccount ? `${highRiskAccount.riskScore}/100 Risk` : 'Portfolio Healthy'}
            </p>
            <p className="text-[11px] text-neutral-400 leading-tight">
              {highRiskAccount
                ? `Account "${highRiskAccount.customerName}" flagged for proactive retention reach-out.`
                : 'Zero accounts exhibiting critical delinquency or cancellation signals.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
