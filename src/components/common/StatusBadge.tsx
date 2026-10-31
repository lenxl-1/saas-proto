import React from 'react';
import { Badge, BadgeProps } from '../ui/Badge';

interface StatusBadgeProps {
  status: string;
  size?: 'xs' | 'sm';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', className }) => {
  const norm = status?.toLowerCase() || '';

  let variant: BadgeProps['variant'] = 'neutral';
  let dot = true;

  if (norm === 'active' || norm === 'paid' || norm === 'accepted') {
    variant = 'success';
  } else if (norm === 'confirmed' || norm === 'sent') {
    variant = 'accent';
  } else if (
    norm === 'quotation' ||
    norm === 'draft' ||
    norm === 'pending' ||
    norm === 'partially paid' ||
    norm === 'trial'
  ) {
    variant = 'warning';
  } else if (norm === 'overdue' || norm === 'rejected' || norm === 'failed') {
    variant = 'danger';
  } else if (norm === 'paused') {
    variant = 'neutral';
  } else if (norm === 'closed' || norm === 'cancelled' || norm === 'expired') {
    variant = 'neutral';
    dot = false;
  }

  return (
    <Badge variant={variant} size={size} dot={dot} className={className}>
      {status}
    </Badge>
  );
};
