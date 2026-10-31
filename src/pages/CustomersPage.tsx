import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Repeat,
  Search,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Customer } from '../types';
import { useAuth } from '../lib/auth';
import {
  auditLogsRepo,
  customersRepo,
  invoicesRepo,
  paymentsRepo,
  plansRepo,
  subscriptionsRepo,
} from '../lib/db';
import { formatDate, formatINR, formatINRCompact, normalizeToMRR } from '../lib/formatters';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { MetricCard } from '../components/ui/MetricCard';

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user?.role === 'admin' || user?.role === 'staff';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'invoices' | 'payments' | 'activity'>(
    'overview'
  );

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    gstin: '',
  });

  const customers = useMemo(() => customersRepo.getAll(user), [user]);
  const subscriptions = useMemo(() => subscriptionsRepo.getAll(user), [user]);
  const invoices = useMemo(() => invoicesRepo.getAll(user), [user]);
  const payments = useMemo(() => paymentsRepo.getAll(user), [user]);
  const plans = useMemo(() => plansRepo.getAll(), []);
  const auditLogs = useMemo(() => auditLogsRepo.getAll(user), [user]);

  // Filter & Search
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter === 'active' && !c.active) return false;
      if (statusFilter === 'inactive' && c.active) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        c.city.toLowerCase().includes(q)
      );
    });
  }, [customers, searchQuery, statusFilter]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Compute per-customer statistics
  const getCustomerMetrics = (customerId: string) => {
    const subs = subscriptions.filter((s) => s.customerId === customerId);
    const activeSubs = subs.filter((s) => s.status === 'Active');
    const invs = invoices.filter((i) => i.customerId === customerId);
    const custPayments = payments.filter((p) => p.customerId === customerId);

    let mrr = 0;
    for (const sub of activeSubs) {
      const plan = plans.find((p) => p.id === sub.planId);
      if (plan) mrr += normalizeToMRR(sub.grandTotal, plan.billingFrequency);
      else mrr += sub.grandTotal;
    }

    const totalRevenue = invs
      .filter((i) => i.status === 'Paid')
      .reduce((acc, i) => acc + i.grandTotal, 0);

    const outstanding = invs
      .filter((i) => i.status === 'Confirmed')
      .reduce((acc, i) => acc + i.balanceDue, 0);

    const lastPayment = custPayments.length > 0 ? custPayments[0].date : null;

    return {
      activeSubsCount: activeSubs.length,
      totalSubsCount: subs.length,
      mrr,
      totalRevenue,
      outstanding,
      lastPayment,
    };
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('error', 'Required Fields', 'Customer name and email are mandatory.');
      return;
    }

    const newCust: Customer = {
      id: 'CUST-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim() || '+91 98000 00000',
      company: formData.company.trim(),
      address: formData.address.trim() || 'Tech Park',
      city: formData.city.trim() || 'Bengaluru',
      state: formData.state.trim() || 'Karnataka',
      pincode: formData.pincode.trim() || '560001',
      gstin: formData.gstin.trim(),
      active: true,
      createdAt: new Date().toISOString(),
    };

    customersRepo.create(newCust, user);
    showToast('success', 'Customer Added', `Customer record for ${newCust.name} created.`);
    setIsAddModalOpen(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      gstin: '',
    });
  };

  // Export CSV handler
  const handleExportCSV = () => {
    const rows = [
      ['Customer ID', 'Name', 'Email', 'Company', 'Phone', 'City', 'State', 'GSTIN', 'Status'],
      ...customers.map((c) => [
        c.id,
        c.name,
        c.email,
        c.company || '',
        c.phone,
        c.city,
        c.state,
        c.gstin || '',
        c.active ? 'Active' : 'Inactive',
      ]),
    ];
    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BrightFlow_Customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Export Complete', `Exported ${customers.length} customer records to CSV.`);
  };

  // Detail view customer
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  const selectedMetrics = useMemo(() => {
    if (!selectedCustomerId) return null;
    return getCustomerMetrics(selectedCustomerId);
  }, [selectedCustomerId, subscriptions, invoices, payments, plans]);

  const selectedSubs = useMemo(() => {
    if (!selectedCustomerId) return [];
    return subscriptions.filter((s) => s.customerId === selectedCustomerId);
  }, [selectedCustomerId, subscriptions]);

  const selectedInvs = useMemo(() => {
    if (!selectedCustomerId) return [];
    return invoices.filter((i) => i.customerId === selectedCustomerId);
  }, [selectedCustomerId, invoices]);

  const selectedPayments = useMemo(() => {
    if (!selectedCustomerId) return [];
    return payments.filter((p) => p.customerId === selectedCustomerId);
  }, [selectedCustomerId, payments]);

  const selectedActivity = useMemo(() => {
    if (!selectedCustomerId) return [];
    const directLogs = auditLogs.filter((a) => a.entityId === selectedCustomerId);
    if (directLogs.length > 0) return directLogs;
    // Synthesize activity from subs & invoices
    const acts = [];
    for (const s of selectedSubs) {
      acts.push({
        id: `act-${s.id}`,
        timestamp: s.createdAt,
        action: `Subscription ${s.subscriptionNumber} created`,
        details: `Initial status: ${s.status}`,
        userName: 'Admin',
      });
    }
    for (const i of selectedInvs) {
      acts.push({
        id: `act-${i.id}`,
        timestamp: i.issueDate,
        action: `Invoice ${i.invoiceNumber} generated`,
        details: `Total: ${formatINR(i.grandTotal)}`,
        userName: 'Billing Engine',
      });
    }
    return acts;
  }, [selectedCustomerId, auditLogs, selectedSubs, selectedInvs]);

  return (
    <div className="space-y-6">
      {/* 13. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            Customers
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Manage your customer relationships and billing accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
          >
            Export
          </Button>
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddModalOpen(true)}
            >
              New customer
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer, email, company..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Status segmented tabs */}
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs self-start sm:self-auto">
          {(['all', 'active', 'inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded capitalize font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-white dark:bg-[#111111] text-[#171717] dark:text-[#F5F5F5] shadow-2xs font-semibold'
                  : 'text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] font-medium">
              <tr>
                <th className="py-2.5 px-4 font-medium">Customer</th>
                <th className="py-2.5 px-4 font-medium">Email</th>
                <th className="py-2.5 px-4 font-medium text-center">Active Subs</th>
                <th className="py-2.5 px-4 font-medium text-right">MRR</th>
                <th className="py-2.5 px-4 font-medium text-right">Total Revenue</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Last Payment</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
              {paginatedCustomers.map((c) => {
                const met = getCustomerMetrics(c.id);
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className="hover:bg-neutral-50/80 dark:hover:bg-neutral-850/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                        {c.name}
                      </span>
                      {c.company && (
                        <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] block">
                          {c.company}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#737373] dark:text-[#A3A3A3]">{c.email}</td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-[#171717] dark:text-[#F5F5F5] tabular-nums">
                      {met.activeSubsCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-[#171717] dark:text-[#F5F5F5] tabular-nums">
                      {formatINR(met.mrr)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#737373] dark:text-[#A3A3A3] tabular-nums">
                      {formatINR(met.totalRevenue)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.active ? 'Active' : 'Closed'} size="xs" />
                    </td>
                    <td className="py-3 px-4 text-[#737373] dark:text-[#A3A3A3] font-mono text-[11px]">
                      {met.lastPayment ? formatDate(met.lastPayment) : '—'}
                    </td>
                    <td
                      className="py-3 px-3 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomerId(c.id);
                      }}
                    >
                      <button className="p-1 text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded transition-colors">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* 14. Customer Detail Workspace Modal */}
      {selectedCustomer && selectedMetrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-[#E5E5E5] dark:border-[#262626] flex items-start justify-between bg-neutral-50/50 dark:bg-neutral-900/30">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
                    {selectedCustomer.name}
                  </h2>
                  <StatusBadge status={selectedCustomer.active ? 'Active' : 'Closed'} size="xs" />
                </div>
                <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">
                  {selectedCustomer.company || 'Individual Account'} · {selectedCustomer.email}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setSelectedCustomerId(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-neutral-50/30 dark:bg-neutral-900/20 border-b border-[#E5E5E5] dark:border-[#262626]">
              <div className="p-3 bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] rounded-xl">
                <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] block">MRR</span>
                <span className="text-base font-semibold font-mono text-[#171717] dark:text-[#F5F5F5] tabular-nums block mt-1">
                  {formatINR(selectedMetrics.mrr)}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] rounded-xl">
                <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] block">
                  Active Subscriptions
                </span>
                <span className="text-base font-semibold font-mono text-[#171717] dark:text-[#F5F5F5] tabular-nums block mt-1">
                  {selectedMetrics.activeSubsCount}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] rounded-xl">
                <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] block">
                  Outstanding
                </span>
                <span className="text-base font-semibold font-mono text-amber-600 dark:text-amber-400 tabular-nums block mt-1">
                  {formatINR(selectedMetrics.outstanding)}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] rounded-xl">
                <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] block">
                  Lifetime Value
                </span>
                <span className="text-base font-semibold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums block mt-1">
                  {formatINR(selectedMetrics.totalRevenue)}
                </span>
              </div>
            </div>

            {/* Workspace Tabs */}
            <div className="flex items-center gap-1 px-4 border-b border-[#E5E5E5] dark:border-[#262626] text-xs">
              {(['overview', 'subscriptions', 'invoices', 'payments', 'activity'] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 px-3 capitalize font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-indigo-600 text-[#171717] dark:text-[#F5F5F5] font-semibold'
                        : 'border-transparent text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717]'
                    }`}
                  >
                    {tab}
                  </button>
                )
              )}
            </div>

            {/* Workspace Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 text-xs space-y-4">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-[#E5E5E5] dark:border-[#262626]">
                    <div>
                      <span className="text-[11px] font-medium text-[#737373] dark:text-[#A3A3A3] block">
                        Billing Address
                      </span>
                      <p className="font-medium text-[#171717] dark:text-[#F5F5F5] mt-1">
                        {selectedCustomer.address}
                      </p>
                      <p className="text-[#737373] dark:text-[#A3A3A3]">
                        {selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.pincode}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-[#737373] dark:text-[#A3A3A3] block">
                        Tax & GSTIN
                      </span>
                      <p className="font-mono font-medium text-[#171717] dark:text-[#F5F5F5] mt-1">
                        {selectedCustomer.gstin || 'Unregistered / Consumer'}
                      </p>
                      <span className="text-[11px] font-medium text-[#737373] dark:text-[#A3A3A3] block mt-3">
                        Phone
                      </span>
                      <p className="font-mono text-[#171717] dark:text-[#F5F5F5]">
                        {selectedCustomer.phone}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'subscriptions' && (
                <div className="space-y-2">
                  {selectedSubs.length === 0 ? (
                    <p className="text-center text-[#737373] py-6">No subscriptions recorded.</p>
                  ) : (
                    selectedSubs.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-3 bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                            {sub.subscriptionNumber}
                          </span>
                          <span className="text-[#737373] dark:text-[#A3A3A3] text-[11px]">
                            Next billing: {formatDate(sub.nextBillingDate)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                            {formatINR(sub.grandTotal)}
                          </span>
                          <StatusBadge status={sub.status} size="xs" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'invoices' && (
                <div className="space-y-2">
                  {selectedInvs.length === 0 ? (
                    <p className="text-center text-[#737373] py-6">No invoices created.</p>
                  ) : (
                    selectedInvs.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3 bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-[#737373] dark:text-[#A3A3A3] text-[11px]">
                            Due: {formatDate(inv.dueDate)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                            {formatINR(inv.grandTotal)}
                          </span>
                          <StatusBadge status={inv.status} size="xs" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="space-y-2">
                  {selectedPayments.length === 0 ? (
                    <p className="text-center text-[#737373] py-6">No payment records found.</p>
                  ) : (
                    selectedPayments.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                            {p.paymentNumber}
                          </span>
                          <span className="text-[#737373] dark:text-[#A3A3A3] text-[11px]">
                            {p.method} · Ref: {p.transactionRef}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 block">
                            +{formatINR(p.amount)}
                          </span>
                          <span className="text-[11px] text-[#737373]">{formatDate(p.date)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E5E5] dark:before:bg-[#262626]">
                  {selectedActivity.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 relative pl-8">
                      <div className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white dark:border-[#111111]" />
                      <div className="flex-1">
                        <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                          {act.action}
                        </span>
                        <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] mt-0.5">
                          {act.details}
                        </p>
                        <span className="text-[10px] text-[#A3A3A3] dark:text-[#71717A] mt-1 block">
                          {formatDate(act.timestamp)} · by {act.userName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5] dark:border-[#262626] mb-4">
              <h3 className="font-semibold text-[#171717] dark:text-[#F5F5F5] text-base">
                New Customer Account
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Technologies"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="billing@acme.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  placeholder="Acme Global Inc."
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="29AAAAA0000A1Z5"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save customer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
