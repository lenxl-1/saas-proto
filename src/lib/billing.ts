import { BillingFrequency, Invoice, InvoiceLine, Subscription, User } from '../types';
import {
  billingRunLogsRepo,
  customersRepo,
  discountsRepo,
  invoicesRepo,
  mockEmailsRepo,
  plansRepo,
  productsRepo,
  settingsRepo,
  subscriptionsRepo,
} from './db';
import { evaluateDiscount } from './discounts';
import { getDueDateFromTerms } from './formatters';
import { calculateOrderLine, calculateTotals, round2 } from './pricing';

/**
 * Calculates next date advancing by frequency with month-end edge case handling.
 * E.g., Jan 31 -> Feb 28 (or Feb 29 in leap year).
 */
export function advanceDateByFrequency(
  startDateStr: string,
  frequency: BillingFrequency
): { nextDate: string; periodEnd: string } {
  const [y, m, d] = startDateStr.split('-').map(Number);
  const current = new Date(y, m - 1, d);

  const next = new Date(current);
  const end = new Date(current);

  switch (frequency) {
    case 'Daily': {
      next.setDate(current.getDate() + 1);
      end.setDate(current.getDate() + 1);
      end.setDate(end.getDate() - 1); // same day
      break;
    }
    case 'Weekly': {
      next.setDate(current.getDate() + 7);
      end.setDate(current.getDate() + 6);
      break;
    }
    case 'Monthly': {
      const targetMonth = current.getMonth() + 1;
      const targetYear = current.getFullYear() + Math.floor(targetMonth / 12);
      const normalizedMonth = targetMonth % 12;
      const originalDay = current.getDate();

      // Find last day of target month
      const daysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      const clampedDay = Math.min(originalDay, daysInTargetMonth);

      next.setFullYear(targetYear, normalizedMonth, clampedDay);

      // Period end is 1 day before the next billing date
      end.setTime(next.getTime());
      end.setDate(end.getDate() - 1);
      break;
    }
    case 'Yearly': {
      const targetYear = current.getFullYear() + 1;
      const targetMonth = current.getMonth();
      const originalDay = current.getDate();
      const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const clampedDay = Math.min(originalDay, daysInTargetMonth);

      next.setFullYear(targetYear, targetMonth, clampedDay);

      end.setTime(next.getTime());
      end.setDate(end.getDate() - 1);
      break;
    }
  }

  const formatISO = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    nextDate: formatISO(next),
    periodEnd: formatISO(end),
  };
}

export interface BillingRunResult {
  subscriptionsEvaluated: number;
  invoicesCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}

