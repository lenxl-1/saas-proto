import { Role, User } from '../types';

export class ForbiddenError extends Error {
  constructor(message = 'Access Denied: You do not have permission to view or manage this resource.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function canManageUsers(role?: Role): boolean {
  return role === 'admin';
}

export function canManageProducts(role?: Role): boolean {
  return role === 'admin';
}

export function canManagePlans(role?: Role): boolean {
  return role === 'admin';
}

export function canManageDiscounts(role?: Role): boolean {
  return role === 'admin';
}

export function canManageSettings(role?: Role): boolean {
  return role === 'admin';
}

export function canManageCustomers(role?: Role): boolean {
  return role === 'admin' || role === 'staff';
}

export function canManageSubscriptions(role?: Role): boolean {
  return role === 'admin' || role === 'staff';
}

export function canManageInvoices(role?: Role): boolean {
  return role === 'admin' || role === 'staff';
}

export function canRecordPayments(role?: Role): boolean {
  return role === 'admin' || role === 'staff';
}

export function canViewAllFinancialReports(role?: Role): boolean {
  return role === 'admin' || role === 'staff';
}

/**
 * Enforces ownership check:
 * - Admin and Staff can access any customer's records.
 * - Customer can ONLY access their own customerId.
 * Throws ForbiddenError if violation.
 */
export function assertCustomerAccess(user: User | null, targetCustomerId: string): void {
  if (!user) {
    throw new ForbiddenError('Authentication required to access this resource.');
  }

  if (user.role === 'admin' || user.role === 'staff') {
    return;
  }

  if (user.role === 'customer') {
    if (!user.customerId || user.customerId !== targetCustomerId) {
      throw new ForbiddenError('403 Forbidden: Customer is not authorized to access data belonging to another customer.');
    }
    return;
  }

  throw new ForbiddenError('Unauthorized access level.');
}

export function isCustomerOwner(user: User | null, targetCustomerId: string): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'staff') return true;
  return user.role === 'customer' && user.customerId === targetCustomerId;
}
