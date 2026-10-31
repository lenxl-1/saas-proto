export type Role = 'admin' | 'staff' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
  salt: string;
  active: boolean;
  customerId?: string; // Links to customer record if customer role
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  active: boolean;
  createdAt: string;
}

export type ProductType = 'Software' | 'Add-on' | 'Service';

export interface ProductVariant {
  id: string;
  attribute: string; // e.g., 'Brand', 'Tier', 'Storage'
  value: string;     // e.g., 'Odoo', 'Pro', '1TB'
  extraPrice: number; // e.g. 560
}

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  sellingPrice: number;
  costPrice: number;
  description: string;
  active: boolean;
  variants: ProductVariant[];
  createdAt: string;
}

export type BillingFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export interface Plan {
  id: string;
  name: string;
  price: number;
  billingFrequency: BillingFrequency;
  minQuantity: number;
  availabilityStartDate: string;
  availabilityEndDate: string;
  description: string;
  pausable: boolean;
  renewable: boolean;
  closable: boolean;
  earlyTerminationAllowed: boolean;
  earlyTerminationFee: number;
  active: boolean;
  createdAt: string;
}

export interface OrderLineTemplate {
  productId: string;
  variantId?: string;
  quantity: number;
  discountPercent?: number;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  defaultPlanId: string;
  validityDays: number;
  paymentTerms: string; // 'Immediate', 'Net 15', 'Net 30', 'Net 60'
  defaultLines: OrderLineTemplate[];
  createdAt: string;
}

export type SubscriptionStatus = 'Draft' | 'Quotation' | 'Confirmed' | 'Active' | 'Closed';

export interface SubscriptionLine {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  variantExtra: number;
  taxPercent: number; // standard 18% GST in India
  discountPercent: number;
  lineTotal: number;
}

export interface Subscription {
  id: string;
  subscriptionNumber: string; // SUB-2026-000123
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string;
  nextBillingDate: string;
  paymentTerms: string; // 'Immediate', 'Net 15', 'Net 30', 'Net 60'
  lines: SubscriptionLine[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  appliedDiscountId?: string;
  pausedAt?: string;
  closedAt?: string;
  earlyTerminatedAt?: string;
  notes?: string;
  createdAt: string;
}

export type InvoiceStatus = 'Draft' | 'Confirmed' | 'Paid' | 'Cancelled';

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  discountAmount: number;
  lineTotal: number;
}

export interface InvoiceNote {
  id: string;
  authorName: string;
  authorRole: Role;
  note: string;
  timestamp: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // INV-2026-000456
  subscriptionId: string;
  customerId: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  lines: InvoiceLine[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  appliedDiscountCode?: string;
  idempotencyKey: string; // e.g. SUB-123_2026-03-01
  sentAt?: string;
  followUpNotes: InvoiceNote[];
  createdAt: string;
}

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'UPI' | 'Card' | 'Cheque';

export interface Payment {
  id: string;
  paymentNumber: string; // PAY-2026-000789
  invoiceId: string;
  customerId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  notes?: string;
  transactionRef: string;
  createdAt: string;
}

export type DiscountType = 'Fixed' | 'Percentage';

export interface Discount {
  id: string;
  code: string;
  name: string;
  type: DiscountType;
  value: number; // e.g. 100 for fixed ₹100 or 15 for 15%
  minPurchaseAmount: number;
  startDate: string;
  expiryDate: string;
  totalUsageLimit: number;
  perCustomerLimit?: number;
  usageCount: number;
  customerUsage: Record<string, number>;
  active: boolean;
  applicablePlanIds?: string[];
  applicableProductIds?: string[];
  createdAt: string;
}

export type AuditEntityType = 'subscription' | 'invoice' | 'payment' | 'plan' | 'product' | 'discount' | 'user' | 'billing';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  entityType: AuditEntityType;
  entityId: string;
  action: string; // e.g. 'Created', 'Status Changed: Quotation -> Confirmed', 'Payment Recorded'
  details: string;
}

export interface EmailMessage {
  id: string;
  toEmail: string;
  toName: string;
  subject: string;
  type: 'password_reset' | 'invoice_sent' | 'payment_reminder' | 'payment_receipt';
  content: string;
  resetToken?: string;
  expiresAt?: string;
  read: boolean;
  sentAt: string;
}

export interface BillingRunLog {
  id: string;
  timestamp: string;
  simulatedDate: string;
  subscriptionsEvaluated: number;
  invoicesCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}

export interface SystemSettings {
  simulatedDate: string | null; // ISO Date YYYY-MM-DD or null for actual current date
  gstRatePercent: number; // Default 18%
  companyName: string;
  companyGstin: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
}
