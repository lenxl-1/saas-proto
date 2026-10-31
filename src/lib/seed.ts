import {
  BillingFrequency,
  Customer,
  Discount,
  Invoice,
  InvoiceLine,
  Payment,
  PaymentMethod,
  Plan,
  Product,
  QuotationTemplate,
  Subscription,
  SubscriptionLine,
  SubscriptionStatus,
  User,
} from '../types';
import { hashPassword } from './crypto';
import {
  customersRepo,
  discountsRepo,
  invoicesRepo,
  paymentsRepo,
  plansRepo,
  productsRepo,
  subscriptionsRepo,
  templatesRepo,
  usersRepo,
} from './db';
import { getDueDateFromTerms } from './formatters';
import { calculateOrderLine, calculateTotals, round2 } from './pricing';

const SEED_VERSION_KEY = 'brightloop_seed_version_v1.2';

export async function isDatabaseSeeded(): Promise<boolean> {
  const seeded = localStorage.getItem(SEED_VERSION_KEY);
  if (!seeded) return false;
  const users = usersRepo.getAll();
  return users.length > 0;
}

export async function seedDemoData(force = false): Promise<void> {
  if (!force && (await isDatabaseSeeded())) {
    return;
  }

  // Clear existing storage
  localStorage.clear();

  // 1. Create Core Users
  const salt = 'brightloop_salt_2026';
  const adminHash = await hashPassword('Admin@12345', salt);
  const staffHash = await hashPassword('Staff@12345', salt);
  const customerHash = await hashPassword('Customer@12345', salt);

  const demoCustomerUser: User = {
    id: 'USR-CUST-001',
    name: 'Aarav Sharma',
    email: 'customer@brightloop.com',
    role: 'customer',
    passwordHash: customerHash,
    salt,
    active: true,
    customerId: 'CUST-001',
    createdAt: '2025-11-01T10:00:00.000Z',
  };

  const demoAdminUser: User = {
    id: 'USR-ADMIN-001',
    name: 'Rajesh Verma (Admin)',
    email: 'admin@brightloop.com',
    role: 'admin',
    passwordHash: adminHash,
    salt,
    active: true,
    createdAt: '2025-10-01T09:00:00.000Z',
  };

  const demoStaffUser: User = {
    id: 'USR-STAFF-001',
    name: 'Pooja Nair (Staff)',
    email: 'staff@brightloop.com',
    role: 'staff',
    passwordHash: staffHash,
    salt,
    active: true,
    createdAt: '2025-10-15T09:00:00.000Z',
  };

  // Additional staff
  const staffHash2 = await hashPassword('Vikram@12345', salt);
  const demoStaffUser2: User = {
    id: 'USR-STAFF-002',
    name: 'Vikram Joshi',
    email: 'vikram.joshi@brightloop.com',
    role: 'staff',
    passwordHash: staffHash2,
    salt,
    active: true,
    createdAt: '2025-11-01T09:00:00.000Z',
  };

  const allUsers: User[] = [demoAdminUser, demoStaffUser, demoStaffUser2, demoCustomerUser];

  // 2. Generate 120 Customers
  const indianFirstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
    'Shaurya', 'Atharv', 'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Kiara', 'Myra', 'Pari', 'Anika',
    'Navya', 'Riya', 'Rohan', 'Kunal', 'Dev', 'Sneha', 'Tanvi', 'Meera', 'Pooja', 'Rahul',
    'Gaurav', 'Siddharth', 'Pranav', 'Nikhil', 'Manish', 'Neha', 'Shreya', 'Kavita', 'Suresh', 'Deepak'
  ];
  const indianLastNames = [
    'Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Menon', 'Joshi', 'Kulkarni', 'Bose',
    'Chatterjee', 'Gupta', 'Malhotra', 'Kapoor', 'Singh', 'Chawla', 'Deshmukh', 'Mehta', 'Shah', 'Aggarwal'
  ];
  const companyPrefixes = ['Apex', 'Zenith', 'Nexus', 'Trident', 'Infra', 'Kite', 'Cloud', 'Pulse', 'Fin', 'Omni'];
  const companySuffixes = ['Technologies', 'Solutions', 'Logistics', 'Retail', 'Ventures', 'Digital', 'Consulting', 'Labs', 'Analytics', 'Media'];
  const cities = [
    { city: 'Bengaluru', state: 'Karnataka', pin: '560001' },
    { city: 'Mumbai', state: 'Maharashtra', pin: '400001' },
    { city: 'Hyderabad', state: 'Telangana', pin: '500001' },
    { city: 'Pune', state: 'Maharashtra', pin: '411001' },
    { city: 'Chennai', state: 'Tamil Nadu', pin: '600001' },
    { city: 'Delhi', state: 'Delhi', pin: '110001' },
    { city: 'Gurugram', state: 'Haryana', pin: '122001' },
    { city: 'Noida', state: 'Uttar Pradesh', pin: '201301' },
    { city: 'Ahmedabad', state: 'Gujarat', pin: '380001' },
    { city: 'Kolkata', state: 'West Bengal', pin: '700001' },
  ];

  const customers: Customer[] = [];
  // First customer matches demoCustomerUser
  customers.push({
    id: 'CUST-001',
    name: 'Aarav Sharma',
    email: 'customer@brightloop.com',
    phone: '+91 98765 43210',
    company: 'Sharma Infotech Pvt Ltd',
    address: '14, 100 Feet Road, HAL 2nd Stage, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    gstin: '29AABCS1429F1Z1',
    active: true,
    createdAt: '2025-11-01T10:00:00.000Z',
  });

  for (let i = 2; i <= 120; i++) {
    const fn = indianFirstNames[i % indianFirstNames.length];
    const ln = indianLastNames[Math.floor(i * 3.7) % indianLastNames.length];
    const cityInfo = cities[i % cities.length];
    const compName = `${companyPrefixes[i % companyPrefixes.length]} ${companySuffixes[(i * 3) % companySuffixes.length]} Pvt Ltd`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@${compName.split(' ')[0].toLowerCase()}.in`;

    customers.push({
      id: `CUST-${String(i).padStart(3, '0')}`,
      name: `${fn} ${ln}`,
      email,
      phone: `+91 ${98000 + (i * 123) % 1999} ${10000 + (i * 456) % 89999}`,
      company: compName,
      address: `${10 + (i * 7) % 150}, Phase ${1 + (i % 5)}, Commercial Hub`,
      city: cityInfo.city,
      state: cityInfo.state,
      pincode: cityInfo.pin,
      gstin: `27AAAC${String(1000 + i)}F1Z${i % 9}`,
      active: true,
      createdAt: new Date(2025, 8 + (i % 6), 1 + (i % 25)).toISOString(),
    });
  }

  // 3. 15 Products with Variants
  const products: Product[] = [
    {
      id: 'PROD-001',
      name: 'Brightloop ERP Core',
      type: 'Software',
      sellingPrice: 1200,
      costPrice: 400,
      description: 'Comprehensive business management module with ledger and inventory.',
      active: true,
      variants: [
        { id: 'VAR-1-1', attribute: 'Brand Edition', value: 'Odoo Compatible', extraPrice: 560 },
        { id: 'VAR-1-2', attribute: 'Brand Edition', value: 'Standard Edition', extraPrice: 0 },
        { id: 'VAR-1-3', attribute: 'Tier', value: 'Enterprise Multi-Company', extraPrice: 1400 },
      ],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PROD-002',
      name: 'Automated Invoicing Engine',
      type: 'Software',
      sellingPrice: 500,
      costPrice: 150,
      description: 'Recurring billing schedules, automated GST invoice dispatch, and payment links.',
      active: true,
      variants: [
        { id: 'VAR-2-1', attribute: 'Capacity', value: 'Up to 500 Invoices/mo', extraPrice: 0 },
        { id: 'VAR-2-2', attribute: 'Capacity', value: 'Unlimited Invoices', extraPrice: 450 },
      ],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PROD-003',
      name: 'GST E-Way Bill & E-Invoice Connector',
      type: 'Software',
      sellingPrice: 750,
      costPrice: 200,
      description: 'Direct NIC portal integration for compliant B2B IRN generation and QR code printing.',
      active: true,
      variants: [
        { id: 'VAR-3-1', attribute: 'Throughput', value: 'Standard (50 req/min)', extraPrice: 0 },
        { id: 'VAR-3-2', attribute: 'Throughput', value: 'High Speed Dedicated Pipe', extraPrice: 600 },
      ],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PROD-004',
      name: 'Customer Portal & Helpdesk Add-on',
      type: 'Add-on',
      sellingPrice: 350,
      costPrice: 90,
      description: 'Self-service client billing access, invoice downloads, and ticket management.',
      active: true,
      variants: [
        { id: 'VAR-4-1', attribute: 'White-labeling', value: 'Standard Brightloop Branding', extraPrice: 0 },
        { id: 'VAR-4-2', attribute: 'White-labeling', value: 'Custom Domain & Logo', extraPrice: 400 },
      ],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PROD-005',
      name: 'WhatsApp & SMS Alert Gateway',
      type: 'Add-on',
      sellingPrice: 250,
      costPrice: 80,
      description: 'Automated payment reminder messages, OTP login, and PDF dispatch via WhatsApp Business.',
      active: true,
      variants: [
        { id: 'VAR-5-1', attribute: 'Pack', value: '1,000 Messages/mo', extraPrice: 0 },
        { id: 'VAR-5-2', attribute: 'Pack', value: '5,000 Messages/mo', extraPrice: 350 },
        { id: 'VAR-5-3', attribute: 'Pack', value: '25,000 Messages/mo', extraPrice: 1200 },
      ],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PROD-006',
      name: 'Bank Statement Auto-Reconciler',
      type: 'Software',
      sellingPrice: 850,
      costPrice: 250,
      description: 'AI-assisted matching of NEFT, RTGS, IMPS, and UPI bank credits to pending invoices.',
      active: true,
      variants: [
        { id: 'VAR-6-1', attribute: 'Connector', value: 'ICICI / HDFC API Direct', extraPrice: 300 },
        { id: 'VAR-6-2', attribute: 'Connector', value: 'CSV / MT940 Parser', extraPrice: 0 },
      ],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PROD-007',
      name: 'Dedicated Onboarding & Data Migration',
      type: 'Service',
      sellingPrice: 4500,
      costPrice: 2000,
      description: 'Full white-glove migration of legacy Excel sheets, customer masters, and opening balances.',
      active: true,
      variants: [
        { id: 'VAR-7-1', attribute: 'SLA', value: 'Standard (7 Days)', extraPrice: 0 },
        { id: 'VAR-7-2', attribute: 'SLA', value: 'Express 48-Hour Sprint', extraPrice: 2500 },
      ],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PROD-008',
      name: 'Quarterly Financial Health Audit',
      type: 'Service',
      sellingPrice: 3000,
      costPrice: 1200,
      description: 'Chartered Accountant review of recurring revenue schedules and tax liabilities.',
      active: true,
      variants: [],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PROD-009',
      name: 'Multi-Currency & Global Tax Pack',
      type: 'Add-on',
      sellingPrice: 650,
      costPrice: 180,
      description: 'Support for USD, EUR, GBP billing alongside INR with real-time forex rates.',
      active: true,
      variants: [],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PROD-010',
      name: 'Custom Webhook & Zapier Bridge',
      type: 'Add-on',
      sellingPrice: 400,
      costPrice: 100,
      description: 'Real-time event streaming to external CRMs, Slack notifications, and databases.',
      active: true,
      variants: [],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PROD-011',
      name: 'Audit Trail & Compliance Vault',
      type: 'Software',
      sellingPrice: 900,
      costPrice: 280,
      description: 'Immutable 7-year tamper-evident log archive complying with MCA and statutory audits.',
      active: true,
      variants: [],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PROD-012',
      name: 'Priority 24/7 Phone & Slack Support',
      type: 'Service',
      sellingPrice: 1500,
      costPrice: 600,
      description: 'Guaranteed 15-minute response time from Senior Solutions Architects.',
      active: true,
      variants: [],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PROD-013',
      name: 'Custom Invoice Template Design',
      type: 'Service',
      sellingPrice: 2200,
      costPrice: 800,
      description: 'Bespoke corporate layout aligned with corporate brand identity guidelines.',
      active: true,
      variants: [],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PROD-014',
      name: 'Usage-Based Metering Connector',
      type: 'Add-on',
      sellingPrice: 700,
      costPrice: 200,
      description: 'Ingest API consumption, active users, or storage gigabytes for usage billing.',
      active: true,
      variants: [],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PROD-015',
      name: 'Advanced Churn Predictor & Retention Suite',
      type: 'Software',
      sellingPrice: 1100,
      costPrice: 350,
      description: 'Identifies accounts at risk of non-renewal before billing cycle ends.',
      active: true,
      variants: [],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
  ];

  // 4. 8 Subscription Plans
  const plans: Plan[] = [
    {
      id: 'PLAN-001',
      name: 'Starter Monthly',
      price: 500,
      billingFrequency: 'Monthly',
      minQuantity: 1,
      availabilityStartDate: '2025-01-01',
      availabilityEndDate: '2028-12-31',
      description: 'Essential billing automation for solo entrepreneurs and early-stage startups.',
      pausable: true,
      renewable: true,
      closable: true,
      earlyTerminationAllowed: true,
      earlyTerminationFee: 0,
      active: true,
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PLAN-002',
      name: 'Growth Monthly',
      price: 1500,
      billingFrequency: 'Monthly',
      minQuantity: 1,
      availabilityStartDate: '2025-01-01',
      availabilityEndDate: '2028-12-31',
      description: 'Expanded capacity with multi-user access and WhatsApp alerts for scaling teams.',
      pausable: true,
      renewable: true,
      closable: true,
      earlyTerminationAllowed: true,
      earlyTerminationFee: 200,
      active: true,
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PLAN-003',
      name: 'Professional Annual',
      price: 12000, // ₹1,000/mo equivalent
      billingFrequency: 'Yearly',
      minQuantity: 1,
      availabilityStartDate: '2025-01-01',
      availabilityEndDate: '2028-12-31',
      description: 'Annual commitment with 2 months free, priority support and custom branding.',
      pausable: true,
      renewable: true,
      closable: true,
      earlyTerminationAllowed: false,
      earlyTerminationFee: 1500,
      active: true,
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PLAN-004',
      name: 'Enterprise Custom Annual',
      price: 45000,
      billingFrequency: 'Yearly',
      minQuantity: 5,
      availabilityStartDate: '2025-01-01',
      availabilityEndDate: '2028-12-31',
      description: 'Full-stack enterprise license with dedicated infrastructure and unlimited users.',
      pausable: false,
      renewable: true,
      closable: false,
      earlyTerminationAllowed: false,
      earlyTerminationFee: 5000,
      active: true,
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PLAN-005',
      name: 'Developer Sprint Weekly',
      price: 350,
      billingFrequency: 'Weekly',
      minQuantity: 1,
      availabilityStartDate: '2025-01-01',
      availabilityEndDate: '2028-12-31',
      description: 'Short-term weekly access for contractors, proof-of-concepts, and agile teams.',
      pausable: true,
      renewable: true,
      closable: true,
      earlyTerminationAllowed: true,
      earlyTerminationFee: 0,
      active: true,
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PLAN-006',
      name: 'High-Frequency Daily Cloud',
      price: 75,
      billingFrequency: 'Daily',
      minQuantity: 1,
      availabilityStartDate: '2025-01-01',
      availabilityEndDate: '2028-12-31',
      description: 'Pay-as-you-go micro-billing for ephemeral testing instances.',
      pausable: true,
      renewable: true,
      closable: true,
      earlyTerminationAllowed: true,
      earlyTerminationFee: 0,
      active: true,
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'PLAN-007',
      name: 'Legacy Basic (Archived)',
      price: 399,
      billingFrequency: 'Monthly',
      minQuantity: 1,
      availabilityStartDate: '2024-01-01',
      availabilityEndDate: '2025-06-30', // expired availability
      description: 'Old pricing tier no longer offered to new subscribers.',
      pausable: false,
      renewable: false,
      closable: true,
      earlyTerminationAllowed: true,
      earlyTerminationFee: 0,
      active: false,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'PLAN-008',
      name: 'Agency Reseller Quarterly',
      price: 4800,
      billingFrequency: 'Monthly',
      minQuantity: 3,
      availabilityStartDate: '2025-01-01',
      availabilityEndDate: '2028-12-31',
      description: 'Special tier designed for digital marketing and accounting agencies managing clients.',
      pausable: true,
      renewable: true,
      closable: true,
      earlyTerminationAllowed: true,
      earlyTerminationFee: 600,
      active: true,
      createdAt: '2025-09-01T00:00:00.000Z',
    },
  ];

  // 5. 6 Discounts
  const discounts: Discount[] = [
    {
      id: 'DISC-001',
      code: 'STARTUP20',
      name: 'Early Stage Startup Special',
      type: 'Percentage',
      value: 20,
      minPurchaseAmount: 1000,
      startDate: '2025-01-01',
      expiryDate: '2027-12-31',
      totalUsageLimit: 500,
      perCustomerLimit: 3,
      usageCount: 42,
      customerUsage: { 'CUST-001': 1, 'CUST-002': 1 },
      active: true,
      applicablePlanIds: ['PLAN-001', 'PLAN-002', 'PLAN-003'],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'DISC-002',
      code: 'FLAT500',
      name: '₹500 Flat Festive Cashback',
      type: 'Fixed',
      value: 500,
      minPurchaseAmount: 2000,
      startDate: '2025-10-01',
      expiryDate: '2027-06-30',
      totalUsageLimit: 200,
      perCustomerLimit: 1,
      usageCount: 78,
      customerUsage: { 'CUST-001': 1 },
      active: true,
      createdAt: '2025-10-01T00:00:00.000Z',
    },
    {
      id: 'DISC-003',
      code: 'ANNUALSAVE10',
      name: 'Annual Subscription Saver',
      type: 'Percentage',
      value: 10,
      minPurchaseAmount: 5000,
      startDate: '2025-01-01',
      expiryDate: '2027-12-31',
      totalUsageLimit: 1000,
      usageCount: 31,
      customerUsage: {},
      active: true,
      applicablePlanIds: ['PLAN-003', 'PLAN-004'],
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'DISC-004',
      code: 'WELCOME100',
      name: 'New Customer Welcome Voucher',
      type: 'Fixed',
      value: 100,
      minPurchaseAmount: 500,
      startDate: '2025-01-01',
      expiryDate: '2027-12-31',
      totalUsageLimit: 1000,
      perCustomerLimit: 1,
      usageCount: 95,
      customerUsage: {},
      active: true,
      createdAt: '2025-09-01T00:00:00.000Z',
    },
    {
      id: 'DISC-005',
      code: 'EXHAUSTED50',
      name: 'Super Flash 50% Off (Fully Claimed)',
      type: 'Percentage',
      value: 50,
      minPurchaseAmount: 1000,
      startDate: '2025-01-01',
      expiryDate: '2027-12-31',
      totalUsageLimit: 15,
      perCustomerLimit: 1,
      usageCount: 15, // Exhausted
      customerUsage: {},
      active: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'DISC-006',
      code: 'EXPIRED2025',
      name: 'Year 2025 Clearance Discount',
      type: 'Percentage',
      value: 25,
      minPurchaseAmount: 1500,
      startDate: '2025-01-01',
      expiryDate: '2025-12-31', // Expired
      totalUsageLimit: 100,
      usageCount: 64,
      customerUsage: {},
      active: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  ];

  // 6. Quotation Templates
  const templates: QuotationTemplate[] = [
    {
      id: 'TMPL-001',
      name: 'Standard SaaS + Invoicing Bundle',
      defaultPlanId: 'PLAN-001',
      validityDays: 30,
      paymentTerms: 'Net 15',
      defaultLines: [
        { productId: 'PROD-001', variantId: 'VAR-1-2', quantity: 1, discountPercent: 0 },
        { productId: 'PROD-002', variantId: 'VAR-2-1', quantity: 1, discountPercent: 0 },
        { productId: 'PROD-004', variantId: 'VAR-4-1', quantity: 1, discountPercent: 0 },
      ],
      createdAt: '2025-10-01T00:00:00.000Z',
    },
    {
      id: 'TMPL-002',
      name: 'Enterprise Full Stack with Onboarding',
      defaultPlanId: 'PLAN-004',
      validityDays: 45,
      paymentTerms: 'Net 30',
      defaultLines: [
        { productId: 'PROD-001', variantId: 'VAR-1-3', quantity: 5, discountPercent: 10 },
        { productId: 'PROD-003', variantId: 'VAR-3-2', quantity: 1, discountPercent: 0 },
        { productId: 'PROD-007', variantId: 'VAR-7-1', quantity: 1, discountPercent: 0 },
        { productId: 'PROD-011', quantity: 1, discountPercent: 0 },
      ],
      createdAt: '2025-10-05T00:00:00.000Z',
    },
    {
      id: 'TMPL-003',
      name: 'Growth Pack with WhatsApp Alerts',
      defaultPlanId: 'PLAN-002',
      validityDays: 15,
      paymentTerms: 'Immediate',
      defaultLines: [
        { productId: 'PROD-001', variantId: 'VAR-1-1', quantity: 2, discountPercent: 5 },
        { productId: 'PROD-005', variantId: 'VAR-5-2', quantity: 1, discountPercent: 0 },
        { productId: 'PROD-006', variantId: 'VAR-6-1', quantity: 1, discountPercent: 0 },
      ],
      createdAt: '2025-10-10T00:00:00.000Z',
    },
  ];

  // 7. Generate 300 Subscriptions, 600+ Invoices, and Payments
  const subscriptions: Subscription[] = [];
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];

  const statuses: SubscriptionStatus[] = ['Active', 'Active', 'Active', 'Active', 'Confirmed', 'Quotation', 'Closed', 'Draft'];
  const paymentTermsList = ['Immediate', 'Net 15', 'Net 30'];

  // Seed customer CUST-001 first with active subscriptions
  const cust001Sub1: Subscription = {
    id: 'SUB-000001',
    subscriptionNumber: 'SUB-2026-000001',
    customerId: 'CUST-001',
    planId: 'PLAN-002',
    status: 'Active',
    startDate: '2025-11-01',
    expiryDate: '2027-11-01',
    nextBillingDate: '2026-11-01',
    paymentTerms: 'Net 15',
    lines: [
      {
        id: 'SUBL-001',
        productId: 'PROD-001',
        productName: 'Brightloop ERP Core',
        variantId: 'VAR-1-1',
        variantName: 'Odoo Compatible',
        quantity: 1,
        unitPrice: 1200,
        variantExtra: 560,
        taxPercent: 18,
        discountPercent: 0,
        lineTotal: round2((1200 + 560) * 1.18),
      },
      {
        id: 'SUBL-002',
        productId: 'PROD-002',
        productName: 'Automated Invoicing Engine',
        variantId: 'VAR-2-1',
        variantName: 'Up to 500 Invoices/mo',
        quantity: 1,
        unitPrice: 500,
        variantExtra: 0,
        taxPercent: 18,
        discountPercent: 0,
        lineTotal: round2(500 * 1.18),
      },
    ],
    subtotal: 2260,
    discountTotal: 0,
    taxTotal: round2(2260 * 0.18),
    grandTotal: round2(2260 * 1.18),
    appliedDiscountId: 'DISC-001',
    createdAt: '2025-11-01T10:00:00.000Z',
  };
  subscriptions.push(cust001Sub1);

  // Generate 300 Subscriptions across customers
  for (let s = 2; s <= 300; s++) {
    const custIndex = ((s * 3) % 119) + 1; // Maps across all 120 customers
    const custId = customers[custIndex].id;
    const plan = plans[(s * 2) % 6]; // pick an active plan
    const status = statuses[s % statuses.length];
    const terms = paymentTermsList[s % paymentTermsList.length];

    // Pick 1 to 3 products
    const prodCount = 1 + (s % 3);
    const subLines: SubscriptionLine[] = [];

    for (let p = 0; p < prodCount; p++) {
      const prod = products[(s + p * 4) % products.length];
      const variant = prod.variants.length > 0 ? prod.variants[s % prod.variants.length] : undefined;
      const qty = Math.max(plan.minQuantity, 1 + ((s + p) % 3));
      const varExtra = variant ? variant.extraPrice : 0;
      const discPct = s % 5 === 0 ? 10 : 0;
      const calc = calculateOrderLine(prod.sellingPrice, varExtra, qty, discPct, 18);

      subLines.push({
        id: `SUBL-${s}-${p}`,
        productId: prod.id,
        productName: prod.name,
        variantId: variant?.id,
        variantName: variant?.value,
        quantity: qty,
        unitPrice: prod.sellingPrice,
        variantExtra: varExtra,
        taxPercent: 18,
        discountPercent: discPct,
        lineTotal: calc.lineTotal,
      });
    }

    const totals = calculateTotals(subLines, 0);

    const startMonth = 1 + (s % 10);
    const startYear = s % 4 === 0 ? 2025 : 2026;
    const startDay = 1 + (s % 26);
    const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
    const expiryDate = `${startYear + 1}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
    
    // nextBillingDate
    const nextBillingMonth = Math.min(12, startMonth + 1);
    const nextBillingDate = `${startYear}-${String(nextBillingMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;

    subscriptions.push({
      id: `SUB-${String(s).padStart(6, '0')}`,
      subscriptionNumber: `SUB-2026-${String(s).padStart(6, '0')}`,
      customerId: custId,
      planId: plan.id,
      status,
      startDate,
      expiryDate,
      nextBillingDate,
      paymentTerms: terms,
      lines: subLines,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      appliedDiscountId: s % 7 === 0 ? 'DISC-001' : undefined,
      createdAt: new Date(startYear, startMonth - 1, startDay).toISOString(),
    });
  }

  // 8. Generate 620+ Invoices linked to Subscriptions
  let invSeq = 1;
  const paymentMethods: PaymentMethod[] = ['UPI', 'Bank Transfer', 'Card', 'Cash', 'Cheque'];

  for (let i = 0; i < subscriptions.length; i++) {
    const sub = subscriptions[i];
    if (sub.status === 'Draft' || sub.status === 'Quotation') {
      continue;
    }

    // Number of past invoices for this subscription
    const invoiceCycles = sub.status === 'Active' ? 2 + (i % 3) : 1;

    for (let cycle = 0; cycle < invoiceCycles; cycle++) {
      const issueMonth = 1 + ((cycle * 2 + (i % 8)) % 10);
      const issueYear = 2026;
      const issueDay = 1 + (i % 25);
      const issueDate = `${issueYear}-${String(issueMonth).padStart(2, '0')}-${String(issueDay).padStart(2, '0')}`;
      const dueDate = getDueDateFromTerms(issueDate, sub.paymentTerms);

      const invLines: InvoiceLine[] = sub.lines.map((l, lIdx) => ({
        id: `INVL-${invSeq}-${lIdx}`,
        description: l.variantName ? `${l.productName} (${l.variantName})` : l.productName,
        quantity: l.quantity,
        unitPrice: round2(l.unitPrice + l.variantExtra),
        taxPercent: l.taxPercent,
        discountAmount: round2(l.unitPrice * (l.discountPercent / 100)),
        lineTotal: l.lineTotal,
      }));

      // Determine status: mostly Paid, some Confirmed (unpaid/outstanding), some overdue
      const isPastDue = new Date(dueDate).getTime() < new Date('2026-10-30').getTime();
      let invStatus: 'Paid' | 'Confirmed' | 'Draft' = 'Paid';

      if (invSeq % 6 === 0) {
        invStatus = 'Confirmed'; // Outstanding
      } else if (invSeq % 17 === 0) {
        invStatus = 'Draft';
      }

      let amountPaid = 0;
      let balanceDue = sub.grandTotal;

      if (invStatus === 'Paid') {
        amountPaid = sub.grandTotal;
        balanceDue = 0;
      } else if (invSeq % 9 === 0 && invStatus === 'Confirmed') {
        // Partial payment
        amountPaid = round2(sub.grandTotal * 0.4);
        balanceDue = round2(sub.grandTotal - amountPaid);
      }

      const invNumber = `INV-2026-${String(invSeq).padStart(6, '0')}`;
      const invoice: Invoice = {
        id: `INV-${String(invSeq).padStart(6, '0')}`,
        invoiceNumber: invNumber,
        subscriptionId: sub.id,
        customerId: sub.customerId,
        status: invStatus,
        issueDate,
        dueDate,
        billingPeriodStart: issueDate,
        billingPeriodEnd: dueDate,
        lines: invLines,
        subtotal: sub.subtotal,
        discountTotal: sub.discountTotal,
        taxTotal: sub.taxTotal,
        grandTotal: sub.grandTotal,
        amountPaid,
        balanceDue,
        appliedDiscountCode: sub.appliedDiscountId ? 'STARTUP20' : undefined,
        idempotencyKey: `${sub.id}_${issueDate}`,
        followUpNotes: isPastDue && balanceDue > 0 ? [
          {
            id: `FN-${invSeq}`,
            authorName: 'Pooja Nair',
            authorRole: 'staff',
            note: 'Client notified via WhatsApp; requested payment by Friday.',
            timestamp: '2026-10-25T11:30:00.000Z',
          }
        ] : [],
        createdAt: new Date(issueYear, issueMonth - 1, issueDay).toISOString(),
      };

      invoices.push(invoice);

      // Record payments if any
      if (amountPaid > 0) {
        const payNum = `PAY-2026-${String(payments.length + 1).padStart(6, '0')}`;
        payments.push({
          id: `PAY-${String(payments.length + 1).padStart(6, '0')}`,
          paymentNumber: payNum,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: amountPaid,
          date: issueDate,
          method: paymentMethods[invSeq % paymentMethods.length],
          transactionRef: `UPI/AXIS/${800000000 + invSeq}`,
          notes: amountPaid === sub.grandTotal ? 'Full payment received' : 'Partial payment recorded',
          createdAt: new Date(issueYear, issueMonth - 1, issueDay, 14, 0, 0).toISOString(),
        });
      }

      invSeq++;
    }
  }

  // Populate into repositories
  usersRepo.create(demoAdminUser, null);
  usersRepo.create(demoStaffUser, demoAdminUser);
  usersRepo.create(demoStaffUser2, demoAdminUser);
  usersRepo.create(demoCustomerUser, null);

  for (const c of customers) {
    customersRepo.create(c, null);
  }
  for (const p of products) {
    productsRepo.create(p, demoAdminUser);
  }
  for (const pl of plans) {
    plansRepo.create(pl, demoAdminUser);
  }
  for (const d of discounts) {
    discountsRepo.create(d, demoAdminUser);
  }
  for (const t of templates) {
    templatesRepo.create(t, demoAdminUser);
  }

  // Fast bulk persistence for large datasets (300 subs, 600+ invoices, payments)
  subscriptionsRepo.rawSetAll(subscriptions);
  invoicesRepo.rawSetAll(invoices);
  paymentsRepo.rawSetAll(payments);

  localStorage.setItem(SEED_VERSION_KEY, 'true');
  console.log(`Seeded Brightloop successfully: ${subscriptions.length} subscriptions, ${invoices.length} invoices, ${payments.length} payments, ${customers.length} customers.`);
}
