import {
  AuditEntityType,
  AuditLog,
  BillingRunLog,
  Customer,
  Discount,
  EmailMessage,
  Invoice,
  Payment,
  Plan,
  Product,
  QuotationTemplate,
  Subscription,
  SubscriptionRequest,
  SubscriptionRequestType,
  SystemSettings,
  User,
} from '../types';
import { assertCustomerAccess, canManageDiscounts, canManagePlans, canManageProducts, canManageUsers, ForbiddenError } from './permissions';

const STORAGE_KEYS = {
  USERS: 'brightloop_users_v1',
  CUSTOMERS: 'brightloop_customers_v1',
  PRODUCTS: 'brightloop_products_v1',
  PLANS: 'brightloop_plans_v1',
  TEMPLATES: 'brightloop_templates_v1',
  SUBSCRIPTIONS: 'brightloop_subscriptions_v1',
  INVOICES: 'brightloop_invoices_v1',
  PAYMENTS: 'brightloop_payments_v1',
  DISCOUNTS: 'brightloop_discounts_v1',
  AUDIT_LOGS: 'brightloop_audit_logs_v1',
  MOCK_EMAILS: 'brightloop_mock_emails_v1',
  BILLING_RUNS: 'brightloop_billing_runs_v1',
  SETTINGS: 'brightloop_settings_v1',
  SESSION: 'brightloop_auth_session_v1',
  REQUESTS: 'brightloop_requests_v1',
};

// Simple event emitter for reactive updates in React components
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribeToDatabase(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifySubscribers() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error in db subscriber', e);
    }
  });
}

// In-memory indexed caches for fast O(1) queries across thousands of records
class MemoryIndexedStore<T extends { id: string }> {
  private key: string;
  private items: T[] = [];
  private map: Map<string, T> = new Map();
  private loaded = false;

  constructor(key: string) {
    this.key = key;
  }

  private load(): void {
    if (this.loaded) return;
    try {
      const data = localStorage.getItem(this.key);
      if (data) {
        this.items = JSON.parse(data);
        this.map = new Map(this.items.map((item) => [item.id, item]));
      } else {
        this.items = [];
        this.map = new Map();
      }
    } catch (e) {
      console.error(`Failed to load ${this.key} from localStorage`, e);
      this.items = [];
      this.map = new Map();
    }
    this.loaded = true;
  }

  public invalidate(): void {
    this.loaded = false;
  }

  public getAll(): T[] {
    this.load();
    return this.items;
  }

  public getById(id: string): T | undefined {
    this.load();
    return this.map.get(id);
  }

  public setAll(items: T[]): void {
    this.items = items;
    this.map = new Map(items.map((item) => [item.id, item]));
    this.loaded = true;
    try {
      localStorage.setItem(this.key, JSON.stringify(items));
    } catch (e) {
      console.error(`Failed to save ${this.key} to localStorage`, e);
    }
    notifySubscribers();
  }

  public insert(item: T): void {
    this.load();
    this.items.unshift(item);
    this.map.set(item.id, item);
    try {
      localStorage.setItem(this.key, JSON.stringify(this.items));
    } catch (e) {
      console.error(`Failed to insert into ${this.key}`, e);
    }
    notifySubscribers();
  }

  public update(id: string, updates: Partial<T>): T | undefined {
    this.load();
    const existing = this.map.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.map.set(id, updated);
    this.items = this.items.map((item) => (item.id === id ? updated : item));
    try {
      localStorage.setItem(this.key, JSON.stringify(this.items));
    } catch (e) {
      console.error(`Failed to update ${this.key}`, e);
    }
    notifySubscribers();
    return updated;
  }

  public remove(id: string): boolean {
    this.load();
    if (!this.map.has(id)) return false;
    this.map.delete(id);
    this.items = this.items.filter((item) => item.id !== id);
    try {
      localStorage.setItem(this.key, JSON.stringify(this.items));
    } catch (e) {
      console.error(`Failed to delete from ${this.key}`, e);
    }
    notifySubscribers();
    return true;
  }
}

