import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CreditCard,
  FileSpreadsheet,
  FileText,
  Package,
  Repeat,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import {
  customersRepo,
  invoicesRepo,
  paymentsRepo,
  productsRepo,
  subscriptionsRepo,
} from '../../lib/db';
import { formatINR } from '../../lib/formatters';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string, entityId?: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger handled in parent
        }
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return [
        {
          category: 'Quick Navigation',
          items: [
            { id: 'dashboard', label: 'Dashboard Overview', page: 'dashboard', icon: Repeat },
            { id: 'customers', label: 'Customers & CRM', page: 'customers', icon: Users },
            { id: 'subscriptions', label: 'Subscriptions Management', page: 'subscriptions', icon: Repeat },
            { id: 'invoices', label: 'Invoices & Billing', page: 'invoices', icon: FileText },
            { id: 'payments', label: 'Payments Ledger', page: 'payments', icon: CreditCard },
            { id: 'products', label: 'Products & Pricing Catalog', page: 'products', icon: Package },
          ],
        },
      ];
    }

    const q = query.toLowerCase();
    const categories: { category: string; items: any[] }[] = [];

    // Customers
    const customers = customersRepo
      .getAll(user)
      .filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.email,
        page: 'customers',
        icon: Users,
      }));
    if (customers.length) categories.push({ category: 'Customers', items: customers });

    // Subscriptions
    const subs = subscriptionsRepo
      .getAll(user)
      .filter((s) => s.subscriptionNumber.toLowerCase().includes(q) || s.status.toLowerCase().includes(q))
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        label: s.subscriptionNumber,
        sublabel: `${s.status} · ${formatINR(s.grandTotal)}`,
        page: 'subscriptions',
        icon: Repeat,
      }));
    if (subs.length) categories.push({ category: 'Subscriptions', items: subs });

    // Invoices
    const invoices = invoicesRepo
      .getAll(user)
      .filter((i) => i.invoiceNumber.toLowerCase().includes(q) || i.status.toLowerCase().includes(q))
      .slice(0, 3)
      .map((i) => ({
        id: i.id,
        label: i.invoiceNumber,
        sublabel: `${i.status} · ${formatINR(i.grandTotal)}`,
        page: 'invoices',
        icon: FileText,
      }));
    if (invoices.length) categories.push({ category: 'Invoices', items: invoices });

    // Quotations
    const quotations = subscriptionsRepo
      .getAll(user)
      .filter(
        (s) =>
          s.status === 'Quotation' &&
          (s.subscriptionNumber.toLowerCase().includes(q) || 'quotation'.includes(q))
      )
      .slice(0, 2)
      .map((s) => ({
        id: s.id,
        label: `Quote ${s.subscriptionNumber}`,
        sublabel: formatINR(s.grandTotal),
        page: 'quotations',
        icon: FileSpreadsheet,
      }));
    if (quotations.length) categories.push({ category: 'Quotations', items: quotations });

    // Products
    const products = productsRepo
      .getAll()
      .filter((p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q))
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        label: p.name,
        sublabel: `${p.type} · ${formatINR(p.sellingPrice)}`,
        page: 'products',
        icon: Package,
      }));
    if (products.length) categories.push({ category: 'Products', items: products });

    return categories;
  }, [query, user]);

  const flatItems = useMemo(() => {
    return results.flatMap((c) => c.items);
  }, [results]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, flatItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % Math.max(1, flatItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = flatItems[selectedIndex];
      if (current) {
        onNavigate(current.page, current.id);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#E5E5E5] dark:border-[#262626] gap-3">
          <Search className="w-4 h-4 text-[#A3A3A3] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search customers, subscriptions, invoices, products..."
            className="flex-1 bg-transparent text-sm text-[#171717] dark:text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[#737373] dark:text-[#A3A3A3] bg-neutral-100 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {flatItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#737373] dark:text-[#A3A3A3]">
              No records found matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((category) => (
              <div key={category.category} className="space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-[#A3A3A3] dark:text-[#71717A]">
                  {category.category}
                </div>
                {category.items.map((item) => {
                  const globalIdx = flatItems.indexOf(item);
                  const isSelected = globalIdx === selectedIndex;
                  const Icon = item.icon || Search;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.page, item.id);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                        isSelected
                          ? 'bg-neutral-100 dark:bg-neutral-800 text-[#171717] dark:text-[#F5F5F5]'
                          : 'text-[#737373] dark:text-[#A3A3A3] hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className="w-3.5 h-3.5 shrink-0 text-[#737373] dark:text-[#A3A3A3]" />
                        <span className="font-medium text-[#171717] dark:text-[#F5F5F5] truncate">
                          {item.label}
                        </span>
                        {item.sublabel && (
                          <span className="text-[11px] text-[#A3A3A3] dark:text-[#71717A] truncate">
                            · {item.sublabel}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#A3A3A3] dark:text-[#71717A] shrink-0 capitalize">
                        {item.page}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts info */}
        <div className="px-4 py-2 border-t border-[#E5E5E5] dark:border-[#262626] bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center justify-between text-[11px] text-[#737373] dark:text-[#A3A3A3]">
          <div className="flex items-center gap-3">
            <span>
              Use <kbd className="font-mono font-medium">↑</kbd>{' '}
              <kbd className="font-mono font-medium">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="font-mono font-medium">↵</kbd> to select
            </span>
          </div>
          <span>BrightFlow Command</span>
        </div>
      </div>
    </div>
  );
};
