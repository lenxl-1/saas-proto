import React, { createContext, useContext, useEffect, useState } from 'react';
import { Customer, User } from '../types';
import { generateSalt, hashPassword, validatePassword, verifyPassword } from './crypto';
import { customersRepo, mockEmailsRepo, usersRepo } from './db';
import { ensureDemoUsers } from './seed';

const SESSION_KEY = 'brightflow_auth_session_v2';
const REMEMBER_KEY = 'brightflow_auth_remember_v2';

interface AuthContextType {
  user: User | null;
  customer: Customer | null;
  isLoading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  switchDemoUser: (role: 'admin' | 'staff' | 'customer') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session
  useEffect(() => {
    async function restoreSession() {
      try {
        await ensureDemoUsers();
        // Check sessionStorage first (temporary session without rememberMe), then localStorage (persistent)
        const stored = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const freshUser = usersRepo.getById(parsed.id);
          if (freshUser && freshUser.active) {
            setUser(freshUser);
            if (freshUser.customerId) {
              const cust = customersRepo.getById(freshUser.customerId, freshUser);
              setCustomer(cust || null);
            }
          } else {
            sessionStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (e) {
        console.error('Session load error', e);
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = async (
    email: string,
    password: string,
    remember = true
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    let existing = usersRepo.getByEmail(cleanEmail);

    // If demo account lookup fails, ensure demo users exist and retry
    if (
      !existing &&
      (cleanEmail === 'admin@brightflow.com' ||
        cleanEmail === 'staff@brightflow.com' ||
        cleanEmail === 'customer@brightflow.com' ||
        cleanEmail === 'admin@brightloop.com' ||
        cleanEmail === 'staff@brightloop.com' ||
        cleanEmail === 'customer@brightloop.com')
    ) {
      await ensureDemoUsers();
      existing = usersRepo.getByEmail(cleanEmail);
    }

    if (!existing) {
      return { success: false, error: 'Incorrect username or password' };
    }

    if (!existing.active) {
      return { success: false, error: 'This account has been deactivated. Please contact support.' };
    }

    let isValid = await verifyPassword(password, existing.salt, existing.passwordHash);
    if (!isValid) {
      // In case password hash in existing user was corrupted by an older version, retry if it's a demo account
      if (
        (cleanEmail === 'admin@brightflow.com' && password === 'Admin@12345') ||
        (cleanEmail === 'staff@brightflow.com' && password === 'Staff@12345') ||
        (cleanEmail === 'customer@brightflow.com' && password === 'Customer@12345')
      ) {
        await ensureDemoUsers();
        const refreshed = usersRepo.getByEmail(cleanEmail);
        if (refreshed && (await verifyPassword(password, refreshed.salt, refreshed.passwordHash))) {
          existing = refreshed;
          isValid = true;
        }
      }
    }

    if (!isValid) {
      return { success: false, error: 'Incorrect username or password' };
    }

    setUser(existing);
    if (existing.customerId) {
      const cust = customersRepo.getById(existing.customerId, existing);
      setCustomer(cust || null);
    } else {
      setCustomer(null);
    }

    if (remember) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ id: existing.id }));
      localStorage.setItem(REMEMBER_KEY, existing.email);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: existing.id }));
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(REMEMBER_KEY);
    }

    return { success: true };
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = data.email.trim().toLowerCase();

    // Check unique email
    const existing = usersRepo.getByEmail(cleanEmail);
    if (existing) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    // Validate password rules
    const val = validatePassword(data.password);
    if (!val.isValid) {
      return {
        success: false,
        error: 'Password does not meet security requirements (at least 8 characters, with uppercase, lowercase, and special character).',
      };
    }