// Stores
const userStore = new MemoryIndexedStore<User>(STORAGE_KEYS.USERS);
const customerStore = new MemoryIndexedStore<Customer>(STORAGE_KEYS.CUSTOMERS);
const productStore = new MemoryIndexedStore<Product>(STORAGE_KEYS.PRODUCTS);
const planStore = new MemoryIndexedStore<Plan>(STORAGE_KEYS.PLANS);
const templateStore = new MemoryIndexedStore<QuotationTemplate>(STORAGE_KEYS.TEMPLATES);
const subscriptionStore = new MemoryIndexedStore<Subscription>(STORAGE_KEYS.SUBSCRIPTIONS);
const invoiceStore = new MemoryIndexedStore<Invoice>(STORAGE_KEYS.INVOICES);
const paymentStore = new MemoryIndexedStore<Payment>(STORAGE_KEYS.PAYMENTS);
const discountStore = new MemoryIndexedStore<Discount>(STORAGE_KEYS.DISCOUNTS);
const auditLogStore = new MemoryIndexedStore<AuditLog>(STORAGE_KEYS.AUDIT_LOGS);
const mockEmailStore = new MemoryIndexedStore<EmailMessage>(STORAGE_KEYS.MOCK_EMAILS);
const billingRunStore = new MemoryIndexedStore<BillingRunLog>(STORAGE_KEYS.BILLING_RUNS);
const requestStore = new MemoryIndexedStore<SubscriptionRequest>(STORAGE_KEYS.REQUESTS);

// Settings store
const defaultSettings: SystemSettings = {
  simulatedDate: null,
  gstRatePercent: 18,
  companyName: 'BrightFlow Technologies Pvt Ltd',
  companyGstin: '27AABCB1234F1Z8',
  companyAddress: 'Suite 402, High-Tech Towers, Indiranagar, Bengaluru, KA 560038',
  companyPhone: '+91 (080) 4123-8900',
  companyEmail: 'billing@brightflow.io',
  companyWebsite: 'https://brightflow.io',
  enableAiAssistant: true,
};

export const settingsRepo = {
  get(): SystemSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return { ...defaultSettings, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error('Failed to get settings', e);
    }
    return defaultSettings;
  },
  update(updates: Partial<SystemSettings>): SystemSettings {
    const current = this.get();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    notifySubscribers();
    return updated;
  },
};

/**
 * Audit Logging Helper
 */
export function logAudit(
  currentUser: User | null,
  entityType: AuditEntityType,
  entityId: string,
  action: string,
  details: string
): void {
  const audit: AuditLog = {
    id: 'AUD-' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    userId: currentUser ? currentUser.id : 'system',
    userName: currentUser ? currentUser.name : 'System Automation',
    userRole: currentUser ? currentUser.role : 'admin',
    entityType,
    entityId,
    action,
    details,
  };
  auditLogStore.insert(audit);
}

// -------------------------------------------------------------
// REPOSITORIES
// -------------------------------------------------------------

export const usersRepo = {
  getAll(currentUser?: User): User[] {
    if (currentUser && !canManageUsers(currentUser.role)) {
      throw new ForbiddenError('Only Administrators can view all users.');
    }
    return userStore.getAll();
  },
  getById(id: string): User | undefined {
    return userStore.getById(id);
  },
  getByEmail(email: string): User | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return userStore.getAll().find((u) => u.email.toLowerCase() === cleanEmail);
  },
  create(user: User, currentUser?: User | null): User {
    if (user.role === 'staff' && (!currentUser || !canManageUsers(currentUser.role))) {
      throw new ForbiddenError('Only Administrators can create staff members.');
    }
    userStore.insert(user);
    logAudit(currentUser || null, 'user', user.id, 'User Registered', `Account created for ${user.email} with role ${user.role}`);
    return user;
  },
  update(id: string, updates: Partial<User>, currentUser?: User | null): User | undefined {
    if (currentUser && currentUser.role !== 'admin' && currentUser.id !== id) {
      throw new ForbiddenError('Unauthorized to update this user.');
    }
    const updated = userStore.update(id, updates);
    if (updated) {
      logAudit(currentUser || null, 'user', id, 'User Updated', `Updated fields on user ${updated.email}`);
    }
    return updated;
  },
};

