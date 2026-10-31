import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';

interface LoginPageProps {
  onNavigateToRegister: () => void;
  onNavigateToReset?: (token?: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateToRegister,
  onNavigateToReset,
}) => {
  const { login, requestPasswordReset } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('admin@brightflow.com');
  const [password, setPassword] = useState('Admin@12345');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password Modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await login(email, password, rememberMe);
      if (!res.success) {
        const err = res.error || 'Incorrect username or password';
        setErrorMessage(err);
        showToast('error', 'Authentication Failed', err);
      } else {
        showToast('success', 'Authenticated', 'Signed in successfully. Routing to your workspace...');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
    showToast(
      'info',
      'Credentials Populated',
      `Filled ${demoEmail}. Click "Sign In" to authenticate.`
    );
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setIsSendingReset(true);
    try {
      const res = await requestPasswordReset(forgotEmail.trim());
      showToast('info', 'Reset Dispatched', res.message);
      setIsForgotModalOpen(false);
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#0A0A0A] flex flex-col items-center justify-center p-4 transition-colors">
      <div className="max-w-md w-full">
        {/* 1. Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#0A0A0A] font-bold text-xl shadow-xs mb-3 ring-1 ring-black/5 dark:ring-white/10">
            B
          </div>
          <h1 className="text-2xl font-bold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            BrightFlow
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Subscription management, without the chaos.
          </p>
        </div>

        {/* 2. Login Form Card */}
        <div className="bg-white dark:bg-[#111111] p-6 sm:p-7 rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-[#171717] dark:text-[#F5F5F5]">
                Sign In
              </h2>
              <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] mt-0.5">
                Enter your credentials to access your account
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[#737373] dark:text-[#A3A3A3]">
              RBAC v2
            </span>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/[0.08] border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Email Field */}
            <div>
              <label className="block font-medium text-[#171717] dark:text-[#F5F5F5] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="name@brightflow.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-medium text-[#171717] dark:text-[#F5F5F5]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-9 pr-10 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-[#737373] dark:text-[#A3A3A3] select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 border-[#D4D4D4] dark:border-[#404040]"
                />
                <span className="text-[11px]">Remember this session</span>
              </label>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isSubmitting}
            >
              Sign In
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-5 pt-4 border-t border-[#F5F5F5] dark:border-[#1F1F1F] text-center text-xs text-[#737373] dark:text-[#A3A3A3]">
            Don&apos;t have an account?{' '}
            <button
              onClick={onNavigateToRegister}
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Register here
            </button>
          </div>
        </div>

        {/* 3. Demo Accounts Section (Placed BELOW form - Prefills ONLY, DOES NOT auto-submit) */}
        <div className="mt-4 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                Demo Accounts
              </span>
              <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3]">
                Click to prefill credentials, then click <strong>Sign In</strong> to authenticate
              </p>
            </div>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded-full">
              Prefill only
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Admin Demo */}
            <button
              type="button"
              onClick={() => handleFillDemo('admin@brightflow.com', 'Admin@12345')}
              className="p-2.5 text-left bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg transition-all text-xs group hover:border-indigo-500/50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                  Admin Demo
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  ADMIN
                </span>
              </div>
              <span className="text-[10px] text-[#737373] dark:text-[#A3A3A3] font-mono block truncate">
                admin@brightflow.com
              </span>
              <span className="text-[9px] text-[#A3A3A3] dark:text-[#71717A] block mt-0.5">
                Full privileges & users
              </span>
            </button>

            {/* Staff Demo */}
            <button
              type="button"
              onClick={() => handleFillDemo('staff@brightflow.com', 'Staff@12345')}
              className="p-2.5 text-left bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg transition-all text-xs group hover:border-emerald-500/50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                  Staff Demo
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  STAFF
                </span>
              </div>
              <span className="text-[10px] text-[#737373] dark:text-[#A3A3A3] font-mono block truncate">
                staff@brightflow.com
              </span>
              <span className="text-[9px] text-[#A3A3A3] dark:text-[#71717A] block mt-0.5">
                Billing & operations
              </span>
            </button>

            {/* Customer Demo */}
            <button
              type="button"
              onClick={() => handleFillDemo('customer@brightflow.com', 'Customer@12345')}
              className="p-2.5 text-left bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg transition-all text-xs group hover:border-violet-500/50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                  Customer Demo
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  CUSTOMER
                </span>
              </div>
              <span className="text-[10px] text-[#737373] dark:text-[#A3A3A3] font-mono block truncate">
                customer@brightflow.com
              </span>
              <span className="text-[9px] text-[#A3A3A3] dark:text-[#71717A] block mt-0.5">
                Client portal & invoices
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-sm w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] dark:border-[#262626] mb-3">
              <h3 className="font-semibold text-[#171717] dark:text-[#F5F5F5] text-sm">
                Reset Password
              </h3>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[#737373] dark:text-[#A3A3A3] mb-4 leading-relaxed">
              Enter your work email address. A 30-minute verification token will be dispatched to
              the Mock Inbox.
            </p>

            <form onSubmit={handleSendResetEmail} className="space-y-3">
              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@brightflow.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button variant="ghost" size="xs" onClick={() => setIsForgotModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="xs" type="submit" isLoading={isSendingReset}>
                  Dispatch Reset
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
