import React from 'react';
import { Calendar, CheckCircle2, Clock, DollarSign, FileText, Info, Shield, X, XCircle } from 'lucide-react';
import { Plan } from '../../types';
import { formatDate, formatINR } from '../../lib/formatters';
import { Button } from '../ui/Button';

interface PlanDetailModalProps {
  plan: Plan;
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: (plan: Plan) => void;
  isAvailable: boolean;
  isCurrentPlan: boolean;
  isArchived: boolean;
  effectiveToday: string;
}

export const PlanDetailModal: React.FC<PlanDetailModalProps> = ({
  plan,
  isOpen,
  onClose,
  onSubscribe,
  isAvailable,
  isCurrentPlan,
  isArchived,
  effectiveToday,
}) => {
  if (!isOpen) return null;

  // Monthly equivalent calculation
  const getMonthlyEquivalent = () => {
    switch (plan.billingFrequency) {
      case 'Yearly':
        return `≈ ${formatINR(Math.round(plan.price / 12))}/month billed annually`;
      case 'Weekly':
        return `≈ ${formatINR(Math.round((plan.price * 52) / 12))}/month billed weekly`;
      case 'Daily':
        return `≈ ${formatINR(Math.round(plan.price * 30))}/month billed daily`;
      default:
        return null;
    }
  };

  const monthlyEq = getMonthlyEquivalent();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-detail-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 id="plan-detail-title" className="text-lg font-semibold text-[#171717] dark:text-[#F5F5F5]">
                {plan.name}
              </h3>
              {isCurrentPlan && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 rounded-full">
                  Current Plan
                </span>
              )}
              {isArchived && (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full">
                  Archived
                </span>
              )}
            </div>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">
              Detailed specifications & commercial terms
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Price Header Box */}
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850/60 border border-[#E5E5E5] dark:border-[#262626] flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold font-mono text-[#171717] dark:text-[#F5F5F5]">
                {formatINR(plan.price)}
              </span>
              <span className="text-xs text-[#737373] dark:text-[#A3A3A3] ml-1.5">
                / {plan.billingFrequency.toLowerCase()}
              </span>
              {monthlyEq && (
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                  {monthlyEq}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] block">Min. Commitment</span>
              <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                {plan.minQuantity} {plan.minQuantity > 1 ? 'Units / Licenses' : 'Unit'}
              </span>
            </div>
          </div>

          {/* Description */}
          {plan.description && (
            <div>
              <h4 className="font-medium text-[#171717] dark:text-[#F5F5F5] mb-1">Overview</h4>
              <p className="text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                {plan.description}
              </p>
            </div>
          )}

          {/* Availability Window */}
          <div className="p-3 rounded-lg border border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#737373]" />
              <span className="text-[#171717] dark:text-[#F5F5F5] font-medium">Availability Window</span>
            </div>
            <span className="font-mono text-[#737373] dark:text-[#A3A3A3]">
              {formatDate(plan.availabilityStartDate)} — {formatDate(plan.availabilityEndDate)}
            </span>
          </div>

          {/* Commercial Features Grid */}
          <div>
            <h4 className="font-medium text-[#171717] dark:text-[#F5F5F5] mb-2">Terms & Flexibility</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg border border-[#E5E5E5] dark:border-[#262626] flex items-center gap-2">
                {plan.pausable ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-[#A3A3A3] shrink-0" />
                )}
                <div>
                  <span className="font-medium text-[#171717] dark:text-[#F5F5F5] block">Pause Anytime</span>
                  <span className="text-[10px] text-[#737373]">{plan.pausable ? 'Permitted' : 'Not allowed'}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-[#E5E5E5] dark:border-[#262626] flex items-center gap-2">
                {plan.renewable ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-[#A3A3A3] shrink-0" />
                )}
                <div>
                  <span className="font-medium text-[#171717] dark:text-[#F5F5F5] block">Auto-Renewable</span>
                  <span className="text-[10px] text-[#737373]">{plan.renewable ? 'Supports renewal' : 'Manual contract'}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-[#E5E5E5] dark:border-[#262626] flex items-center gap-2">
                {plan.earlyTerminationAllowed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-[#A3A3A3] shrink-0" />
                )}
                <div>
                  <span className="font-medium text-[#171717] dark:text-[#F5F5F5] block">Early Termination</span>
                  <span className="text-[10px] text-[#737373]">
                    {plan.earlyTerminationAllowed
                      ? plan.earlyTerminationFee > 0
                        ? `Fee: ${formatINR(plan.earlyTerminationFee)}`
                        : 'No penalty fee'
                      : 'Fixed commitment'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-[#E5E5E5] dark:border-[#262626] flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <div>
                  <span className="font-medium text-[#171717] dark:text-[#F5F5F5] block">Tax Standard</span>
                  <span className="text-[10px] text-[#737373]">18% GST (Tax Invoice provided)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Plain Language Summary */}
          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-indigo-900 dark:text-indigo-200 block">
                  Plain-Language Agreement Summary
                </span>
                <p className="text-[#737373] dark:text-[#A3A3A3] text-[11px] leading-relaxed">
                  Subscribing initiates a commercial Quotation for your review. Invoices will automatically recur {plan.billingFrequency.toLowerCase()} at {formatINR(plan.price)} base price + 18% GST. You maintain full control to request pause or cancellation from your portal according to the plan terms.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between bg-neutral-50/40 dark:bg-neutral-900/30">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          {!isArchived && (
            <Button
              variant="primary"
              size="sm"
              disabled={!isAvailable}
              onClick={() => {
                onClose();
                onSubscribe(plan);
              }}
            >
              {isAvailable ? 'Proceed to Subscribe' : 'Not Available in Period'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