export const customersRepo = {
  getAll(currentUser: User | null): Customer[] {
    if (!currentUser) return [];
    if (currentUser.role === 'customer') {
      const own = customerStore.getById(currentUser.customerId || '');
      return own ? [own] : [];
    }
    return customerStore.getAll();
  },
  getById(id: string, currentUser: User | null): Customer | undefined {
    assertCustomerAccess(currentUser, id);
    return customerStore.getById(id);
  },
  create(customer: Customer, currentUser: User | null): Customer {
    customerStore.insert(customer);
    logAudit(currentUser, 'user', customer.id, 'Customer Created', `New customer profile for ${customer.name}`);
    return customer;
  },
  update(id: string, updates: Partial<Customer>, currentUser: User | null): Customer | undefined {
    assertCustomerAccess(currentUser, id);
    const updated = customerStore.update(id, updates);
    if (updated) {
      logAudit(currentUser, 'user', id, 'Customer Updated', `Customer record ${updated.name} updated`);
    }
    return updated;
  },
};

export const productsRepo = {
  getAll(): Product[] {
    return productStore.getAll();
  },
  getById(id: string): Product | undefined {
    return productStore.getById(id);
  },
  create(product: Product, currentUser: User | null): Product {
    if (!canManageProducts(currentUser?.role)) {
      throw new ForbiddenError('Only Administrators can create or modify products.');
    }
    productStore.insert(product);
    logAudit(currentUser, 'product', product.id, 'Product Created', `Created product ${product.name} (Base ₹${product.sellingPrice})`);
    return product;
  },
  update(id: string, updates: Partial<Product>, currentUser: User | null): Product | undefined {
    if (!canManageProducts(currentUser?.role)) {
      throw new ForbiddenError('Only Administrators can update products.');
    }
    const updated = productStore.update(id, updates);
    if (updated) {
      logAudit(currentUser, 'product', id, 'Product Updated', `Updated product ${updated.name}`);
    }
    return updated;
  },
  deactivate(id: string, currentUser: User | null): boolean {
    if (!canManageProducts(currentUser?.role)) {
      throw new ForbiddenError('Only Administrators can deactivate products.');
    }
    // Check if referenced in subscriptions
    const referenced = subscriptionStore.getAll().some((sub) =>
      sub.lines.some((line) => line.productId === id)
    );
    if (referenced) {
      // Soft deactivate instead of delete to maintain relational integrity
      productStore.update(id, { active: false });
      logAudit(currentUser, 'product', id, 'Product Deactivated', 'Deactivated product due to relational references');
      return true;
    }
    const removed = productStore.remove(id);
    if (removed) {
      logAudit(currentUser, 'product', id, 'Product Deleted', 'Deleted unreferenced product');
    }
    return removed;
  },
};

export const plansRepo = {
  getAll(): Plan[] {
    return planStore.getAll();
  },
  getActive(simulatedDate?: string): Plan[] {
    const plans = planStore.getAll().filter((p) => p.active);
    if (!simulatedDate) return plans;
    const target = new Date(simulatedDate).getTime();
    return plans.filter((p) => {
      const start = new Date(p.availabilityStartDate).getTime();
      const end = new Date(p.availabilityEndDate).getTime();
      return target >= start && target <= end;
    });
  },
  getById(id: string): Plan | undefined {
    return planStore.getById(id);
  },
  create(plan: Plan, currentUser: User | null): Plan {
    if (!canManagePlans(currentUser?.role)) {
      throw new ForbiddenError('Only Administrators can configure plans.');
    }
    planStore.insert(plan);
    logAudit(currentUser, 'plan', plan.id, 'Plan Created', `Created plan ${plan.name} at ₹${plan.price}/${plan.billingFrequency}`);
    return plan;
  },
  update(id: string, updates: Partial<Plan>, currentUser: User | null): Plan | undefined {
    if (!canManagePlans(currentUser?.role)) {
      throw new ForbiddenError('Only Administrators can update plans.');
    }
    const updated = planStore.update(id, updates);
    if (updated) {
      logAudit(currentUser, 'plan', id, 'Plan Updated', `Plan ${updated.name} updated`);
    }
    return updated;
  },
  deactivate(id: string, currentUser: User | null): boolean {
    if (!canManagePlans(currentUser?.role)) {
      throw new ForbiddenError('Only Administrators can deactivate plans.');
    }
    const referenced = subscriptionStore.getAll().some((s) => s.planId === id);
    if (referenced) {
      planStore.update(id, { active: false });
      logAudit(currentUser, 'plan', id, 'Plan Deactivated', 'Deactivated plan because active subscriptions reference it');
      return true;
    }
    const removed = planStore.remove(id);
    if (removed) {
      logAudit(currentUser, 'plan', id, 'Plan Deleted', 'Deleted unreferenced plan');
    }
    return removed;
  },
};

