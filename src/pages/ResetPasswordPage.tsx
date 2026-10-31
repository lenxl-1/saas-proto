import React, { useMemo, useState } from 'react';
import {
  CheckCircle,
  KeyRound,
  Lock,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { validatePassword } from '../lib/crypto';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';

interface ResetPasswordPageProps {
  initialToken?: string;
  onNavigateToLogin: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  initialToken = '',
  onNavigateToLogin,
}) => {
  const { resetPassword } = useAuth();
  const { showToast } = useToast();

  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordValidation = useMemo(() => validatePassword(newPassword), [newPassword]);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      showToast('error', 'Token Required', 'Please enter your password reset token.');
      return;
    }

    if (!passwordValidation.isValid) {
      showToast('error', 'Security Requirements', 'Password does not meet the security standards.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('error', 'Mismatch', 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPassword(token.trim(), newPassword);
      if (!res.success) {
        showToast('error', 'Reset Failed', res.error || 'Token invalid or expired.');
      } else {
        showToast('success', 'Password Updated', 'Your password has been changed. You may now sign in.');
        onNavigateToLogin();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#0A0A0A] flex items-center justify-center p-4 transition-colors">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#0A0A0A] font-bold text-lg shadow-sm mb-3">
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            Reset Password
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Single-use token with 30-minute validity generated via Mock Inbox.
          </p>
        </div>

        <div className="bg-white dark:bg-[#111111] p-6 sm:p-7 rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-[#737373] dark:text-[#A3A3A3] mb-1">
                Security Reset Token *
              </label>
              <input
                type="text"
                required
                placeholder="rst_..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-[#737373] dark:text-[#A3A3A3] mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none"
              />

              {/* Password Checklist */}
              <div className="mt-2.5 p-3 bg-neutral-50 dark:bg-neutral-850 border border-[#E5E5E5] dark:border-[#262626] rounded-lg space-y-1 text-[11px]">
                <p className="font-semibold text-[#171717] dark:text-[#F5F5F5] mb-1">
                  Security Standards Checklist:
                </p>
                <div
                  className={`flex items-center gap-1.5 ${
                    passwordValidation.criteria.minLength
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-[#A3A3A3]'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Minimum 9 characters</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    passwordValidation.criteria.hasUpper
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-[#A3A3A3]'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>At least 1 uppercase letter (A-Z)</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    passwordValidation.criteria.hasLower
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-[#A3A3A3]'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>At least 1 lowercase letter (a-z)</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    passwordValidation.criteria.hasDigit
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-[#A3A3A3]'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>At least 1 numerical digit (0-9)</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    passwordValidation.criteria.hasSpecial
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-[#A3A3A3]'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>At least 1 special character (!@#$%^&*)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-medium text-[#737373] dark:text-[#A3A3A3] mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-3"
              isLoading={isSubmitting}
            >
              Update Password & Sign In
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#F5F5F5] dark:border-[#1F1F1F] text-center text-xs text-[#737373] dark:text-[#A3A3A3]">
            Remember your password?{' '}
            <button
              onClick={onNavigateToLogin}
              className="font-medium text-[#171717] dark:text-[#F5F5F5] hover:underline"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
