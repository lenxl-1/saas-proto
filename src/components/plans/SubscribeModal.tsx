import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle,
  FileCheck,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  Package,
  Plus,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { z } from 'zod';
import { Discount, Plan, Product, Subscription, SubscriptionLine, User } from '../../types';
import { discountsRepo, mockEmailsRepo, productsRepo, settingsRepo, subscriptionsRepo } from '../../lib/db';
import { formatDate, formatINR } from '../../lib/formatters';
import { calculateTotals } from '../../lib/pricing';
import { Button } from '../ui/Button';

interface SubscribeModalProps {
  plan: Plan;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (subNumber: string) => void;
}

export const SubscribeModal: React.FC<SubscribeModalProps> = ({
  plan,
  currentUser,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  // Active add-on products
  const availableProducts = useMemo(() => {
    return productsRepo.getAll().filter((p) => p.active);
  }, []);

  // Form State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [quantity, setQuantity] = useState<number>(plan.minQuantity || 1);
  const [paymentTerms, setPaymentTerms] = useState<string>('Immediate');
  const [startDate, setStartDate] = useState<string>(effectiveToday);

  // Selected add-ons
  const [selectedAddons, setSelectedAddons] = useState<
    { productId: string; variantId?: string; quantity: number }[]
  >([]);

  // Discount code state
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Step 2 Legal Checkbox
  const [legalAgreed, setLegalAgreed] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSubNumber, setCreatedSubNumber] = useState<string | null>(null);

  // Zod schema for live configuration validation
  const configSchema = useMemo(() => {
    return z.object({
      quantity: z
        .number()
        .int('Must be a whole number')
        .min(
          plan.minQuantity || 1,
          `Minimum quantity for ${plan.name} is ${plan.minQuantity || 1}`
        ),
      startDate: z.string().min(1, 'Start date is required'),
      paymentTerms: z.enum(['Immediate', 'Net 15', 'Net 30', 'Net 60']),
    });
  }, [plan]);

  const validationResult = configSchema.safeParse({
    quantity,
    startDate,
    paymentTerms,
  });

  const validationError = !validationResult.success
    ? validationResult.error.issues[0]?.message
    : null;

  // Add-on helpers
  const handleAddAddon = (productId: string) => {
    if (selectedAddons.some((a) => a.productId === productId)) return;
    const prod = availableProducts.find((p) => p.id === productId);
    const firstVariant = prod?.variants[0]?.id;
    setSelectedAddons((prev) => [...prev, { productId, variantId: firstVariant, quantity: 1 }]);
  };

  const handleRemoveAddon = (index: number) => {
    setSelectedAddons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateAddon = (
    index: number,
    updates: Partial<{ variantId: string; quantity: number }>
  ) => {
    setSelectedAddons((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  // Compile draft subscription lines
  const draftLines: SubscriptionLine[] = useMemo(() => {
    const lines: SubscriptionLine[] = [];

    // Plan base line
    const planSubtotal = plan.price * quantity;
    const planTax = Math.round(planSubtotal * 0.18 * 100) / 100;
    lines.push({
      id: 'LINE-PLAN',
      productId: plan.id,
      productName: `${plan.name} Tier (${plan.billingFrequency})`,
      quantity,
      unitPrice: plan.price,
      variantExtra: 0,
      taxPercent: 18,
      discountPercent: 0,
      lineTotal: planSubtotal + planTax,
    });

    // Addons
    selectedAddons.forEach((addon, idx) => {
      const prod = availableProducts.find((p) => p.id === addon.productId);
      if (!prod) return;
      const variant = prod.variants.find((v) => v.id === addon.variantId);
      const extraPrice = variant?.extraPrice || 0;
      const unit = prod.sellingPrice;
      const itemSubtotal = (unit + extraPrice) * addon.quantity;
      const itemTax = Math.round(itemSubtotal * 0.18 * 100) / 100;

      lines.push({
        id: `LINE-ADDON-${idx}`,
        productId: prod.id,
        productName: prod.name,
        variantId: variant?.id,
        variantName: variant ? `${variant.attribute}: ${variant.value}` : undefined,
        quantity: addon.quantity,
        unitPrice: unit,
        variantExtra: extraPrice,
        taxPercent: 18,
        discountPercent: 0,
        lineTotal: itemSubtotal + itemTax,
      });
    });

    return lines;
  }, [plan, quantity, selectedAddons, availableProducts]);

  // Compute calculated pricing totals
  const subtotalBeforeDiscount = useMemo(() => {
    return draftLines.reduce((acc, l) => acc + (l.unitPrice + l.variantExtra) * l.quantity, 0);
  }, [draftLines]);

  // Apply discount calculation
  const discountCalculation = useMemo(() => {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.type === 'Fixed') {
      return Math.min(subtotalBeforeDiscount, appliedDiscount.value);
    }
    return Math.round(subtotalBeforeDiscount * (appliedDiscount.value / 100) * 100) / 100;
  }, [appliedDiscount, subtotalBeforeDiscount]);

  const taxTotal = useMemo(() => {
    const taxable = Math.max(0, subtotalBeforeDiscount - discountCalculation);
    return Math.round(taxable * 0.18 * 100) / 100;
  }, [subtotalBeforeDiscount, discountCalculation]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotalBeforeDiscount - discountCalculation) + taxTotal;
  }, [subtotalBeforeDiscount, discountCalculation, taxTotal]);

  // Handle Apply Discount Code
  const handleApplyDiscount = () => {
    setDiscountError(null);
    if (!discountCodeInput.trim()) {
      setDiscountError('Please enter a coupon code.');
      return;
    }

    const discount = discountsRepo.getByCode(discountCodeInput);
    if (!discount) {
      setDiscountError(`Coupon code "${discountCodeInput.toUpperCase()}" is invalid.`);
      return;
    }

    if (!discount.active) {
      setDiscountError('This discount coupon is currently inactive.');
      return;
    }

    // Check availability dates
    const todayTs = new Date(effectiveToday).getTime();
    const startTs = new Date(discount.startDate).getTime();
    const endTs = new Date(discount.expiryDate).getTime();
    if (todayTs < startTs || todayTs > endTs) {
      setDiscountError(`Coupon is only valid from ${discount.startDate} to ${discount.expiryDate}.`);
      return;
    }

    // Check usage limits
    if (discount.usageCount >= discount.totalUsageLimit) {
      setDiscountError('This promotion has reached its maximum global redemption limit.');
      return;
    }

    // Check per-customer limit
    const custId = currentUser.customerId || '';
    const custUsage = discount.customerUsage?.[custId] || 0;
    if (discount.perCustomerLimit && custUsage >= discount.perCustomerLimit) {
      setDiscountError(`You have already utilized this coupon code (${custUsage}/${discount.perCustomerLimit} times).`);
      return;
    }

    // Check minimum purchase amount
    if (subtotalBeforeDiscount < discount.minPurchaseAmount) {
      setDiscountError(
        `Minimum order amount of ${formatINR(discount.minPurchaseAmount)} required to apply this coupon.`
      );
      return;
    }

    // Check applicable plans
    if (discount.applicablePlanIds && discount.applicablePlanIds.length > 0) {
      if (!discount.applicablePlanIds.includes(plan.id)) {
        setDiscountError(`Coupon code is not applicable to the ${plan.name} plan tier.`);
        return;
      }
    }

    setAppliedDiscount(discount);
    setDiscountError(null);
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCodeInput('');
    setDiscountError(null);
  };

  // Submit Quotation
  const handleSubmitQuotation = async () => {
    if (!currentUser.customerId) {
      alert('Error: No associated customer account found for this user.');
      return;
    }

    if (!legalAgreed) {
      alert('Please accept the recurring agreement terms to proceed.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate expiry date (1 year from start or standard billing cycle)
      const startDateObj = new Date(startDate);
      const expiryDateObj = new Date(startDate);
      expiryDateObj.setFullYear(startDateObj.getFullYear() + 1);

      // Next billing date
      const nextBillingObj = new Date(startDate);
      if (plan.billingFrequency === 'Daily') nextBillingObj.setDate(nextBillingObj.getDate() + 1);
      else if (plan.billingFrequency === 'Weekly') nextBillingObj.setDate(nextBillingObj.getDate() + 7);
      else if (plan.billingFrequency === 'Monthly') nextBillingObj.setMonth(nextBillingObj.getMonth() + 1);
      else nextBillingObj.setFullYear(nextBillingObj.getFullYear() + 1);

      const subNumber = 'SUB-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);

      const newSubscription: Subscription = {
        id: 'SUB-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        subscriptionNumber: subNumber,
        customerId: currentUser.customerId, // Strict customer security scoping
        planId: plan.id,
        status: 'Quotation',
        startDate,
        expiryDate: expiryDateObj.toISOString().split('T')[0],
        nextBillingDate: nextBillingObj.toISOString().split('T')[0],
        paymentTerms,
        lines: draftLines,
        subtotal: subtotalBeforeDiscount,
        discountTotal: discountCalculation,
        taxTotal,
        grandTotal,
        appliedDiscountId: appliedDiscount?.id,
        createdAt: new Date().toISOString(),
      };

      subscriptionsRepo.create(newSubscription, currentUser);

      // Increment discount usage if applied
      if (appliedDiscount) {
        discountsRepo.incrementUsage(appliedDiscount.id, currentUser.customerId);
      }

      // Send Mock Inbox Emails
      mockEmailsRepo.send({
        toEmail: currentUser.email,
        toName: currentUser.name,
        subject: `Quotation Created: ${subNumber} for ${plan.name}`,
        type: 'quotation_requested',
        content: `Dear ${currentUser.name},\n\nThank you for requesting a subscription to ${plan.name}!\n\nQuotation Reference: ${subNumber}\nFrequency: ${plan.billingFrequency}\nCommitment Quantity: ${quantity}\nGrand Total: ${formatINR(grandTotal)}\n\nYou can review and confirm your quotation anytime directly in your BrightFlow portal.\n\nWarm regards,\nBrightFlow Billing Ops`,
      });

      mockEmailsRepo.send({
        toEmail: 'billing-ops@brightflow.io',
        toName: 'Operations Team',
        subject: `New Customer Quotation: ${subNumber} (${currentUser.name})`,
        type: 'quotation_requested',
        content: `Customer ${currentUser.name} has generated Quotation ${subNumber} for plan ${plan.name}.\nGrand Total: ${formatINR(grandTotal)}\nPayment Terms: ${paymentTerms}\nStatus: Quotation (Awaiting Customer Confirmation)`,
      });

      setCreatedSubNumber(subNumber);
      setStep(3);
      onSuccess(subNumber);
    } catch (err: unknown) {
      console.error(err);
      alert('Failed to submit quotation: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-[#111111] sm:rounded-2xl border-0 sm:border border-[#E5E5E5] dark:border-[#262626] shadow-2xl w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-[#171717] dark:text-[#F5F5F5]">
                Subscribe to {plan.name}
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-[#737373] dark:text-[#A3A3A3] rounded">
                {plan.billingFrequency}
              </span>
            </div>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">
              Step {step} of 3: {step === 1 ? 'Configure' : step === 2 ? 'Review & Agree' : 'Confirmation'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1 shrink-0">
          <div
            className="bg-indigo-600 h-1 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Step Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {/* STEP 1: CONFIGURE */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Plan Overview Banner */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-850/60 rounded-xl border border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-[#171717] dark:text-[#F5F5F5] block">
                    {plan.name} Base Tier
                  </span>
                  <span className="text-[11px] text-[#737373]">
                    Billed {plan.billingFrequency.toLowerCase()} at {formatINR(plan.price)} / unit
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#737373] uppercase tracking-wider block">Min Units</span>
                  <span className="font-bold text-xs text-[#171717] dark:text-[#F5F5F5]">
                    {plan.minQuantity || 1}
                  </span>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                    Subscription Quantity / Licenses <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-[#737373]">
                    Min: {plan.minQuantity || 1}
                  </span>
                </div>
                <input
                  type="number"
                  min={plan.minQuantity || 1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className={`w-full p-2.5 bg-white dark:bg-[#161616] border rounded-lg text-xs font-mono text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 ${
                    validationError ? 'border-red-400 focus:ring-red-400' : 'border-[#E5E5E5] dark:border-[#262626] focus:ring-indigo-500'
                  }`}
                />
                {validationError && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {validationError}
                  </p>
                )}
              </div>

              {/* Start Date & Payment Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                    Subscription Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-xs text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-xs text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Immediate">Immediate (On Invoice Generation)</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                  </select>
                </div>
              </div>

              {/* Add-ons & Additional Modules */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#171717] dark:text-[#F5F5F5] flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Optional Modules & Add-ons</span>
                  </label>
                  <span className="text-[11px] text-[#737373]">
                    {selectedAddons.length} added
                  </span>
                </div>

                {/* Selected Add-ons list */}
                {selectedAddons.length > 0 && (
                  <div className="space-y-2 p-3 bg-neutral-50/70 dark:bg-neutral-850/40 rounded-xl border border-[#E5E5E5] dark:border-[#262626]">
                    {selectedAddons.map((addon, index) => {
                      const prod = availableProducts.find((p) => p.id === addon.productId);
                      if (!prod) return null;
                      return (
                        <div
                          key={addon.productId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white dark:bg-[#111111] rounded-lg border border-[#E5E5E5] dark:border-[#262626]"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] truncate block">
                              {prod.name}
                            </span>
                            <span className="text-[11px] text-[#737373]">
                              Base: {formatINR(prod.sellingPrice)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {prod.variants.length > 0 && (
                              <select
                                value={addon.variantId || ''}
                                onChange={(e) => handleUpdateAddon(index, { variantId: e.target.value })}
                                className="p-1 text-[11px] bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded text-[#171717] dark:text-[#F5F5F5]"
                              >
                                {prod.variants.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.attribute}: {v.value} (+{formatINR(v.extraPrice)})
                                  </option>
                                ))}
                              </select>
                            )}

                            <input
                              type="number"
                              min={1}
                              value={addon.quantity}
                              onChange={(e) =>
                                handleUpdateAddon(index, {
                                  quantity: Math.max(1, parseInt(e.target.value) || 1),
                                })
                              }
                              className="w-14 p-1 text-[11px] text-center font-mono bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded text-[#171717] dark:text-[#F5F5F5]"
                            />

                            <button
                              type="button"
                              onClick={() => handleRemoveAddon(index)}
                              className="p-1 text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add module picker */}
                {availableProducts.filter((p) => !selectedAddons.some((a) => a.productId === p.id)).length > 0 && (
                  <div className="flex gap-2">
                    <select
                      id="addon-picker"
                      className="flex-1 p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-xs text-[#171717] dark:text-[#F5F5F5]"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddAddon(e.target.value);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="" disabled>
                        + Choose an add-on product or service...
                      </option>
                      {availableProducts
                        .filter((p) => !selectedAddons.some((a) => a.productId === p.id))
                        .map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name} ({prod.type}) — {formatINR(prod.sellingPrice)}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Discount Code Section */}
              <div className="space-y-1.5 pt-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <label className="font-semibold text-[#171717] dark:text-[#F5F5F5] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Promo / Discount Code</span>
                </label>

                {appliedDiscount ? (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <span className="font-bold text-emerald-800 dark:text-emerald-200">
                          {appliedDiscount.code}
                        </span>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 ml-2">
                          {appliedDiscount.type === 'Fixed'
                            ? `-${formatINR(appliedDiscount.value)} fixed discount`
                            : `-${appliedDiscount.value}% off subtotal`}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveDiscount}
                      className="text-[11px] text-red-600 dark:text-red-400 hover:underline font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. WELCOME10, ANNUAL20"
                      value={discountCodeInput}
                      onChange={(e) => {
                        setDiscountCodeInput(e.target.value.toUpperCase());
                        setDiscountError(null);
                      }}
                      className="flex-1 p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-xs uppercase font-mono text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <Button variant="outline" size="sm" onClick={handleApplyDiscount}>
                      Apply
                    </Button>
                  </div>
                )}

                {discountError && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {discountError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW & AGREE */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-50/70 dark:bg-neutral-850/50 rounded-xl border border-[#E5E5E5] dark:border-[#262626] space-y-3">
                <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider block">
                  Commercial Breakdown
                </span>

                <div className="space-y-2 border-b border-[#E5E5E5] dark:border-[#262626] pb-3">
                  {draftLines.map((line) => (
                    <div key={line.id} className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                          {line.productName}
                        </span>
                        <span className="text-[11px] text-[#737373]">
                          {line.quantity} × {formatINR(line.unitPrice + line.variantExtra)}
                        </span>
                      </div>
                      <span className="font-mono font-medium text-[#171717] dark:text-[#F5F5F5]">
                        {formatINR((line.unitPrice + line.variantExtra) * line.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotals & Taxes */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#737373]">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatINR(subtotalBeforeDiscount)}</span>
                  </div>

                  {discountCalculation > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount Applied ({appliedDiscount?.code}):</span>
                      <span className="font-mono">-{formatINR(discountCalculation)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-[#737373]">
                    <span>Tax (18% GST):</span>
                    <span className="font-mono">+{formatINR(taxTotal)}</span>
                  </div>

                  <div className="flex justify-between text-sm font-bold text-[#171717] dark:text-[#F5F5F5] pt-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                    <span>Grand Total:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {formatINR(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Agreement summary */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-850/30 rounded-xl border border-[#E5E5E5] dark:border-[#262626] space-y-2 text-[11px]">
                <div className="grid grid-cols-2 gap-2 text-[#737373]">
                  <div>
                    <span>Billing Frequency:</span>{' '}
                    <strong className="text-[#171717] dark:text-[#F5F5F5]">{plan.billingFrequency}</strong>
                  </div>
                  <div>
                    <span>Payment Terms:</span>{' '}
                    <strong className="text-[#171717] dark:text-[#F5F5F5]">{paymentTerms}</strong>
                  </div>
                  <div>
                    <span>Start Date:</span>{' '}
                    <strong className="text-[#171717] dark:text-[#F5F5F5]">{formatDate(startDate)}</strong>
                  </div>
                  <div>
                    <span>Pausable:</span>{' '}
                    <strong className="text-[#171717] dark:text-[#F5F5F5]">{plan.pausable ? 'Yes' : 'No'}</strong>
                  </div>
                </div>
              </div>

              {/* Legal Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#E5E5E5] dark:border-[#262626] cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-850/50 transition-colors">
                <input
                  type="checkbox"
                  checked={legalAgreed}
                  onChange={(e) => setLegalAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-[#D4D4D4] text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
                  I agree to the recurring subscription terms and automatic invoice generation under BrightFlow billing rules. I understand this initiates a formal commercial quotation in my portal.
                </span>
              </label>
            </div>
          )}

          {/* STEP 3: CONFIRMATION */}
          {step === 3 && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800/40">
                <FileCheck className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#171717] dark:text-[#F5F5F5]">
                  Quotation Created Successfully!
                </h3>
                <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1 max-w-sm mx-auto">
                  Quotation <strong className="font-mono text-[#171717] dark:text-[#F5F5F5]">{createdSubNumber}</strong> has been issued to your account.
                </p>
              </div>

              <div className="p-4 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-[#E5E5E5] dark:border-[#262626] max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#737373]">Plan:</span>
                  <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">{plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Amount:</span>
                  <span className="font-mono font-bold text-[#171717] dark:text-[#F5F5F5]">{formatINR(grandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Status:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                    Quotation (Awaiting Confirmation)
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#737373] max-w-sm mx-auto">
                A confirmation has been sent to your Mock Inbox. You can review and confirm your agreement now from the Subscriptions or Quotations tab.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between bg-neutral-50/40 dark:bg-neutral-900/30 shrink-0">
          {step === 1 && (
            <>
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={Boolean(validationError)}
                onClick={() => setStep(2)}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Review Order
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!legalAgreed || isSubmitting}
                onClick={handleSubmitQuotation}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating Quotation...
                  </span>
                ) : (
                  'Confirm & Request Quotation'
                )}
              </Button>
            </>
          )}

          {step === 3 && (
            <div className="w-full flex justify-end">
              <Button variant="primary" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
