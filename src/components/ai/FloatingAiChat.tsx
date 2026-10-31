import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle,
  Clock,
  CornerDownLeft,
  HelpCircle,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  User as UserIcon,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import {
  generateRuleBasedAiResponse,
  get_aging_report,
  get_churn_risk_customers,
  get_kpis,
  get_overdue_invoices,
  get_revenue_by_month,
} from '../../lib/analytics';
import { customersRepo, invoicesRepo, mockEmailsRepo, settingsRepo, subscriptionsRepo } from '../../lib/db';
import { formatDate, formatINR } from '../../lib/formatters';
import { ConfirmModal } from '../common/ConfirmModal';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolBadge?: string;
  isOffline?: boolean;
  timestamp: string;
}

export const FloatingAiChat: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const settings = settingsRepo.get();

  // If AI Assistant is disabled in settings, do not render
  if (settings.enableAiAssistant === false) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Quick action confirmation dialog state
  const [actionConfirm, setActionConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ isOpen: false, title: '', message: '', action: () => {} });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isCustomer = user?.role === 'customer';

  // Seed initial greeting message
  useEffect(() => {
    if (messages.length === 0) {
      if (isCustomer) {
        setMessages([
          {
            id: 'init-msg',
            sender: 'assistant',
            text: `👋 Hello **${user?.name || 'Customer'}**! I am your **BrightFlow Account Assistant**.\n\nYou can ask me about your active subscriptions, next billing milestone, invoice breakdown, or renewal terms.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        setMessages([
          {
            id: 'init-msg',
            sender: 'assistant',
            text: `👋 Hello **${user?.name || 'Commander'}**! I am your **BrightFlow AI Revenue Assistant**.\n\nAsk me anything about MRR trajectories, 6-month forecast models, accounts receivable aging, or high churn risk accounts.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    }
  }, [isCustomer, user?.name]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Prepare context for backend proxy
    const context = {
      kpis: get_kpis(user),
      recentRevenue: get_revenue_by_month(user, 3),
      overdueCount: get_overdue_invoices(user).length,
    };

    try {
      // Attempt server proxy call to /api/ai/chat
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, user, context }),
      });

      const data = await response.json();

      if (data && !data.fallback && data.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'res-' + Date.now(),
            sender: 'assistant',
            text: data.text,
            toolBadge: 'Powered by Gemini 3.8 Flash',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        // Fallback to deterministic math engine
        const fallbackRes = generateRuleBasedAiResponse(promptText, user);
        setMessages((prev) => [
          ...prev,
          {
            id: 'res-' + Date.now(),
            sender: 'assistant',
            text: fallbackRes.text,
            toolBadge: fallbackRes.toolBadge || 'Deterministic Analytics Engine',
            isOffline: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      // Deterministic fallback on network/server error
      const fallbackRes = generateRuleBasedAiResponse(promptText, user);
      setMessages((prev) => [
        ...prev,
        {
          id: 'res-' + Date.now(),
          sender: 'assistant',
          text: fallbackRes.text,
          toolBadge: fallbackRes.toolBadge || 'Deterministic Analytics Engine',
          isOffline: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }
    }
  };

  // Quick Action execution handler with confirmation
  const handleTriggerAction = (actionName: string) => {
    if (actionName === 'reminders') {
      const overdue = get_overdue_invoices(user);
      if (overdue.length === 0) {
        showToast('info', 'No Overdue Invoices', 'All customer accounts are currently settled.');
        return;
      }

      setActionConfirm({
        isOpen: true,
        title: 'Dispatch Overdue Payment Reminders',
        message: `This will send automated email notifications to ${overdue.length} customer(s) with outstanding delinquent balances exceeding ₹0. Would you like to proceed?`,
        action: () => {
          overdue.forEach((inv) => {
            mockEmailsRepo.send({
              toEmail: inv.email || 'customer@example.com',
              toName: inv.customerName,
              subject: `Urgent Payment Reminder: Invoice ${inv.invoiceNumber}`,
              type: 'payment_reminder',
              content: `Dear ${inv.customerName},\n\nThis is an automated courtesy reminder that Invoice ${
                inv.invoiceNumber
              } for ${formatINR(inv.balanceDue)} was due on ${inv.dueDate} (${inv.daysOverdue} days past due).\n\nPlease log in to your BrightFlow portal to settle this balance at your earliest convenience.`,
            });
          });

          showToast('success', 'Reminders Dispatched', `Sent notifications to ${overdue.length} customers.`);

          setMessages((prev) => [
            ...prev,
            {
              id: 'act-' + Date.now(),
              sender: 'assistant',
              text: `✅ **Action Executed:** Dispatched overdue payment reminder emails to **${overdue.length} account(s)**. You can audit the generated notifications in Mock Inbox.`,
              toolBadge: `Dispatched ${overdue.length} automated reminders`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        },
      });
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-5 right-5 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Open AI Revenue Assistant"
          >
            <div className="relative">
              <Bot className="w-5 h-5 text-indigo-400 dark:text-indigo-600 animate-pulse" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold tracking-tight pr-1">
              {isCustomer ? 'Account Assistant' : 'AI Assistant'}
            </span>
          </button>
        )}
      </div>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[95vw] sm:w-[420px] h-[580px] max-h-[85vh] bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-3.5 px-4 border-b border-[#E5E5E5] dark:border-[#262626] bg-neutral-50/80 dark:bg-neutral-900/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-xs text-[#171717] dark:text-[#F5F5F5]">
                    {isCustomer ? 'BrightFlow Account Assistant' : 'BrightFlow AI Revenue Assistant'}
                  </h3>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <span className="text-[10px] text-[#737373] dark:text-[#A3A3A3] block">
                  {isCustomer ? 'Customer Scoped · Zero Data Leakage' : 'Enterprise Intelligence · Gemini 3.8'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([])}
                className="p-1.5 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200/40">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-1`}>
                  <div
                    className={`p-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-br-xs'
                        : 'bg-neutral-100/80 dark:bg-neutral-850/70 border border-[#E5E5E5] dark:border-[#262626] text-[#171717] dark:text-[#F5F5F5] rounded-bl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed prose prose-xs dark:prose-invert">
                      {msg.text}
                    </div>
                  </div>

                  {msg.toolBadge && (
                    <div className="flex items-center gap-1.5 px-1 text-[10px] text-[#737373] dark:text-[#A3A3A3]">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>{msg.toolBadge}</span>
                      {msg.isOffline && (
                        <span className="text-amber-600 dark:text-amber-400 font-mono text-[9px] bg-amber-50 dark:bg-amber-950/40 px-1 rounded">
                          Deterministic Mode
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs text-[#737373]">
                <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/40">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-850 px-3 py-2 rounded-xl border border-[#E5E5E5] dark:border-[#262626]">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 text-[11px]">Computing financial metrics...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 border-t border-[#E5E5E5] dark:border-[#262626] bg-neutral-50/50 dark:bg-neutral-900/30 overflow-x-auto scrollbar-none flex gap-1.5 shrink-0">
            {isCustomer ? (
              <>
                <button
                  onClick={() => handleSendMessage('What is my current monthly subscription spend?')}
                  className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] whitespace-nowrap hover:border-indigo-500"
                >
                  My Monthly Spend
                </button>
                <button
                  onClick={() => handleSendMessage('Do I have any unpaid or overdue invoices?')}
                  className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] whitespace-nowrap hover:border-indigo-500"
                >
                  Check Unpaid Invoices
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleSendMessage('What is our current MRR, ARR, and financial overview?')}
                  className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] whitespace-nowrap hover:border-indigo-500"
                >
                  MRR & ARR Pulse
                </button>
                <button
                  onClick={() => handleSendMessage('Show me the 6-month revenue forecast and trajectory.')}
                  className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] whitespace-nowrap hover:border-indigo-500"
                >
                  6-Mo Forecast
                </button>
                <button
                  onClick={() => handleSendMessage('Which accounts currently have highest churn risk?')}
                  className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-white dark:bg-[#161616] border border-[#E5E5E5] dark:border-[#262626] text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] whitespace-nowrap hover:border-indigo-500"
                >
                  High Churn Risks
                </button>
                <button
                  onClick={() => handleTriggerAction('reminders')}
                  className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 whitespace-nowrap hover:bg-amber-100 flex items-center gap-1"
                >
                  <Zap className="w-2.5 h-2.5" />
                  Send Overdue Reminders
                </button>
              </>
            )}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-[#E5E5E5] dark:border-[#262626] bg-white dark:bg-[#111111] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder={isCustomer ? 'Ask about your billing or plan...' : 'Ask AI revenue assistant...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 text-xs px-3 py-2 bg-neutral-50 dark:bg-neutral-850 border border-[#E5E5E5] dark:border-[#262626] rounded-xl text-[#171717] dark:text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={!input.trim() || isLoading}
              className="rounded-xl px-3"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      )}

      {/* Quick Action Confirmation Modal */}
      <ConfirmModal
        isOpen={actionConfirm.isOpen}
        title={actionConfirm.title}
        message={actionConfirm.message}
        onConfirm={() => {
          actionConfirm.action();
          setActionConfirm((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setActionConfirm((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};