    // 1. Create Customer record
    const customerId = 'CUST-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const newCustomer: Customer = {
      id: customerId,
      name: data.name.trim(),
      email: cleanEmail,
      phone: data.phone || '+91 98000 00000',
      company: data.company?.trim(),
      address: data.address?.trim() || 'Office / Tech Park',
      city: data.city?.trim() || 'Bengaluru',
      state: data.state?.trim() || 'Karnataka',
      pincode: data.pincode?.trim() || '560001',
      gstin: data.gstin?.trim(),
      active: true,
      createdAt: new Date().toISOString(),
    };
    customersRepo.create(newCustomer, null);

    // 2. Create User record
    const salt = generateSalt();
    const hash = await hashPassword(data.password, salt);

    const newUser: User = {
      id: 'USR-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      name: data.name.trim(),
      email: cleanEmail,
      role: 'customer', // Public registration is ALWAYS Customer role
      passwordHash: hash,
      salt,
      active: true,
      customerId,
      createdAt: new Date().toISOString(),
    };
    usersRepo.create(newUser, null);

    // Auto login
    setUser(newUser);
    setCustomer(newCustomer);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: newUser.id }));

    // Send welcome email to Mock Inbox
    mockEmailsRepo.send({
      toEmail: cleanEmail,
      toName: newUser.name,
      subject: 'Welcome to Brightloop Subscription Management!',
      type: 'invoice_sent',
      content: `Hello ${newUser.name},\n\nWelcome to Brightloop Software! Your customer account has been created successfully.\n\nYou can now browse subscription plans, view quotations, and manage recurring invoices.\n\nBest regards,\nBrightloop Team`,
    });

    return { success: true };
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setCustomer(null);
  };

  const requestPasswordReset = async (
    email: string
  ): Promise<{ success: boolean; message: string; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const user = usersRepo.getByEmail(cleanEmail);

    if (!user) {
      // Security standard: don't reveal if email doesn't exist
      return {
        success: true,
        message: 'If an account exists with this email, a reset link has been dispatched to your Mock Inbox.',
      };
    }

    const token = 'rst_' + Math.random().toString(36).substring(2, 12) + Date.now();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30-minute expiry

    mockEmailsRepo.send({
      toEmail: user.email,
      toName: user.name,
      subject: 'Password Reset Request - Brightloop',
      type: 'password_reset',
      resetToken: token,
      expiresAt,
      content: `Hello ${user.name},\n\nA password reset request was received for your Brightloop account.\n\nClick the link below or paste the reset token to set a new password:\nReset Token: ${token}\n(Expires in 30 minutes)\n\nIf you did not request this, you can safely ignore this email.`,
    });

    return {
      success: true,
      message: 'Password reset link has been sent to your Mock Inbox (see top navigation). Token valid for 30 minutes.',
    };
  };

  const resetPassword = async (
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    const emails = mockEmailsRepo.getAll();
    const emailMatch = emails.find((e) => e.resetToken === token);

    if (!emailMatch) {
      return { success: false, error: 'Invalid or expired password reset token.' };
    }

    if (emailMatch.expiresAt && new Date().getTime() > new Date(emailMatch.expiresAt).getTime()) {
      return { success: false, error: 'This reset token has expired. Please request a new one.' };
    }

    // Password validation rules
    const val = validatePassword(newPassword);
    if (!val.isValid) {
      return {
        success: false,
        error: 'Password does not satisfy security rules (9+ characters, uppercase, lowercase, digit, and symbol required).',
      };
    }

    const targetUser = usersRepo.getByEmail(emailMatch.toEmail);
    if (!targetUser) {
      return { success: false, error: 'User associated with this token was not found.' };
    }

    const salt = generateSalt();
    const hash = await hashPassword(newPassword, salt);
    usersRepo.update(targetUser.id, { passwordHash: hash, salt }, targetUser);

    // Mark email token as consumed (single-use)
    mockEmailsRepo.markAsRead(emailMatch.id);

    return { success: true };
  };

  const switchDemoUser = async (role: 'admin' | 'staff' | 'customer') => {
    const map = {
      admin: ['admin@brightflow.com', 'admin@brightloop.com'],
      staff: ['staff@brightflow.com', 'staff@brightloop.com'],
      customer: ['customer@brightflow.com', 'customer@brightloop.com'],
    };
    const targetEmails = map[role];
    let targetUser: User | undefined;
    for (const em of targetEmails) {
      targetUser = usersRepo.getByEmail(em);
      if (targetUser) break;
    }
    if (targetUser) {
      setUser(targetUser);
      if (targetUser.customerId) {
        const cust = customersRepo.getById(targetUser.customerId, targetUser);
        setCustomer(cust || null);
      } else {
        setCustomer(null);
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify({ id: targetUser.id }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        customer,
        isLoading,
        login,
        register,
        logout,
        requestPasswordReset,
        resetPassword,
        switchDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