export const templatesRepo = {
  getAll(): QuotationTemplate[] {
    return templateStore.getAll();
  },
  getById(id: string): QuotationTemplate | undefined {
    return templateStore.getById(id);
  },
  create(template: QuotationTemplate, currentUser: User | null): QuotationTemplate {
    templateStore.insert(template);
    logAudit(currentUser, 'subscription', template.id, 'Template Created', `Quotation template ${template.name} created`);
    return template;
  },
  update(id: string, updates: Partial<QuotationTemplate>, currentUser: User | null): QuotationTemplate | undefined {
    const updated = templateStore.update(id, updates);
    if (updated) {
      logAudit(currentUser, 'subscription', id, 'Template Updated', `Quotation template ${updated.name} updated`);
    }
    return updated;
  },
  delete(id: string): boolean {
    return templateStore.remove(id);
  },
};

export const subscriptionsRepo = {
  getAll(currentUser: User | null): Subscription[] {
    if (!currentUser) return [];
    const all = subscriptionStore.getAll();
    if (currentUser.role === 'customer') {
      return all.filter((s) => s.customerId === currentUser.customerId);
    }
    return all;
  },
  getById(id: string, currentUser: User | null): Subscription | undefined {
    const sub = subscriptionStore.getById(id);
    if (!sub) return undefined;
    assertCustomerAccess(currentUser, sub.customerId);
    return sub;
  },
  create(sub: Subscription, currentUser: User | null): Subscription {
    subscriptionStore.insert(sub);
    logAudit(
      currentUser,
      'subscription',
      sub.id,
      'Subscription Created',
      `Subscription ${sub.subscriptionNumber} created with status ${sub.status}`
    );
    return sub;
  },
  update(id: string, updates: Partial<Subscription>, currentUser: User | null): Subscription | undefined {
    const existing = subscriptionStore.getById(id);
    if (!existing) return undefined;
    assertCustomerAccess(currentUser, existing.customerId);

    // Validate status transitions strictly
    if (updates.status && updates.status !== existing.status) {
      const allowed: Record<string, string[]> = {
        Draft: ['Quotation', 'Closed'],
        Quotation: ['Confirmed', 'Closed'],
        Confirmed: ['Active', 'Closed'],
        Active: ['Closed'],
        Closed: [],
      };

      if (!allowed[existing.status]?.includes(updates.status)) {
        throw new Error(
          `Invalid status transition from ${existing.status} to ${updates.status}. Allowed transitions: ${
            allowed[existing.status]?.join(', ') || 'None'
          }`
        );
      }

      // Customer can only transition Quotation -> Confirmed
      if (currentUser?.role === 'customer') {
        if (existing.status !== 'Quotation' || updates.status !== 'Confirmed') {
          throw new ForbiddenError('Customers can only confirm quotations sent to them.');
        }
      }
    }

    const updated = subscriptionStore.update(id, updates);
    if (updated && updates.status && updates.status !== existing.status) {
      logAudit(
        currentUser,
        'subscription',
        id,
        `Status Changed: ${existing.status} → ${updates.status}`,
        `Transitioned subscription ${existing.subscriptionNumber}`
      );
    }
    return updated;
  },
  rawSetAll(subs: Subscription[]): void {
    subscriptionStore.setAll(subs);
  },
};

