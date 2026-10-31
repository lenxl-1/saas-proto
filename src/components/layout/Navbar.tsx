import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  FastForward,
  Inbox,
  LogOut,
  Menu,
  Moon,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { mockEmailsRepo, subscribeToDatabase } from '../../lib/db';
import { formatDate } from '../../lib/formatters';
import { useBillingScheduler } from '../../hooks/useBillingScheduler';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/Button';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  onOpenSearch: () => void;
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  currentPage,
  onOpenSearch,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}) => {
  const { user, logout, switchDemoUser } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { triggerRun, isRunning, simulatedDate, effectiveToday, setSimulatedDate } =
    useBillingScheduler();
  const { showToast } = useToast();
  const [unreadCount, setUnreadCount] = useState(() => mockEmailsRepo.getUnreadCount());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState(effectiveToday);

  React.useEffect(() => {
    return subscribeToDatabase(() => {
      setUnreadCount(mockEmailsRepo.getUnreadCount());
    });
  }, []);

  const handleRunBilling = () => {
    const res = triggerRun();
    if (res) {
      showToast(
        'success',
        'Billing Run Completed',
        `Evaluated ${res.subscriptionsEvaluated} active subscriptions. Generated ${res.invoicesCreated} invoices (${res.duplicatesSkipped} duplicates skipped).`
      );
    }
  };

  const handleAdvanceMonth = () => {
    const cur = new Date(effectiveToday);
    cur.setMonth(cur.getMonth() + 1);
    const nextStr = cur.toISOString().split('T')[0];
    setSimulatedDate(nextStr);
    showToast(
      'info',
      'Date Advanced',
      `Simulation calendar moved forward to ${formatDate(nextStr)}.`
    );
  };

  const handleResetDate = () => {
    setSimulatedDate(null);
    showToast('info', 'Date Reset', 'Calendar synchronized to real-time clock.');
  };

  const handleApplyCustomDate = () => {
    setSimulatedDate(tempDate);
    setIsDatePickerOpen(false);
    showToast('info', 'Clock Updated', `System time set to ${formatDate(tempDate)}.`);
  };

  // Breadcrumbs title mapping
  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Dashboard';
      case 'customers':
        return 'Customers';
      case 'quotations':
        return 'Quotations';
      case 'subscriptions':
        return 'Subscriptions';
      case 'invoices':
        return 'Invoices';
      case 'payments':
        return 'Payments';
      case 'products':
        return 'Products & Variants';
      case 'plans':
        return 'Subscription Plans';
      case 'discounts':
        return 'Discounts';
      case 'reports':
        return 'Revenue & Reports';
      case 'users':
        return 'User Management';
      case 'mock-inbox':
        return 'Notifications & Inbox';
      case 'performance':
        return 'Performance Benchmark';
      case 'demo-guide':
        return 'Interactive Guide';
      default:
        return 'Overview';
    }
  };

  return (
    <header className="no-print bg-white/95 dark:bg-[#111111]/95 backdrop-blur-md border-b border-[#E7E7E9] dark:border-white/[0.08] sticky top-0 z-40 transition-colors">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Left: Mobile hamburger & Contextual Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            aria-label="Toggle Navigation Menu"
            className="md:hidden p-1.5 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded-md transition-colors"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#A3A3A3] dark:text-[#71717A] hidden sm:inline">BrightFlow</span>
            <span className="text-[#E5E5E5] dark:text-[#262626] hidden sm:inline">/</span>
            <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
              {getPageTitle()}
            </span>
          </div>
        </div>

        {/* Right Zone: Search, Time Simulation, Theme Toggle, Notifications, Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Search Bar (⌘ K) */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100/80 dark:bg-neutral-800/80 hover:bg-neutral-200/70 dark:hover:bg-neutral-750 text-[#737373] dark:text-[#A3A3A3] rounded-lg text-xs transition-colors border border-transparent hover:border-[#E5E5E5] dark:hover:border-[#333333]"
            title="Global Search (⌘K / Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Search anything...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono px-1 py-0.2 bg-white dark:bg-[#111111] border border-[#E7E7E9] dark:border-white/[0.08] rounded shadow-2xs">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          </button>

          {/* Simulated Calendar Controls */}
          <div className="relative">
            <div className="flex items-center bg-neutral-100/70 dark:bg-neutral-800/70 border border-[#E7E7E9] dark:border-white/[0.08] rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="flex items-center gap-1.5 px-2 py-1 text-[#171717] dark:text-[#F5F5F5] hover:text-indigo-600 dark:hover:text-indigo-400 font-medium rounded hover:bg-white dark:hover:bg-[#111111] transition-colors"
                title="Change simulated calendar date"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-mono text-xs tabular-nums">
                  {formatDate(effectiveToday)}
                </span>
                {simulatedDate && (
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-1 py-0.2 rounded">
                    Simulated
                  </span>
                )}
              </button>

              <button
                onClick={handleAdvanceMonth}
                aria-label="Advance 1 Month"
                title="Advance 1 Month"
                className="p-1 text-[#737373] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-[#111111] rounded transition-colors"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>

              {simulatedDate && (
                <button
                  onClick={handleResetDate}
                  title="Reset to Real Clock"
                  aria-label="Reset to Real Clock"
                  className="p-1 text-[#737373] hover:text-red-500 hover:bg-white dark:hover:bg-[#111111] rounded transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Custom Date Popover */}
            {isDatePickerOpen && (
              <div className="absolute right-0 mt-2 p-3 bg-white dark:bg-[#111111] border border-[#E7E7E9] dark:border-white/[0.08] rounded-xl shadow-xl w-64 z-50 animate-in fade-in zoom-in-95">
                <p className="text-xs font-semibold text-[#171717] dark:text-[#F5F5F5] mb-1">
                  Simulate System Date
                </p>
                <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] mb-3 leading-relaxed">
                  Fast-forward calendar time to trigger automated recurring subscriptions and due
                  invoices.
                </p>
                <input
                  type="date"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  className="w-full text-xs p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E7E7E9] dark:border-white/[0.08] rounded-lg mb-3 text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setTempDate(new Date().toISOString().split('T')[0])}
                    className="text-[11px] text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
                  >
                    Today
                  </button>
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setIsDatePickerOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button variant="primary" size="xs" onClick={handleApplyCustomDate}>
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Automated Billing Trigger (Admin/Staff) */}
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRunBilling}
              disabled={isRunning}
              icon={
                isRunning ? (
                  <Clock className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500" />
                )
              }
              className="hidden lg:inline-flex"
            >
              Run Billing
            </Button>
          )}

          {/* Theme Mode Switcher */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle color theme"
            title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-1.5 text-[#737373] hover:text-[#171717] dark:text-[#A3A3A3] dark:hover:text-[#F5F5F5] hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* Mock Inbox Notifications */}
          <button
            onClick={() => onNavigate('mock-inbox')}
            aria-label="Notifications & Mock Inbox"
            title="Notifications & Mock Inbox"
            className={`relative p-1.5 rounded-lg text-[#737373] hover:text-[#171717] dark:text-[#A3A3A3] dark:hover:text-[#F5F5F5] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
              currentPage === 'mock-inbox' ? 'bg-neutral-100 dark:bg-neutral-800 text-[#171717]' : ''
            }`}
          >
            <Inbox className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-indigo-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Authenticated User Identity & Role Badge */}
          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-[#E5E5E5] dark:border-[#262626]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-[#171717] dark:text-[#F5F5F5] text-xs font-semibold flex items-center justify-center shrink-0">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-medium text-[#171717] dark:text-[#F5F5F5] leading-tight truncate max-w-[120px]">
                  {user?.name}
                </span>
                <span
                  className={`text-[9px] font-bold tracking-wider uppercase font-mono ${
                    user?.role === 'admin'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : user?.role === 'staff'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-violet-600 dark:text-violet-400'
                  }`}
                >
                  {user?.role}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              aria-label="Log Out"
              title="Sign Out of BrightFlow"
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#737373] hover:text-rose-600 dark:text-[#A3A3A3] dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Log out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
