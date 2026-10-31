import { BillingFrequency } from '../types';

export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatINRCompact(amount: number): string {
  if (isNaN(amount) || amount === 0) return '₹0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  }
  return formatINR(amount);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function getDueDateFromTerms(issueDateStr: string, paymentTerms: string): string {
  const date = new Date(issueDateStr);
  let daysToAdd = 0;
  if (paymentTerms.toLowerCase().includes('15')) daysToAdd = 15;
  else if (paymentTerms.toLowerCase().includes('30')) daysToAdd = 30;
  else if (paymentTerms.toLowerCase().includes('60')) daysToAdd = 60;
  else if (paymentTerms.toLowerCase().includes('immediate')) daysToAdd = 0;
  else daysToAdd = 15;

  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split('T')[0];
}

export function isInvoiceOverdue(dueDateStr: string, status: string, currentDateStr: string): boolean {
  if (status === 'Paid' || status === 'Cancelled') return false;
  const due = new Date(dueDateStr).getTime();
  const current = new Date(currentDateStr).getTime();
  return current > due;
}

export function getDaysOverdue(dueDateStr: string, currentDateStr: string): number {
  const due = new Date(dueDateStr).getTime();
  const current = new Date(currentDateStr).getTime();
  if (current <= due) return 0;
  const diffTime = current - due;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Normalizes any plan price to Monthly Recurring Revenue (MRR)
 */
export function normalizeToMRR(price: number, frequency: BillingFrequency): number {
  switch (frequency) {
    case 'Daily':
      return price * 30;
    case 'Weekly':
      return (price * 52) / 12;
    case 'Monthly':
      return price;
    case 'Yearly':
      return price / 12;
    default:
      return price;
  }
}
