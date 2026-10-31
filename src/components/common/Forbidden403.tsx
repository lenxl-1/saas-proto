import React from 'react';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { Button } from '../ui/Button';

interface Forbidden403Props {
  reason?: string;
  onGoBack?: () => void;
}

export const Forbidden403: React.FC<Forbidden403Props> = ({
  reason = 'You do not have authorization to view or modify this record.',
  onGoBack,
}) => {
  const { user } = useAuth();

  return (
    <div className="min-h-[55vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <span className="text-[10px] font-semibold tracking-wider uppercase text-rose-600 dark:text-rose-400">
        403 Forbidden
      </span>
      <h2 className="mt-1 text-xl font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
        403 - Access Forbidden
      </h2>
      <p className="mt-2 text-xs text-[#737373] dark:text-[#A3A3A3] max-w-sm leading-relaxed">
        {reason}
      </p>
      <div className="mt-4 p-2.5 bg-neutral-50 dark:bg-neutral-900/50 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[11px] text-[#737373] dark:text-[#A3A3A3] max-w-sm">
        Logged-in identity: <strong className="text-[#171717] dark:text-[#F5F5F5]">{user?.name}</strong>{' '}
        <span className="capitalize text-indigo-600 dark:text-indigo-400 font-medium">({user?.role})</span>
      </div>
      {onGoBack && (
        <div className="mt-5">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={onGoBack}
          >
            Return to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
};
