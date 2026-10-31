import React from 'react';
import { Check, Download, Printer, X } from 'lucide-react';
import { Subscription } from '../../types';
import { useAuth } from '../../lib/auth';
import { customersRepo, plansRepo, settingsRepo, subscriptionsRepo } from '../../lib/db';
import { formatDate, formatINR } from '../../lib/formatters';
import { generateQuotationPDF } from '../../lib/pdf';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';

interface QuotationViewModalProps {
  subscriptionId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export const QuotationViewModal: React.FC<QuotationViewModalProps> = ({
  subscriptionId,
  onClose,
  onUpdated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  if (!subscriptionId) return null;

  const subscription = subscriptionsRepo.getById(subscriptionId, user);
  if (!subscription) return null;

  const customer = customersRepo.getById(subscription.customerId, user);
  const plan = plansRepo.getById(subscription.planId);
  const settings = settingsRepo.get();

  const handleDownloadPDF = () => {
    generateQuotationPDF(subscription, customer, plan);
    showToast('success', 'PDF Downloaded', `Quotation ${subscription.subscriptionNumber}.pdf saved.`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmQuotation = () => {
    try {
      subscriptionsRepo.update(subscription.id, { status: 'Confirmed' }, user);
      showToast('success', 'Quotation Confirmed', 'The quotation has been confirmed. Staff can now activate recurring billing.');
      onUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Action Failed', msg);
    }
  };

  const handleActivate = () => {
    try {
      subscriptionsRepo.update(subscription.id, { status: 'Active' }, user);
      showToast('success', 'Subscription Activated', 'Subscription is now active and recurring billing is scheduled.');
      onUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Action Failed', msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-2xl max-w-3xl w-full border border-[#E5E5E5] dark:border-[#262626] overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 border-b border-[#E5E5E5] dark:border-[#262626] bg-neutral-50/70 dark:bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] font-mono text-sm">
              {subscription.subscriptionNumber}
            </span>
            <StatusBadge status={subscription.status} size="xs" />
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
            <button
              onClick={onClose}
              className="p-1.5 text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded-md transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quotation Body */}
        <div className="overflow-y-auto p-6 sm:p-8 flex-1 print-page space-y-6">
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
            </div>

            <div className="sm:text-right">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-indigo-600 dark:text-indigo-400 block">
                SUBSCRIPTION QUOTATION
              </span>
              <p className="text-base font-semibold text-[#171717] dark:text-[#F5F5F5] font-mono mt-0.5">
                {subscription.subscriptionNumber}
              </p>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
                Date:{' '}
                <span className="font-medium text-[#171717] dark:text-[#F5F5F5]">
                  {formatDate(subscription.startDate)}
                </span>
              </p>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3]">
                Plan:{' '}
                <span className="font-medium text-[#171717] dark:text-[#F5F5F5]">{plan?.name}</span>
              </p>
            </div>
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-2 text-xs">
            <div className="p-4 bg-neutral-50/70 dark:bg-neutral-900/30 rounded-xl border border-[#E5E5E5] dark:border-[#262626]">
              <p className="font-semibold text-[#737373] dark:text-[#A3A3A3] uppercase tracking-wider text-[10px] mb-2">
                Prepared For
              </p>
              <p className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">{customer?.name}</p>
              {customer?.company && (
                <p className="text-[#737373] dark:text-[#A3A3A3] font-medium">{customer.company}</p>
              )}
              <p className="text-[#737373] dark:text-[#A3A3A3] mt-1">{customer?.address}, {customer?.city}</p>
              <p className="text-[#737373] dark:text-[#A3A3A3] font-mono">{customer?.email} | {customer?.phone}</p>
            </div>
            <div className="p-4 bg-neutral-50/70 dark:bg-neutral-900/30 rounded-xl border border-[#E5E5E5] dark:border-[#262626]">
              <p className="font-semibold text-[#737373] dark:text-[#A3A3A3] uppercase tracking-wider text-[10px] mb-2">
                Terms & Validity
              </p>
              <p className="text-[#171717] dark:text-[#F5F5F5] font-medium">
                Payment Terms: {subscription.paymentTerms}
              </p>
              <p className="text-[#737373] dark:text-[#A3A3A3]">Billing Cycle: {plan?.billingFrequency}</p>
              <p className="text-[#737373] dark:text-[#A3A3A3]">
                Valid Through: {formatDate(subscription.expiryDate)}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] font-medium text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Product / Variant</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Discount</th>
                  <th className="py-2.5 px-3 text-right">GST %</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
                {subscription.lines.map((line) => (
                  <tr key={line.id} className="text-[#171717] dark:text-[#F5F5F5]">
                    <td className="py-3 px-3">
                      <p className="font-medium">{line.productName}</p>
                      {line.variantName && (
                        <p className="text-[#737373] dark:text-[#A3A3A3] text-[11px]">Variant: {line.variantName}</p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-[#737373] dark:text-[#A3A3A3]">{line.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#737373] dark:text-[#A3A3A3]">
                      {formatINR(line.unitPrice + line.variantExtra)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#737373] dark:text-[#A3A3A3]">
                      {line.discountPercent}%
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

          {/* Totals */}
          <div className="flex justify-end pt-2">
            <div className="w-80 space-y-2 text-xs bg-neutral-50/70 dark:bg-neutral-900/30 p-4 rounded-xl border border-[#E5E5E5] dark:border-[#262626]">
              <div className="flex justify-between text-[#737373] dark:text-[#A3A3A3]">
                <span>Subtotal</span>
                <span className="font-mono text-[#171717] dark:text-[#F5F5F5]">
                  {formatINR(subscription.subtotal)}
                </span>
              </div>
              {subscription.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount</span>
                  <span className="font-mono">-{formatINR(subscription.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#737373] dark:text-[#A3A3A3]">
                <span>GST (18%)</span>
                <span className="font-mono text-[#171717] dark:text-[#F5F5F5]">
                  {formatINR(subscription.taxTotal)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E5E5E5] dark:border-[#262626] text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
                <span>Grand Total</span>
                <span className="font-mono">{formatINR(subscription.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="no-print p-4 bg-neutral-50/70 dark:bg-neutral-900/50 border-t border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between gap-3 shrink-0">
          <div>
            {subscription.status === 'Quotation' && (
              <Button
                variant="primary"
                size="sm"
                icon={<Check className="w-3.5 h-3.5" />}
                onClick={handleConfirmQuotation}
              >
                Confirm Quotation
              </Button>
            )}

            {(user?.role === 'admin' || user?.role === 'staff') && subscription.status === 'Confirmed' && (
              <Button
                variant="primary"
                size="sm"
                icon={<Check className="w-3.5 h-3.5" />}
                onClick={handleActivate}
              >
                Activate Subscription
              </Button>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
