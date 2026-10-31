import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Columns,
  Copy,
  Edit2,
  Layers,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { BillingFrequency, Plan } from '../types';
import { useAuth } from '../lib/auth';
import { plansRepo, settingsRepo, subscriptionsRepo } from '../lib/db';
import { formatDate, formatINR } from '../lib/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';

export const PlansPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  const canManage = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'compare'>('cards');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('4999');
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('Monthly');
  const [minQuantity, setMinQuantity] = useState(1);
  const [availabilityStartDate, setAvailabilityStartDate] = useState('2025-01-01');
  const [availabilityEndDate, setAvailabilityEndDate] = useState('2028-12-31');
  const [description, setDescription] = useState('');
  const [pausable, setPausable] = useState(true);
  const [renewable, setRenewable] = useState(true);
  const [closable, setClosable] = useState(true);
  const [earlyTerminationAllowed, setEarlyTerminationAllowed] = useState(true);
  const [earlyTerminationFee, setEarlyTerminationFee] = useState('0');

  const plans = useMemo(() => plansRepo.getAll(), []);
  const subscriptions = useMemo(() => subscriptionsRepo.getAll(null), []);

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [plans, searchQuery]);

  const getActiveSubCount = (planId: string) => {
    return subscriptions.filter((s) => s.planId === planId && s.status === 'Active').length;
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setPrice('4999');
    setBillingFrequency('Monthly');
    setMinQuantity(1);
    setAvailabilityStartDate(effectiveToday);
    setAvailabilityEndDate('2028-12-31');
    setDescription('');
    setPausable(true);
    setRenewable(true);
    setClosable(true);
    setEarlyTerminationAllowed(true);
    setEarlyTerminationFee('0');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Plan) => {
    setEditingPlan(p);
    setName(p.name);
    setPrice(String(p.price));
    setBillingFrequency(p.billingFrequency);
    setMinQuantity(p.minQuantity);
    setAvailabilityStartDate(p.availabilityStartDate);
    setAvailabilityEndDate(p.availabilityEndDate);
    setDescription(p.description);
    setPausable(p.pausable);
    setRenewable(p.renewable);
    setClosable(p.closable);
    setEarlyTerminationAllowed(p.earlyTerminationAllowed);
    setEarlyTerminationFee(String(p.earlyTerminationFee));
    setIsModalOpen(true);
  };

  const handleDuplicate = (p: Plan) => {
    const newPlan: Plan = {
      ...p,
      id: 'PLAN-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      name: `${p.name} (Copy)`,
      createdAt: new Date().toISOString(),
    };
    plansRepo.create(newPlan, user);
    showToast('success', 'Plan Duplicated', `Created duplicate of "${p.name}".`);
  };

  const handleToggleArchive = (p: Plan) => {
    plansRepo.update(p.id, { active: !p.active }, user);
    showToast(
      'info',
      p.active ? 'Plan Archived' : 'Plan Reactivated',
      `"${p.name}" status updated.`
    );
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Name Required', 'Plan name is mandatory.');
      return;
    }

    const priceNum = parseFloat(price);
    const feeNum = parseFloat(earlyTerminationFee) || 0;

    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('error', 'Invalid Price', 'Plan price must be greater than zero.');
      return;
    }

    try {
      if (editingPlan) {
        plansRepo.update(
          editingPlan.id,
          {
            name: name.trim(),
            price: priceNum,
            billingFrequency,
            minQuantity: Math.max(1, minQuantity),
            availabilityStartDate,
            availabilityEndDate,
            description: description.trim(),
            pausable,
            renewable,
            closable,
            earlyTerminationAllowed,
            earlyTerminationFee: feeNum,
          },
          user
        );
        showToast('success', 'Plan Updated', `Plan ${name} saved.`);
      } else {
        const newPlan: Plan = {
          id: 'PLAN-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          name: name.trim(),
          price: priceNum,
          billingFrequency,
          minQuantity: Math.max(1, minQuantity),
          availabilityStartDate,
          availabilityEndDate,
          description: description.trim(),
          pausable,
          renewable,
          closable,
          earlyTerminationAllowed,
          earlyTerminationFee: feeNum,
          active: true,
          createdAt: new Date().toISOString(),
        };
        plansRepo.create(newPlan, user);
        showToast('success', 'Plan Added', `Plan ${name} created.`);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Save Failed', msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* 17. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            Subscription Plans
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Configure recurring tiers, pricing frequencies, and renewal agreements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle: Cards vs Comparison Matrix */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-[#111111] text-[#171717] dark:text-[#F5F5F5] shadow-2xs font-semibold'
                  : 'text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717]'
              }`}
            >
              Plans List
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`px-3 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'compare'
                  ? 'bg-white dark:bg-[#111111] text-[#171717] dark:text-[#F5F5F5] shadow-2xs font-semibold'
                  : 'text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717]'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Compare</span>
            </button>
          </div>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={openCreateModal}
            >
              New Plan
            </Button>
          )}
        </div>
      </div>

      {viewMode === 'cards' ? (
        <>
          {/* Search bar */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl">
            <div className="relative w-full max-w-xs">
              <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search plans by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <span className="text-xs text-[#737373] dark:text-[#A3A3A3]">
              {filteredPlans.length} active plans configured
            </span>
          </div>

          {/* Premium Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlans.map((p) => {
              const activeCount = getActiveSubCount(p.id);

              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl p-5 flex flex-col justify-between hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-base text-[#171717] dark:text-[#F5F5F5] tracking-tight">
                          {p.name}
                        </h3>
                        <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1 line-clamp-2">
                          {p.description}
                        </p>
                      </div>
                      <StatusBadge status={p.active ? 'Active' : 'Closed'} size="xs" />
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#F5F5F5] dark:border-[#1F1F1F]">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono text-[#171717] dark:text-[#F5F5F5] tabular-nums">
                          {formatINR(p.price)}
                        </span>
                        <span className="text-xs text-[#737373] dark:text-[#A3A3A3]">
                          /{p.billingFrequency.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-[#737373] dark:text-[#A3A3A3]">
                      <div className="flex justify-between">
                        <span>Min. Quantity:</span>
                        <span className="font-mono text-[#171717] dark:text-[#F5F5F5]">
                          {p.minQuantity} units
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Subscriptions:</span>
                        <span className="font-mono font-semibold text-[#171717] dark:text-[#F5F5F5]">
                          {activeCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pausable / Renewable:</span>
                        <span className="text-[#171717] dark:text-[#F5F5F5]">
                          {p.pausable ? 'Yes' : 'No'} · {p.renewable ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {p.earlyTerminationAllowed && (
                        <div className="flex justify-between">
                          <span>Early Termination Fee:</span>
                          <span className="font-mono text-amber-600 dark:text-amber-400">
                            {p.earlyTerminationFee > 0 ? formatINR(p.earlyTerminationFee) : 'Free'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {canManage && (
                    <div className="mt-5 pt-3 border-t border-[#F5F5F5] dark:border-[#1F1F1F] flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={<Edit2 className="w-3 h-3" />}
                          onClick={() => openEditModal(p)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={<Copy className="w-3 h-3" />}
                          onClick={() => handleDuplicate(p)}
                        >
                          Duplicate
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleToggleArchive(p)}
                      >
                        {p.active ? 'Archive' : 'Restore'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* 18. Plan Comparison Matrix */
        <div className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-[#171717] dark:text-[#F5F5F5]">
              Plan Comparison Matrix
            </h3>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">
              Side-by-side feature, pricing, and contract policy comparison
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5E5] dark:border-[#262626]">
                  <th className="py-3 px-4 font-semibold text-[#737373] dark:text-[#A3A3A3] w-1/4">
                    Features & Policies
                  </th>
                  {plans.slice(0, 4).map((p) => (
                    <th key={p.id} className="py-3 px-4 font-semibold text-[#171717] dark:text-[#F5F5F5] text-center">
                      <span className="block text-sm">{p.name}</span>
                      <span className="font-mono text-base font-bold text-indigo-600 dark:text-indigo-400 block mt-1">
                        {formatINR(p.price)}
                      </span>
                      <span className="text-[10px] text-[#A3A3A3] font-normal">
                        per {p.billingFrequency.toLowerCase()}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
                <tr>
                  <td className="py-3 px-4 font-medium text-[#171717] dark:text-[#F5F5F5]">
                    Billing Frequency
                  </td>
                  {plans.slice(0, 4).map((p) => (
                    <td key={p.id} className="py-3 px-4 text-center text-[#737373] dark:text-[#A3A3A3]">
                      {p.billingFrequency}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-[#171717] dark:text-[#F5F5F5]">
                    Minimum Quantity
                  </td>
                  {plans.slice(0, 4).map((p) => (
                    <td key={p.id} className="py-3 px-4 text-center font-mono text-[#737373] dark:text-[#A3A3A3]">
                      {p.minQuantity} seat(s)
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-[#171717] dark:text-[#F5F5F5]">
                    Pause Subscription Allowed
                  </td>
                  {plans.slice(0, 4).map((p) => (
                    <td key={p.id} className="py-3 px-4 text-center">
                      {p.pausable ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-[#A3A3A3] mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-[#171717] dark:text-[#F5F5F5]">
                    Auto-Renewable
                  </td>
                  {plans.slice(0, 4).map((p) => (
                    <td key={p.id} className="py-3 px-4 text-center">
                      {p.renewable ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-[#A3A3A3] mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-[#171717] dark:text-[#F5F5F5]">
                    Early Termination Fee
                  </td>
                  {plans.slice(0, 4).map((p) => (
                    <td key={p.id} className="py-3 px-4 text-center font-mono text-[#737373] dark:text-[#A3A3A3]">
                      {p.earlyTerminationFee > 0 ? formatINR(p.earlyTerminationFee) : 'None'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plan Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-md w-full flex flex-col max-h-[92vh] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#171717] dark:text-[#F5F5F5]">
                {editingPlan ? 'Edit Subscription Plan' : 'Create New Plan'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Plan Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Business Pro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Base Recurring Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Frequency
                  </label>
                  <select
                    value={billingFrequency}
                    onChange={(e) => setBillingFrequency(e.target.value as BillingFrequency)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Tier features, user entitlements..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                />
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-[#E5E5E5] dark:border-[#262626] space-y-2">
                <span className="font-semibold text-[11px] text-[#171717] dark:text-[#F5F5F5] block">
                  Plan Policy Flags
                </span>
                <label className="flex items-center gap-2 text-[#737373] dark:text-[#A3A3A3] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pausable}
                    onChange={(e) => setPausable(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Permit customers/staff to pause subscription</span>
                </label>
                <label className="flex items-center gap-2 text-[#737373] dark:text-[#A3A3A3] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={renewable}
                    onChange={(e) => setRenewable(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Allow annual/cycle renewals</span>
                </label>
                <label className="flex items-center gap-2 text-[#737373] dark:text-[#A3A3A3] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={earlyTerminationAllowed}
                    onChange={(e) => setEarlyTerminationAllowed(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Allow early contract termination</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
