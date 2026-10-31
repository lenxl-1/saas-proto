import React from 'react';
import {
  Activity,
  BarChart3,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Inbox,
  Layers,
  LayoutDashboard,
  Package,
  Percent,
  Repeat,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { user, switchDemoUser } = useAuth();
  const role = user?.role || 'customer';

  // Navigation schema configured for roles
  const getNavSections = (): NavSection[] => {
    if (role === 'customer') {
      return [
        {
          title: 'PORTAL',
          items: [
            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
            { id: 'ai-insights', label: 'Spend & Forecast', icon: Sparkles },
            { id: 'subscriptions', label: 'My Subscriptions', icon: Repeat },
            { id: 'invoices', label: 'Invoices & Receipts', icon: FileText },
            { id: 'payments', label: 'Payments History', icon: CreditCard },
          ],
        },
        {
          title: 'CATALOG',
          items: [{ id: 'plans', label: 'Explore Plans', icon: Layers }],
        },
        {
          title: 'SYSTEM',
          items: [
            { id: 'mock-inbox', label: 'Notification Inbox', icon: Inbox },
            { id: 'demo-guide', label: 'Demo Guide', icon: Sparkles },
          ],
        },
      ];
    }

    const sections: NavSection[] = [
      {
        title: 'OVERVIEW',
        items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
      },
      {
        title: 'OPERATIONS',
        items: [
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet },
          { id: 'subscriptions', label: 'Subscriptions', icon: Repeat },
          { id: 'invoices', label: 'Invoices', icon: FileText },
          { id: 'payments', label: 'Payments', icon: CreditCard },
        ],
      },
      {
        title: 'CATALOG',
        items: [
          { id: 'products', label: 'Products', icon: Package },
          { id: 'plans', label: 'Plans', icon: Layers },
          { id: 'discounts', label: 'Discounts', icon: Percent },
        ],
      },
      {
        title: 'ANALYTICS',
        items: [
          { id: 'ai-insights', label: 'AI Insights & Forecast', icon: Sparkles, badge: 'AI' },
          { id: 'reports', label: 'Revenue & Reports', icon: TrendingUp },
        ],
      },
      {
        title: 'SYSTEM',
        items: [
          { id: 'mock-inbox', label: 'Notifications', icon: Inbox },
          ...(role === 'admin'
            ? [
                { id: 'users', label: 'Team & Roles', icon: ShieldCheck },
                { id: 'performance', label: 'Activity & 5K', icon: Activity },
              ]
            : []),
          { id: 'demo-guide', label: 'Demo Guide', icon: Sparkles },
        ],
      },
    ];

    return sections;
  };

  const navSections = getNavSections();

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between overflow-y-auto">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#E7E7E9] dark:border-white/[0.08]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              onNavigate('dashboard');
              onCloseMobile?.();
            }}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            {/* Geometric "B" mark */}
            <div className="w-7 h-7 rounded-lg bg-[#171717] dark:bg-white text-white dark:text-[#0A0A0A] font-bold text-sm flex items-center justify-center tracking-tighter shadow-2xs group-hover:scale-105 transition-transform">
              B
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-[#171717] dark:text-[#F5F5F5] block leading-none">
                BrightFlow
              </span>
              <span className="text-[10px] text-[#A3A3A3] dark:text-[#71717A] tracking-tight block mt-1">
                Subscription Engine
              </span>
            </div>
          </button>

          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1 text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 px-3 py-3 space-y-5">
        {navSections.map((sec) => (
          <div key={sec.title} className="space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[#A3A3A3] dark:text-[#71717A]">
              {sec.title}
            </div>
            <nav className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const active = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all text-left relative group ${
                      active
                        ? 'bg-neutral-150 dark:bg-neutral-800 text-[#171717] dark:text-[#F5F5F5] font-semibold'
                        : 'text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5] hover:bg-neutral-100/70 dark:hover:bg-neutral-850'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {/* Active indicator bar */}
                      {active && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-r-full" />
                      )}
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          active
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-[#A3A3A3] dark:text-[#71717A] group-hover:text-[#171717] dark:group-hover:text-[#F5F5F5]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-[#737373] dark:text-[#A3A3A3] px-1.5 py-0.2 rounded font-mono">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom User Profile & Demo Switcher */}
      <div className="p-3 border-t border-[#E7E7E9] dark:border-white/[0.08] bg-neutral-50/50 dark:bg-neutral-900/30">
        <div className="flex items-center gap-2.5 px-1 py-1 mb-2">
          <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-[#171717] dark:text-[#F5F5F5] text-xs font-semibold flex items-center justify-center shrink-0">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-[#171717] dark:text-[#F5F5F5] block truncate leading-tight">
              {user?.name}
            </span>
            <span className="text-[10px] text-[#A3A3A3] dark:text-[#71717A] capitalize block truncate mt-0.5">
              {user?.role} Workspace
            </span>
          </div>
        </div>

        {/* Quick Role Switcher for instant testing */}
        <div className="flex items-center gap-1 bg-neutral-150 dark:bg-neutral-800 p-0.5 rounded-lg text-[10px]">
          <button
            onClick={() => switchDemoUser('admin')}
            className={`flex-1 py-1 rounded font-medium transition-colors ${
              user?.role === 'admin'
                ? 'bg-white dark:bg-[#111111] text-[#171717] dark:text-[#F5F5F5] font-semibold shadow-2xs'
                : 'text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717]'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => switchDemoUser('staff')}
            className={`flex-1 py-1 rounded font-medium transition-colors ${
              user?.role === 'staff'
                ? 'bg-white dark:bg-[#111111] text-[#171717] dark:text-[#F5F5F5] font-semibold shadow-2xs'
                : 'text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717]'
            }`}
          >
            Staff
          </button>
          <button
            onClick={() => switchDemoUser('customer')}
            className={`flex-1 py-1 rounded font-medium transition-colors ${
              user?.role === 'customer'
                ? 'bg-white dark:bg-[#111111] text-[#171717] dark:text-[#F5F5F5] font-semibold shadow-2xs'
                : 'text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717]'
            }`}
          >
            Customer
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (240px) */}
      <aside className="no-print hidden md:flex w-60 bg-white dark:bg-[#111111] border-r border-[#E7E7E9] dark:border-white/[0.08] flex-col shrink-0 min-h-[calc(100vh-3.5rem)] transition-colors">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-[#111111] border-r border-[#E7E7E9] dark:border-white/[0.08] z-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
