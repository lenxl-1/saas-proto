import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  Layers,
  Package,
  Repeat,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';

interface DemoGuidePageProps {
  onNavigate: (page: string) => void;
}

export const DemoGuidePage: React.FC<DemoGuidePageProps> = ({ onNavigate }) => {
  const { user, switchDemoUser } = useAuth();

  const steps = [
    {
      step: 1,
      title: 'Admin Configures Products & Plans',
      role: 'admin',
      desc: 'Admin creates software products with variants (e.g. Odoo compatible +₹560), margin calculator, and flexible subscription plans (monthly, yearly, minimum quantities, cancellation policies).',
      actionLabel: 'Explore Products & Variants',
      targetPage: 'products',
      userSwitch: 'admin' as const,
    },
    {
      step: 2,
      title: 'Customer Self-Registration & Security',
      role: 'customer',
      desc: 'Customers self-register with strict password security (min 9 chars, uppercase, lowercase, number, symbol), live checklist, and hashed passwords stored via Web Crypto API.',
      actionLabel: 'View Customer Profiles',
      targetPage: 'customers',
      userSwitch: 'customer' as const,
    },
    {
      step: 3,
      title: 'Staff Creates Quotation from Template',
      role: 'staff',
      desc: 'Sales reps generate quotations using pre-built templates or customized bundles. Customer reviews and clicks "Confirm Quotation".',
      actionLabel: 'Open Quotations & Templates',
      targetPage: 'quotations',
      userSwitch: 'staff' as const,
    },
    {
      step: 4,
      title: 'Activate Subscription & Lifecycle Policy',
      role: 'staff',
      desc: 'Staff activates the confirmed subscription (Strict workflow: Draft → Quotation → Confirmed → Active → Closed). Plan policies dictate pausing, renewal, or early termination fee.',
      actionLabel: 'Manage Subscriptions',
      targetPage: 'subscriptions',
      userSwitch: 'staff' as const,
    },
    {
      step: 5,
      title: 'Automated Recurring Billing Engine',
      role: 'admin',
      desc: 'Billing engine evaluates subscriptions due <= today, calculates GST (18%) and coupons, advances next billing date by frequency, and prevents duplicate billing via idempotency keys.',
      actionLabel: 'View Generated Invoices',
      targetPage: 'invoices',
      userSwitch: 'admin' as const,
    },
    {
      step: 6,
      title: 'Payment Reconciliation & PDF Download',
      role: 'staff',
      desc: 'Record full or partial payments via UPI, NEFT, or Cards. Status auto-updates to Paid when balance reaches zero. Print or download high-fidelity tax invoice PDFs.',
      actionLabel: 'Record Payments',
      targetPage: 'payments',
      userSwitch: 'staff' as const,
    },
    {
      step: 7,
      title: 'Customer Isolated Self-Service Portal',
      role: 'customer',
      desc: 'Customer logs in and sees exclusively their own subscriptions, invoices, and payments. Ownership checks strictly prevent Customer A from accessing Customer B.',
      actionLabel: 'View Customer Dashboard',
      targetPage: 'dashboard',
      userSwitch: 'customer' as const,
    },
    {
      step: 8,
      title: 'Executive Dashboards & Financial Analytics',
      role: 'admin',
      desc: 'Monitor real-time MRR, ARR, overdue receivables, revenue trends, top subscription plans, and export datasets to CSV format.',
      actionLabel: 'Open Executive Dashboard',
      targetPage: 'dashboard',
      userSwitch: 'admin' as const,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#111111] p-6 sm:p-8 rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xs">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40 rounded-full text-[11px] font-medium text-indigo-700 dark:text-indigo-300 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Interactive End-to-End Walkthrough</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#171717] dark:text-[#F5F5F5]">
          BrightFlow Evaluation & Demo Guide
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed max-w-2xl">
          Follow the 8-step lifecycle below to evaluate core workflows: role-based access control, product variants,
          quotation workflows, automated idempotent billing, discount validation, payments, and reporting.
        </p>

        {/* Current Identity Bar */}
        <div className="mt-6 pt-4 border-t border-[#E5E5E5] dark:border-[#262626] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-[#737373] dark:text-[#A3A3A3]">
            Active Role:{' '}
            <strong className="text-[#171717] dark:text-[#F5F5F5] font-semibold">{user?.name}</strong>{' '}
            <span className="capitalize text-indigo-600 dark:text-indigo-400 font-medium">({user?.role})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#A3A3A3] dark:text-[#737373] text-[11px] mr-1">Switch Persona:</span>
            <button
              onClick={() => switchDemoUser('admin')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                user?.role === 'admin'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-transparent'
                  : 'bg-neutral-50 dark:bg-neutral-800 text-[#737373] dark:text-[#A3A3A3] border-[#E5E5E5] dark:border-[#262626]'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => switchDemoUser('staff')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                user?.role === 'staff'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-transparent'
                  : 'bg-neutral-50 dark:bg-neutral-800 text-[#737373] dark:text-[#A3A3A3] border-[#E5E5E5] dark:border-[#262626]'
              }`}
            >
              Staff
            </button>
            <button
              onClick={() => switchDemoUser('customer')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                user?.role === 'customer'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-transparent'
                  : 'bg-neutral-50 dark:bg-neutral-800 text-[#737373] dark:text-[#A3A3A3] border-[#E5E5E5] dark:border-[#262626]'
              }`}
            >
              Customer
            </button>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((st) => (
          <div
            key={st.step}
            className="bg-white dark:bg-[#111111] p-4 sm:p-5 rounded-xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-800/60 transition-colors"
          >
            <div className="flex items-start gap-3.5 flex-1">
              <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] text-[#171717] dark:text-[#F5F5F5] font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                {st.step}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">{st.title}</h3>
                  <span className="text-[10px] uppercase font-semibold text-[#737373] dark:text-[#A3A3A3] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                    {st.role}
                  </span>
                </div>
                <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1 leading-relaxed">{st.desc}</p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
              <Button
                variant="primary"
                size="xs"
                icon={<ChevronRight className="w-3.5 h-3.5" />}
                onClick={() => {
                  switchDemoUser(st.userSwitch);
                  onNavigate(st.targetPage);
                }}
              >
                {st.actionLabel}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
