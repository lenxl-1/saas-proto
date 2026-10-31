import jsPDF from 'jspdf';
import { Customer, Invoice, Plan, Subscription } from '../types';
import { formatDate, formatINR } from './formatters';

export function generateInvoicePDF(
  invoice: Invoice,
  customer?: Customer,
  subscription?: Subscription,
  plan?: Plan
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Colors
  const primaryColor = [30, 41, 59]; // slate-800
  const accentColor = [79, 70, 229];  // indigo-600
  const textColor = [51, 65, 85];     // slate-700
  const lightBg = [248, 250, 252];    // slate-50

  // 1. Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('BRIGHTFLOW TECHNOLOGIES PVT LTD', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('GSTIN: 27AABCB1234F1Z8', 140, 15);

  // 2. Invoice Title & Meta
  let y = 36;
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', 14, y);

  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 14, y + 6);
  doc.text(`Date of Issue: ${formatDate(invoice.issueDate)}`, 14, y + 11);
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 14, y + 16);
  doc.text(`Billing Period: ${formatDate(invoice.billingPeriodStart)} to ${formatDate(invoice.billingPeriodEnd)}`, 14, y + 21);

  // Billed To Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(110, y - 2, 86, 28, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO:', 114, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(customer?.name || 'Customer', 114, y + 9);
  if (customer?.company) {
    doc.text(customer.company, 114, y + 14);
  }
  doc.text(customer?.email || '', 114, y + 19);
  if (customer?.gstin) {
    doc.text(`GSTIN: ${customer.gstin}`, 114, y + 24);
  }

  // 3. Line Items Table Header
  y = 70;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('DESCRIPTION', 16, y + 5.5);
  doc.text('QTY', 110, y + 5.5);
  doc.text('UNIT PRICE', 125, y + 5.5);
  doc.text('TAX', 155, y + 5.5);
  doc.text('AMOUNT', 175, y + 5.5);

  // Rows
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  for (const line of invoice.lines) {
    doc.text(line.description.substring(0, 48), 16, y);
    doc.text(String(line.quantity), 112, y);
    doc.text(`Rs. ${line.unitPrice.toFixed(2)}`, 125, y);
    doc.text(`${line.taxPercent}%`, 155, y);
    doc.text(`Rs. ${line.lineTotal.toFixed(2)}`, 175, y);
    y += 8;
  }

  // Separator
  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, 196, y);

  // 4. Totals Breakdown
  y += 8;
  const rightX = 140;
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', rightX, y);
  doc.text(`Rs. ${invoice.subtotal.toFixed(2)}`, 175, y);

  if (invoice.discountTotal > 0) {
    y += 6;
    doc.text(`Discount (${invoice.appliedDiscountCode || 'Special'}):`, rightX, y);
    doc.text(`-Rs. ${invoice.discountTotal.toFixed(2)}`, 175, y);
  }

  y += 6;
  doc.text('GST (18%):', rightX, y);
  doc.text(`Rs. ${invoice.taxTotal.toFixed(2)}`, 175, y);

  y += 8;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(rightX - 2, y - 5, 58, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total:', rightX, y);
  doc.text(`Rs. ${invoice.grandTotal.toFixed(2)}`, 175, y);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.text('Amount Paid:', rightX, y);
  doc.text(`Rs. ${invoice.amountPaid.toFixed(2)}`, 175, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(invoice.balanceDue > 0 ? 185 : 22, invoice.balanceDue > 0 ? 28 : 101, invoice.balanceDue > 0 ? 28 : 52);
  doc.text('Balance Due:', rightX, y);
  doc.text(`Rs. ${invoice.balanceDue.toFixed(2)}`, 175, y);

  // 5. Payment Instructions & Footer
  y = 230;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, y, 182, 34, 2, 2, 'F');

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT INSTRUCTIONS', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Bank: HDFC Bank Ltd | A/C: 50200012345678 | IFSC: HDFC0001234', 18, y + 12);
  doc.text('UPI ID: brightflow@hdfcbank | Remittance Reference: ' + invoice.invoiceNumber, 18, y + 18);
  doc.text('Terms: ' + (subscription?.paymentTerms || 'Net 15 Days') + ' | Support: billing@brightflow.io', 18, y + 24);

  doc.setFontSize(8);
  doc.text('This is a computer-generated tax invoice and requires no physical signature.', 14, 280);

  doc.save(`${invoice.invoiceNumber}.pdf`);
}

export function generateQuotationPDF(
  subscription: Subscription,
  customer?: Customer,
  plan?: Plan
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [30, 41, 59];
  const accentColor = [79, 70, 229];
  const textColor = [51, 65, 85];
  const lightBg = [248, 250, 252];

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('BRIGHTFLOW TECHNOLOGIES PVT LTD', 14, 15);

  let y = 36;
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SUBSCRIPTION QUOTATION', 14, y);

  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(`Quotation Ref: ${subscription.subscriptionNumber}`, 14, y + 6);
  doc.text(`Created Date: ${formatDate(subscription.startDate)}`, 14, y + 11);
  doc.text(`Plan: ${plan?.name || 'Selected Plan'}`, 14, y + 16);
  doc.text(`Payment Terms: ${subscription.paymentTerms}`, 14, y + 21);

  // Customer Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(110, y - 2, 86, 28, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED FOR:', 114, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(customer?.name || 'Customer', 114, y + 9);
  if (customer?.company) doc.text(customer.company, 114, y + 14);
  doc.text(customer?.email || '', 114, y + 19);

  // Table
  y = 70;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PRODUCT / SERVICE', 16, y + 5.5);
  doc.text('QTY', 110, y + 5.5);
  doc.text('UNIT PRICE', 125, y + 5.5);
  doc.text('TAX', 155, y + 5.5);
  doc.text('TOTAL', 175, y + 5.5);

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  for (const line of subscription.lines) {
    const desc = line.variantName ? `${line.productName} (${line.variantName})` : line.productName;
    doc.text(desc.substring(0, 48), 16, y);
    doc.text(String(line.quantity), 112, y);
    doc.text(`Rs. ${(line.unitPrice + line.variantExtra).toFixed(2)}`, 125, y);
    doc.text(`${line.taxPercent}%`, 155, y);
    doc.text(`Rs. ${line.lineTotal.toFixed(2)}`, 175, y);
    y += 8;
  }

  y += 8;
  const rightX = 140;
  doc.text('Subtotal:', rightX, y);
  doc.text(`Rs. ${subscription.subtotal.toFixed(2)}`, 175, y);

  if (subscription.discountTotal > 0) {
    y += 6;
    doc.text('Discount:', rightX, y);
    doc.text(`-Rs. ${subscription.discountTotal.toFixed(2)}`, 175, y);
  }

  y += 6;
  doc.text('GST (18%):', rightX, y);
  doc.text(`Rs. ${subscription.taxTotal.toFixed(2)}`, 175, y);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total:', rightX, y);
  doc.text(`Rs. ${subscription.grandTotal.toFixed(2)}`, 175, y);

  doc.save(`${subscription.subscriptionNumber}-Quotation.pdf`);
}
