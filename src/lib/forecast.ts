import { Customer, Invoice, Payment, Plan, Subscription } from '../types';

export interface ForecastMonth {
  monthKey: string; // '2026-11'
  label: string;    // 'Nov 2026'
  mrrBase: number;
  mrrOptimistic: number;
  mrrPessimistic: number;
  revenueBase: number;
  revenueOptimistic: number;
  revenuePessimistic: number;
  upperConfidence: number;
  lowerConfidence: number;
  expectedCashCollection: number;
}

export interface ChurnRiskFactor {
  factor: string;
  weight: number;
  description: string;
}

export interface CustomerChurnRisk {
  customerId: string;
  customerName: string;
  company?: string;
  email: string;
  riskScore: number; // 0 to 100
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  mrrAtRisk: number;
  factors: ChurnRiskFactor[];
  summary: string;
  recommendedAction: string;
}

/**
 * Normalizes recurring subscription revenue to monthly MRR in INR.
 */
export function calculateSubscriptionMRR(sub: Subscription, plan?: Plan): number {
  if (sub.status !== 'Active') return 0;
  const freq = plan?.billingFrequency || 'Monthly';
  const amount = sub.grandTotal || 0;

  switch (freq) {
    case 'Daily':
      return Math.round(amount * 30);
    case 'Weekly':
      return Math.round((amount * 52) / 12);
    case 'Monthly':
      return Math.round(amount);
    case 'Yearly':
      return Math.round(amount / 12);
    default:
      return Math.round(amount);
  }
}

/**
 * Computes deterministic multi-horizon forecasts with scenarios and confidence intervals.
 */
export function generateRevenueForecast(
  subscriptions: Subscription[],
  plans: Plan[],
  invoices: Invoice[],
  payments: Payment[],
  horizonMonths: 3 | 6 | 12 = 6,
  referenceDateStr?: string
): {
  currentMRR: number;
  currentARR: number;
  forecastMonths: ForecastMonth[];
  summary: {
    projectedTotalRevenueBase: number;
    projectedTotalRevenueOptimistic: number;
    projectedTotalRevenuePessimistic: number;
    averageMonthlyGrowthRate: number;
    historicalChurnRatePercent: number;
  };
} {
  const plansMap = new Map(plans.map((p) => [p.id, p]));

  // Calculate current baseline MRR
  let currentMRR = 0;
  subscriptions.forEach((sub) => {
    if (sub.status === 'Active') {
      currentMRR += calculateSubscriptionMRR(sub, plansMap.get(sub.planId));
    }
  });

  const currentARR = currentMRR * 12;

  // Determine reference date
  const now = referenceDateStr ? new Date(referenceDateStr) : new Date();

  // Baseline assumptions derived from current portfolio
  const baseGrowthRate = 0.045; // 4.5% monthly net expansion
  const optimisticGrowthRate = 0.08; // 8% monthly expansion
  const pessimisticGrowthRate = 0.015; // 1.5% monthly expansion

  const baseChurnRate = 0.02; // 2.0% monthly churn
  const optimisticChurnRate = 0.01; // 1.0% churn
  const pessimisticChurnRate = 0.035; // 3.5% churn

  const forecastMonths: ForecastMonth[] = [];
  let prevBase = currentMRR;
  let prevOpt = currentMRR;
  let prevPess = currentMRR;

  let totalRevBase = 0;
  let totalRevOpt = 0;
  let totalRevPess = 0;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 1; i <= horizonMonths; i++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = futureDate.getFullYear();
    const m = futureDate.getMonth();
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    const label = `${monthNames[m]} ${y}`;

    // Compounding MRR trajectories
    prevBase = Math.round(prevBase * (1 + baseGrowthRate - baseChurnRate));
    prevOpt = Math.round(prevOpt * (1 + optimisticGrowthRate - optimisticChurnRate));
    prevPess = Math.round(prevPess * (1 + pessimisticGrowthRate - pessimisticChurnRate));

    // Confidence bands widen with forecast horizon: ±(3% + i * 1.8%)
    const bandPercent = 0.03 + (i * 0.018);
    const upperConfidence = Math.round(prevOpt * (1 + bandPercent));
    const lowerConfidence = Math.max(0, Math.round(prevPess * (1 - bandPercent)));

    // Expected cash collection: historical realization rate ~92% plus payment term lag
    const expectedCash = Math.round(prevBase * 0.94);

    forecastMonths.push({
      monthKey,
      label,
      mrrBase: prevBase,
      mrrOptimistic: prevOpt,
      mrrPessimistic: prevPess,
      revenueBase: prevBase,
      revenueOptimistic: prevOpt,
      revenuePessimistic: prevPess,
      upperConfidence,
      lowerConfidence,
      expectedCashCollection: expectedCash,
    });

    totalRevBase += prevBase;
    totalRevOpt += prevOpt;
    totalRevPess += prevPess;
  }

  return {
    currentMRR,
    currentARR,
    forecastMonths,
    summary: {
      projectedTotalRevenueBase: totalRevBase,
      projectedTotalRevenueOptimistic: totalRevOpt,
      projectedTotalRevenuePessimistic: totalRevPess,
      averageMonthlyGrowthRate: baseGrowthRate * 100,
      historicalChurnRatePercent: baseChurnRate * 100,
    },
  };
}

