/**
 * Pure, unit-testable pricing and financial math functions.
 * All financial values are rounded to 2 decimal places.
 */

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface LineCalculationResult {
  baseTotal: number;       // (unitPrice + variantExtra) * quantity
  discountAmount: number;  // baseTotal * (discountPercent / 100)
  taxableAmount: number;   // baseTotal - discountAmount
  taxAmount: number;       // taxableAmount * (taxPercent / 100)
  lineTotal: number;       // taxableAmount + taxAmount
}

export function calculateOrderLine(
  unitPrice: number,
  variantExtra = 0,
  quantity = 1,
  discountPercent = 0,
  taxPercent = 18
): LineCalculationResult {
  const safeUnitPrice = Math.max(0, unitPrice);
  const safeVariantExtra = Math.max(0, variantExtra);
  const safeQty = Math.max(1, quantity);
  const safeDiscountPct = Math.min(100, Math.max(0, discountPercent));
  const safeTaxPct = Math.max(0, taxPercent);

  const effectiveUnitPrice = round2(safeUnitPrice + safeVariantExtra);
  const baseTotal = round2(effectiveUnitPrice * safeQty);
  const discountAmount = round2(baseTotal * (safeDiscountPct / 100));
  const taxableAmount = round2(Math.max(0, baseTotal - discountAmount));
  const taxAmount = round2(taxableAmount * (safeTaxPct / 100));
  const lineTotal = round2(taxableAmount + taxAmount);

  return {
    baseTotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    lineTotal,
  };
}

export interface TotalsCalculationResult {
  subtotal: number;
  discountTotal: number;
  taxableSubtotal: number;
  taxTotal: number;
  grandTotal: number;
}

export function calculateTotals(
  lines: Array<{
    unitPrice: number;
    variantExtra?: number;
    quantity: number;
    discountPercent?: number;
    taxPercent?: number;
  }>,
  additionalDiscount = 0
): TotalsCalculationResult {
  let subtotal = 0;
  let lineDiscounts = 0;
  let taxTotal = 0;

  for (const line of lines) {
    const calc = calculateOrderLine(
      line.unitPrice,
      line.variantExtra || 0,
      line.quantity,
      line.discountPercent || 0,
      line.taxPercent ?? 18
    );
    subtotal += calc.baseTotal;
    lineDiscounts += calc.discountAmount;
    taxTotal += calc.taxAmount;
  }

  subtotal = round2(subtotal);
  lineDiscounts = round2(lineDiscounts);
  taxTotal = round2(taxTotal);

  const totalDiscount = round2(lineDiscounts + Math.max(0, additionalDiscount));
  const effectiveTotalDiscount = Math.min(subtotal, totalDiscount);
  const taxableSubtotal = round2(Math.max(0, subtotal - effectiveTotalDiscount));
  const grandTotal = round2(taxableSubtotal + taxTotal);

  return {
    subtotal,
    discountTotal: effectiveTotalDiscount,
    taxableSubtotal,
    taxTotal,
    grandTotal,
  };
}

export function calculateMargin(sellingPrice: number, costPrice: number) {
  const sp = Math.max(0, sellingPrice);
  const cp = Math.max(0, costPrice);
  const marginAmount = round2(sp - cp);
  const marginPercent = sp > 0 ? round2((marginAmount / sp) * 100) : 0;
  const isWarning = cp > sp;

  return {
    marginAmount,
    marginPercent,
    isWarning,
  };
}
