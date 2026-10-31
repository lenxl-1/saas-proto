import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  Download,
  Mail,
  MessageSquare,
  Printer,
  X,
} from 'lucide-react';
import { Customer, Invoice, PaymentMethod, Plan, Subscription } from '../../types';
import { useAuth } from '../../lib/auth';
import {
  customersRepo,
  invoicesRepo,
  mockEmailsRepo,
  paymentsRepo,
  plansRepo,
  settingsRepo,
  subscriptionsRepo,
} from '../../lib/db';
import { formatDate, formatINR, isInvoiceOverdue } from '../../lib/formatters';
import { generateInvoicePDF } from '../../lib/pdf';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';

interface InvoiceViewModalProps {
  invoiceId: string | null;
  onClose: () => void;
  onInvoiceUpdated?: () => void;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  invoiceId,
  onClose,
  onInvoiceUpdated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [newNote, setNewNote] = useState('');

  if (!invoiceId) return null;

  const invoice = invoicesRepo.getById(invoiceId, user);
  if (!invoice) return null;

  const customer = customersRepo.getById(invoice.customerId, user);
  const subscription = subscriptionsRepo.getById(invoice.subscriptionId, user);
  const plan = subscription ? plansRepo.getById(subscription.planId) : undefined;
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];
  const isOverdue = isInvoiceOverdue(invoice.dueDate, invoice.status, effectiveToday);

  const canManage = user?.role === 'admin' || user?.role === 'staff';

  const handleDownloadPDF = () => {
    generateInvoicePDF(invoice, customer, subscription, plan);
    showToast('success', 'PDF Generated', `Invoice ${invoice.invoiceNumber}.pdf downloaded.`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    if (!customer) return;
    mockEmailsRepo.send({
      toEmail: customer.email,
      toName: customer.name,
      subject: `Invoice ${invoice.invoiceNumber} from BrightFlow`,
      type: 'invoice_sent',
      content: `Dear ${customer.name},\n\nPlease find attached invoice ${invoice.invoiceNumber} for amount ${formatINR(
        invoice.grandTotal
      )}.\nDue Date: ${formatDate(invoice.dueDate)}\nBalance Due: ${formatINR(invoice.balanceDue)}\n\nThank you!`,
    });
    invoicesRepo.update(invoice.id, { sentAt: new Date().toISOString() }, user);
    showToast('success', 'Invoice Dispatched', `Simulated email dispatched to ${customer.email} in Mock Inbox.`);
    onInvoiceUpdated?.();
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !user) return;
    invoicesRepo.addFollowUpNote(invoice.id, newNote.trim(), user);
    setNewNote('');
    showToast('info', 'Note Saved', 'Follow-up internal note recorded.');
    onInvoiceUpdated?.();
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('error', 'Invalid Amount', 'Please enter a valid positive payment amount.');
      return;
    }
    if (amountNum > invoice.balanceDue + 0.01) {
      showToast('error', 'Amount Exceeds Balance', `Maximum payable amount is ${formatINR(invoice.balanceDue)}.`);
      return;
    }

    try {
      const allPayments = paymentsRepo.getAll(null);
      const payNumber = `PAY-2026-${String(allPayments.length + 1).padStart(6, '0')}`;

      paymentsRepo.recordPayment(
        {
          id: 'PAY-' + Math.random().toString(36).substring(2, 9),
          paymentNumber: payNumber,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: amountNum,
          date: effectiveToday,
          method: paymentMethod,
          notes: paymentNotes || 'Manual payment entry',
          transactionRef: `${paymentMethod.toUpperCase()}/REF-${Math.floor(100000 + Math.random() * 900000)}`,
          createdAt: new Date().toISOString(),
        },
        user
      );

      showToast('success', 'Payment Recorded', `Recorded ${formatINR(amountNum)} via ${paymentMethod}.`);
      setIsRecordingPayment(false);
      setPaymentAmount('');
      setPaymentNotes('');
      onInvoiceUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Payment Failed', msg);
    }
  };

  const handleCancelInvoice = () => {
    if (invoice.amountPaid > 0) {
      showToast('error', 'Cannot Cancel', 'Invoices with recorded payments cannot be cancelled.');
      return;
    }
    invoicesRepo.update(invoice.id, { status: 'Cancelled' }, user);
    showToast('info', 'Invoice Cancelled', `Invoice ${invoice.invoiceNumber} status set to Cancelled.`);
    onInvoiceUpdated?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-2xl max-w-3xl w-full border border-[#E5E5E5] dark:border-[#262626] overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Modal Header Actions */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 border-b border-[#E5E5E5] dark:border-[#262626] bg-neutral-50/70 dark:bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] font-mono text-sm">
              {invoice.invoiceNumber}
            </span>
            <StatusBadge status={isOverdue ? 'Overdue' : invoice.status} size="xs" />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
            >
              Print
            </Button>
            <Button
              variant="outline"
              size="xs"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleDownloadPDF}
            >
              PDF
            </Button>
            {canManage && (
              <Button
                variant="subtle"
                size="xs"
                icon={<Mail className="w-3.5 h-3.5" />}
                onClick={handleSendEmail}
              >
                Send Email
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded-md transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Printable Invoice Document */}
        <div className="overflow-y-auto p-6 sm:p-8 flex-1 print-page space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-[#E5E5E5] dark:border-[#262626]">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center">
                  B
                </div>
                <h1 className="text-lg font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
                  {settings.companyName}
                </h1>
              </div>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-2 max-w-sm leading-relaxed">
                {settings.companyAddress}
              </p>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] font-mono mt-1">
                GSTIN: <span className="font-medium text-[#171717] dark:text-[#F5F5F5]">{settings.companyGstin}</span>
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-indigo-600 dark:text-indigo-400 block">
                TAX INVOICE
              </span>
              <p className="text-base font-semibold text-[#171717] dark:text-[#F5F5F5] font-mono mt-0.5">
                {invoice.invoiceNumber}
              </p>
              <div className="mt-2 text-xs text-[#737373] dark:text-[#A3A3A3] space-y-0.5">
                <p>
                  Issue Date:{' '}
                  <span className="font-medium text-[#171717] dark:text-[#F5F5F5]">
                    {formatDate(invoice.issueDate)}
                  </span>
                </p>
                <p>
                  Due Date:{' '}
                  <span
                    className={`font-medium ${
                      isOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-[#171717] dark:text-[#F5F5F5]'
                    }`}
                  >
                    {formatDate(invoice.dueDate)}
                  </span>
                </p>
                <p>
                  Terms:{' '}
                  <span className="font-medium text-[#171717] dark:text-[#F5F5F5]">
                    {subscription?.paymentTerms || 'Net 15'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Billed To & Subscription Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-2 text-xs">
            <div className="p-4 bg-neutral-50/70 dark:bg-neutral-900/30 rounded-xl border border-[#E5E5E5] dark:border-[#262626]">
              <p className="font-semibold text-[#737373] dark:text-[#A3A3A3] uppercase tracking-wider text-[10px] mb-2">
                Billed To
              </p>
              <p className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">{customer?.name}</p>
              {customer?.company && (
                <p className="text-[#737373] dark:text-[#A3A3A3] font-medium">{customer.company}</p>
              )}
              <p className="text-[#737373] dark:text-[#A3A3A3] mt-1">{customer?.address}</p>
              <p className="text-[#737373] dark:text-[#A3A3A3]">
                {customer?.city}, {customer?.state} - {customer?.pincode}
              </p>
              <p className="text-[#737373] dark:text-[#A3A3A3] mt-1 font-mono">{customer?.email}</p>
              {customer?.gstin && (
                <p className="font-mono text-[#737373] dark:text-[#A3A3A3] mt-0.5">GSTIN: {customer.gstin}</p>
              )}
            </div>

            <div className="p-4 bg-neutral-50/70 dark:bg-neutral-900/30 rounded-xl border border-[#E5E5E5] dark:border-[#262626]">
              <p className="font-semibold text-[#737373] dark:text-[#A3A3A3] uppercase tracking-wider text-[10px] mb-2">
                Subscription Info
              </p>
              <p className="text-[#171717] dark:text-[#F5F5F5] font-mono text-xs">
                Ref: {subscription?.subscriptionNumber || 'N/A'}
              </p>
              <p className="text-[#737373] dark:text-[#A3A3A3] mt-0.5">Plan: {plan?.name || 'Selected Plan'}</p>
              <p className="text-[#737373] dark:text-[#A3A3A3] mt-1 font-mono text-[11px]">
                Period: {formatDate(invoice.billingPeriodStart)} → {formatDate(invoice.billingPeriodEnd)}
              </p>
              <p className="text-[#A3A3A3] dark:text-[#737373] text-[10px] mt-2 font-mono truncate">
                Idempotency: {invoice.idempotencyKey}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] font-medium text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">GST %</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
                {invoice.lines.map((line) => (
                  <tr key={line.id} className="text-[#171717] dark:text-[#F5F5F5]">
                    <td className="py-3 px-3 font-medium">{line.description}</td>
                    <td className="py-3 px-3 text-center text-[#737373] dark:text-[#A3A3A3]">{line.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#737373] dark:text-[#A3A3A3]">
                      {formatINR(line.unitPrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#737373] dark:text-[#A3A3A3]">
                      {line.taxPercent}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium">
                      {formatINR(line.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-80 space-y-2 text-xs bg-neutral-50/70 dark:bg-neutral-900/30 p-4 rounded-xl border border-[#E5E5E5] dark:border-[#262626]">
              <div className="flex justify-between text-[#737373] dark:text-[#A3A3A3]">
                <span>Subtotal</span>
                <span className="font-mono text-[#171717] dark:text-[#F5F5F5]">
                  {formatINR(invoice.subtotal)}
                </span>
              </div>
              {invoice.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount ({invoice.appliedDiscountCode || 'Applied'})</span>
                  <span className="font-mono">-{formatINR(invoice.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#737373] dark:text-[#A3A3A3]">
                <span>GST (18%)</span>
                <span className="font-mono text-[#171717] dark:text-[#F5F5F5]">
                  {formatINR(invoice.taxTotal)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E5E5E5] dark:border-[#262626] text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                <span>Grand Total</span>
                <span className="font-mono">{formatINR(invoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-[#737373] dark:text-[#A3A3A3]">
                <span>Amount Paid</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                  {formatINR(invoice.amountPaid)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E5E5E5] dark:border-[#262626] text-sm font-semibold">
                <span className={invoice.balanceDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#171717] dark:text-[#F5F5F5]'}>
                  Balance Due:
                </span>
                <span
                  className={`font-mono ${
                    invoice.balanceDue > 0
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : 'text-[#171717] dark:text-[#F5F5F5]'
                  }`}
                >
                  {formatINR(invoice.balanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Remittance Information */}
          <div className="p-4 bg-neutral-50/70 dark:bg-neutral-900/40 border border-[#E5E5E5] dark:border-[#262626] rounded-xl text-xs text-[#737373] dark:text-[#A3A3A3]">
            <h4 className="font-semibold text-[#171717] dark:text-[#F5F5F5] mb-2 text-xs">
              Remittance & Settlement Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <p>
                Account Name:{' '}
                <strong className="text-[#171717] dark:text-[#F5F5F5]">BrightFlow Technologies Pvt Ltd</strong>
              </p>
              <p>
                Bank: <strong className="text-[#171717] dark:text-[#F5F5F5]">HDFC Bank Ltd</strong>
              </p>
              <p>
                A/C Number:{' '}
                <strong className="font-mono text-[#171717] dark:text-[#F5F5F5]">50200012345678</strong>
              </p>
              <p>
                IFSC Code:{' '}
                <strong className="font-mono text-[#171717] dark:text-[#F5F5F5]">HDFC0001234</strong>
              </p>
              <p>
                UPI ID:{' '}
                <strong className="font-mono text-[#171717] dark:text-[#F5F5F5]">brightflow@hdfcbank</strong>
              </p>
              <p>
                Ref:{' '}
                <strong className="font-mono text-[#171717] dark:text-[#F5F5F5]">{invoice.invoiceNumber}</strong>
              </p>
            </div>
          </div>

          {/* Internal Follow-Up Notes (Admin/Staff only) */}
          {canManage && (
            <div className="no-print pt-6 border-t border-[#E5E5E5] dark:border-[#262626]">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-3.5 h-3.5 text-[#737373] dark:text-[#A3A3A3]" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#A3A3A3]">
                  Internal Collection Notes ({invoice.followUpNotes?.length || 0})
                </h4>
              </div>

              <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Record note or call log with customer..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                />
                <Button variant="primary" size="xs" type="submit" disabled={!newNote.trim()}>
                  Post Note
                </Button>
              </form>

              <div className="space-y-2">
                {invoice.followUpNotes?.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 bg-neutral-50/70 dark:bg-neutral-900/30 rounded-lg border border-[#E5E5E5] dark:border-[#262626] text-xs"
                  >
                    <div className="flex items-center justify-between text-[#737373] dark:text-[#A3A3A3] mb-1">
                      <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                        {note.authorName} ({note.authorRole})
                      </span>
                      <span className="font-mono text-[11px]">{formatDate(note.timestamp)}</span>
                    </div>
                    <p className="text-[#171717] dark:text-[#F5F5F5]">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="no-print p-4 bg-neutral-50/70 dark:bg-neutral-900/50 border-t border-[#E5E5E5] dark:border-[#262626] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {canManage && invoice.balanceDue > 0 && invoice.status !== 'Cancelled' && (
              <Button
                variant="primary"
                size="sm"
                icon={<CreditCard className="w-3.5 h-3.5" />}
                onClick={() => {
                  setPaymentAmount(String(invoice.balanceDue));
                  setIsRecordingPayment(true);
                }}
              >
                Record Payment ({formatINR(invoice.balanceDue)})
              </Button>
            )}

            {canManage && invoice.status !== 'Cancelled' && invoice.amountPaid === 0 && (
              <Button variant="ghost" size="sm" onClick={handleCancelInvoice} className="text-rose-600 dark:text-rose-400">
                Cancel Invoice
              </Button>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Record Payment Sub-Modal */}
        {isRecordingPayment && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#E5E5E5] dark:border-[#262626]">
              <div className="flex justify-between items-center pb-3 border-b border-[#E5E5E5] dark:border-[#262626] mb-4">
                <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  Record Payment Entry
                </h3>
                <button
                  onClick={() => setIsRecordingPayment(false)}
                  className="text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-[#737373] dark:text-[#A3A3A3] mb-1">
                    Invoice Target
                  </label>
                  <input
                    type="text"
                    disabled
                    value={invoice.invoiceNumber}
                    className="w-full p-2 bg-neutral-100 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#737373] dark:text-[#A3A3A3] mb-1">
                    Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={invoice.balanceDue}
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono font-semibold focus:outline-none"
                  />
                  <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] mt-1 font-mono">
                    Remaining balance: {formatINR(invoice.balanceDue)}
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-[#737373] dark:text-[#A3A3A3] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#737373] dark:text-[#A3A3A3] mb-1">
                    Reference / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bank UTR number or settlement memo"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5E5] dark:border-[#262626]">
                  <Button variant="ghost" size="sm" onClick={() => setIsRecordingPayment(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    Confirm & Apply Payment
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
