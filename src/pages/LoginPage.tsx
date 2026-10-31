import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
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

  const [email, setEmail] = useState('admin@brightloop.com');
  const [password, setPassword] = useState('Admin@12345');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password Modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await login(email, password, rememberMe);
      if (!res.success) {
        showToast('error', 'Login Failed', res.error || 'Invalid credentials.');
      } else {
        showToast('success', 'Welcome Back', 'Signed in successfully.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
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
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#0A0A0A] flex items-center justify-center p-4 transition-colors">
      <div className="max-w-md w-full">
        {/* 1. Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#0A0A0A] font-bold text-lg shadow-sm mb-3">
            B
          </div>
          <h1 className="text-2xl font-bold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            BrightFlow
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Subscription management, without the chaos.
          </p>
        </div>

        {/* 1-Click Demo Accounts Selector */}
        <div className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl p-3.5 mb-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-[#737373] dark:text-[#A3A3A3] mb-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Demo Workspaces</span>
            <span className="text-[10px]">Instant Login</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo('admin@brightloop.com', 'Admin@12345')}
              className="p-2 text-left bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 border border-[#E5E5E5] dark:border-[#262626] rounded-lg transition-colors text-xs"
            >
              <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">Admin</span>
              <span className="text-[10px] text-[#737373] dark:text-[#A3A3A3] block truncate">Full access</span>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('staff@brightloop.com', 'Staff@12345')}
              className="p-2 text-left bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 border border-[#E5E5E5] dark:border-[#262626] rounded-lg transition-colors text-xs"
            >
              <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">Staff</span>
              <span className="text-[10px] text-[#737373] dark:text-[#A3A3A3] block truncate">Billing ops</span>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('customer@brightloop.com', 'Customer@12345')}
              className="p-2 text-left bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 border border-[#E5E5E5] dark:border-[#262626] rounded-lg transition-colors text-xs"
            >
              <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">Customer</span>
              <span className="text-[10px] text-[#737373] dark:text-[#A3A3A3] block truncate">Portal view</span>
            </button>
          </div>
        </div>

        {/* Login Form Box */}
        <div className="bg-white dark:bg-[#111111] p-6 sm:p-7 rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-sm">
          <h2 className="text-base font-semibold text-[#171717] dark:text-[#F5F5F5] mb-4">
            Sign In to BrightFlow
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-[#737373] dark:text-[#A3A3A3] mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3]">Password</label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#737373] dark:text-[#A3A3A3]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Remember this session</span>
              </label>
            </div>

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

          <div className="mt-5 pt-4 border-t border-[#F5F5F5] dark:border-[#1F1F1F] text-center text-xs text-[#737373] dark:text-[#A3A3A3]">
            Don&apos;t have an account?{' '}
            <button
              onClick={onNavigateToRegister}
              className="font-medium text-[#171717] dark:text-[#F5F5F5] hover:underline"
            >
              Register here
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
                  placeholder="admin@brightloop.com"
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
