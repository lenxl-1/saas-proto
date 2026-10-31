import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { validatePassword } from '../lib/crypto';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';

interface RegisterPageProps {
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateToLogin }) => {
  const { register } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !email.trim()) {
      const err = 'Name and email are mandatory.';
      setErrorMessage(err);
      showToast('error', 'Required Fields', err);
      return;
    }

    if (!passwordValidation.isValid) {
      const err = 'Please satisfy all password security requirements.';
      setErrorMessage(err);
      showToast('error', 'Password Requirements', err);
      return;
    }

    if (password !== confirmPassword) {
      const err = 'Passwords do not match.';
      setErrorMessage(err);
      showToast('error', 'Password Mismatch', err);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || '+91 98000 00000',
        company: company.trim(),
        city: city.trim(),
      });

      if (!res.success) {
        const err = res.error || 'Registration failed.';
        setErrorMessage(err);
        showToast('error', 'Registration Failed', err);
      } else {
        showToast('success', 'Account Created', 'Welcome to BrightFlow! Your customer account is active.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#0A0A0A] flex items-center justify-center p-4 transition-colors">
      <div className="max-w-md w-full my-6">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#0A0A0A] font-bold text-xl shadow-xs mb-3 ring-1 ring-black/5 dark:ring-white/10">
            B
          </div>
          <h1 className="text-2xl font-bold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            Create Customer Account
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Register for self-service subscription plans & billing portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#111111] p-6 sm:p-7 rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#171717] dark:text-[#F5F5F5]">
              Customer Registration
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold uppercase">
              Role: Customer
            </span>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/[0.08] border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-[#171717] dark:text-[#F5F5F5] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Patel"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block font-medium text-[#171717] dark:text-[#F5F5F5] mb-1">
                Work Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="ramesh@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#737373] dark:text-[#A3A3A3] mb-1">
                  Company
                </label>
                <input
                  type="text"
                  placeholder="Patel Infotech"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block font-medium text-[#737373] dark:text-[#A3A3A3] mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  placeholder="+91 98000 00000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-medium text-[#171717] dark:text-[#F5F5F5] mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Create secure password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full p-2 pr-9 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Requirements Checklist (Always visible) */}
              <div className="mt-2 p-2.5 bg-neutral-50/80 dark:bg-neutral-900/60 rounded-lg border border-[#E5E5E5] dark:border-[#262626] space-y-1">
                <span className="text-[10px] uppercase font-semibold text-[#737373] dark:text-[#A3A3A3] tracking-wider block mb-1">
                  Password Requirements:
                </span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${passwordValidation.criteria.minLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-[#737373] dark:text-[#A3A3A3]'}`}>
                    {passwordValidation.criteria.minLength ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current opacity-40" />}
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordValidation.criteria.hasUpper ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-[#737373] dark:text-[#A3A3A3]'}`}>
                    {passwordValidation.criteria.hasUpper ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current opacity-40" />}
                    <span>1 uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordValidation.criteria.hasLower ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-[#737373] dark:text-[#A3A3A3]'}`}>
                    {passwordValidation.criteria.hasLower ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current opacity-40" />}
                    <span>1 lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordValidation.criteria.hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-[#737373] dark:text-[#A3A3A3]'}`}>
                    {passwordValidation.criteria.hasSpecial ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current opacity-40" />}
                    <span>1 special symbol (!@#$%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block font-medium text-[#171717] dark:text-[#F5F5F5] mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full p-2 pr-9 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5] transition-colors"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <div className={`mt-1 text-[11px] flex items-center gap-1 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {passwordsMatch ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>Passwords match</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      <span>Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-3"
              isLoading={isSubmitting}
            >
              Complete Registration
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#F5F5F5] dark:border-[#1F1F1F] text-center text-xs text-[#737373] dark:text-[#A3A3A3]">
            Already have an account?{' '}
            <button
              onClick={onNavigateToLogin}
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Sign in here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