export function runBillingEngine(
  targetDateStr?: string,
  currentUser?: User | null
): BillingRunResult {
  const settings = settingsRepo.get();
  const effectiveDateStr =
    targetDateStr || settings.simulatedDate || new Date().toISOString().split('T')[0];

  const allSubscriptions = subscriptionsRepo.getAll(null);
  const activeSubscriptions = allSubscriptions.filter((s) => s.status === 'Active');

  let invoicesCreated = 0;
  let duplicatesSkipped = 0;
  const errors: string[] = [];

  for (const sub of activeSubscriptions) {
    try {
      const plan = plansRepo.getById(sub.planId);
      const frequency: BillingFrequency = plan ? plan.billingFrequency : 'Monthly';
      const customer = customersRepo.getById(sub.customerId, null);

      if (!customer) {
        continue;
      }

      // Loop to catch up on any missed billing periods sequentially
      let currentBillingDate = sub.nextBillingDate;
      let loopSafety = 0;

      while (
        currentBillingDate <= effectiveDateStr &&
        currentBillingDate <= sub.expiryDate &&
        loopSafety < 60 // Max 60 catch-up periods per run to prevent runaway
      ) {
        loopSafety++;
        const periodStart = currentBillingDate;
        const { nextDate, periodEnd } = advanceDateByFrequency(periodStart, frequency);
        const idempotencyKey = `${sub.id}_${periodStart}`;

        // Check if invoice already generated for this exact cycle
        const existingInvoice = invoicesRepo.getByIdempotencyKey(idempotencyKey);
        if (existingInvoice) {
          duplicatesSkipped++;
          currentBillingDate = nextDate;
          // Synchronize subscription next billing date if needed
          if (sub.nextBillingDate <= periodStart) {
            subscriptionsRepo.update(sub.id, { nextBillingDate: nextDate }, null);
          }
          continue;
        }

        // Generate invoice lines
        const invoiceLines: InvoiceLine[] = [];
        for (const line of sub.lines) {
          const product = productsRepo.getById(line.productId);
          const productName = product ? product.name : line.productName;
          const desc = line.variantName
            ? `${productName} (${line.variantName}) - ${plan?.name || 'Subscription'}`
            : `${productName} - ${plan?.name || 'Subscription'}`;

          const calc = calculateOrderLine(
            line.unitPrice,
            line.variantExtra,
            line.quantity,
            line.discountPercent,
            line.taxPercent
          );

          invoiceLines.push({
            id: 'INVL-' + Math.random().toString(36).substring(2, 9),
            description: desc,
            quantity: line.quantity,
            unitPrice: round2(line.unitPrice + line.variantExtra),
            taxPercent: line.taxPercent,
            discountAmount: calc.discountAmount,
            lineTotal: calc.lineTotal,
          });
        }

        // Check discounts
        let additionalDiscountAmount = 0;
        let appliedDiscountCode: string | undefined = undefined;

        if (sub.appliedDiscountId) {
          const discount = discountsRepo.getById(sub.appliedDiscountId);
          if (discount) {
            const tempTotals = calculateTotals(sub.lines, 0);
            const evalResult = evaluateDiscount(
              discount,
              tempTotals.subtotal,
              sub.customerId,
              effectiveDateStr,
              sub.planId,
              sub.lines.map((l) => l.productId)
            );
            if (evalResult.eligible) {
              additionalDiscountAmount = evalResult.discountAmount;
              appliedDiscountCode = discount.code;
              discountsRepo.incrementUsage(discount.id, sub.customerId);
            }
          }
        }

        const totals = calculateTotals(sub.lines, additionalDiscountAmount);
        const dueDate = getDueDateFromTerms(periodStart, sub.paymentTerms);

        // Generate unique sequential invoice number
        const allInvoices = invoicesRepo.getAll(null);
        const nextInvoiceNum = `INV-2026-${String(allInvoices.length + 1).padStart(6, '0')}`;

        const newInvoice: Invoice = {
          id: 'INV-' + Math.random().toString(36).substring(2, 9),
          invoiceNumber: nextInvoiceNum,
          subscriptionId: sub.id,
          customerId: sub.customerId,
          status: 'Confirmed',
          issueDate: periodStart,
          dueDate,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          lines: invoiceLines,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          amountPaid: 0,
          balanceDue: totals.grandTotal,
          appliedDiscountCode,
          idempotencyKey,
          followUpNotes: [],
          createdAt: new Date().toISOString(),
        };

        invoicesRepo.create(newInvoice, currentUser || null);
        invoicesCreated++;

        // Advance subscription nextBillingDate
        currentBillingDate = nextDate;
        subscriptionsRepo.update(sub.id, { nextBillingDate: nextDate }, null);

        // Send simulated notification email into Mock Inbox
        mockEmailsRepo.send({
          toEmail: customer.email,
          toName: customer.name,
          subject: `Invoice ${newInvoice.invoiceNumber} for your subscription ${sub.subscriptionNumber}`,
          type: 'invoice_sent',
          content: `Dear ${customer.name},\n\nYour automated recurring invoice ${newInvoice.invoiceNumber} for billing period ${periodStart} to ${periodEnd} has been generated.\n\nTotal Amount Due: ₹${newInvoice.grandTotal.toLocaleString('en-IN')}\nDue Date: ${dueDate}\nPayment Terms: ${sub.paymentTerms}\n\nPlease remit payment at your earliest convenience.\n\nBest regards,\nBrightloop Software Billing Team`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Subscription ${sub.subscriptionNumber}: ${msg}`);
      console.error('Error billing subscription', sub.id, err);
    }
  }

  const result: BillingRunResult = {
    subscriptionsEvaluated: activeSubscriptions.length,
    invoicesCreated,
    duplicatesSkipped,
    errors,
  };

  billingRunLogsRepo.log({
    simulatedDate: effectiveDateStr,
    subscriptionsEvaluated: activeSubscriptions.length,
    invoicesCreated,
    duplicatesSkipped,
    errors,
  });

  return result;
}