export const invoicesRepo = {
  getAll(currentUser: User | null): Invoice[] {
    if (!currentUser) return [];
    const all = invoiceStore.getAll();
    if (currentUser.role === 'customer') {
      return all.filter((inv) => inv.customerId === currentUser.customerId);
    }
    return all;
  },
  getById(id: string, currentUser: User | null): Invoice | undefined {
    const inv = invoiceStore.getById(id);
    if (!inv) return undefined;
    assertCustomerAccess(currentUser, inv.customerId);
    return inv;
  },
  getByIdempotencyKey(key: string): Invoice | undefined {
    return invoiceStore.getAll().find((inv) => inv.idempotencyKey === key);
  },
  create(inv: Invoice, currentUser: User | null): Invoice {
    invoiceStore.insert(inv);
    logAudit(
      currentUser,
      'invoice',
      inv.id,
      'Invoice Created',
      `Invoice ${inv.invoiceNumber} generated for amount ₹${inv.grandTotal.toLocaleString('en-IN')}`
    );
    return inv;
  },
  update(id: string, updates: Partial<Invoice>, currentUser: User | null): Invoice | undefined {
    const existing = invoiceStore.getById(id);
    if (!existing) return undefined;
    assertCustomerAccess(currentUser, existing.customerId);
    const updated = invoiceStore.update(id, updates);
    return updated;
  },
  addFollowUpNote(id: string, noteText: string, currentUser: User): Invoice | undefined {
    const existing = invoiceStore.getById(id);
    if (!existing) return undefined;
    if (currentUser.role === 'customer') {
      throw new ForbiddenError('Customers cannot add internal follow-up notes.');
    }
    const notes = existing.followUpNotes || [];
    const newNote = {
      id: 'NOTE-' + Math.random().toString(36).substring(2, 9),
      authorName: currentUser.name,
      authorRole: currentUser.role,
      note: noteText,
      timestamp: new Date().toISOString(),
    };
    const updated = invoiceStore.update(id, { followUpNotes: [newNote, ...notes] });
    logAudit(currentUser, 'invoice', id, 'Follow-up Note Added', noteText);
    return updated;
  },
  rawSetAll(invoices: Invoice[]): void {
    invoiceStore.setAll(invoices);
  },
};

