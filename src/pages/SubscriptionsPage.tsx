import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Lock,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  Customer,
  Plan,
  Product,
  Subscription,
  SubscriptionLine,
  SubscriptionStatus,
} from '../types';
import { useAuth } from '../lib/auth';
import {
  auditLogsRepo,
  customersRepo,
  discountsRepo,
  invoicesRepo,
  plansRepo,
  productsRepo,
  settingsRepo,
  subscriptionsRepo,
} from '../lib/db';
import { formatDate, formatINR, formatINRCompact } from '../lib/formatters';
import { generateQuotationPDF } from '../lib/pdf';
import { calculateOrderLine, calculateTotals } from '../lib/pricing';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { QuotationViewModal } from '../components/quotations/QuotationViewModal';
import { CustomerActionModal } from '../components/subscriptions/CustomerActionModal';
import { SubscriptionRequestsTab } from '../components/subscriptions/SubscriptionRequestsTab';
import { Button } from '../components/ui/Button';
import { LifecycleStepper } from '../components/ui/LifecycleStepper';
import { MetricCard } from '../components/ui/MetricCard';
import { useToast } from '../context/ToastContext';
import { SubscriptionRequestType } from '../types';
import { requestsRepo } from '../lib/db';

export const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  const canManage = user?.role === 'admin' || user?.role === 'staff';
  const isCustomer = user?.role === 'customer';

  // Subscriptions vs Requests tab (for staff/admin)
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'requests'>('subscriptions');

  // Customer Request Modal State
  const [customerModal, setCustomerModal] = useState<{
    isOpen: boolean;
    sub: Subscription | null;
    type: SubscriptionRequestType;
  }>({ isOpen: false, sub: null, type: 'pause' });

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modals & Detail
  const [viewingSubId, setViewingSubId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSubForInspection, setSelectedSubForInspection] = useState<Subscription | null>(
    null
  );

  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    isDestructive?: boolean;
  }>({ isOpen: false, title: '', message: '', action: () => {} });

  // Data
  const subscriptions = useMemo(() => subscriptionsRepo.getAll(user), [user]);
  const customers = useMemo(() => customersRepo.getAll(user), [user]);
  const plans = useMemo(() => plansRepo.getAll(), []);
  const products = useMemo(() => productsRepo.getAll().filter((p) => p.active), []);
  const discounts = useMemo(() => discountsRepo.getAll().filter((d) => d.active), []);
  const auditLogs = useMemo(() => auditLogsRepo.getAll(user), [user]);
  const pendingRequestsCount = useMemo(() => {
    return requestsRepo.getAll(user).filter((r) => r.status === 'Pending').length;
  }, [user]);

  // Filtered dataset
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
      if (customerFilter !== 'all' && sub.customerId !== customerFilter) return false;
      if (planFilter !== 'all' && sub.planId !== planFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const subNum = sub.subscriptionNumber.toLowerCase();
        const customer = customers.find((c) => c.id === sub.customerId);
        const custName = customer?.name.toLowerCase() || '';
        const compName = customer?.company?.toLowerCase() || '';
        if (!subNum.includes(query) && !custName.includes(query) && !compName.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [subscriptions, statusFilter, customerFilter, planFilter, searchQuery, customers]);

  // Paginated items
  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubscriptions.slice(start, start + pageSize);
  }, [filteredSubscriptions, currentPage, pageSize]);

  // Status transition handler
  const handleTransitionStatus = (sub: Subscription, newStatus: SubscriptionStatus) => {
    const plan = plans.find((p) => p.id === sub.planId);

    if (newStatus === 'Closed' && plan && !plan.closable) {
      showToast('error', 'Action Restricted', `Plan "${plan.name}" does not permit closing.`);
      return;
    }

    try {
      subscriptionsRepo.update(sub.id, { status: newStatus }, user);
      showToast('success', 'Status Updated', `Subscription transitioned to ${newStatus}.`);
      if (selectedSubForInspection?.id === sub.id) {
        setSelectedSubForInspection({ ...selectedSubForInspection, status: newStatus });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Transition Denied', msg);
    }
  };

  // Plan actions
  const handlePause = (sub: Subscription) => {
    const plan = plans.find((p) => p.id === sub.planId);
    if (!plan?.pausable) {
      showToast('error', 'Not Allowed', 'This plan does not permit pausing.');
      return;
    }
    subscriptionsRepo.update(
      sub.id,
      { pausedAt: effectiveToday, notes: (sub.notes || '') + `\nPaused on ${effectiveToday}` },
      user
    );
    showToast('info', 'Subscription Paused', 'Recurring billing suspended until resumed.');
    if (selectedSubForInspection?.id === sub.id) {
      setSelectedSubForInspection({ ...selectedSubForInspection, pausedAt: effectiveToday });
    }
  };

  const handleResume = (sub: Subscription) => {
    subscriptionsRepo.update(
      sub.id,
      { pausedAt: undefined, notes: (sub.notes || '') + `\nResumed on ${effectiveToday}` },
      user
    );
    showToast('success', 'Subscription Resumed', 'Subscription is active.');
    if (selectedSubForInspection?.id === sub.id) {
      setSelectedSubForInspection({ ...selectedSubForInspection, pausedAt: undefined });
    }
  };

  const handleEarlyTerminate = (sub: Subscription) => {
    const plan = plans.find((p) => p.id === sub.planId);
    if (!plan?.earlyTerminationAllowed) {
      showToast('error', 'Not Allowed', 'Early termination is not permitted by this plan.');
      return;
    }

    setConfirmModalData({
      isOpen: true,
      title: 'Confirm Early Termination',
      message: `Are you sure you want to early terminate subscription ${sub.subscriptionNumber}? ${
        plan.earlyTerminationFee > 0
          ? `An early termination fee of ₹${plan.earlyTerminationFee.toLocaleString('en-IN')} applies.`
          : ''
      }`,
      isDestructive: true,
      action: () => {
        subscriptionsRepo.update(
          sub.id,
          {
            status: 'Closed',
            closedAt: effectiveToday,
            earlyTerminatedAt: effectiveToday,
            notes:
              (sub.notes || '') +
              `\nEarly terminated on ${effectiveToday}. Fee: ₹${plan.earlyTerminationFee}`,
          },
          user
        );
        showToast('info', 'Subscription Terminated', 'Closed with early termination status.');
        if (selectedSubForInspection?.id === sub.id) {
          setSelectedSubForInspection({ ...selectedSubForInspection, status: 'Closed' });
        }
      },
    });
  };

  const handleRenew = (sub: Subscription) => {
    const plan = plans.find((p) => p.id === sub.planId);
    if (!plan?.renewable) {
      showToast('error', 'Not Allowed', 'This plan is marked as non-renewable.');
      return;
    }

    const curExpiry = new Date(sub.expiryDate);
    curExpiry.setFullYear(curExpiry.getFullYear() + 1);
    const newExpiry = curExpiry.toISOString().split('T')[0];

    subscriptionsRepo.update(
      sub.id,
      {
        expiryDate: newExpiry,
        notes: (sub.notes || '') + `\nRenewed on ${effectiveToday} until ${newExpiry}`,
      },
      user
    );
    showToast('success', 'Subscription Renewed', `Expiry date extended to ${formatDate(newExpiry)}.`);
    if (selectedSubForInspection?.id === sub.id) {
      setSelectedSubForInspection({ ...selectedSubForInspection, expiryDate: newExpiry });
    }
  };

  // Create Subscription Form State
  const [newSubCustomer, setNewSubCustomer] = useState<string>(customers[0]?.id || '');
  const [newSubPlan, setNewSubPlan] = useState<string>(plans[0]?.id || '');
  const [newSubTerms, setNewSubTerms] = useState<string>('Net 15');
  const [newSubStatus, setNewSubStatus] = useState<SubscriptionStatus>('Quotation');
  const [newSubDiscount, setNewSubDiscount] = useState<string>('');
  const [newSubLines, setNewSubLines] = useState<
    Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      discountPercent: number;
    }>
  >([{ productId: products[0]?.id || '', quantity: 1, discountPercent: 0 }]);

  const handleAddLine = () => {
    if (products.length === 0) return;
    setNewSubLines([...newSubLines, { productId: products[0].id, quantity: 1, discountPercent: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    setNewSubLines(newSubLines.filter((_, i) => i !== index));
  };

  const handleCreateSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCustomer) {
      showToast('error', 'Customer Required', 'Please select a customer.');
      return;
    }
    if (!newSubPlan) {
      showToast('error', 'Plan Required', 'Please select a plan.');
      return;
    }
    if (newSubLines.length === 0) {
      showToast('error', 'Order Lines Required', 'At least one product line is required.');
      return;
    }

    const plan = plans.find((p) => p.id === newSubPlan);
    const totalQty = newSubLines.reduce((acc, l) => acc + l.quantity, 0);

    if (plan && totalQty < plan.minQuantity) {
      showToast(
        'error',
        'Minimum Quantity Not Met',
        `Plan "${plan.name}" requires at least ${plan.minQuantity} items.`
      );
      return;
    }

    const builtLines: SubscriptionLine[] = [];
    for (const l of newSubLines) {
      const prod = products.find((p) => p.id === l.productId);
      if (!prod) continue;
      const variant = prod.variants.find((v) => v.id === l.variantId);
      const varExtra = variant ? variant.extraPrice : 0;
      const calc = calculateOrderLine(prod.sellingPrice, varExtra, l.quantity, l.discountPercent, 18);

      builtLines.push({
        id: 'SUBL-' + Math.random().toString(36).substring(2, 9),
        productId: prod.id,
        productName: prod.name,
        variantId: variant?.id,
        variantName: variant?.value,
        quantity: l.quantity,
        unitPrice: prod.sellingPrice,
        variantExtra: varExtra,
        taxPercent: 18,
        discountPercent: l.discountPercent,
        lineTotal: calc.lineTotal,
      });
    }

    const totals = calculateTotals(builtLines, 0);
    const allSubs = subscriptionsRepo.getAll(null);
    const subNumber = `SUB-2026-${String(allSubs.length + 1).padStart(6, '0')}`;

    const startDate = effectiveToday;
    const expiryDate = new Date(
      new Date(effectiveToday).setFullYear(new Date(effectiveToday).getFullYear() + 1)
    )
      .toISOString()
      .split('T')[0];

    const newSub: Subscription = {
      id: 'SUB-' + Math.random().toString(36).substring(2, 9),
      subscriptionNumber: subNumber,
      customerId: newSubCustomer,
      planId: newSubPlan,
      status: newSubStatus,
      startDate,
      expiryDate,
      nextBillingDate: startDate,
      paymentTerms: newSubTerms,
      lines: builtLines,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      appliedDiscountId: newSubDiscount || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      subscriptionsRepo.create(newSub, user);
      showToast('success', 'Subscription Created', `Created ${subNumber} in ${newSubStatus} status.`);
      setIsCreateModalOpen(false);
      setNewSubLines([{ productId: products[0]?.id || '', quantity: 1, discountPercent: 0 }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Creation Failed', msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* 20. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            Subscriptions
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            {isCustomer
              ? 'Your active service agreements, quotations, and recurring billing plans.'
              : 'Automated recurring agreements and lifecycle management.'}
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            New Subscription
          </Button>
        )}
      </div>

      {/* Staff / Admin Tab Selector */}
      {canManage && (
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-850 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'subscriptions'
                ? 'bg-white dark:bg-[#111111] text-[#171717] dark:text-[#F5F5F5] shadow-2xs font-semibold'
                : 'text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5]'
            }`}
          >
            Subscriptions ({subscriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-[#111111] text-[#171717] dark:text-[#F5F5F5] shadow-2xs font-semibold'
                : 'text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5]'
            }`}
          >
            <span>Customer Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>
      )}

      {activeTab === 'requests' && canManage ? (
        <SubscriptionRequestsTab currentUser={user!} />
      ) : (
        <>
          {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by subscription #, customer..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-xs text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
          >
            <option value="all">All statuses ({subscriptions.length})</option>
            <option value="Active">Active</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Quotation">Quotation</option>
            <option value="Draft">Draft</option>
            <option value="Closed">Closed</option>
          </select>

          {/* Plan filter */}
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-xs text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
          >
            <option value="all">All plans</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subscriptions Data Table */}
      <div className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] font-medium">
              <tr>
                <th className="py-2.5 px-4 font-medium">Subscription</th>
                <th className="py-2.5 px-4 font-medium">Customer</th>
                <th className="py-2.5 px-4 font-medium">Plan</th>
                <th className="py-2.5 px-4 font-medium">Billing Cycle</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Amount</th>
                <th className="py-2.5 px-4 font-medium">Next Billing</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
              {paginatedSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#737373] dark:text-[#A3A3A3]">
                    No subscriptions matching selected filters.
                  </td>
                </tr>
              ) : (
                paginatedSubscriptions.map((sub) => {
                  const customer = customers.find((c) => c.id === sub.customerId);
                  const plan = plans.find((p) => p.id === sub.planId);
                  const isPaused = Boolean(sub.pausedAt);

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => setSelectedSubForInspection(sub)}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-850/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-[#171717] dark:text-[#F5F5F5]">
                        {sub.subscriptionNumber}
                        {isPaused && (
                          <span className="ml-2 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1 py-0.2 rounded font-sans">
                            Paused
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                          {customer?.name || 'Customer'}
                        </span>
                        {customer?.company && (
                          <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] block">
                            {customer.company}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#171717] dark:text-[#F5F5F5] font-medium">
                        {plan?.name || 'Standard'}
                      </td>
                      <td className="py-3 px-4 text-[#737373] dark:text-[#A3A3A3]">
                        {plan?.billingFrequency || 'Monthly'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={sub.status} size="xs" />
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] tabular-nums">
                        {formatINR(sub.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-[#737373] dark:text-[#A3A3A3] font-mono text-[11px] whitespace-nowrap">
                        {formatDate(sub.nextBillingDate)}
                      </td>
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedSubForInspection(sub)}
                            className="p-1 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded transition-colors"
                            title="Inspect Subscription"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {sub.status === 'Draft' && canManage && (
                            <button
                              onClick={() => handleTransitionStatus(sub, 'Quotation')}
                              className="px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200/50"
                            >
                              Send Quote
                            </button>
                          )}

                          {sub.status === 'Quotation' && (
                            <button
                              onClick={() => handleTransitionStatus(sub, 'Confirmed')}
                              className="px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded border border-indigo-200/50"
                            >
                              Confirm
                            </button>
                          )}

                          {sub.status === 'Confirmed' && canManage && (
                            <button
                              onClick={() => handleTransitionStatus(sub, 'Active')}
                              className="px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-200/50"
                            >
                              Activate
                            </button>
                          )}

                          {sub.status === 'Active' && plan?.pausable && canManage && (
                            <button
                              onClick={() => (isPaused ? handleResume(sub) : handlePause(sub))}
                              className="p-1 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded"
                              title={isPaused ? 'Resume' : 'Pause'}
                            >
                              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                            </button>
                          )}

                          {/* Customer Actions on Active */}
                          {sub.status === 'Active' && isCustomer && (
                            <div className="flex items-center gap-1">
                              {plan?.pausable && (
                                <button
                                  onClick={() =>
                                    setCustomerModal({ isOpen: true, sub, type: 'pause' })
                                  }
                                  className="px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200/50 hover:bg-amber-100"
                                >
                                  Pause
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  setCustomerModal({ isOpen: true, sub, type: 'renew' })
                                }
                                className="px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded border border-indigo-200/50 hover:bg-indigo-100"
                              >
                                Renew
                              </button>
                              <button
                                onClick={() =>
                                  setCustomerModal({ isOpen: true, sub, type: 'cancel' })
                                }
                                className="px-2 py-0.5 text-[11px] font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded border border-red-200/50 hover:bg-red-100"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredSubscriptions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
        </>
      )}

      {/* 20 & 21. Subscription Inspection Drawer / Modal */}
      {selectedSubForInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/30">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold font-mono text-[#171717] dark:text-[#F5F5F5]">
                    {selectedSubForInspection.subscriptionNumber}
                  </h2>
                  <StatusBadge status={selectedSubForInspection.status} size="xs" />
                </div>
                <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">
                  {customers.find((c) => c.id === selectedSubForInspection.customerId)?.name} ·{' '}
                  {plans.find((p) => p.id === selectedSubForInspection.planId)?.name}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => {
                    const cust = customers.find((c) => c.id === selectedSubForInspection.customerId);
                    const plan = plans.find((p) => p.id === selectedSubForInspection.planId);
                    if (cust && plan) {
                      generateQuotationPDF(selectedSubForInspection, cust, plan);
                    }
                  }}
                >
                  Download PDF
                </Button>
                <button
                  onClick={() => setSelectedSubForInspection(null)}
                  className="p-1 text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Lifecycle Visual Stepper */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-[#E5E5E5] dark:border-[#262626]">
                <span className="text-[11px] font-semibold text-[#737373] dark:text-[#A3A3A3] uppercase tracking-wider block mb-2">
                  Agreement Lifecycle
                </span>
                <LifecycleStepper currentStatus={selectedSubForInspection.status} />
              </div>

              {/* Key metadata grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-neutral-50/40 dark:bg-neutral-900/30 rounded-xl border border-[#E5E5E5] dark:border-[#262626]">
                <div>
                  <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] block">Start Date</span>
                  <span className="font-mono text-xs text-[#171717] dark:text-[#F5F5F5] block mt-0.5">
                    {formatDate(selectedSubForInspection.startDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] block">Expiry Date</span>
                  <span className="font-mono text-xs text-[#171717] dark:text-[#F5F5F5] block mt-0.5">
                    {formatDate(selectedSubForInspection.expiryDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] block">Billing Cycle</span>
                  <span className="text-xs text-[#171717] dark:text-[#F5F5F5] block mt-0.5">
                    {plans.find((p) => p.id === selectedSubForInspection.planId)?.billingFrequency}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] block">Payment Terms</span>
                  <span className="text-xs text-[#171717] dark:text-[#F5F5F5] block mt-0.5">
                    {selectedSubForInspection.paymentTerms}
                  </span>
                </div>
              </div>

              {/* Subscription Order Lines Table */}
              <div>
                <h4 className="font-semibold text-[#171717] dark:text-[#F5F5F5] mb-2">
                  Subscription Lines
                </h4>
                <div className="border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 dark:bg-neutral-850 border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3]">
                      <tr>
                        <th className="py-2 px-3">Product / Service</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Unit Price</th>
                        <th className="py-2 px-3 text-right">Tax (GST)</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
                      {selectedSubForInspection.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                              {l.productName}
                            </span>
                            {l.variantName && (
                              <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] block">
                                Variant: {l.variantName} (+{formatINR(l.variantExtra)})
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                            {l.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#737373]">
                            {formatINR(l.unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#737373]">
                            {l.taxPercent}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] tabular-nums">
                            {formatINR(l.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 bg-neutral-50/50 dark:bg-neutral-900/40 border-t border-[#E5E5E5] dark:border-[#262626] flex flex-col items-end gap-1 text-xs">
                    <div className="flex justify-between w-48 text-[#737373]">
                      <span>Subtotal:</span>
                      <span className="font-mono">{formatINR(selectedSubForInspection.subtotal)}</span>
                    </div>
                    {selectedSubForInspection.discountTotal > 0 && (
                      <div className="flex justify-between w-48 text-emerald-600">
                        <span>Discount:</span>
                        <span className="font-mono">-{formatINR(selectedSubForInspection.discountTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between w-48 text-[#737373]">
                      <span>Tax (18% GST):</span>
                      <span className="font-mono">+{formatINR(selectedSubForInspection.taxTotal)}</span>
                    </div>
                    <div className="flex justify-between w-48 font-bold text-[#171717] dark:text-[#F5F5F5] pt-1 border-t border-[#E5E5E5] dark:border-[#262626]">
                      <span>Grand Total:</span>
                      <span className="font-mono">{formatINR(selectedSubForInspection.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 21. Subscription Timeline */}
              <div>
                <h4 className="font-semibold text-[#171717] dark:text-[#F5F5F5] mb-2">
                  Subscription Activity Timeline
                </h4>
                <div className="space-y-3 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E5E5] dark:before:bg-[#262626]">
                  <div className="relative">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 border border-white dark:border-[#111111]" />
                    <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                      Subscription agreement initiated
                    </span>
                    <span className="text-[11px] text-[#737373] block mt-0.5">
                      Created on {formatDate(selectedSubForInspection.createdAt)}
                    </span>
                  </div>
                  {selectedSubForInspection.status !== 'Draft' && (
                    <div className="relative">
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-[#111111]" />
                      <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                        Quotation accepted & confirmed
                      </span>
                      <span className="text-[11px] text-[#737373] block mt-0.5">
                        Agreed under payment terms {selectedSubForInspection.paymentTerms}
                      </span>
                    </div>
                  )}
                  {selectedSubForInspection.status === 'Active' && (
                    <div className="relative">
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 border border-white dark:border-[#111111]" />
                      <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                        Subscription activated & automated billing scheduled
                      </span>
                      <span className="text-[11px] text-[#737373] block mt-0.5">
                        Next automated billing: {formatDate(selectedSubForInspection.nextBillingDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/30">
              <div className="flex items-center gap-2">
                {selectedSubForInspection.status === 'Active' && canManage && (
                  <>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() =>
                        selectedSubForInspection.pausedAt
                          ? handleResume(selectedSubForInspection)
                          : handlePause(selectedSubForInspection)
                      }
                    >
                      {selectedSubForInspection.pausedAt ? 'Resume' : 'Pause'}
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleRenew(selectedSubForInspection)}
                    >
                      Renew
                    </Button>
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => handleEarlyTerminate(selectedSubForInspection)}
                    >
                      Terminate
                    </Button>
                  </>
                )}

                {/* Customer inspection actions */}
                {selectedSubForInspection.status === 'Quotation' && isCustomer && (
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => handleTransitionStatus(selectedSubForInspection, 'Confirmed')}
                  >
                    Confirm Quotation
                  </Button>
                )}
                {selectedSubForInspection.status === 'Active' && isCustomer && (
                  <>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() =>
                        setCustomerModal({
                          isOpen: true,
                          sub: selectedSubForInspection,
                          type: 'pause',
                        })
                      }
                    >
                      Request Pause
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() =>
                        setCustomerModal({
                          isOpen: true,
                          sub: selectedSubForInspection,
                          type: 'renew',
                        })
                      }
                    >
                      Renew
                    </Button>
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() =>
                        setCustomerModal({
                          isOpen: true,
                          sub: selectedSubForInspection,
                          type: 'cancel',
                        })
                      }
                    >
                      Request Cancellation
                    </Button>
                  </>
                )}
              </div>
              <Button
                variant="primary"
                size="xs"
                onClick={() => setSelectedSubForInspection(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalData.isOpen}
        title={confirmModalData.title}
        message={confirmModalData.message}
        isDestructive={confirmModalData.isDestructive}
        onConfirm={() => {
          confirmModalData.action();
          setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModalData((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Create Subscription Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#171717] dark:text-[#F5F5F5]">
                New Subscription / Quotation
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubscription} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Customer Account *
                  </label>
                  <select
                    value={newSubCustomer}
                    onChange={(e) => setNewSubCustomer(e.target.value)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Subscription Plan *
                  </label>
                  <select
                    value={newSubPlan}
                    onChange={(e) => setNewSubPlan(e.target.value)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.billingFrequency} ({formatINR(p.price)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newSubStatus}
                    onChange={(e) => setNewSubStatus(e.target.value as SubscriptionStatus)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  >
                    <option value="Quotation">Quotation</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={newSubTerms}
                    onChange={(e) => setNewSubTerms(e.target.value)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  >
                    <option value="Immediate">Immediate</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                  </select>
                </div>
              </div>

              {/* Order Lines */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium text-[#171717] dark:text-[#F5F5F5]">
                    Product Lines
                  </label>
                  <Button variant="outline" size="xs" onClick={handleAddLine} type="button">
                    + Add Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {newSubLines.map((line, idx) => {
                    const prod = products.find((p) => p.id === line.productId);
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg flex items-center gap-3"
                      >
                        <div className="flex-1">
                          <select
                            value={line.productId}
                            onChange={(e) => {
                              const updated = [...newSubLines];
                              updated[idx].productId = e.target.value;
                              updated[idx].variantId = undefined;
                              setNewSubLines(updated);
                            }}
                            className="w-full p-1.5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded text-xs text-[#171717] dark:text-[#F5F5F5]"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({formatINR(p.sellingPrice)})
                              </option>
                            ))}
                          </select>
                        </div>

                        {prod && prod.variants.length > 0 && (
                          <div className="w-32">
                            <select
                              value={line.variantId || ''}
                              onChange={(e) => {
                                const updated = [...newSubLines];
                                updated[idx].variantId = e.target.value || undefined;
                                setNewSubLines(updated);
                              }}
                              className="w-full p-1.5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded text-xs text-[#171717] dark:text-[#F5F5F5]"
                            >
                              <option value="">Standard Base</option>
                              {prod.variants.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.value} (+₹{v.extraPrice})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="w-16">
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => {
                              const updated = [...newSubLines];
                              updated[idx].quantity = Math.max(1, Number(e.target.value));
                              setNewSubLines(updated);
                            }}
                            className="w-full p-1.5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded text-center text-xs text-[#171717] dark:text-[#F5F5F5]"
                          />
                        </div>

                        {newSubLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button variant="ghost" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Create Subscription
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Legacy Quotation View Modal */}
      <QuotationViewModal
        subscriptionId={viewingSubId}
        onClose={() => setViewingSubId(null)}
      />

      {/* Customer Action Modal (Pause / Cancel / Renew) */}
      {customerModal.isOpen && customerModal.sub && (
        <CustomerActionModal
          subscription={customerModal.sub}
          actionType={customerModal.type}
          currentUser={user!}
          isOpen={customerModal.isOpen}
          onClose={() => setCustomerModal((prev) => ({ ...prev, isOpen: false }))}
          onSuccess={() => {
            // refresh
          }}
        />
      )}
    </div>
  );
};
