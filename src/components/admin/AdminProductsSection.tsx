import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import type { Category, Product } from '../../types/store';
import { adminApi } from '../../utils/adminApi';
import { validateProductPayload, type ProductInputPayload } from '../../utils/adminLogic';
import { formatEGP } from '../../utils/storeLogic';
import { SmartImage } from '../SmartImage';

interface AdminProductsSectionProps {
  products: Product[];
  categories: Category[];
  mode: 'list' | 'add';
  onSwitchToAdd: () => void;
  onSwitchToList: () => void;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

const EMPTY_FORM = (categories: Category[]): ProductInputPayload => ({
  nameAr: '',
  nameEn: '',
  descriptionAr: '',
  descriptionEn: '',
  unitAr: '1 كجم',
  unitEn: '1 kg',
  categoryId: categories[0]?.id || '',
  price: 0,
  discountPrice: null,
  stock: 20,
  image: '/src/assets/images/prod_fruits_vegetables_1794823232575.jpg',
  sku: '',
  isAvailable: true,
  isFeatured: false,
  isBestSeller: false,
  isNewArrival: true,
});

export function AdminProductsSection({
  products,
  categories,
  mode,
  onSwitchToAdd,
  onSwitchToList,
  onRefresh,
  onNotify,
}: AdminProductsSectionProps) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductInputPayload>(() => EMPTY_FORM(categories));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const startCreate = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM(categories));
    onSwitchToAdd();
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      descriptionAr: product.descriptionAr,
      descriptionEn: product.descriptionEn,
      unitAr: product.unitAr,
      unitEn: product.unitEn,
      categoryId: product.categoryId,
      price: product.price,
      discountPrice: product.discountPrice,
      stock: product.stock,
      image: product.image,
      sku: product.sku,
      isAvailable: product.isAvailable,
      isFeatured: product.isFeatured,
      isBestSeller: product.isBestSeller,
      isNewArrival: product.isNewArrival,
    });
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await adminApi.uploadImageFile(file);
      setForm((prev) => ({ ...prev, image: res.url }));
      onNotify('تم رفع صورة المنتج وحفظها بنجاح');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'فشل رفع الصورة', true);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveForm = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateProductPayload(form);
    if (err) {
      onNotify(err, true);
      return;
    }

    setSaving(true);
    try {
      if (editingProduct) {
        await adminApi.updateProduct(editingProduct.id, form);
        onNotify('تم تحديث بيانات المنتج وظهورها فوراً في المتجر');
        setEditingProduct(null);
      } else {
        await adminApi.createProduct(form);
        onNotify('تمت إضافة المنتج الجديد ونشره في المتجر فوراً');
        setForm(EMPTY_FORM(categories));
        onSwitchToList();
      }
      await onRefresh();
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : 'تعذر حفظ المنتج',
        true
      );
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggle = async (
    product: Product,
    field: 'isAvailable' | 'isFeatured'
  ) => {
    try {
      await adminApi.updateProduct(product.id, {
        [field]: !product[field],
      });
      await onRefresh();
      onNotify('تم تحديث حالة المنتج');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذر التحديث', true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteProduct(id);
      setConfirmDeleteId(null);
      await onRefresh();
      onNotify('تم حذف المنتج نهائياً');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذر حذف المنتج', true);
    }
  };

  const showForm = mode === 'add' || editingProduct !== null;

  if (showForm) {
    return (
      <div className="bg-white border border-[#E2E7E0] rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[#E2E7E0] pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#142218]">
              {editingProduct ? `تعديل المنتج: ${editingProduct.nameAr}` : 'إضافة منتج جديد'}
            </h2>
            <p className="text-xs text-[#526056] mt-1">
              أي تعديل يتم حفظه يظهر مباشرة للعملاء في المتجر الإلكتروني
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              onSwitchToList();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4DDD1] text-xs font-semibold text-[#526056] hover:text-[#142218] cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>إلغاء والعودة</span>
          </button>
        </div>

        <form onSubmit={handleSaveForm} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="prod-name-ar" className="block text-sm font-semibold text-[#142218]">
                اسم المنتج (بالعربية) *
              </label>
              <input
                id="prod-name-ar"
                type="text"
                required
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                placeholder="مثال: تفاح أحمر مستورد طازج"
                className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm focus:outline-none focus:border-[#0F5E36]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prod-name-en" className="block text-sm font-semibold text-[#142218]">
                اسم المنتج (بالإنجليزية)
              </label>
              <input
                id="prod-name-en"
                type="text"
                dir="ltr"
                value={form.nameEn || ''}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                placeholder="e.g., Fresh Red Apples"
                className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm focus:outline-none focus:border-[#0F5E36]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prod-category" className="block text-sm font-semibold text-[#142218]">
                القسم *
              </label>
              <select
                id="prod-category"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm focus:outline-none focus:border-[#0F5E36]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr} ({c.nameEn})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="prod-unit-ar" className="block text-sm font-semibold text-[#142218]">
                  الوزن / العبوة (عربي)
                </label>
                <input
                  id="prod-unit-ar"
                  type="text"
                  value={form.unitAr || ''}
                  onChange={(e) => setForm({ ...form, unitAr: e.target.value })}
                  placeholder="1 كجم"
                  className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm focus:outline-none focus:border-[#0F5E36]"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="prod-sku" className="block text-sm font-semibold text-[#142218]">
                  كود المنتج (SKU)
                </label>
                <input
                  id="prod-sku"
                  type="text"
                  dir="ltr"
                  value={form.sku || ''}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="AND-205"
                  className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm focus:outline-none focus:border-[#0F5E36]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="prod-price" className="block text-sm font-semibold text-[#142218]">
                  السعر (ج.م) *
                </label>
                <input
                  id="prod-price"
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  dir="ltr"
                  value={form.price || ''}
                  onChange={(e) =>
                    setForm({ ...form, price: Number(e.target.value) })
                  }
                  className="w-full h-11 px-3 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm tabular-nums focus:outline-none focus:border-[#0F5E36]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="prod-discount" className="block text-sm font-semibold text-[#142218]">
                  سعر الخصم (ج.م)
                </label>
                <input
                  id="prod-discount"
                  type="number"
                  min="0"
                  step="0.5"
                  dir="ltr"
                  value={form.discountPrice ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discountPrice:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="اختياري"
                  className="w-full h-11 px-3 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm tabular-nums focus:outline-none focus:border-[#0F5E36]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="prod-stock" className="block text-sm font-semibold text-[#142218]">
                  الكمية بالمخزون *
                </label>
                <input
                  id="prod-stock"
                  type="number"
                  min="0"
                  step="1"
                  required
                  dir="ltr"
                  value={form.stock}
                  onChange={(e) =>
                    setForm({ ...form, stock: Number(e.target.value) })
                  }
                  className="w-full h-11 px-3 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm tabular-nums focus:outline-none focus:border-[#0F5E36]"
                />
              </div>
            </div>

            {/* Image Upload & URL */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[#142218]">
                صورة المنتج
              </label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#E2E7E0] bg-[#F1F4F0] shrink-0">
                  <SmartImage
                    src={form.image}
                    alt={form.nameAr || 'Product'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#0F5E36] text-[#0F5E36] hover:bg-[#EEF5EE] text-xs font-semibold cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>{uploading ? 'جاري الرفع...' : 'رفع صورة من جهازك'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleImageUpload}
                      className="sr-only"
                    />
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    placeholder="أو ضع رابط الصورة"
                    className="w-full h-9 px-3 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-xs focus:outline-none focus:border-[#0F5E36]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="prod-desc-ar" className="block text-sm font-semibold text-[#142218]">
                وصف المنتج (بالعربية)
              </label>
              <textarea
                id="prod-desc-ar"
                rows={3}
                value={form.descriptionAr || ''}
                onChange={(e) =>
                  setForm({ ...form, descriptionAr: e.target.value })
                }
                className="w-full p-3 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm focus:outline-none focus:border-[#0F5E36]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="prod-desc-en" className="block text-sm font-semibold text-[#142218]">
                وصف المنتج (بالإنجليزية)
              </label>
              <textarea
                id="prod-desc-en"
                rows={3}
                dir="ltr"
                value={form.descriptionEn || ''}
                onChange={(e) =>
                  setForm({ ...form, descriptionEn: e.target.value })
                }
                className="w-full p-3 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm focus:outline-none focus:border-[#0F5E36]"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6 pt-2 border-t border-[#EEF2ED]">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#142218] cursor-pointer">
              <input
                type="checkbox"
                checked={form.isAvailable ?? true}
                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                className="w-4 h-4 accent-[#0F5E36]"
              />
              <span>متاح للطلب في المتجر</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#142218] cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFeatured ?? false}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                className="w-4 h-4 accent-[#0F5E36]"
              />
              <span>منتج مميز بالرئيسية</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#142218] cursor-pointer">
              <input
                type="checkbox"
                checked={form.isBestSeller ?? false}
                onChange={(e) => setForm({ ...form, isBestSeller: e.target.checked })}
                className="w-4 h-4 accent-[#0F5E36]"
              />
              <span>الأكثر مبيعاً</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#142218] cursor-pointer">
              <input
                type="checkbox"
                checked={form.isNewArrival ?? false}
                onChange={(e) => setForm({ ...form, isNewArrival: e.target.checked })}
                className="w-4 h-4 accent-[#0F5E36]"
              />
              <span>وصل حديثاً</span>
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-6 py-3 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
            >
              {saving
                ? 'جاري الحفظ...'
                : editingProduct
                ? 'حفظ التعديلات'
                : 'حفظ ونشر المنتج'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  const filtered = products.filter((p) => {
    if (filterCat !== 'all' && p.categoryId !== filterCat) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        p.nameAr.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-[#526056] absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الكود..."
              className="w-full h-10 ps-9 pe-3 rounded-lg border border-[#D4DDD1] bg-white text-sm focus:outline-none focus:border-[#0F5E36]"
            />
          </div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="h-10 px-3 rounded-lg border border-[#D4DDD1] bg-white text-sm focus:outline-none focus:border-[#0F5E36]"
          >
            <option value="all">كل الأقسام ({products.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة منتج</span>
        </button>
      </div>

      <div className="bg-white border border-[#E2E7E0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-[#F9FAF8] text-xs text-[#526056] border-b border-[#E2E7E0]">
              <tr>
                <th className="py-3 px-4 text-start font-semibold">المنتج</th>
                <th className="py-3 px-4 text-start font-semibold">القسم</th>
                <th className="py-3 px-4 text-start font-semibold">السعر</th>
                <th className="py-3 px-4 text-start font-semibold">الخصم</th>
                <th className="py-3 px-4 text-start font-semibold">المخزون</th>
                <th className="py-3 px-4 text-start font-semibold">الحالة</th>
                <th className="py-3 px-4 text-start font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2ED]">
              {filtered.map((prod) => {
                const cat = categoryMap.get(prod.categoryId);
                return (
                  <tr key={prod.id} className="hover:bg-[#F9FAF8]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg overflow-hidden border border-[#E2E7E0] bg-[#F1F4F0] shrink-0">
                          <SmartImage
                            src={prod.image}
                            alt={prod.nameAr}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#142218] truncate max-w-[220px]">
                            {prod.nameAr}
                          </p>
                          <p className="text-xs text-[#526056] tabular-nums">
                            {prod.sku} · {prod.unitAr}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#526056]">
                      {cat?.nameAr || prod.categoryId}
                    </td>
                    <td className="py-3 px-4 font-semibold tabular-nums">
                      {formatEGP(prod.price, 'ar')}
                    </td>
                    <td className="py-3 px-4 text-[#B45309] font-semibold tabular-nums">
                      {prod.discountPrice ? formatEGP(prod.discountPrice, 'ar') : '—'}
                    </td>
                    <td className="py-3 px-4 tabular-nums font-semibold">
                      <span
                        className={
                          prod.stock <= 0
                            ? 'text-[#B91C1C]'
                            : prod.stock <= 10
                            ? 'text-[#B45309]'
                            : 'text-[#142218]'
                        }
                      >
                        {prod.stock}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleQuickToggle(prod, 'isAvailable')}
                        className={`text-xs font-semibold px-2.5 py-1 rounded border cursor-pointer ${
                          prod.isAvailable && prod.stock > 0
                            ? 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
                            : 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
                        }`}
                      >
                        {prod.isAvailable && prod.stock > 0 ? 'متوفر' : 'غير متوفر'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(prod)}
                          aria-label={`تعديل ${prod.nameAr}`}
                          className="p-2 rounded-lg border border-[#E2E7E0] hover:border-[#0F5E36] text-[#142218] hover:text-[#0F5E36] cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {confirmDeleteId === prod.id ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(prod.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#B91C1C] text-white text-xs font-semibold cursor-pointer"
                          >
                            تأكيد الحذف
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(prod.id)}
                            aria-label={`حذف ${prod.nameAr}`}
                            className="p-2 rounded-lg border border-[#E2E7E0] hover:border-[#B91C1C] text-[#526056] hover:text-[#B91C1C] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