export const paymentsRepo = {
  getAll(currentUser: User | null): Payment[] {
    if (!currentUser) return [];
    const all = paymentStore.getAll();
    if (currentUser.role === 'customer') {
      return all.filter((p) => p.customerId === currentUser.customerId);
    }
    return all;
  },
  getById(id: string, currentUser: User | null): Payment | undefined {
    const pay = paymentStore.getById(id);
    if (!pay) return undefined;
    assertCustomerAccess(currentUser, pay.customerId);
    return pay;
  },
  getByInvoiceId(invoiceId: string, currentUser: User | null): Payment[] {
    return this.getAll(currentUser).filter((p) => p.invoiceId === invoiceId);
  },
  recordPayment(
    payment: Payment,
    currentUser: User | null
  ): { payment: Payment; invoice: Invoice } {
    const invoice = invoiceStore.getById(payment.invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (payment.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }
    if (payment.amount > invoice.balanceDue + 0.01) {
      throw new Error(`Payment cannot exceed outstanding balance of ₹${invoice.balanceDue.toLocaleString('en-IN')}.`);
    }

    paymentStore.insert(payment);

    const newAmountPaid = Math.round((invoice.amountPaid + payment.amount) * 100) / 100;
    const newBalanceDue = Math.max(0, Math.round((invoice.grandTotal - newAmountPaid) * 100) / 100);
    const newStatus = newBalanceDue <= 0.01 ? 'Paid' : invoice.status;

    const updatedInvoice = invoiceStore.update(invoice.id, {
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      status: newStatus,
    })!;

    logAudit(
      currentUser,
      'payment',
      payment.id,
      'Payment Recorded',
      `Payment ${payment.paymentNumber} of ₹${payment.amount.toLocaleString('en-IN')} via ${payment.method} for ${invoice.invoiceNumber}`
    );

    // Send receipt email to customer mock inbox
    const customer = customerStore.getById(invoice.customerId);
    if (customer) {
      mockEmailsRepo.send({
        toEmail: customer.email,
        toName: customer.name,
        subject: `Payment Receipt: ${payment.paymentNumber} for ${invoice.invoiceNumber}`,
        type: 'payment_receipt',
        content: `Dear ${customer.name},\n\nWe have received your payment of ₹${payment.amount.toLocaleString(
          'en-IN'
        )} via ${payment.method}.\nInvoice Number: ${invoice.invoiceNumber}\nRemaining Balance: ₹${newBalanceDue.toLocaleString(
          'en-IN'
        )}\n\nThank you for choosing BrightFlow!`,
      });
    }

    return { payment, invoice: updatedInvoice };
  },
  rawSetAll(payments: Payment[]): void {
    paymentStore.setAll(payments);
  },
};

export const discountsRepo = {
  getAll(): Discount[] {
    return discountStore.getAll();
  },
  getById(id: string): Discount | undefined {
    return discountStore.getById(id);
  },
  getByCode(code: string): Discount | undefined {
    const clean = code.trim().toUpperCase();
    return discountStore.getAll().find((d) => d.code.toUpperCase() === clean);
  },
  create(discount: Discount, currentUser: User | null): Discount {
    if (!canManageDiscounts(currentUser?.role)) {
      throw new ForbiddenError('Only Administrators can configure discounts.');
    }
    discountStore.insert(discount);
    logAudit(currentUser, 'discount', discount.id, 'Discount Created', `Created discount code ${discount.code}`);
    return discount;
  },
  update(id: string, updates: Partial<Discount>, currentUser: User | null): Discount | undefined {
    if (!canManageDiscounts(currentUser?.role)) {
      throw new ForbiddenError('Only Administrators can update discounts.');
    }
    const updated = discountStore.update(id, updates);
    if (updated) {
      logAudit(currentUser, 'discount', id, 'Discount Updated', `Updated discount ${updated.code}`);
    }
    return updated;
  },
  incrementUsage(id: string, customerId: string): void {
    const discount = discountStore.getById(id);
    if (!discount) return;
    const usageCount = discount.usageCount + 1;
    const customerUsage = { ...discount.customerUsage };
    customerUsage[customerId] = (customerUsage[customerId] || 0) + 1;
    discountStore.update(id, { usageCount, customerUsage });
  },
};

export const auditLogsRepo = {
  getAll(currentUser: User | null): AuditLog[] {
    if (!currentUser || currentUser.role === 'customer') {
      return [];
    }
    return auditLogStore.getAll();
  },
};

export const mockEmailsRepo = {
  getAll(): EmailMessage[] {
    return mockEmailStore.getAll();
  },
  getUnreadCount(): number {
    return mockEmailStore.getAll().filter((m) => !m.read).length;
  },
  send(message: Omit<EmailMessage, 'id' | 'sentAt' | 'read'>): EmailMessage {
    const msg: EmailMessage = {
      ...message,
      id: 'EML-' + Math.random().toString(36).substring(2, 9),
      read: false,
      sentAt: new Date().toISOString(),
    };
    mockEmailStore.insert(msg);
    return msg;
  },
  markAsRead(id: string): void {
    mockEmailStore.update(id, { read: true });
  },
  clearAll(): void {
    mockEmailStore.setAll([]);
  },
};

export const billingRunLogsRepo = {
  getAll(): BillingRunLog[] {
    return billingRunStore.getAll();
  },
  log(run: Omit<BillingRunLog, 'id' | 'timestamp'>): BillingRunLog {
    const item: BillingRunLog = {
      ...run,
      id: 'RUN-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
    };
    billingRunStore.insert(item);
    return item;
  },
};

export const requestsRepo = {
  getAll(currentUser: User | null): SubscriptionRequest[] {
    if (!currentUser) return [];
    const all = requestStore.getAll();
    if (currentUser.role === 'customer') {
      return all.filter((r) => r.customerId === currentUser.customerId);
    }
    return all;
  },
  getById(id: string, currentUser: User | null): SubscriptionRequest | undefined {
    const req = requestStore.getById(id);
    if (!req) return undefined;
    assertCustomerAccess(currentUser, req.customerId);
    return req;
  },
  create(
    data: { subscriptionId: string; type: SubscriptionRequestType; reason?: string },
    currentUser: User | null
  ): SubscriptionRequest {
    if (!currentUser) throw new Error('Authentication required');
    const sub = subscriptionStore.getById(data.subscriptionId);
    if (!sub) throw new Error('Subscription not found');
    assertCustomerAccess(currentUser, sub.customerId);

    const customer = customerStore.getById(sub.customerId);
    const newReq: SubscriptionRequest = {
      id: 'REQ-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      subscriptionId: sub.id,
      subscriptionNumber: sub.subscriptionNumber,
      customerId: sub.customerId,
      customerName: customer?.name || 'Customer',
      type: data.type,
      reason: data.reason,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    requestStore.insert(newReq);

    logAudit(
      currentUser,
      'subscription',
      sub.id,
      `Request Submitted: ${data.type.toUpperCase()}`,
      `Customer requested ${data.type} for subscription ${sub.subscriptionNumber}: ${data.reason || 'No note provided'}`
    );

    mockEmailsRepo.send({
      toEmail: 'billing-ops@brightflow.io',
      toName: 'Operations Team',
      subject: `New Customer Request: ${data.type.toUpperCase()} for ${sub.subscriptionNumber}`,
      type: 'subscription_request',
      content: `Customer ${customer?.name || 'Customer'} has requested a ${data.type} action for ${sub.subscriptionNumber}.\nReason: ${data.reason || 'None provided'}\n\nPlease review in the Subscriptions -> Requests dashboard.`,
    });

    return newReq;
  },
  resolve(
    id: string,
    action: 'Approved' | 'Rejected',
    adminNote: string,
    currentUser: User | null
  ): SubscriptionRequest {
    if (!currentUser || currentUser.role === 'customer') {
      throw new ForbiddenError('Only Staff or Administrators can resolve subscription requests.');
    }
    const req = requestStore.getById(id);
    if (!req) throw new Error('Request not found');
    if (req.status !== 'Pending') {
      throw new Error(`Request has already been ${req.status.toLowerCase()}.`);
    }

    const sub = subscriptionStore.getById(req.subscriptionId);
    const resolvedAt = new Date().toISOString();

    if (action === 'Approved' && sub) {
      if (req.type === 'pause') {
        subscriptionStore.update(sub.id, { pausedAt: resolvedAt });
      } else if (req.type === 'cancel') {
        subscriptionStore.update(sub.id, { status: 'Closed', closedAt: resolvedAt });
      } else if (req.type === 'renew') {
        const currentExp = new Date(sub.expiryDate || new Date().toISOString());
        currentExp.setFullYear(currentExp.getFullYear() + 1);
        subscriptionStore.update(sub.id, { expiryDate: currentExp.toISOString().split('T')[0] });
      }
    }

    const updated = requestStore.update(id, {
      status: action,
      adminNote,
      resolvedAt,
    })!;

    logAudit(
      currentUser,
      'subscription',
      req.subscriptionId,
      `Request ${action}: ${req.type.toUpperCase()}`,
      `Staff ${currentUser.name} ${action.toLowerCase()} ${req.type} request. Note: ${adminNote || 'None'}`
    );

    const customer = customerStore.getById(req.customerId);
    if (customer) {
      mockEmailsRepo.send({
        toEmail: customer.email,
        toName: customer.name,
        subject: `Subscription Request Update: ${req.type.toUpperCase()} ${action}`,
        type: 'subscription_request_resolved',
        content: `Dear ${customer.name},\n\nYour request to ${req.type} subscription ${req.subscriptionNumber} has been ${action}.\nAdmin Note: ${adminNote || 'Processed by operations team.'}\n\nThank you,\nBrightFlow Team`,
      });
    }

    return updated;
  },
};

