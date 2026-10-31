import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle,
  Clock,
  Filter,
  Inbox,
  Pause,
  RefreshCw,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { SubscriptionRequest, SubscriptionRequestStatus, User } from '../../types';
import { requestsRepo } from '../../lib/db';
import { formatDate } from '../../lib/formatters';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';

interface SubscriptionRequestsTabProps {
  currentUser: User;
  onRefresh?: () => void;
}

export const SubscriptionRequestsTab: React.FC<SubscriptionRequestsTabProps> = ({
  currentUser,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<'All' | SubscriptionRequestStatus>('Pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Resolution modal state
  const [resolvingRequest, setResolvingRequest] = useState<{
    request: SubscriptionRequest;
    action: 'Approved' | 'Rejected';
  } | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requests = useMemo(() => requestsRepo.getAll(currentUser), [currentUser]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.subscriptionNumber.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          (r.reason && r.reason.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [requests, statusFilter, searchQuery]);

  const handleConfirmResolve = async () => {
    if (!resolvingRequest) return;
    setIsSubmitting(true);

    try {
      requestsRepo.resolve(
        resolvingRequest.request.id,
        resolvingRequest.action,
        adminNote.trim(),
        currentUser
      );

      showToast(
        'success',
        `Request ${resolvingRequest.action}`,
        `Subscription ${resolvingRequest.request.subscriptionNumber} request was ${resolvingRequest.action.toLowerCase()}.`
      );

      setResolvingRequest(null);
      setAdminNote('');
      onRefresh?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Action Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: SubscriptionRequestStatus) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 rounded-full inline-flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> Pending
          </span>
        );
      case 'Approved':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 rounded-full inline-flex items-center gap-1">
            <Check className="w-2.5 h-2.5" /> Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200/50 rounded-full inline-flex items-center gap-1">
            <X className="w-2.5 h-2.5" /> Rejected
          </span>
        );
    }
  };

  const getTypeBadge = (type: SubscriptionRequest['type']) => {
    switch (type) {
      case 'pause':
        return (
          <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded">
            Pause
          </span>
        );
      case 'cancel':
        return (
          <span className="px-2 py-0.5 text-[10px] font-medium bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded">
            Cancel
          </span>
        );
      case 'renew':
        return (
          <span className="px-2 py-0.5 text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 rounded">
            Renew
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((tab) => {
            const count =
              tab === 'All'
                ? requests.length
                : requests.filter((r) => r.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === tab
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xs'
                    : 'text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#A3A3A3] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Requests table */}
      <div className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] font-medium">
              <tr>
                <th className="py-2.5 px-4 font-medium">Request ID</th>
                <th className="py-2.5 px-4 font-medium">Customer</th>
                <th className="py-2.5 px-4 font-medium">Subscription</th>
                <th className="py-2.5 px-4 font-medium">Request Type</th>
                <th className="py-2.5 px-4 font-medium">Reason / Customer Note</th>
                <th className="py-2.5 px-4 font-medium">Date</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#737373] dark:text-[#A3A3A3]">
                    No customer requests found in this view.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-850/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-[#171717] dark:text-[#F5F5F5]">
                      {req.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#171717] dark:text-[#F5F5F5]">
                      {req.customerName}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#737373] dark:text-[#A3A3A3]">
                      {req.subscriptionNumber}
                    </td>
                    <td className="py-3 px-4">
                      {getTypeBadge(req.type)}
                    </td>
                    <td className="py-3 px-4 max-w-xs text-[#737373] dark:text-[#A3A3A3] truncate">
                      {req.reason || 'No note provided'}
                    </td>
                    <td className="py-3 px-4 text-[#737373] dark:text-[#A3A3A3] font-mono text-[11px] whitespace-nowrap">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {req.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => {
                              setResolvingRequest({ request: req, action: 'Approved' });
                              setAdminNote('');
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="xs"
                            onClick={() => {
                              setResolvingRequest({ request: req, action: 'Rejected' });
                              setAdminNote('');
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#A3A3A3] italic">
                          Resolved {req.resolvedAt ? formatDate(req.resolvedAt) : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Confirmation & Admin Note Modal */}
      {resolvingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] dark:border-[#262626]">
              <h3 className="font-semibold text-sm text-[#171717] dark:text-[#F5F5F5]">
                {resolvingRequest.action === 'Approved' ? 'Approve' : 'Reject'} Subscription Request
              </h3>
              <button
                onClick={() => setResolvingRequest(null)}
                className="p-1 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-[#E5E5E5] dark:border-[#262626] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#737373]">Customer:</span>
                  <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                    {resolvingRequest.request.customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Agreement:</span>
                  <span className="font-mono text-[#171717] dark:text-[#F5F5F5]">
                    {resolvingRequest.request.subscriptionNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Action Requested:</span>
                  <span className="uppercase font-semibold text-indigo-600 dark:text-indigo-400">
                    {resolvingRequest.request.type}
                  </span>
                </div>
                {resolvingRequest.request.reason && (
                  <div className="pt-1.5 border-t border-[#E5E5E5] dark:border-[#262626]">
                    <span className="text-[11px] text-[#737373] block">Customer's Reason:</span>
                    <p className="text-[#171717] dark:text-[#F5F5F5] italic mt-0.5">
                      &ldquo;{resolvingRequest.request.reason}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                  Admin Note for Customer
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain resolution details or reason for this action..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-xs text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button variant="outline" size="xs" onClick={() => setResolvingRequest(null)}>
                  Cancel
                </Button>
                <Button
                  variant={resolvingRequest.action === 'Approved' ? 'primary' : 'danger'}
                  size="xs"
                  onClick={handleConfirmResolve}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : `Confirm ${resolvingRequest.action}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
