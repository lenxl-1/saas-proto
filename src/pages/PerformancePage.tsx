import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Cpu,
  Database,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Subscription, SubscriptionLine } from '../types';
import { useAuth } from '../lib/auth';
import {
  customersRepo,
  plansRepo,
  productsRepo,
  settingsRepo,
  subscriptionsRepo,
} from '../lib/db';
import { calculateTotals } from '../lib/pricing';
import { seedDemoData } from '../lib/seed';
import { Forbidden403 } from '../components/common/Forbidden403';
import { Button } from '../components/ui/Button';
import { MetricCard } from '../components/ui/MetricCard';
import { useToast } from '../context/ToastContext';

interface BenchmarkResult {
  operation: string;
  count: number;
  durationMs: number;
  slaLimitMs: number;
  status: 'Passed' | 'Failed';
}

export const PerformancePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  if (user?.role !== 'admin') {
    return <Forbidden403 reason="Only Administrators can execute performance benchmarks." />;
  }

  const [isGenerating, setIsGenerating] = useState(false);
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>([]);
  const [currentSubCount, setCurrentSubCount] = useState(() => subscriptionsRepo.getAll(null).length);

  const runBenchmarkSuite = () => {
    const results: BenchmarkResult[] = [];

    // Test 1: Full GetAll()
    const t0 = performance.now();
    const all = subscriptionsRepo.getAll(null);
    const t1 = performance.now();
    results.push({
      operation: 'Retrieve All Subscriptions (getAll)',
      count: all.length,
      durationMs: Math.round((t1 - t0) * 100) / 100,
      slaLimitMs: 2000,
      status: t1 - t0 < 2000 ? 'Passed' : 'Failed',
    });

    // Test 2: Status filtering across entire set
    const t2 = performance.now();
    const active = all.filter((s) => s.status === 'Active');
    const t3 = performance.now();
    results.push({
      operation: 'Filter by Status (status === "Active")',
      count: active.length,
      durationMs: Math.round((t3 - t2) * 100) / 100,
      slaLimitMs: 500,
      status: t3 - t2 < 500 ? 'Passed' : 'Failed',
    });

    // Test 3: Financial Aggregation & MRR Math
    const t4 = performance.now();
    let sum = 0;
    for (const s of all) {
      sum += s.grandTotal;
    }
    const t5 = performance.now();
    results.push({
      operation: 'Calculate Full Financial Aggregates & Volume',
      count: all.length,
      durationMs: Math.round((t5 - t4) * 100) / 100,
      slaLimitMs: 1000,
      status: t5 - t4 < 1000 ? 'Passed' : 'Failed',
    });

    // Test 4: Customer Index Lookups
    const t6 = performance.now();
    for (let i = 0; i < 500; i++) {
      subscriptionsRepo.getById(`SUB-${String(i).padStart(6, '0')}`, null);
    }
    const t7 = performance.now();
    results.push({
      operation: '500 Sequential Indexed Lookups (getById)',
      count: 500,
      durationMs: Math.round((t7 - t6) * 100) / 100,
      slaLimitMs: 500,
      status: t7 - t6 < 500 ? 'Passed' : 'Failed',
    });

    setBenchmarks(results);
    setCurrentSubCount(all.length);
    showToast('success', 'Benchmark Complete', `Executed 4 test suites across ${all.length} records.`);
  };

  const handleGenerate5000 = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const customers = customersRepo.getAll(null);
        const plans = plansRepo.getAll();
        const products = productsRepo.getAll();

        const bigList: Subscription[] = [];
        const statuses = ['Active', 'Active', 'Confirmed', 'Quotation', 'Closed'];

        for (let i = 1; i <= 5000; i++) {
          const cust = customers[i % customers.length] || customers[0];
          const plan = plans[i % plans.length] || plans[0];
          const prod = products[i % products.length] || products[0];

          const line: SubscriptionLine = {
            id: `SUBL-B-${i}`,
            productId: prod.id,
            productName: prod.name,
            quantity: 1,
            unitPrice: prod.sellingPrice,
            variantExtra: 0,
            taxPercent: 18,
            discountPercent: 0,
            lineTotal: prod.sellingPrice * 1.18,
          };

          const totals = calculateTotals([line], 0);

          bigList.push({
            id: `SUB-B-${String(i).padStart(6, '0')}`,
            subscriptionNumber: `SUB-2026-B${String(i).padStart(5, '0')}`,
            customerId: cust.id,
            planId: plan.id,
            status: statuses[i % statuses.length] as any,
            startDate: '2026-01-01',
            expiryDate: '2027-01-01',
            nextBillingDate: '2026-11-01',
            paymentTerms: 'Net 15',
            lines: [line],
            subtotal: totals.subtotal,
            discountTotal: 0,
            taxTotal: totals.taxTotal,
            grandTotal: totals.grandTotal,
            createdAt: new Date().toISOString(),
          });
        }

        subscriptionsRepo.rawSetAll(bigList);
        setCurrentSubCount(bigList.length);
        setIsGenerating(false);
        showToast('success', '5,000 Records Generated', 'In-memory indexed caches rebuilt with 5,000 subscriptions.');
        runBenchmarkSuite();
      } catch (err: unknown) {
        setIsGenerating(false);
        const msg = err instanceof Error ? err.message : String(err);
        showToast('error', 'Generation Error', msg);
      }
    }, 100);
  };

  const handleResetToStandard = async () => {
    setIsGenerating(true);
    await seedDemoData(true);
    setCurrentSubCount(subscriptionsRepo.getAll(null).length);
    setIsGenerating(false);
    showToast('info', 'Database Reset', 'Reset to initial standard demo dataset (300 subs, 120 customers, 600+ invoices).');
    runBenchmarkSuite();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            System Performance Benchmark
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Verification suite testing sub-second rendering, in-memory Map indexing, and pagination scalability under load.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Play className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
            onClick={runBenchmarkSuite}
          >
            Run Benchmark
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Zap className="w-3.5 h-3.5" />}
            isLoading={isGenerating}
            onClick={handleGenerate5000}
          >
            Generate 5,000 Subscriptions
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            disabled={isGenerating}
            onClick={handleResetToStandard}
          >
            Reset Dataset
          </Button>
        </div>
      </div>

      {/* Dataset Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Subscriptions In Memory"
          value={currentSubCount.toLocaleString('en-IN')}
          subtext="Indexed Map storage"
          icon={<Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
        />
        <MetricCard
          label="Architectural SLA Target"
          value="< 2,000 ms"
          subtext="Strict interactive SLA limit"
          icon={<Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
        />
        <MetricCard
          label="Query Method"
          value="O(1) Map Hash"
          subtext="Page size: 20 rows per chunk"
          icon={<Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
        />
      </div>

      {/* Benchmark Results Table */}
      <div className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">
            Benchmark Latency Telemetry
          </h3>
          <span className="text-[11px] font-mono text-[#A3A3A3] dark:text-[#737373]">
            performance.now() timer
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] font-medium">
              <tr>
                <th className="py-2.5 px-4 font-medium">Test Operation</th>
                <th className="py-2.5 px-4 font-medium text-center">Items Evaluated</th>
                <th className="py-2.5 px-4 font-medium text-right">Measured Latency</th>
                <th className="py-2.5 px-4 font-medium text-right">Target SLA</th>
                <th className="py-2.5 px-4 font-medium text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
              {benchmarks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#737373] dark:text-[#A3A3A3]">
                    Click "Run Benchmark" or "Generate 5,000 Subscriptions" to execute real in-browser stress tests.
                  </td>
                </tr>
              ) : (
                benchmarks.map((b, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-neutral-50/80 dark:hover:bg-neutral-850/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-[#171717] dark:text-[#F5F5F5]">
                      {b.operation}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[#737373] dark:text-[#A3A3A3]">
                      {b.count.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#171717] dark:text-[#F5F5F5]">
                      {b.durationMs} ms
                    </td>
                    <td className="py-3 px-4 text-right text-[#737373] dark:text-[#A3A3A3] font-mono text-[11px]">
                      &lt; {b.slaLimitMs} ms
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{b.status}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Assistant & System Settings Card */}
      <div className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5E5E5] dark:border-[#262626]">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
              System & AI Assistant Settings
            </h3>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3]">
              Configure Gemini intelligence and workspace automation policies.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850/50 border border-[#E5E5E5] dark:border-[#262626]">
          <div>
            <span className="font-semibold text-xs text-[#171717] dark:text-[#F5F5F5] block">
              Enable AI Revenue Assistant
            </span>
            <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] mt-0.5 max-w-md">
              Activates the floating AI chat assistant on all pages for role-scoped forecasting, aging queries, and automated billing actions.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={settingsRepo.get().enableAiAssistant !== false}
              onChange={(e) => {
                settingsRepo.update({ enableAiAssistant: e.target.checked });
                showToast(
                  'info',
                  'Settings Saved',
                  `AI assistant ${e.target.checked ? 'enabled' : 'disabled'}.`
                );
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
};
