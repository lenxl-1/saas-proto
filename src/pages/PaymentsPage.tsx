import React, { useMemo, useState } from 'react';
import {
  CheckCircle,
  CreditCard,
  Download,
  Eye,
  Filter,
  Plus,
  Receipt,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { PaymentMethod } from '../types';
import { useAuth } from '../lib/auth';
import {
  customersRepo,
  invoicesRepo,
  paymentsRepo,
  settingsRepo,
} from '../lib/db';
import { formatDate, formatINR, formatINRCompact } from '../lib/formatters';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { InvoiceViewModal } from '../components/invoices/InvoiceViewModal';
import { Button } from '../components/ui/Button';
import { MetricCard } from '../components/ui/MetricCard';
import { useToast } from '../context/ToastContext';

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  const canManage = user?.role === 'admin' || user?.role === 'staff';

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Form
  const [targetInvoiceId, setTargetInvoiceId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const payments = useMemo(() => paymentsRepo.getAll(user), [user]);
  const invoices = useMemo(() => invoicesRepo.getAll(user), [user]);
  const customers = useMemo(() => customersRepo.getAll(user), [user]);

  const unpaidInvoices = useMemo(() => {
    return invoices.filter((i) => i.balanceDue > 0 && i.status !== 'Cancelled');
  }, [invoices]);

  const selectedTargetInvoice = useMemo(() => {
    return unpaidInvoices.find((i) => i.id === targetInvoiceId);
  }, [unpaidInvoices, targetInvoiceId]);

  const totalCollected = useMemo(() => {
    return payments.reduce((acc, p) => acc + p.amount, 0);
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (methodFilter !== 'all' && p.method !== methodFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pNum = p.paymentNumber.toLowerCase();
        const ref = p.transactionRef.toLowerCase();
        const cust = customers.find((c) => c.id === p.customerId);
        const name = cust?.name.toLowerCase() || '';
        const comp = cust?.company?.toLowerCase() || '';
        if (!pNum.includes(q) && !ref.includes(q) && !name.includes(q) && !comp.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [payments, methodFilter, searchQuery, customers]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const invoice = invoices.find((i) => i.id === targetInvoiceId);
    if (!invoice) {
      showToast('error', 'Select Invoice', 'Please select an unpaid invoice.');
      return;
    }

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('error', 'Invalid Amount', 'Enter a valid payment amount greater than ₹0.');
      return;
    }

    if (amt > invoice.balanceDue + 0.01) {
      showToast('error', 'Exceeds Balance', `Maximum payable amount is ${formatINR(invoice.balanceDue)}.`);
      return;
    }

    try {
      const allPayments = paymentsRepo.getAll(null);
      const payNum = `PAY-2026-${String(allPayments.length + 1).padStart(6, '0')}`;

      paymentsRepo.recordPayment(
        {
          id: 'PAY-' + Math.random().toString(36).substring(2, 9),
          paymentNumber: payNum,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: amt,
          date: effectiveToday,
          method: paymentMethod,
          notes: paymentNotes || 'Manual payment entry',
          transactionRef: `${paymentMethod.toUpperCase()}/TXN-${Math.floor(100000 + Math.random() * 900000)}`,
          createdAt: new Date().toISOString(),
        },
        user
      );

      showToast('success', 'Payment Logged', `Recorded ${formatINR(amt)} via ${paymentMethod}.`);
      setIsRecordModalOpen(false);
      setTargetInvoiceId('');
      setPaymentAmount('');
      setPaymentNotes('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Failed to Record Payment', msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* 23. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            Payments
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Financial transactions, settlement reconciliation, and receipt archives.
          </p>
        </div>

        {canManage && unpaidInvoices.length > 0 && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setTargetInvoiceId(unpaidInvoices[0]?.id || '');
              setIsRecordModalOpen(true);
            }}
          >
            Record Payment
          </Button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Collected"
          value={formatINRCompact(totalCollected)}
          secondaryText="Total settled revenue"
        />
        <MetricCard
          label="Transactions Logged"
          value={payments.length}
          secondaryText="All recorded allocations"
        />
        <MetricCard
          label="Unpaid Invoices"
          value={unpaidInvoices.length}
          trend={unpaidInvoices.length > 0 ? 'down' : 'neutral'}
          trendValue={`${unpaidInvoices.length} pending`}
          secondaryText="Awaiting customer settlement"
        />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payment #, ref, customer..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs self-start sm:self-auto overflow-x-auto">
          {['all', 'UPI', 'Bank Transfer', 'Card', 'Cash', 'Cheque'].map((m) => (
            <button
              key={m}
              onClick={() => {
                setMethodFilter(m);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded whitespace-nowrap font-medium transition-colors ${
                methodFilter === m
                  ? 'bg-white dark:bg-[#111111] text-[#171717] dark:text-[#F5F5F5] font-semibold shadow-2xs'
                  : 'text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717]'
              }`}
            >
              {m === 'all' ? 'All Methods' : m}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Data Table */}
      <div className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] font-medium">
              <tr>
                <th className="py-2.5 px-4 font-medium">Payment ID</th>
                <th className="py-2.5 px-4 font-medium">Invoice #</th>
                <th className="py-2.5 px-4 font-medium">Customer</th>
                <th className="py-2.5 px-4 font-medium">Method</th>
                <th className="py-2.5 px-4 font-medium">Transaction Ref</th>
                <th className="py-2.5 px-4 font-medium">Date</th>
                <th className="py-2.5 px-4 font-medium text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#737373] dark:text-[#A3A3A3]">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => {
                  const cust = customers.find((c) => c.id === p.customerId);
                  const inv = invoices.find((i) => i.id === p.invoiceId);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-850/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-[#171717] dark:text-[#F5F5F5]">
                        {p.paymentNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400">
                        <button
                          onClick={() => setSelectedInvoiceId(p.invoiceId)}
                          className="hover:underline"
                        >
                          {inv?.invoiceNumber || p.invoiceId}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                          {cust?.name || 'Customer'}
                        </span>
                        {cust?.company && (
                          <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] block">
                            {cust.company}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-[#171717] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#262626]">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#737373] dark:text-[#A3A3A3]">
                        {p.transactionRef}
                      </td>
                      <td className="py-3 px-4 text-[#737373] dark:text-[#A3A3A3] font-mono text-[11px]">
                        {formatDate(p.date)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        +{formatINR(p.amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setSelectedInvoiceId(p.invoiceId)}
                          className="p-1 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded"
                          title="View Settled Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
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
          totalItems={filteredPayments.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Record Payment Modal with Allocation Breakdown */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] dark:border-[#262626] mb-4">
              <h3 className="font-semibold text-[#171717] dark:text-[#F5F5F5] text-base">
                Record Payment
              </h3>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Target Unpaid Invoice *
                </label>
                <select
                  value={targetInvoiceId}
                  onChange={(e) => {
                    setTargetInvoiceId(e.target.value);
                    const inv = unpaidInvoices.find((i) => i.id === e.target.value);
                    if (inv) setPaymentAmount(inv.balanceDue.toString());
                  }}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                >
                  {unpaidInvoices.map((inv) => {
                    const c = customers.find((cust) => cust.id === inv.customerId);
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} · {c?.name} (Balance: {formatINR(inv.balanceDue)})
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedTargetInvoice && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-[#E5E5E5] dark:border-[#262626] space-y-1.5">
                  <div className="flex justify-between text-[#737373]">
                    <span>Invoice Total:</span>
                    <span className="font-mono text-[#171717] dark:text-[#F5F5F5]">
                      {formatINR(selectedTargetInvoice.grandTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#737373]">
                    <span>Already Settled:</span>
                    <span className="font-mono text-emerald-600">
                      {formatINR(selectedTargetInvoice.amountPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-[#171717] dark:text-[#F5F5F5] pt-1 border-t border-[#E5E5E5] dark:border-[#262626]">
                    <span>Current Balance Due:</span>
                    <span className="font-mono text-amber-600">
                      {formatINR(selectedTargetInvoice.balanceDue)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3]">
                    Payment Amount (₹) *
                  </label>
                  {selectedTargetInvoice && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(selectedTargetInvoice.balanceDue.toString())}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Full Balance ({formatINR(selectedTargetInvoice.balanceDue)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 24999"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="Card">Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Payment Notes / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cleared via HDFC Bank"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button variant="ghost" size="sm" onClick={() => setIsRecordModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Record Settlement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice View Modal */}
      <InvoiceViewModal
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </div>
  );
};
