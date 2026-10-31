import React, { Suspense, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { isDatabaseSeeded, seedDemoData } from './lib/seed';
import { ToastProvider, useToast } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Forbidden403 } from './components/common/Forbidden403';
import { CommandPalette } from './components/ui/CommandPalette';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { CustomersPage } from './pages/CustomersPage';
import { ProductsPage } from './pages/ProductsPage';
import { PlansPage } from './pages/PlansPage';
import { DiscountsPage } from './pages/DiscountsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { MockInboxPage } from './pages/MockInboxPage';
import { PerformancePage } from './pages/PerformancePage';
import { DemoGuidePage } from './pages/DemoGuidePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

function MainApp() {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [authView, setAuthView] = useState<'login' | 'register' | 'reset'>('login');
  const [resetToken, setResetToken] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Initialize and seed demo data on first load
  useEffect(() => {
    async function init() {
      try {
        const seeded = await isDatabaseSeeded();
        if (!seeded) {
          await seedDemoData(false);
        }
      } catch (err) {
        console.error('Seeding error', err);
      } finally {
        setIsInitializing(false);
      }
    }
    init();
  }, []);

  // Global keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Mock Inbox reset password click navigation
  const handleNavigateToReset = (token: string) => {
    setResetToken(token);
    setAuthView('reset');
  };

  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#0A0A0A] font-bold text-2xl flex items-center justify-center mx-auto shadow-sm animate-pulse tracking-tight">
            B
          </div>
          <p className="mt-4 text-xs font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            BrightFlow
          </p>
          <p className="mt-1 text-[11px] text-[#737373] dark:text-[#A3A3A3]">
            Mounting subscription state & indexed database
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated views
  if (!user) {
    if (authView === 'register') {
      return <RegisterPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'reset') {
      return (
        <ResetPasswordPage
          initialToken={resetToken}
          onNavigateToLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <LoginPage
        onNavigateToRegister={() => setAuthView('register')}
        onNavigateToReset={(tok) => {
          setResetToken(tok || '');
          setAuthView('reset');
        }}
      />
    );
  }

  // Role Guard validation
  const renderCurrentPage = () => {
    // Admin only sections
    if ((currentPage === 'users' || currentPage === 'performance') && user.role !== 'admin') {
      return (
        <Forbidden403
          reason="This administrative section is restricted to Administrator roles."
          onGoBack={() => setCurrentPage('dashboard')}
        />
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'subscriptions':
        return <SubscriptionsPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'quotations':
        return <QuotationsPage />;
      case 'customers':
        return <CustomersPage />;
      case 'products':
        return <ProductsPage />;
      case 'plans':
        return <PlansPage />;
      case 'discounts':
        return <DiscountsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'users':
        return <UsersPage />;
      case 'mock-inbox':
        return (
          <MockInboxPage
            onNavigateToReset={(tok) => {
              setResetToken(tok);
              setAuthView('reset');
            }}
          />
        );
      case 'performance':
        return <PerformancePage />;
      case 'demo-guide':
        return <DemoGuidePage onNavigate={setCurrentPage} />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#0A0A0A] flex flex-col font-sans text-[#171717] dark:text-[#F5F5F5] transition-colors duration-150">
      <Navbar
        onNavigate={setCurrentPage}
        currentPage={currentPage}
        onOpenSearch={() => setIsSearchOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderCurrentPage()}
          </div>
        </main>
      </div>

      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(page) => setCurrentPage(page)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
