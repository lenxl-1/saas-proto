import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle,
  Edit2,
  Lock,
  Plus,
  Shield,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Role, User } from '../types';
import { useAuth } from '../lib/auth';
import { generateSalt, hashPassword, validatePassword } from '../lib/crypto';
import { usersRepo } from '../lib/db';
import { formatDate } from '../lib/formatters';
import { Forbidden403 } from '../components/common/Forbidden403';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';

export const UsersPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  if (user?.role !== 'admin') {
    return <Forbidden403 reason="Only Administrators can access User & Staff account management." />;
  }

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('staff');

  const users = useMemo(() => usersRepo.getAll(user), [user]);
  const passwordCheck = useMemo(() => validatePassword(password), [password]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('error', 'Required Fields', 'Name and email are mandatory.');
      return;
    }

    if (!passwordCheck.isValid) {
      showToast('error', 'Weak Password', 'Password must satisfy all security requirements.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = usersRepo.getByEmail(cleanEmail);
    if (existing) {
      showToast('error', 'Email Taken', 'A user with this email address already exists.');
      return;
    }

    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    const newUser: User = {
      id: 'USR-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      name: name.trim(),
      email: cleanEmail,
      role,
      passwordHash: hash,
      salt,
      active: true,
      createdAt: new Date().toISOString(),
    };

    usersRepo.create(newUser, user);
    showToast('success', 'Staff Member Created', `Account for ${newUser.name} created.`);
    setIsModalOpen(false);
    setName('');
    setEmail('');
    setPassword('');
  };

  const handleToggleActive = (targetUser: User) => {
    if (targetUser.id === user.id) {
      showToast('error', 'Cannot Deactivate Self', 'You cannot deactivate your own active admin account.');
      return;
    }
    const newActive = !targetUser.active;
    usersRepo.update(targetUser.id, { active: newActive }, user);
    showToast(
      'info',
      'Account Status Changed',
      `${targetUser.name} is now ${newActive ? 'active' : 'inactive'}.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            Team & User Access
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Provision internal operators, assign RBAC permissions, and manage credentials.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<UserPlus className="w-3.5 h-3.5" />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Staff Member
        </Button>
      </div>

      {/* Users Data Table */}
      <div className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] font-medium">
              <tr>
                <th className="py-2.5 px-4 font-medium">User Profile</th>
                <th className="py-2.5 px-4 font-medium">Email Address</th>
                <th className="py-2.5 px-4 font-medium">Assigned Role</th>
                <th className="py-2.5 px-4 font-medium">Joined Date</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
              {users.map((u) => {
                const isSelf = u.id === user.id;

                return (
                  <tr
                    key={u.id}
                    className="hover:bg-neutral-50/80 dark:hover:bg-neutral-850/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[#171717] dark:text-[#F5F5F5] text-xs font-semibold flex items-center justify-center">
                          {u.name[0]}
                        </div>
                        <div>
                          <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                            {u.name}
                            {isSelf && (
                              <span className="ml-1.5 text-[10px] text-[#A3A3A3] font-normal">
                                (You)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#737373] dark:text-[#A3A3A3]">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium capitalize border ${
                          u.role === 'admin'
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200/50'
                            : u.role === 'staff'
                            ? 'bg-neutral-100 dark:bg-neutral-800 text-[#171717] dark:text-[#F5F5F5] border-[#E5E5E5] dark:border-[#262626]'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/50'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#737373] dark:text-[#A3A3A3] font-mono text-[11px]">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={u.active ? 'Active' : 'Closed'} size="xs" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`text-xs font-medium hover:underline ${
                            u.active ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {u.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] dark:border-[#262626] mb-4">
              <h3 className="font-semibold text-[#171717] dark:text-[#F5F5F5] text-base">
                Create Staff Account
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="priya@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Role Permission
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                >
                  <option value="staff">Staff (Operations & Quotations)</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 chars, 1 uppercase, 1 digit, 1 special"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none"
                />
                {password && (
                  <p className="mt-1 text-[11px] text-[#737373] dark:text-[#A3A3A3]">
                    {passwordCheck.isValid ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Password criteria satisfied.
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        Must contain uppercase, number, and special character.
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Create Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
