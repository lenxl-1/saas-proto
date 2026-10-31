import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import { BillingFrequency, Plan, User } from '../../types';
import { plansRepo, settingsRepo, subscriptionsRepo } from '../../lib/db';
import { formatDate, formatINR } from '../../lib/formatters';
import { Button } from '../ui/Button';
import { PlanDetailModal } from './PlanDetailModal';
import { SubscribeModal } from './SubscribeModal';
import { useToast } from '../../context/ToastContext';

interface CustomerPlanExplorerProps {
  currentUser: User;
}

export const CustomerPlanExplorer: React.FC<CustomerPlanExplorerProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  // Filters state
  const [frequencyFilter, setFrequencyFilter] = useState<'All' | BillingFrequency>('All');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedPlanForDetail, setSelectedPlanForDetail] = useState<Plan | null>(null);
  const [subscribingPlan, setSubscribingPlan] = useState<Plan | null>(null);

  // Load plans & customer's subscriptions
  const allPlans = useMemo(() => plansRepo.getAll(), []);
  const customerSubscriptions = useMemo(
    () => subscriptionsRepo.getAll(currentUser),
    [currentUser]
  );

  // Identify plans customer currently has active subscriptions on
  const activePlanIds = useMemo(() => {
    return new Set(
      customerSubscriptions
        .filter((s) => s.status === 'Active')
        .map((s) => s.planId)
    );
  }, [customerSubscriptions]);

  // Identify all plans customer has any subscription history on
  const customerSubscribedPlanIds = useMemo(() => {
    return new Set(customerSubscriptions.map((s) => s.planId));
  }, [customerSubscriptions]);

  // Check if today is inside availability window
  const isPlanAvailable = (plan: Plan) => {
    if (!plan.active) return false;
    const today = new Date(effectiveToday).getTime();
    const start = new Date(plan.availabilityStartDate).getTime();
    const end = new Date(plan.availabilityEndDate).getTime();
    return today >= start && today <= end;
  };

  // Filtered & Sorted plans list
  const filteredPlans = useMemo(() => {
    return allPlans
      .filter((plan) => {
        // Hide inactive/archived plans UNLESS customer already has a subscription on them
        if (!plan.active && !customerSubscribedPlanIds.has(plan.id)) {
          return false;
        }

        // Frequency filter
        if (frequencyFilter !== 'All' && plan.billingFrequency !== frequencyFilter) {
          return false;
        }

        // Search text
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = plan.name.toLowerCase().includes(q);
          const matchDesc = plan.description.toLowerCase().includes(q);
          if (!matchName && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'asc') return a.price - b.price;
        return b.price - a.price;
      });
  }, [allPlans, frequencyFilter, searchQuery, sortOrder, customerSubscribedPlanIds]);

  // Monthly equivalent text
  const getMonthlyEquivalent = (plan: Plan) => {
    switch (plan.billingFrequency) {
      case 'Yearly':
        return `≈ ${formatINR(Math.round(plan.price / 12))}/month billed yearly`;
      case 'Weekly':
        return `≈ ${formatINR(Math.round((plan.price * 52) / 12))}/month billed weekly`;
      case 'Daily':
        return `≈ ${formatINR(Math.round(plan.price * 30))}/month billed daily`;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1.1 Customer Header */}
      <div className="border-b border-[#E5E5E5] dark:border-[#262626] pb-4">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
          Choose your plan
        </h1>
        <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
          Pick a plan that fits your team and request a quotation in one click.
        </p>
      </div>

      {/* Filter and Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl shadow-2xs">
        {/* Frequency Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(['All', 'Monthly', 'Yearly', 'Weekly', 'Daily'] as const).map((freq) => (
            <button
              key={freq}
              onClick={() => setFrequencyFilter(freq)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                frequencyFilter === freq
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xs'
                  : 'text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {freq}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#A3A3A3] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Sort */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="text-xs px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="asc">Price: Low to High</option>
            <option value="desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Plan Cards Grid */}
      {filteredPlans.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-2xl">
          <Layers className="w-8 h-8 text-[#A3A3A3] mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">No matching plans found</h3>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1 max-w-sm mx-auto">
            Try adjusting your search query or billing frequency filters.
          </p>
          <Button
            variant="outline"
            size="xs"
            className="mt-4"
            onClick={() => {
              setFrequencyFilter('All');
              setSearchQuery('');
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => {
            const available = isPlanAvailable(plan);
            const isCurrent = activePlanIds.has(plan.id);
            const isArchived = !plan.active;
            const monthlyEq = getMonthlyEquivalent(plan);
            const isBestValue =
              plan.billingFrequency === 'Yearly' ||
              plan.name.toLowerCase().includes('pro') ||
              plan.name.toLowerCase().includes('enterprise');

            return (
              <div
                key={plan.id}
                tabIndex={0}
                role="button"
                onClick={() => setSelectedPlanForDetail(plan)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedPlanForDetail(plan);
                  }
                }}
                className={`relative group bg-white dark:bg-[#111111] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isCurrent
                    ? 'border-indigo-500 dark:border-indigo-500 ring-1 ring-indigo-500/20'
                    : isBestValue
                    ? 'border-indigo-200 dark:border-indigo-900/50'
                    : 'border-[#E5E5E5] dark:border-[#262626] hover:border-[#D4D4D4] dark:hover:border-[#333333]'
                }`}
              >
                {/* Badges row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 rounded-full">
                        Current plan
                      </span>
                    )}
                    {isBestValue && !isCurrent && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/50 rounded-full flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        Best value
                      </span>
                    )}
                    {isArchived && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full">
                        Archived
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-[#737373] dark:text-[#A3A3A3] uppercase tracking-wider">
                    {plan.billingFrequency}
                  </span>
                </div>

                {/* Plan Header */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-[#171717] dark:text-[#F5F5F5] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {plan.name}
                  </h3>

                  <p className="text-xs text-[#737373] dark:text-[#A3A3A3] line-clamp-2 min-h-[2rem]">
                    {plan.description || 'Comprehensive subscription package for modern teams.'}
                  </p>

                  {/* Pricing Box */}
                  <div className="pt-3 pb-2 border-t border-[#F5F5F5] dark:divide-[#1F1F1F]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-mono text-[#171717] dark:text-[#F5F5F5]">
                        {formatINR(plan.price)}
                      </span>
                      <span className="text-xs text-[#737373]">
                        / {plan.billingFrequency.toLowerCase()}
                      </span>
                    </div>

                    {monthlyEq && (
                      <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                        {monthlyEq}
                      </p>
                    )}
                  </div>

                  {/* Highlights */}
                  <div className="space-y-1.5 py-2 text-xs text-[#737373] dark:text-[#A3A3A3]">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Min. commitment: {plan.minQuantity} {plan.minQuantity > 1 ? 'units' : 'unit'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{plan.pausable ? 'Pause / Resume supported' : 'Continuous cycle'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>18% GST tax invoice generated</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-4 border-t border-[#E5E5E5] dark:border-[#262626] mt-4" onClick={(e) => e.stopPropagation()}>
                  {isArchived ? (
                    <button
                      disabled
                      className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[#A3A3A3] cursor-not-allowed text-center"
                    >
                      Archived Tier
                    </button>
                  ) : available ? (
                    <Button
                      variant={isCurrent ? 'outline' : 'primary'}
                      size="sm"
                      className="w-full justify-center"
                      onClick={() => setSubscribingPlan(plan)}
                    >
                      {isCurrent ? 'Subscribe Additional License' : 'Subscribe'}
                    </Button>
                  ) : (
                    <div className="relative group/tooltip">
                      <button
                        disabled
                        className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[#A3A3A3] cursor-not-allowed text-center"
                      >
                        Not available
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:block z-20 px-2.5 py-1 text-[10px] text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 rounded shadow-lg whitespace-nowrap">
                        Available from {formatDate(plan.availabilityStartDate)} to {formatDate(plan.availabilityEndDate)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Detail Modal */}
      {selectedPlanForDetail && (
        <PlanDetailModal
          plan={selectedPlanForDetail}
          isOpen={Boolean(selectedPlanForDetail)}
          onClose={() => setSelectedPlanForDetail(null)}
          onSubscribe={(plan) => setSubscribingPlan(plan)}
          isAvailable={isPlanAvailable(selectedPlanForDetail)}
          isCurrentPlan={activePlanIds.has(selectedPlanForDetail.id)}
          isArchived={!selectedPlanForDetail.active}
          effectiveToday={effectiveToday}
        />
      )}

      {/* Subscribe 3-step Modal */}
      {subscribingPlan && (
        <SubscribeModal
          plan={subscribingPlan}
          currentUser={currentUser}
          isOpen={Boolean(subscribingPlan)}
          onClose={() => setSubscribingPlan(null)}
          onSuccess={(subNumber) => {
            showToast('success', 'Quotation Generated', `Quotation ${subNumber} created. You can confirm it anytime.`);
          }}
        />
      )}
    </div>
  );
};
