import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Inbox,
  Mail,
  MailOpen,
  Trash2,
  X,
} from 'lucide-react';
import { EmailMessage } from '../types';
import { mockEmailsRepo, subscribeToDatabase } from '../lib/db';
import { formatDateTime } from '../lib/formatters';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';

interface MockInboxPageProps {
  onNavigateToReset?: (token: string) => void;
}

export const MockInboxPage: React.FC<MockInboxPageProps> = ({ onNavigateToReset }) => {
  const { showToast } = useToast();
  const [emails, setEmails] = useState(() => mockEmailsRepo.getAll());
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  React.useEffect(() => {
    return subscribeToDatabase(() => {
      setEmails(mockEmailsRepo.getAll());
    });
  }, []);

  const handleOpenEmail = (msg: EmailMessage) => {
    mockEmailsRepo.markAsRead(msg.id);
    setSelectedEmail(msg);
  };

  const handleClearInbox = () => {
    mockEmailsRepo.clearAll();
    setSelectedEmail(null);
    showToast('info', 'Inbox Cleared', 'All notification records removed.');
  };

  const filteredEmails = useMemo(() => {
    return emails.filter((msg) => {
      if (categoryFilter === 'all') return true;
      if (categoryFilter === 'reset' && msg.type === 'password_reset') return true;
      if (categoryFilter === 'invoice' && msg.type === 'invoice_sent') return true;
      if (categoryFilter === 'payment' && (msg.type === 'payment_receipt' || msg.type === 'payment_reminder')) return true;
      return true;
    });
  }, [emails, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* 27. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            Notifications & Dispatch Log
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Simulated outbound notifications for renewals, invoices, settlements, and verification tokens.
          </p>
        </div>

        {emails.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={handleClearInbox}
            className="text-red-600 dark:text-red-400"
          >
            Clear Inbox
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-white dark:bg-[#111111] p-1 border border-[#E5E5E5] dark:border-[#262626] rounded-xl text-xs">
        {[
          { id: 'all', label: 'All Notifications' },
          { id: 'invoice', label: 'Invoices' },
          { id: 'payment', label: 'Payments' },
          { id: 'reset', label: 'Security & Auth' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              categoryFilter === tab.id
                ? 'bg-neutral-100 dark:bg-neutral-800 text-[#171717] dark:text-[#F5F5F5] font-semibold'
                : 'text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Split View: List and Detail Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Messages List */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden shadow-2xs">
          <div className="p-3.5 border-b border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between text-xs">
            <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
              Notifications ({filteredEmails.length})
            </span>
            <span className="text-[11px] text-[#A3A3A3]">Auto-captured log</span>
          </div>

          <div className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F] max-h-[550px] overflow-y-auto">
            {filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#737373] dark:text-[#A3A3A3]">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#A3A3A3]" />
                <p>No messages recorded in this view.</p>
              </div>
            ) : (
              filteredEmails.map((msg) => {
                const isSelected = selectedEmail?.id === msg.id;

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleOpenEmail(msg)}
                    className={`p-4 cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? 'bg-neutral-100/90 dark:bg-neutral-800/90 text-[#171717] dark:text-[#F5F5F5]'
                        : !msg.read
                        ? 'bg-white dark:bg-[#111111] hover:bg-neutral-50 dark:hover:bg-neutral-850 font-semibold'
                        : 'bg-white dark:bg-[#111111] hover:bg-neutral-50 dark:hover:bg-neutral-850 text-[#737373] dark:text-[#A3A3A3]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-[#171717] dark:text-[#F5F5F5] truncate max-w-[190px]">
                        {msg.toName}
                      </span>
                      <span className="text-[10px] text-[#A3A3A3] font-mono">
                        {formatDateTime(msg.sentAt)}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-[#171717] dark:text-[#F5F5F5] truncate mb-1">
                      {msg.subject}
                    </p>

                    <p className="text-[11px] text-[#737373] dark:text-[#A3A3A3] line-clamp-2 leading-relaxed">
                      {msg.content}
                    </p>

                    {msg.type === 'password_reset' && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        Auth Token
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Reading Pane */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl p-6 min-h-[420px] flex flex-col justify-between shadow-2xs">
          {selectedEmail ? (
            <div className="space-y-4 text-xs">
              <div className="pb-4 border-b border-[#E5E5E5] dark:border-[#262626]">
                <div className="flex items-center justify-between text-[11px] text-[#A3A3A3]">
                  <span className="font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold">
                    {selectedEmail.type.replace('_', ' ')}
                  </span>
                  <span>{formatDateTime(selectedEmail.sentAt)}</span>
                </div>
                <h2 className="text-lg font-semibold text-[#171717] dark:text-[#F5F5F5] mt-1.5">
                  {selectedEmail.subject}
                </h2>
                <div className="mt-3 text-xs text-[#737373] dark:text-[#A3A3A3] space-y-0.5">
                  <p>
                    <strong className="text-[#171717] dark:text-[#F5F5F5]">To:</strong>{' '}
                    {selectedEmail.toName} &lt;{selectedEmail.toEmail}&gt;
                  </p>
                  <p>
                    <strong className="text-[#171717] dark:text-[#F5F5F5]">From:</strong> BrightFlow
                    Notifications &lt;billing@brightflow.app&gt;
                  </p>
                </div>
              </div>

              {/* Message Content */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-[#E5E5E5] dark:border-[#262626] whitespace-pre-wrap font-sans text-xs text-[#171717] dark:text-[#F5F5F5] leading-relaxed">
                {selectedEmail.content}
              </div>

              {/* Action Button for password reset */}
              {selectedEmail.resetToken && onNavigateToReset && (
                <div className="p-4 bg-neutral-100/60 dark:bg-neutral-800/60 rounded-xl border border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                      Simulated Reset Link Ready
                    </span>
                    <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3]">
                      Click to test the password reset flow using this token
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onNavigateToReset(selectedEmail.resetToken!)}
                  >
                    Open Reset Form
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#737373] dark:text-[#A3A3A3]">
              <Mail className="w-10 h-10 mb-3 opacity-30 text-[#A3A3A3]" />
              <h3 className="font-semibold text-sm text-[#171717] dark:text-[#F5F5F5]">
                No Message Selected
              </h3>
              <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1 max-w-xs">
                Select an outbound notification on the left to inspect its full payload.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
