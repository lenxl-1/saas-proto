import { Discount } from '../types';
import { round2 } from './pricing';

export type DiscountStatus = 'Active' | 'Scheduled' | 'Expired' | 'Exhausted' | 'Disabled';

export function getDiscountStatus(discount: Discount, currentDateStr: string): DiscountStatus {
  if (!discount.active) return 'Disabled';
  
  if (discount.totalUsageLimit > 0 && discount.usageCount >= discount.totalUsageLimit) {
    return 'Exhausted';
  }

  const current = new Date(currentDateStr).getTime();
  const start = new Date(discount.startDate).getTime();
  const expiry = new Date(discount.expiryDate).getTime();

  if (current < start) return 'Scheduled';
  if (current > expiry) return 'Expired';

  return 'Active';
}

export interface DiscountEligibilityResult {
  eligible: boolean;
  reason?: string;
  discountAmount: number;
}

export function evaluateDiscount(
  discount: Discount,
  subtotal: number,
  customerId: string,
  currentDateStr: string,
  planId?: string,
  productIds?: string[]
): DiscountEligibilityResult {
  const status = getDiscountStatus(discount, currentDateStr);

  if (status !== 'Active') {
    return {
      eligible: false,
      reason: `Discount is ${status.toLowerCase()}`,
      discountAmount: 0,
    };
  }

  if (subtotal < discount.minPurchaseAmount) {
    return {
      eligible: false,
      reason: `Minimum purchase amount of ₹${discount.minPurchaseAmount.toLocaleString('en-IN')} required`,
      discountAmount: 0,
    };
  }

  if (discount.perCustomerLimit && customerId) {
    const custCount = discount.customerUsage[customerId] || 0;
    if (custCount >= discount.perCustomerLimit) {
      return {
        eligible: false,
        reason: `Customer per-account limit of ${discount.perCustomerLimit} has been reached`,
        discountAmount: 0,
      };
    }
  }

  // Check plan restriction
  if (discount.applicablePlanIds && discount.applicablePlanIds.length > 0 && planId) {
    if (!discount.applicablePlanIds.includes(planId)) {
      return {
        eligible: false,
        reason: 'Not applicable to the selected subscription plan',
        discountAmount: 0,
      };
    }
  }

  // Check product restriction
  if (discount.applicableProductIds && discount.applicableProductIds.length > 0 && productIds && productIds.length > 0) {
    const matchesProduct = productIds.some(pid => discount.applicableProductIds?.includes(pid));
    if (!matchesProduct) {
      return {
        eligible: false,
        reason: 'Not applicable to the products in this order',
        discountAmount: 0,
      };
    }
  }

  let calculatedAmount = 0;
  if (discount.type === 'Fixed') {
    calculatedAmount = Math.min(discount.value, subtotal);
  } else {
    calculatedAmount = round2(subtotal * (discount.value / 100));
  }

  // Ensure discount never makes subtotal negative
  const finalDiscountAmount = Math.max(0, Math.min(subtotal, calculatedAmount));

  return {
    eligible: true,
    discountAmount: finalDiscountAmount,
  };
}
