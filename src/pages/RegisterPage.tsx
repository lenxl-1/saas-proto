import React, { useMemo, useState } from 'react';
import {
  CheckCircle,
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      showToast('error', 'Required Fields', 'Name and email are mandatory.');
      return;
    }

    if (!passwordValidation.isValid) {
      showToast('error', 'Password Rules Not Met', 'Please satisfy all 5 password requirements.');
      return;
    }

    if (password !== confirmPassword) {
      showToast('error', 'Mismatch', 'Passwords do not match.');
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
        showToast('error', 'Registration Failed', res.error);
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
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#0A0A0A] font-bold text-lg shadow-sm mb-3">
            B
          </div>
          <h1 className="text-2xl font-bold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            Create Customer Account
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Register to subscribe to software modules and access client billing.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#111111] p-6 sm:p-7 rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-[#737373] dark:text-[#A3A3A3] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Patel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-medium text-[#737373] dark:text-[#A3A3A3] mb-1">
                Work Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="ramesh@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-[#737373] dark:text-[#A3A3A3] mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                placeholder="Min 8 chars, 1 uppercase, 1 digit, 1 special"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
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
                className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
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
              className="font-medium text-[#171717] dark:text-[#F5F5F5] hover:underline"
            >
              Sign in here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
