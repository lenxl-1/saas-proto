import React, { useMemo, useRef, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import '../lib/chartConfig';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Layers,
  PieChart,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  get_aging_report,
  get_churn_risk_customers,
  get_cohort_retention,
  get_customer_dashboard_data,
  get_kpis,
  get_mrr_movement,
  get_overdue_invoices,
  get_payment_method_mix,
  get_plan_performance,
  get_revenue_by_month,
  get_subscription_status_counts,
  get_top_customers,
} from '../lib/analytics';
import { generateRevenueForecast } from '../lib/forecast';
import {
  customersRepo,
  invoicesRepo,
  paymentsRepo,
  plansRepo,
  settingsRepo,
  subscriptionsRepo,
} from '../lib/db';
import { formatDate, formatINR, formatINRCompact } from '../lib/formatters';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';

export const AiInsightsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  const isCustomer = user?.role === 'customer';

  // Forecasting parameters
  const [horizon, setHorizon] = useState<3 | 6 | 12>(6);
  const [scenario, setScenario] = useState<'base' | 'optimistic' | 'pessimistic'>('base');

  // Chart refs for PNG export
  const forecastChartRef = useRef<any>(null);
  const mrrMovementChartRef = useRef<any>(null);
  const agingChartRef = useRef<any>(null);
  const plansChartRef = useRef<any>(null);
  const statusChartRef = useRef<any>(null);
  const methodChartRef = useRef<any>(null);

  // Data queries
  const subs = useMemo(() => subscriptionsRepo.getAll(user), [user]);
  const allPlans = useMemo(() => plansRepo.getAll(), []);
  const invoices = useMemo(() => invoicesRepo.getAll(user), [user]);
  const payments = useMemo(() => paymentsRepo.getAll(user), [user]);

  // KPIs & deterministic calculations
  const kpis = useMemo(() => get_kpis(user) as any, [user]);
  const forecastData = useMemo(() => {
    return generateRevenueForecast(subs, allPlans, invoices, payments, horizon, effectiveToday);
  }, [subs, allPlans, invoices, payments, horizon, effectiveToday]);

  const mrrMovements = useMemo(() => get_mrr_movement(user, 6), [user]);
  const agingReport = useMemo(() => get_aging_report(user), [user]);
  const planPerformance = useMemo(() => get_plan_performance(user), [user]);
  const statusCounts = useMemo(() => get_subscription_status_counts(user), [user]);
  const paymentMix = useMemo(() => get_payment_method_mix(user), [user]);
  const churnRisks = useMemo(() => get_churn_risk_customers(user), [user]);
  const cohorts = useMemo(() => get_cohort_retention(user), [user]);
  const customerData = useMemo(() => get_customer_dashboard_data(user), [user]);

  // CSV Export handler
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (isCustomer) {
      csvContent += 'Customer Spend Forecast & Ledger\n';
      csvContent += 'Month,Invoiced Amount (INR)\n';
      customerData?.spendHistory.forEach((row) => {
        csvContent += `"${row.label}",${row.amount}\n`;
      });
    } else {
      csvContent += `BrightFlow AI Forecast (${horizon}-Month Horizon - ${scenario.toUpperCase()})\n`;
      csvContent += 'Month,Base MRR,Optimistic MRR,Pessimistic MRR,Base Revenue,Expected Cash Collection\n';
      forecastData.forecastMonths.forEach((m) => {
        csvContent += `"${m.label}",${m.mrrBase},${m.mrrOptimistic},${m.mrrPessimistic},${m.revenueBase},${m.expectedCashCollection}\n`;
      });
      csvContent += '\nAccounts Receivable Aging Report\nBucket,Amount,Invoices Count,Percentage\n';
      agingReport.buckets.forEach((b) => {
        csvContent += `"${b.range}",${b.amount},${b.count},${b.percentage}%\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `brightflow-ai-forecast-${horizon}m.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'CSV Export Complete', 'Financial metrics exported to CSV.');
  };

  // PNG Export handler for primary charts
  const handleDownloadPNG = () => {
    const chart = forecastChartRef.current;
    if (chart) {
      const url = chart.toBase64Image();
      const link = document.createElement('a');
      link.download = `brightflow-forecast-${scenario}-${horizon}m.png`;
      link.href = url;
      link.click();
      showToast('success', 'Chart PNG Saved', 'Forecast chart saved as PNG image.');
    } else {
      showToast('info', 'Chart Export', 'Right click on any chart to save image.');
    }
  };

  // 1. Forecast Line Chart Config
  const forecastLabels = forecastData.forecastMonths.map((m) => m.label);
  const forecastChartData = {
    labels: forecastLabels,
    datasets: [
      {
        label: 'Selected Trajectory',
        data: forecastData.forecastMonths.map((m) =>
          scenario === 'optimistic'
            ? m.mrrOptimistic
            : scenario === 'pessimistic'
            ? m.mrrPessimistic
            : m.mrrBase
        ),
        borderColor: '#4F46E5',
        backgroundColor: 'rgba(79, 70, 229, 0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#4F46E5',
        pointRadius: 4,
      },
      {
        label: 'Upper Confidence (Optimistic)',
        data: forecastData.forecastMonths.map((m) => m.upperConfidence),
        borderColor: 'rgba(16, 185, 129, 0.4)',
        borderDash: [5, 5],
        borderWidth: 1.5,
        fill: false,
        pointRadius: 0,
      },
      {
        label: 'Lower Confidence (Pessimistic)',
        data: forecastData.forecastMonths.map((m) => m.lowerConfidence),
        borderColor: 'rgba(239, 68, 68, 0.4)',
        borderDash: [5, 5],
        borderWidth: 1.5,
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  // 2. MRR Movement Stacked Bar
  const mrrMovementData = {
    labels: mrrMovements.map((m) => m.monthLabel),
    datasets: [
      {
        label: 'New MRR',
        data: mrrMovements.map((m) => m.newMrr),
        backgroundColor: '#10B981',
      },
      {
        label: 'Expansion MRR',
        data: mrrMovements.map((m) => m.expansionMrr),
        backgroundColor: '#6366F1',
      },
      {
        label: 'Contraction MRR',
        data: mrrMovements.map((m) => -m.contractionMrr),
        backgroundColor: '#F59E0B',
      },
      {
        label: 'Churn MRR',
        data: mrrMovements.map((m) => -m.churnMrr),
        backgroundColor: '#EF4444',
      },
    ],
  };

  // 4. Aging Bar
  const agingChartData = {
    labels: agingReport.buckets.map((b) => b.range),
    datasets: [
      {
        label: 'Receivables Amount (₹)',
        data: agingReport.buckets.map((b) => b.amount),
        backgroundColor: ['#10B981', '#6366F1', '#F59E0B', '#F97316', '#EF4444'],
        borderRadius: 6,
      },
    ],
  };

  // 5. Plan Mix Donut
  const planChartData = {
    labels: planPerformance.map((p) => p.planName),
    datasets: [
      {
        data: planPerformance.map((p) => p.monthlyRevenue),
        backgroundColor: ['#4F46E5', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'],
        borderWidth: 0,
      },
    ],
  };

  // 6. Status Doughnut
  const statusChartData = {
    labels: ['Active', 'Confirmed', 'Quotation', 'Draft', 'Closed'],
    datasets: [
      {
        data: [
          statusCounts.Active,
          statusCounts.Confirmed,
          statusCounts.Quotation,
          statusCounts.Draft,
          statusCounts.Closed,
        ],
        backgroundColor: ['#10B981', '#6366F1', '#F59E0B', '#9CA3AF', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  // 7. Payment Mix Donut
  const paymentMethodData = {
    labels: paymentMix.map((p) => p.method),
    datasets: [
      {
        data: paymentMix.map((p) => p.totalAmount),
        backgroundColor: ['#6366F1', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `₹${Number(context.raw || 0).toLocaleString('en-IN')}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: {
          font: { size: 10 },
          callback: (val: any) => formatINRCompact(Number(val)),
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
              {isCustomer ? 'Account Insights & Spend Forecast' : 'AI Revenue Intelligence & Forecasting'}
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 rounded-full flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Gemini & Deterministic
            </span>
          </div>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            {isCustomer
              ? 'Multi-month recurring expenditure analysis, renewal tracking, and billing schedule.'
              : 'Multi-horizon recurring revenue projection, cohort retention, and churn risk scoring.'}
          </p>
        </div>

        {/* Action Buttons: Export CSV & PNG */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          {!isCustomer && (
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleDownloadPNG}
            >
              Export Chart PNG
            </Button>
          )}
        </div>
      </div>

      {/* 9. KPI Sparklines Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl shadow-2xs">
          <span className="text-[11px] text-[#737373] block">
            {isCustomer ? 'Committed MRR' : 'Portfolio MRR'}
          </span>
          <span className="text-lg font-bold font-mono text-[#171717] dark:text-[#F5F5F5] block mt-0.5">
            {formatINR(isCustomer ? kpis.monthlyCommittedSpend : kpis.mrr)}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5 mt-1">
            <TrendingUp className="w-3 h-3" /> +4.5% MoM
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl shadow-2xs">
          <span className="text-[11px] text-[#737373] block">
            {isCustomer ? 'Annualized Spend' : 'Annual Run Rate'}
          </span>
          <span className="text-lg font-bold font-mono text-[#171717] dark:text-[#F5F5F5] block mt-0.5">
            {formatINR(isCustomer ? kpis.annualizedSpend : kpis.arr)}
          </span>
          <span className="text-[10px] text-[#737373] mt-1 block font-mono">12x Multiplier</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl shadow-2xs">
          <span className="text-[11px] text-[#737373] block">
            {isCustomer ? 'Active Plans' : 'ARPU (Monthly)'}
          </span>
          <span className="text-lg font-bold font-mono text-[#171717] dark:text-[#F5F5F5] block mt-0.5">
            {isCustomer ? kpis.activeSubscriptions : formatINR(kpis.arpu)}
          </span>
          <span className="text-[10px] text-[#737373] mt-1 block">
            {isCustomer ? 'Live agreements' : 'Per active customer'}
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl shadow-2xs">
          <span className="text-[11px] text-[#737373] block">
            {isCustomer ? 'Total Paid' : 'Annual Churn'}
          </span>
          <span className="text-lg font-bold font-mono text-[#171717] dark:text-[#F5F5F5] block mt-0.5">
            {isCustomer ? formatINR(kpis.totalPaidToDate) : `${kpis.churnRatePercent}%`}
          </span>
          <span className="text-[10px] text-emerald-600 mt-1 block">
            {isCustomer ? 'Settled receipts' : 'Healthy benchmark'}
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl shadow-2xs">
          <span className="text-[11px] text-[#737373] block">
            {isCustomer ? 'Balance Due' : 'Customer LTV'}
          </span>
          <span className="text-lg font-bold font-mono text-[#171717] dark:text-[#F5F5F5] block mt-0.5">
            {isCustomer ? formatINR(kpis.outstandingBalance) : formatINR(kpis.customerLTV)}
          </span>
          <span className="text-[10px] text-[#737373] mt-1 block">
            {isCustomer ? 'Open invoices' : 'Lifetime value model'}
          </span>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl shadow-2xs">
          <span className="text-[11px] text-[#737373] block">
            {isCustomer ? 'Overdue Due' : 'Collection Rate'}
          </span>
          <span className="text-lg font-bold font-mono text-[#171717] dark:text-[#F5F5F5] block mt-0.5">
            {isCustomer ? kpis.overdueInvoicesCount : `${kpis.collectionRatePercent}%`}
          </span>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 block">
            {isCustomer ? 'Invoices past due' : '90-day efficiency'}
          </span>
        </div>
      </div>

      {/* Customer Scoped Dashboard Section (if Customer) */}
      {isCustomer && customerData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 10. Customer Spend History Chart */}
          <div className="md:col-span-2 p-5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-2xl shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  10. Your Monthly Invoiced Spend History
                </h3>
                <p className="text-xs text-[#737373]">Historical statements generated over recent periods</p>
              </div>
            </div>
            <div className="h-56">
              <Bar
                data={{
                  labels: customerData.spendHistory.map((s) => s.label),
                  datasets: [
                    {
                      label: 'Invoiced Amount (₹)',
                      data: customerData.spendHistory.map((s) => s.amount),
                      backgroundColor: '#4F46E5',
                      borderRadius: 6,
                    },
                  ],
                }}
                options={chartOptions}
              />
            </div>
          </div>

          {/* 11. Upcoming Invoice Countdown Card */}
          <div className="p-5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-2xl shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                <Clock className="w-4 h-4" />
                <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  11. Upcoming Invoice Countdown
                </h3>
              </div>
              <p className="text-xs text-[#737373]">Next scheduled payment milestone</p>

              {customerData.nextInvoice ? (
                <div className="mt-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-[#E5E5E5] dark:border-[#262626] space-y-2">
                  <span className="font-mono text-xs text-[#737373] block">
                    {customerData.nextInvoice.invoiceNumber}
                  </span>
                  <span className="text-2xl font-bold font-mono text-[#171717] dark:text-[#F5F5F5] block">
                    {formatINR(customerData.nextInvoice.balanceDue)}
                  </span>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                    <span className="text-[#737373]">Due Date:</span>
                    <span className="font-medium text-[#171717] dark:text-[#F5F5F5]">
                      {formatDate(customerData.nextInvoice.dueDate)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-6 text-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 text-emerald-800 dark:text-emerald-300 text-xs">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                  All current invoices are fully settled!
                </div>
              )}
            </div>

            {/* 12. Recent Payments Timeline */}
            <div className="pt-3 border-t border-[#E5E5E5] dark:border-[#262626] text-xs">
              <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block mb-2">
                12. Recent Settled Payments
              </span>
              <div className="space-y-1.5">
                {customerData.recentPayments.length === 0 ? (
                  <span className="text-[#737373]">No past payments recorded.</span>
                ) : (
                  customerData.recentPayments.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex justify-between text-[11px]">
                      <span className="text-[#737373] font-mono">{formatDate(p.date)} ({p.method})</span>
                      <span className="font-mono font-medium text-emerald-600">+{formatINR(p.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin / Staff Complete 9-Chart Suite */}
      {!isCustomer && (
        <>
          {/* 1. Revenue & MRR Forecast Line Chart */}
          <div className="p-5 sm:p-6 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-2xl shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  1. Multi-Horizon Revenue & MRR Trajectory
                </h3>
                <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">
                  Deterministic compound growth modeling with upper/lower scenario bounds.
                </p>
              </div>

              {/* Horizon & Scenario Selectors */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Horizon Selector */}
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs">
                  {([3, 6, 12] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => setHorizon(h)}
                      className={`px-2.5 py-1 rounded font-medium transition-colors ${
                        horizon === h
                          ? 'bg-white dark:bg-[#111111] text-[#171717] dark:text-[#F5F5F5] shadow-2xs font-semibold'
                          : 'text-[#737373]'
                      }`}
                    >
                      {h} Months
                    </button>
                  ))}
                </div>

                {/* Scenario Selector */}
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs">
                  {(['base', 'optimistic', 'pessimistic'] as const).map((sc) => (
                    <button
                      key={sc}
                      onClick={() => setScenario(sc)}
                      className={`px-2.5 py-1 rounded font-medium capitalize transition-colors ${
                        scenario === sc
                          ? 'bg-white dark:bg-[#111111] text-[#171717] dark:text-[#F5F5F5] shadow-2xs font-semibold'
                          : 'text-[#737373]'
                      }`}
                    >
                      {sc}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-64 sm:h-72">
              <Line ref={forecastChartRef} data={forecastChartData} options={chartOptions} />
            </div>

            {/* Trajectory Insights Footer */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E5E5E5] dark:border-[#262626] text-xs">
              <div>
                <span className="text-[#737373] text-[11px] block">Baseline Starting MRR</span>
                <span className="font-mono font-bold text-[#171717] dark:text-[#F5F5F5]">
                  {formatINR(forecastData.currentMRR)}
                </span>
              </div>
              <div>
                <span className="text-[#737373] text-[11px] block">Projected End MRR ({scenario})</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {formatINR(
                    scenario === 'optimistic'
                      ? forecastData.forecastMonths[forecastData.forecastMonths.length - 1]?.mrrOptimistic || 0
                      : scenario === 'pessimistic'
                      ? forecastData.forecastMonths[forecastData.forecastMonths.length - 1]?.mrrPessimistic || 0
                      : forecastData.forecastMonths[forecastData.forecastMonths.length - 1]?.mrrBase || 0
                  )}
                </span>
              </div>
              <div>
                <span className="text-[#737373] text-[11px] block">Cumulative Projected Revenue</span>
                <span className="font-mono font-bold text-[#171717] dark:text-[#F5F5F5]">
                  {formatINR(forecastData.summary.projectedTotalRevenueBase)}
                </span>
              </div>
              <div>
                <span className="text-[#737373] text-[11px] block">Immediate Next Cash Expected</span>
                <span className="font-mono font-bold text-emerald-600">
                  {formatINR(forecastData.forecastMonths[0]?.expectedCashCollection || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Grid Row: 2. MRR Movement & 4. Aging Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 2. MRR Movement Waterfall / Stacked Bar */}
            <div className="p-5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-2xl shadow-2xs space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  2. MRR Movement (New, Expansion, Churn)
                </h3>
                <p className="text-xs text-[#737373]">Monthly composition of recurring expansion & contraction</p>
              </div>
              <div className="h-56">
                <Bar ref={mrrMovementChartRef} data={mrrMovementData} options={chartOptions} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#737373] pt-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> New</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-indigo-500" /> Expansion</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> Contraction</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" /> Churn</span>
              </div>
            </div>

            {/* 4. Accounts Receivable Aging Bar */}
            <div className="p-5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-2xl shadow-2xs space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  4. Accounts Receivable Aging Breakdown
                </h3>
                <p className="text-xs text-[#737373]">Uncollected balances grouped into 30/60/90 day intervals</p>
              </div>
              <div className="h-56">
                <Bar ref={agingChartRef} data={agingChartData} options={chartOptions} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#737373] pt-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <span>Total Receivables: <strong className="text-[#171717] dark:text-[#F5F5F5] font-mono">{formatINR(agingReport.totalReceivables)}</strong></span>
                <span>Overdue: <strong className="text-red-600 font-mono">{formatINR(agingReport.totalOverdue)}</strong></span>
              </div>
            </div>
          </div>

          {/* Grid Row: 3. Cohort Retention Heatmap */}
          <div className="p-5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-2xl shadow-2xs space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                3. Customer Cohort Retention Heatmap
              </h3>
              <p className="text-xs text-[#737373]">Net subscription retention rate (%) through consecutive renewal cycles</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373]">
                    <th className="py-2 px-3">Cohort</th>
                    <th className="py-2 px-3 text-center">Accounts</th>
                    <th className="py-2 px-3 text-center">M0</th>
                    <th className="py-2 px-3 text-center">M1</th>
                    <th className="py-2 px-3 text-center">M2</th>
                    <th className="py-2 px-3 text-center">M3</th>
                    <th className="py-2 px-3 text-center">M4</th>
                    <th className="py-2 px-3 text-center">M5</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
                  {cohorts.map((c) => (
                    <tr key={c.cohortMonth} className="font-mono">
                      <td className="py-2.5 px-3 font-sans font-medium text-[#171717] dark:text-[#F5F5F5]">{c.cohortMonth}</td>
                      <td className="py-2.5 px-3 text-center text-[#737373]">{c.initialSize}</td>
                      <td className="py-2.5 px-3 text-center bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold">{c.m0}%</td>
                      <td className={`py-2.5 px-3 text-center ${c.m1 ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' : 'text-[#A3A3A3]'}`}>{c.m1 ? `${c.m1}%` : '—'}</td>
                      <td className={`py-2.5 px-3 text-center ${c.m2 ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' : 'text-[#A3A3A3]'}`}>{c.m2 ? `${c.m2}%` : '—'}</td>
                      <td className={`py-2.5 px-3 text-center ${c.m3 ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' : 'text-[#A3A3A3]'}`}>{c.m3 ? `${c.m3}%` : '—'}</td>
                      <td className={`py-2.5 px-3 text-center ${c.m4 ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' : 'text-[#A3A3A3]'}`}>{c.m4 ? `${c.m4}%` : '—'}</td>
                      <td className={`py-2.5 px-3 text-center ${c.m5 ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' : 'text-[#A3A3A3]'}`}>{c.m5 ? `${c.m5}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grid Row: 5. Plan Revenue Donut, 6. Status Donut, 7. Payment Mix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 5. Plan Performance Donut */}
            <div className="p-5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-2xl shadow-2xs space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  5. Plan Revenue Share
                </h3>
                <p className="text-xs text-[#737373]">Contribution per tier</p>
              </div>
              <div className="h-44">
                <Doughnut ref={plansChartRef} data={planChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              </div>
              <div className="space-y-1 text-[11px] pt-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                {planPerformance.slice(0, 3).map((p) => (
                  <div key={p.planId} className="flex justify-between">
                    <span className="text-[#737373] truncate max-w-[120px]">{p.planName}</span>
                    <span className="font-mono font-medium">{formatINR(p.monthlyRevenue)} ({p.sharePercent}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Subscription Status Distribution */}
            <div className="p-5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-2xl shadow-2xs space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  6. Subscription Lifecycle Mix
                </h3>
                <p className="text-xs text-[#737373]">Status breakdown</p>
              </div>
              <div className="h-44">
                <Doughnut ref={statusChartRef} data={statusChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              </div>
              <div className="flex justify-between text-[11px] text-[#737373] pt-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <span>Active: <strong className="text-emerald-600 font-mono">{statusCounts.Active}</strong></span>
                <span>Quotation: <strong className="text-amber-600 font-mono">{statusCounts.Quotation}</strong></span>
                <span>Confirmed: <strong className="text-indigo-600 font-mono">{statusCounts.Confirmed}</strong></span>
              </div>
            </div>

            {/* 7. Payment Method Mix */}
            <div className="p-5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-2xl shadow-2xs space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  7. Payment Method Mix
                </h3>
                <p className="text-xs text-[#737373]">Channel realization</p>
              </div>
              <div className="h-44">
                <Doughnut ref={methodChartRef} data={paymentMethodData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
              </div>
              <div className="space-y-1 text-[11px] pt-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                {paymentMix.slice(0, 3).map((pm) => (
                  <div key={pm.method} className="flex justify-between">
                    <span className="text-[#737373]">{pm.method}</span>
                    <span className="font-mono font-medium">{formatINR(pm.totalAmount)} ({pm.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 8. Churn Risk Distribution & High Risk Accounts */}
          <div className="p-5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>8. Churn Risk Intelligence Matrix</span>
                </h3>
                <p className="text-xs text-[#737373]">Deterministic 0-100 risk scoring based on delinquency, paused states, and renewal windows</p>
              </div>
              <span className="text-xs text-[#737373]">
                {churnRisks.filter((r) => r.riskScore >= 50).length} High/Critical accounts flagged
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373]">
                    <th className="py-2 px-3">Customer Account</th>
                    <th className="py-2 px-3">Company</th>
                    <th className="py-2 px-3 text-center">Risk Score</th>
                    <th className="py-2 px-3">Risk Level</th>
                    <th className="py-2 px-3">Key Delinquency Drivers</th>
                    <th className="py-2 px-3 text-right">MRR at Risk</th>
                    <th className="py-2 px-3">Recommended Retention Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
                  {churnRisks.slice(0, 6).map((r) => (
                    <tr key={r.customerId} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-850/50">
                      <td className="py-2.5 px-3 font-semibold text-[#171717] dark:text-[#F5F5F5]">{r.customerName}</td>
                      <td className="py-2.5 px-3 text-[#737373]">{r.company || 'Direct'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-bold text-xs">{r.riskScore}/100</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            r.riskLevel === 'Critical'
                              ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                              : r.riskLevel === 'High'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}
                        >
                          {r.riskLevel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs text-[#737373] truncate">{r.summary}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#171717] dark:text-[#F5F5F5]">
                        {formatINR(r.mrrAtRisk)}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                        {r.recommendedAction}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
