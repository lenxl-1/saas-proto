import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileText,
  Mail,
  Printer,
  Search,
} from 'lucide-react';
import { Invoice } from '../types';
import { useAuth } from '../lib/auth';
import {
  customersRepo,
  invoicesRepo,
  mockEmailsRepo,
  settingsRepo,
} from '../lib/db';
import { formatDate, formatINR, getDaysOverdue, isInvoiceOverdue } from '../lib/formatters';
import { generateInvoicePDF } from '../lib/pdf';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { InvoiceViewModal } from '../components/invoices/InvoiceViewModal';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';

export const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  const canManage = user?.role === 'admin' || user?.role === 'staff';

  // Tabs: 'all' | 'outstanding' | 'overdue' | 'paid' | 'draft' | 'cancelled'
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const invoices = useMemo(() => invoicesRepo.getAll(user), [user]);
  const customers = useMemo(() => customersRepo.getAll(user), [user]);

  // Tab counts
  const tabCounts = useMemo(() => {
    let outstanding = 0;
    let overdue = 0;
    let paid = 0;
    let draft = 0;
    let cancelled = 0;

    for (const inv of invoices) {
      if (inv.status === 'Paid') paid++;
      else if (inv.status === 'Draft') draft++;
      else if (inv.status === 'Cancelled') cancelled++;
      else if (inv.status === 'Confirmed') {
        outstanding++;
        if (isInvoiceOverdue(inv.dueDate, inv.status, effectiveToday)) {
          overdue++;
        }
      }
    }

    return { all: invoices.length, outstanding, overdue, paid, draft, cancelled };
  }, [invoices, effectiveToday]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isOverdue = isInvoiceOverdue(inv.dueDate, inv.status, effectiveToday);

      if (activeTab === 'outstanding' && inv.status !== 'Confirmed') return false;
      if (activeTab === 'overdue' && !isOverdue) return false;
      if (activeTab === 'paid' && inv.status !== 'Paid') return false;
      if (activeTab === 'draft' && inv.status !== 'Draft') return false;
      if (activeTab === 'cancelled' && inv.status !== 'Cancelled') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = inv.invoiceNumber.toLowerCase();
        const cust = customers.find((c) => c.id === inv.customerId);
        const name = cust?.name.toLowerCase() || '';
        const comp = cust?.company?.toLowerCase() || '';
        if (!num.includes(q) && !name.includes(q) && !comp.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, activeTab, searchQuery, customers, effectiveToday]);

  // Paginated
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  const handleSendReminder = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    const cust = customers.find((c) => c.id === inv.customerId);
    if (!cust) return;

    const days = getDaysOverdue(inv.dueDate, effectiveToday);
    mockEmailsRepo.send({
      toEmail: cust.email,
      toName: cust.name,
      subject: `Payment Reminder: Overdue Invoice ${inv.invoiceNumber}`,
      type: 'payment_reminder',
      content: `Dear ${cust.name},\n\nThis is a reminder that invoice ${inv.invoiceNumber} for amount ${formatINR(
        inv.balanceDue
      )} was due on ${formatDate(inv.dueDate)} (${days > 0 ? `${days} days overdue` : 'due today'}).\n\nPlease arrange for payment to avoid service interruption.\n\nThank you,\nBrightFlow Billing Operations`,
    });

    showToast('success', 'Reminder Sent', `Simulated payment reminder dispatched to ${cust.email}.`);
  };

  const handleQuickDownloadPDF = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    const cust = customers.find((c) => c.id === inv.customerId);
    generateInvoicePDF(inv, cust);
    showToast('success', 'PDF Saved', `Invoice ${inv.invoiceNumber}.pdf downloaded.`);
  };

  return (
    <div className="space-y-6">
      {/* 22. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            Invoices
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Automated recurring invoices, payment reconciliation, and reminder dispatch.
          </p>
        </div>
      </div>

      {/* Segmented Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl">
        <div className="flex flex-wrap items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs">
          {[
            { id: 'all', label: 'All', count: tabCounts.all },
            { id: 'outstanding', label: 'Outstanding', count: tabCounts.outstanding },
            { id: 'overdue', label: 'Overdue', count: tabCounts.overdue },
            { id: 'paid', label: 'Paid', count: tabCounts.paid },
            { id: 'draft', label: 'Draft', count: tabCounts.draft },
            { id: 'cancelled', label: 'Cancelled', count: tabCounts.cancelled },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-[#111111] text-[#171717] dark:text-[#F5F5F5] font-semibold shadow-2xs'
                  : 'text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] text-[#A3A3A3] font-mono tabular-nums">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice #, customer..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] font-medium">
              <tr>
                <th className="py-2.5 px-4 font-medium">Invoice #</th>
                <th className="py-2.5 px-4 font-medium">Customer</th>
                <th className="py-2.5 px-4 font-medium">Issue Date</th>
                <th className="py-2.5 px-4 font-medium">Due Date</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Total Amount</th>
                <th className="py-2.5 px-4 font-medium text-right">Balance Due</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
              {paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#737373] dark:text-[#A3A3A3]">
                    No invoices found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const customer = customers.find((c) => c.id === inv.customerId);
                  const isOverdue = isInvoiceOverdue(inv.dueDate, inv.status, effectiveToday);

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoiceId(inv.id)}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-850/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-[#171717] dark:text-[#F5F5F5]">
                        {inv.invoiceNumber}
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
                      <td className="py-3 px-4 text-[#737373] dark:text-[#A3A3A3] font-mono text-[11px]">
                        {formatDate(inv.issueDate)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-[#737373] dark:text-[#A3A3A3]'}>
                          {formatDate(inv.dueDate)}
                        </span>
                        {isOverdue && (
                          <span className="block text-[10px] text-red-500">
                            {getDaysOverdue(inv.dueDate, effectiveToday)}d overdue
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={isOverdue ? 'Overdue' : inv.status} size="xs" />
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] tabular-nums">
                        {formatINR(inv.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium tabular-nums">
                        <span className={inv.balanceDue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400'}>
                          {formatINR(inv.balanceDue)}
                        </span>
                      </td>
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedInvoiceId(inv.id)}
                            className="p-1 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded transition-colors"
                            title="Inspect Invoice & Record Payment"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleQuickDownloadPDF(inv, e)}
                            className="p-1 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {isOverdue && canManage && (
                            <button
                              onClick={(e) => handleSendReminder(inv, e)}
                              className="px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200/50"
                              title="Send Reminder"
                            >
                              Remind
                            </button>
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
          totalItems={filteredInvoices.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Invoice Detail / Record Payment Modal */}
      <InvoiceViewModal
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </div>
  );
};