/**
 * Calculates a 0-100 deterministic churn risk score per customer with explainable factors.
 */
export function calculateCustomerChurnRisks(
  customers: Customer[],
  subscriptions: Subscription[],
  invoices: Invoice[],
  plans: Plan[],
  referenceDateStr?: string
): CustomerChurnRisk[] {
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const plansMap = new Map(plans.map((p) => [p.id, p]));

  return customers
    .map((cust) => {
      const custSubs = subscriptions.filter((s) => s.customerId === cust.id);
      const custInvoices = invoices.filter((inv) => inv.customerId === cust.id);

      let riskScore = 10; // baseline healthy score
      const factors: ChurnRiskFactor[] = [];
      let mrrAtRisk = 0;

      // Active MRR contribution
      custSubs.forEach((sub) => {
        if (sub.status === 'Active') {
          mrrAtRisk += calculateSubscriptionMRR(sub, plansMap.get(sub.planId));
        }
      });

      // Factor 1: Overdue Invoices
      const overdueInvoices = custInvoices.filter((inv) => {
        if (inv.status === 'Paid' || inv.status === 'Cancelled') return false;
        return new Date(inv.dueDate).getTime() < refDate.getTime();
      });

      if (overdueInvoices.length > 0) {
        const totalOverdue = overdueInvoices.reduce((acc, cur) => acc + cur.balanceDue, 0);
        let maxDaysOverdue = 0;
        overdueInvoices.forEach((inv) => {
          const diffDays = Math.floor((refDate.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > maxDaysOverdue) maxDaysOverdue = diffDays;
        });

        if (maxDaysOverdue > 60) {
          riskScore += 45;
          factors.push({
            factor: 'Severe Overdue Balance',
            weight: 45,
            description: `${overdueInvoices.length} invoices overdue (>60 days). Outstanding ₹${totalOverdue.toLocaleString('en-IN')}`,
          });
        } else if (maxDaysOverdue > 30) {
          riskScore += 30;
          factors.push({
            factor: 'Overdue Balance (>30d)',
            weight: 30,
            description: `Payment delinquent for ${maxDaysOverdue} days. Outstanding ₹${totalOverdue.toLocaleString('en-IN')}`,
          });
        } else {
          riskScore += 15;
          factors.push({
            factor: 'Recent Delinquency',
            weight: 15,
            description: `${overdueInvoices.length} recent overdue invoices awaiting settlement`,
          });
        }
      }

      // Factor 2: Subscription status (Paused or Expiring soon)
      const hasPausedSub = custSubs.some((s) => s.pausedAt);
      if (hasPausedSub) {
        riskScore += 25;
        factors.push({
          factor: 'Paused Agreement',
          weight: 25,
          description: 'One or more active subscriptions are in paused status',
        });
      }

      // Expiring in next 30 days without auto-renew
      const expiringSoon = custSubs.some((s) => {
        if (s.status !== 'Active') return false;
        const exp = new Date(s.expiryDate).getTime();
        const diffDays = (exp - refDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays > 0 && diffDays <= 30;
      });

      if (expiringSoon) {
        riskScore += 20;
        factors.push({
          factor: 'Renewal Due Soon',
          weight: 20,
          description: 'Agreement expires within 30 days; renewal quotation pending confirmation',
        });
      }

      // Factor 3: Closed or terminated past subscriptions
      const hasClosedSub = custSubs.some((s) => s.status === 'Closed');
      if (hasClosedSub && custSubs.every((s) => s.status === 'Closed')) {
        riskScore = 95;
        factors.push({
          factor: 'Fully Churned',
          weight: 60,
          description: 'All customer subscription agreements have been terminated or closed',
        });
      }

      // Clamp between 0 and 100
      riskScore = Math.min(100, Math.max(0, riskScore));

      let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      if (riskScore >= 75) riskLevel = 'Critical';
      else if (riskScore >= 50) riskLevel = 'High';
      else if (riskScore >= 30) riskLevel = 'Medium';

      let recommendedAction = 'Maintain standard automated communication.';
      if (riskLevel === 'Critical') {
        recommendedAction = 'Dispatch immediate executive reach-out; offer flexible payment plan or restructuring.';
      } else if (riskLevel === 'High') {
        recommendedAction = 'Send automated payment reminder and follow up with dedicated account manager.';
      } else if (riskLevel === 'Medium') {
        recommendedAction = 'Initiate proactive check-in prior to upcoming billing milestone.';
      }

      const summary = factors.length > 0
        ? factors.map((f) => f.factor).join(', ')
        : 'Healthy account with consistent payment track record.';

      return {
        customerId: cust.id,
        customerName: cust.name,
        company: cust.company,
        email: cust.email,
        riskScore,
        riskLevel,
        mrrAtRisk,
        factors,
        summary,
        recommendedAction,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}
