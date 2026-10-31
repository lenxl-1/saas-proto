import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Edit2,
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { Product, ProductType, ProductVariant } from '../types';
import { useAuth } from '../lib/auth';
import { productsRepo } from '../lib/db';
import { formatINR } from '../lib/formatters';
import { calculateMargin } from '../lib/pricing';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';

export const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>('Software');
  const [sellingPrice, setSellingPrice] = useState<string>('4999');
  const [costPrice, setCostPrice] = useState<string>('1500');
  const [description, setDescription] = useState('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  const products = useMemo(() => productsRepo.getAll(), []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [products, typeFilter, searchQuery]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setType('Software');
    setSellingPrice('4999');
    setCostPrice('1500');
    setDescription('');
    setVariants([
      {
        id: 'VAR-' + Math.random().toString(36).substring(2, 7),
        attribute: 'Edition',
        value: 'Standard',
        extraPrice: 0,
      },
      {
        id: 'VAR-' + Math.random().toString(36).substring(2, 7),
        attribute: 'Edition',
        value: 'Pro',
        extraPrice: 1000,
      },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setType(p.type);
    setSellingPrice(String(p.sellingPrice));
    setCostPrice(String(p.costPrice));
    setDescription(p.description);
    setVariants(p.variants || []);
    setIsModalOpen(true);
  };

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        id: 'VAR-' + Math.random().toString(36).substring(2, 7),
        attribute: 'Edition',
        value: 'Enterprise',
        extraPrice: 2000,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Name Required', 'Product name is mandatory.');
      return;
    }

    const sp = parseFloat(sellingPrice);
    const cp = parseFloat(costPrice);

    if (isNaN(sp) || sp < 0 || isNaN(cp) || cp < 0) {
      showToast('error', 'Invalid Pricing', 'Selling price and cost price must be non-negative.');
      return;
    }

    try {
      if (editingProduct) {
        productsRepo.update(
          editingProduct.id,
          {
            name: name.trim(),
            type,
            sellingPrice: sp,
            costPrice: cp,
            description: description.trim(),
            variants,
          },
          user
        );
        showToast('success', 'Product Updated', `Product ${name} updated.`);
      } else {
        const newProduct: Product = {
          id: 'PROD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          name: name.trim(),
          type,
          sellingPrice: sp,
          costPrice: cp,
          description: description.trim(),
          active: true,
          variants,
          createdAt: new Date().toISOString(),
        };
        productsRepo.create(newProduct, user);
        showToast('success', 'Product Added', `Product ${name} registered in catalog.`);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Save Failed', msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* 15. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#262626]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#171717] dark:text-[#F5F5F5] tracking-tight">
            Products
          </h1>
          <p className="text-xs text-[#737373] dark:text-[#A3A3A3] mt-1">
            Manage products, variants and pricing.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={openCreateModal}
          >
            Add product
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products or descriptions..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] placeholder-[#A3A3A3] focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs self-start sm:self-auto">
          {['all', 'Software', 'Add-on', 'Service'].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTypeFilter(t);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded capitalize font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-white dark:bg-[#111111] text-[#171717] dark:text-[#F5F5F5] font-semibold shadow-2xs'
                  : 'text-[#737373] dark:text-[#A3A3A3] hover:text-[#171717]'
              }`}
            >
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Products Data Table */}
      <div className="bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-[#E5E5E5] dark:border-[#262626] text-[#737373] dark:text-[#A3A3A3] font-medium">
              <tr>
                <th className="py-2.5 px-4 font-medium">Product</th>
                <th className="py-2.5 px-4 font-medium">Type</th>
                <th className="py-2.5 px-4 font-medium">Variants & Tiers</th>
                <th className="py-2.5 px-4 font-medium text-right">Sales Price</th>
                <th className="py-2.5 px-4 font-medium text-right">Cost Price</th>
                <th className="py-2.5 px-4 font-medium text-right">Margin</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                {canManage && <th className="py-2.5 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5] dark:divide-[#1F1F1F]">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#737373] dark:text-[#A3A3A3]">
                    No products registered matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const margin = calculateMargin(p.sellingPrice, p.costPrice);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-850/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#171717] dark:text-[#F5F5F5] block">
                          {p.name}
                        </span>
                        <span className="text-[11px] text-[#737373] dark:text-[#A3A3A3] line-clamp-1">
                          {p.description}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-[#737373] dark:text-[#A3A3A3] border border-[#E5E5E5] dark:border-[#262626]">
                          {p.type}
                        </span>
                      </td>
                      {/* 16. Variants representation with price differences */}
                      <td className="py-3 px-4">
                        {p.variants && p.variants.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {p.variants.map((v) => (
                              <span
                                key={v.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-50 dark:bg-neutral-800/80 border border-[#E5E5E5] dark:border-[#262626] text-[10px] text-[#171717] dark:text-[#F5F5F5]"
                              >
                                <span className="font-medium">{v.value}</span>
                                {v.extraPrice > 0 ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                                    +{formatINR(v.extraPrice)}
                                  </span>
                                ) : (
                                  <span className="text-[#A3A3A3]">Base</span>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#A3A3A3]">Single SKU</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[#171717] dark:text-[#F5F5F5] tabular-nums">
                        {formatINR(p.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#737373] dark:text-[#A3A3A3] tabular-nums">
                        {formatINR(p.costPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                        {margin.marginPercent}%
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={p.active ? 'Active' : 'Closed'} size="xs" />
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1 text-[#737373] hover:text-[#171717] dark:hover:text-[#F5F5F5] rounded transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Product Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111111] rounded-2xl border border-[#E5E5E5] dark:border-[#262626] shadow-2xl max-w-lg w-full flex flex-col max-h-[92vh] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5E5] dark:border-[#262626] flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#171717] dark:text-[#F5F5F5]">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BrightFlow Enterprise ERP"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ProductType)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                  >
                    <option value="Software">Software</option>
                    <option value="Add-on">Add-on</option>
                    <option value="Service">Service</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Sales Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-[#737373] dark:text-[#A3A3A3] block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Key features and license details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-[#E5E5E5] dark:border-[#262626] rounded-lg text-[#171717] dark:text-[#F5F5F5] focus:outline-none"
                />
              </div>

              {/* 16. Variants Section */}
              <div className="pt-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
                    Product Variants & Add-on Prices
                  </label>
                  <Button variant="outline" size="xs" onClick={handleAddVariant} type="button">
                    + Add Variant
                  </Button>
                </div>

                <div className="space-y-2">
                  {variants.map((v, i) => (
                    <div
                      key={v.id || i}
                      className="p-2.5 bg-neutral-50 dark:bg-neutral-850 border border-[#E5E5E5] dark:border-[#262626] rounded-lg flex items-center gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Attribute (e.g. Edition)"
                        value={v.attribute}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[i].attribute = e.target.value;
                          setVariants(updated);
                        }}
                        className="w-28 p-1.5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded text-xs text-[#171717] dark:text-[#F5F5F5]"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. Pro)"
                        value={v.value}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[i].value = e.target.value;
                          setVariants(updated);
                        }}
                        className="flex-1 p-1.5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded text-xs text-[#171717] dark:text-[#F5F5F5]"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[#A3A3A3]">+₹</span>
                        <input
                          type="number"
                          placeholder="Extra"
                          value={v.extraPrice}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[i].extraPrice = Number(e.target.value);
                            setVariants(updated);
                          }}
                          className="w-20 p-1.5 bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#262626] rounded font-mono text-xs text-[#171717] dark:text-[#F5F5F5]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(i)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E5E5E5] dark:border-[#262626]">
                <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
