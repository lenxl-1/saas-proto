import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Plus,
  Send,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { QuotationTemplate, Subscription } from '../types';
import { useAuth } from '../lib/auth';
import {
  customersRepo,
  plansRepo,
  productsRepo,
  settingsRepo,
  subscriptionsRepo,
  templatesRepo,
} from '../lib/db';
import { formatDate, formatINR } from '../lib/formatters';
import { calculateOrderLine, calculateTotals } from '../lib/pricing';
import { generateQuotationPDF } from '../lib/pdf';
import { StatusBadge } from '../components/common/StatusBadge';
import { QuotationViewModal } from '../components/quotations/QuotationViewModal';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';

export const QuotationsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  const canManage = user?.role === 'admin' || user?.role === 'staff';

  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [isCreateFromTemplateModalOpen, setIsCreateFromTemplateModalOpen] = useState(false);
  const [selectedTemplateForQuote, setSelectedTemplateForQuote] =
    useState<QuotationTemplate | null>(null);
  const [targetCustomerId, setTargetCustomerId] = useState('');

  const templates = useMemo(() => templatesRepo.getAll(), []);
  const subscriptions = useMemo(() => subscriptionsRepo.getAll(user), [user]);
  const quotations = useMemo(
    () =>
      subscriptions.filter(
        (s) => s.status === 'Quotation' || s.status === 'Draft' || s.status === 'Confirmed'
      ),
    [subscriptions]
  );
  const customers = useMemo(() => customersRepo.getAll(user), [user]);
  const plans = useMemo(() => plansRepo.getAll(), []);
  const products = useMemo(() => productsRepo.getAll().filter((p) => p.active), []);

  // Form
  const [tmplName, setTmplName] = useState('');
  const [tmplPlanId, setTmplPlanId] = useState(plans[0]?.id || '');
  const [tmplValidity, setTmplValidity] = useState(30);
  const [tmplTerms, setTmplTerms] = useState('Net 15');
  const [tmplLines, setTmplLines] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: products[0]?.id || '', quantity: 1 },
  ]);

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmplName.trim()) {
      showToast('error', 'Name Required', 'Please enter a name for the quotation template.');
      return;
    }

    const newTmpl: QuotationTemplate = {
      id: 'TMPL-' + Math.random().toString(36).substring(2, 9),
      name: tmplName.trim(),
      defaultPlanId: tmplPlanId,
      validityDays: tmplValidity,
      paymentTerms: tmplTerms,
      defaultLines: tmplLines,
      createdAt: new Date().toISOString(),
    };

    templatesRepo.create(newTmpl, user);
    showToast('success', 'Template Created', `Quotation template "${newTmpl.name}" saved.`);
    setIsNewTemplateModalOpen(false);
    setTmplName('');
  };

  const handleLaunchQuotationFromTemplate = (tmpl: QuotationTemplate) => {
    setSelectedTemplateForQuote(tmpl);
    setTargetCustomerId(customers[0]?.id || '');
    setIsCreateFromTemplateModalOpen(true);
  };

  const handleConfirmQuoteGeneration = () => {
    if (!selectedTemplateForQuote || !targetCustomerId) {
      showToast('error', 'Select Customer', 'Please select a customer for this quotation.');
      return;
    }

    const plan = plans.find((p) => p.id === selectedTemplateForQuote.defaultPlanId) || plans[0];

    const builtLines = selectedTemplateForQuote.defaultLines.map((l) => {
      const prod = products.find((p) => p.id === l.productId) || products[0];
      const calc = calculateOrderLine(prod.sellingPrice, 0, l.quantity, 0, 18);
      return {
        id: 'SUBL-' + Math.random().toString(36).substring(2, 9),
        productId: prod.id,
        productName: prod.name,
        quantity: l.quantity,
        unitPrice: prod.sellingPrice,
        variantExtra: 0,
        taxPercent: 18,
        discountPercent: 0,
        lineTotal: calc.lineTotal,
      };
    });

    const totals = calculateTotals(builtLines, 0);
    const allSubs = subscriptionsRepo.getAll(null);
    const subNumber = `SUB-2026-${String(allSubs.length + 1).padStart(6, '0')}`;

    const expiry = new Date(effectiveToday);
    expiry.setDate(expiry.getDate() + selectedTemplateForQuote.validityDays);

    const newSub: Subscription = {
      id: 'SUB-' + Math.random().toString(36).substring(2, 9),
      subscriptionNumber: subNumber,
      customerId: targetCustomerId,
      planId: plan.id,
      status: 'Quotation',
      startDate: effectiveToday,
      expiryDate: expiry.toISOString().split('T')[0],
      nextBillingDate: effectiveToday,
      paymentTerms: selectedTemplateForQuote.paymentTerms,
      lines: builtLines,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      createdAt: new Date().toISOString(),
    };

    subscriptionsRepo.create(newSub, user);
    showToast('success', 'Quotation Generated', `Quotation ${subNumber} created.`);
    setIsCreateFromTemplateModalOpen(false);
    setSelectedSubId(newSub.id);
  };

  const getValidityDaysLeft = (expiryDate: string) => {
    const exp = new Date(expiryDate).getTime();
    const cur = new Date(effectiveToday).getTime();
    const diff = Math.ceil((exp - cur) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      {/* 19. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            Quotations
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Manage proposal workflows, pricing templates, and contract agreements.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsNewTemplateModalOpen(true)}
          >
            New Template
          </Button>
        )}
      </div>

      {/* Templates Row */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
            Fast Proposal Templates ({templates.length})
          </h3>
          <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3]">
            Instantly spin up formal quotes for enterprise deals
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tmpl) => {
            const plan = plans.find((p) => p.id === tmpl.defaultPlanId);
            return (
              <div
                key={tmpl.id}
                className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl p-4 flex flex-col justify-between hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#171717] dark:text-[#F5F5F5]">
                      {tmpl.name}
                    </span>
                    <span className="text-[10px] text-[#A3A3A3] font-mono">
                      {tmpl.validityDays}d validity
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-[#737373] dark:text-[#A3A3A3]">
                    <p>Default Plan: <strong className="text-[#171717] dark:text-[#F5F5F5]">{plan?.name || 'Pro'}</strong></p>
                    <p>Terms: <strong className="text-[#171717] dark:text-[#F5F5F5]">{tmpl.paymentTerms}</strong></p>
                    <p>{tmpl.defaultLines.length} pre-configured item lines</p>
                  </div>
                </div>

                {canManage && (
                  <div className="mt-4 pt-3 border-t border-[#F5F5F5] dark:border-[#1F1F1F]">
                    <Button
                      variant="secondary"
                      size="xs"
                      className="w-full"
                      onClick={() => handleLaunchQuotationFromTemplate(tmpl)}
                    >
                      Use Template
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quotations Data Table */}
      <div className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
              Active Quotations & Drafts
            </h3>
            <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-0.5">
              Proposals in negotiation or pending client confirmation
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] font-medium">
              <tr>
                <th className="py-2.5 px-4 font-medium">Quote #</th>
                <th className="py-2.5 px-4 font-medium">Customer</th>
                <th className="py-2.5 px-4 font-medium">Plan</th>
                <th className="py-2.5 px-4 font-medium text-right">Amount</th>
                <th className="py-2.5 px-4 font-medium">Validity / Expiry</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Created</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#737373] dark:text-[#A3A3A3]">
                    No active quotations. Use a template above to generate one.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => {
                  const cust = customers.find((c) => c.id === q.customerId);
                  const plan = plans.find((p) => p.id === q.planId);
                  const daysLeft = getValidityDaysLeft(q.expiryDate);

                  return (
                    <tr
                      key={q.id}
                      onClick={() => setSelectedSubId(q.id)}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-850/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-[#171717] dark:text-[#F5F5F5]">
                        {q.subscriptionNumber}
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
                      <td className="py-3 px-4 text-[#737373] dark:text-[#A3A3A3]">
                        {plan?.name || 'Standard'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] tabular-nums">
                        {formatINR(q.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        <span className={daysLeft <= 3 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-[#171717] dark:text-[#F5F5F5]'}>
                          {formatDate(q.expiryDate)}
                        </span>
                        <span className="text-[10px] text-[#737373] block">
                          {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={q.status} size="xs" />
                      </td>
                      <td className="py-3 px-4 text-[#737373] dark:text-[#A3A3A3] font-mono text-[11px]">
                        {formatDate(q.createdAt)}
                      </td>
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedSubId(q.id)}
                            className="p-1 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded transition-colors"
                            title="Inspect Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (cust && plan) {
                                generateQuotationPDF(q, cust, plan);
                                showToast('success', 'PDF Saved', `Quote ${q.subscriptionNumber}.pdf generated.`);
                              }
                            }}
                            className="p-1 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Quote from Template Modal */}
      {isCreateFromTemplateModalOpen && selectedTemplateForQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] dark:border-[#262626] mb-4">
              <h3 className="font-semibold text-[#171717] dark:text-[#F5F5F5] text-base">
                Generate Proposal from &ldquo;{selectedTemplateForQuote.name}&rdquo;
              </h3>
              <button
                onClick={() => setIsCreateFromTemplateModalOpen(false)}
                className="text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Recipient Customer Account *
                </label>
                <select
                  value={targetCustomerId}
                  onChange={(e) => setTargetCustomerId(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-[#E5E5E5] dark:border-[#262626] space-y-1">
                <span className="text-[11px] font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                  Template Specifications
                </span>
                <p className="text-[#737373] dark:text-[#A3A3A3]">
                  Validity: {selectedTemplateForQuote.validityDays} days
                </p>
                <p className="text-[#737373] dark:text-[#A3A3A3]">
                  Payment Terms: {selectedTemplateForQuote.paymentTerms}
                </p>
                <p className="text-[#737373] dark:text-[#A3A3A3]">
                  Line Items: {selectedTemplateForQuote.defaultLines.length} products
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateFromTemplateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmQuoteGeneration}
                >
                  Create Proposal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Template Creation Modal */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] dark:border-[#262626] mb-4">
              <h3 className="font-semibold text-[#171717] dark:text-[#F5F5F5] text-base">
                New Quotation Template
              </h3>
              <button
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Annual SLA"
                  value={tmplName}
                  onChange={(e) => setTmplName(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Default Plan
                  </label>
                  <select
                    value={tmplPlanId}
                    onChange={(e) => setTmplPlanId(e.target.value)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Validity (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={tmplValidity}
                    onChange={(e) => setTmplValidity(Number(e.target.value))}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNewTemplateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Template
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quotation View Modal */}
      <QuotationViewModal
        subscriptionId={selectedSubId}
        onClose={() => setSelectedSubId(null)}
      />
    </div>
  );
};
