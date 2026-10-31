import React, { useState } from 'react';
import { AlertCircle, Clock, Pause, Play, RefreshCw, X, XCircle } from 'lucide-react';
import { Subscription, SubscriptionRequestType, User } from '../../types';
import { requestsRepo } from '../../lib/db';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';

interface CustomerActionModalProps {
  subscription: Subscription;
  actionType: SubscriptionRequestType;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CustomerActionModal: React.FC<CustomerActionModalProps> = ({
  subscription,
  actionType,
  currentUser,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const getTitle = () => {
    switch (actionType) {
      case 'pause':
        return 'Request Subscription Pause';
      case 'cancel':
        return 'Request Subscription Cancellation';
      case 'renew':
        return 'Request Subscription Renewal';
    }
  };

  const getIcon = () => {
    switch (actionType) {
      case 'pause':
        return <Pause className="w-5 h-5 text-amber-500" />;
      case 'cancel':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'renew':
        return <RefreshCw className="w-5 h-5 text-indigo-500" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      requestsRepo.create(
        {
          subscriptionId: subscription.id,
          type: actionType,
          reason: reason.trim() || undefined,
        },
        currentUser
      );

      showToast(
        'success',
        'Request Submitted',
        `Your request to ${actionType} agreement ${subscription.subscriptionNumber} has been logged. Our operations team will process it shortly.`
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Request Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-md w-full p-5 space-y-4"
        role="dialog"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] dark:border-[#262626]">
          <div className="flex items-center gap-2.5">
            {getIcon()}
            <div>
              <h3 className="font-semibold text-sm text-[#171717] dark:text-[#F5F5F5]">
                {getTitle()}
              </h3>
              <p className="text-[11px] font-mono text-[#737373]">
                {subscription.subscriptionNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <p className="text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
            {actionType === 'pause' &&
              'Pausing halts future automatic billing cycles until you request resumption. Your current services remain active through the existing paid billing period.'}
            {actionType === 'cancel' &&
              'Requesting cancellation flags your agreement for closure at the end of the current term without early termination penalties.'}
            {actionType === 'renew' &&
              'Requesting renewal notifies our billing desk to extend your subscription agreement for an additional contract cycle with your existing discounted terms.'}
          </p>

          <div className="space-y-1.5">
            <label className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
              Reason or Additional Notes (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Provide context for our billing desk..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-xs text-[#171717] dark:text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5] dark:border-[#262626]">
            <Button variant="outline" size="xs" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'cancel' ? 'danger' : 'primary'}
              size="xs"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
