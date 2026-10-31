import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  Percent,
  Plus,
  Search,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { Discount, DiscountType } from '../types';
import { useAuth } from '../lib/auth';
import { discountsRepo, plansRepo, productsRepo, settingsRepo } from '../lib/db';
import { getDiscountStatus } from '../lib/discounts';
import { formatDate, formatINR } from '../lib/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';

export const DiscountsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  const canManage = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<DiscountType>('Percentage');
  const [value, setValue] = useState('15');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('1000');
  const [startDate, setStartDate] = useState(effectiveToday);
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [totalUsageLimit, setTotalUsageLimit] = useState(100);
  const [perCustomerLimit, setPerCustomerLimit] = useState(1);

  const discounts = useMemo(() => discountsRepo.getAll(), []);

  const filteredDiscounts = useMemo(() => {
    return discounts.filter((d) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [discounts, searchQuery]);

  const openCreateModal = () => {
    setEditingDiscount(null);
    setCode('');
    setName('');
    setType('Percentage');
    setValue('15');
    setMinPurchaseAmount('1000');
    setStartDate(effectiveToday);
    setExpiryDate('2027-12-31');
    setTotalUsageLimit(100);
    setPerCustomerLimit(1);
    setIsModalOpen(true);
  };

  const openEditModal = (d: Discount) => {
    setEditingDiscount(d);
    setCode(d.code);
    setName(d.name);
    setType(d.type);
    setValue(String(d.value));
    setMinPurchaseAmount(String(d.minPurchaseAmount));
    setStartDate(d.startDate);
    setExpiryDate(d.expiryDate);
    setTotalUsageLimit(d.totalUsageLimit);
    setPerCustomerLimit(d.perCustomerLimit || 1);
    setIsModalOpen(true);
  };

  const handleSaveDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      showToast('error', 'Fields Required', 'Code and name are required.');
      return;
    }

    const valNum = parseFloat(value);
    const minAmt = parseFloat(minPurchaseAmount) || 0;

    if (isNaN(valNum) || valNum <= 0) {
      showToast('error', 'Invalid Value', 'Discount value must be greater than zero.');
      return;
    }

    try {
      if (editingDiscount) {
        discountsRepo.update(
          editingDiscount.id,
          {
            code: code.trim().toUpperCase(),
            name: name.trim(),
            type,
            value: valNum,
            minPurchaseAmount: minAmt,
            startDate,
            expiryDate,
            totalUsageLimit: Math.max(1, totalUsageLimit),
            perCustomerLimit: Math.max(1, perCustomerLimit),
          },
          user
        );
        showToast('success', 'Discount Updated', `Coupon ${code} updated.`);
      } else {
        const newDisc: Discount = {
          id: 'DISC-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          code: code.trim().toUpperCase(),
          name: name.trim(),
          type,
          value: valNum,
          minPurchaseAmount: minAmt,
          startDate,
          expiryDate,
          totalUsageLimit: Math.max(1, totalUsageLimit),
          perCustomerLimit: Math.max(1, perCustomerLimit),
          usageCount: 0,
          customerUsage: {},
          active: true,
          createdAt: new Date().toISOString(),
        };
        discountsRepo.create(newDisc, user);
        showToast('success', 'Discount Created', `Coupon ${code} added.`);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Save Failed', msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* 24. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            Discounts & Coupons
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Manage promotional codes, volume incentives, and coupon rules.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={openCreateModal}
          >
            New Discount
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl">
        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search coupon code or campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs text-[#737373] dark:text-[#A3A3A3]">
          {filteredDiscounts.length} promotional rules
        </span>
      </div>

      {/* Discounts Data Table */}
      <div className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] font-medium">
              <tr>
                <th className="py-2.5 px-4 font-medium">Coupon Code</th>
                <th className="py-2.5 px-4 font-medium">Campaign Name</th>
                <th className="py-2.5 px-4 font-medium">Type & Value</th>
                <th className="py-2.5 px-4 font-medium text-right">Min. Spend</th>
                <th className="py-2.5 px-4 font-medium">Validity Period</th>
                <th className="py-2.5 px-4 font-medium">Usage Progress</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                {canManage && <th className="py-2.5 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
              {filteredDiscounts.map((d) => {
                const status = getDiscountStatus(d, effectiveToday);
                const percent = Math.min(100, Math.round((d.usageCount / d.totalUsageLimit) * 100));

                return (
                  <tr
                    key={d.id}
                    className="hover:bg-neutral-50/80 dark:hover:bg-neutral-850/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[#171717] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#262626]">
                        {d.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#171717] dark:text-[#F5F5F5]">
                      {d.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {d.type === 'Percentage' ? `${d.value}% Off` : `-${formatINR(d.value)}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#737373] dark:text-[#A3A3A3] tabular-nums">
                      {d.minPurchaseAmount > 0 ? formatINR(d.minPurchaseAmount) : 'None'}
                    </td>
                    <td className="py-3 px-4 text-[#737373] dark:text-[#A3A3A3] font-mono text-[11px]">
                      {formatDate(d.startDate)} → {formatDate(d.expiryDate)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-28 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-[#737373]">
                          <span>{d.usageCount} used</span>
                          <span>{d.totalUsageLimit} max</span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status={status === 'Active' ? 'Active' : status === 'Expired' ? 'Expired' : status === 'Scheduled' ? 'Quotation' : 'Closed'}
                        size="xs"
                      />
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(d)}
                          className="p-1 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded transition-colors"
                          title="Edit Discount"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discount Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-md w-full flex flex-col max-h-[92vh] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#171717] dark:text-[#F5F5F5]">
                {editingDiscount ? 'Edit Discount Rule' : 'New Discount Rule'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDiscount} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUMMER25"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono uppercase focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Discount Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as DiscountType)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Campaign / Offer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Early Bird Promotion"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Discount Value ({type === 'Percentage' ? '%' : '₹'}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Min. Purchase (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minPurchaseAmount}
                    onChange={(e) => setMinPurchaseAmount(e.target.value)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Total Global Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={totalUsageLimit}
                    onChange={(e) => setTotalUsageLimit(Number(e.target.value))}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Per Customer Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={perCustomerLimit}
                    onChange={(e) => setPerCustomerLimit(Number(e.target.value))}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Discount Rule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
