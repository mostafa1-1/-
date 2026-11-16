import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import type { Category, Product } from '../../types/store';
import { adminApi } from '../../utils/adminApi';
import { validateCategoryPayload } from '../../utils/adminLogic';
import { SmartImage } from '../SmartImage';

interface AdminCategoriesSectionProps {
  categories: Category[];
  products: Product[];
  onRefresh: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

export function AdminCategoriesSection({
  categories,
  products,
  onRefresh,
  onNotify,
}: AdminCategoriesSectionProps) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [image, setImage] = useState(
    '/src/assets/images/prod_fruits_vegetables_1794823232575.jpg'
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setNameAr('');
    setNameEn('');
    setDescriptionAr('');
    setDescriptionEn('');
    setImage('/src/assets/images/prod_fruits_vegetables_1794823232575.jpg');
    setIsCreating(true);
  };

  const openEdit = (cat: Category) => {
    setIsCreating(false);
    setEditing(cat);
    setNameAr(cat.nameAr);
    setNameEn(cat.nameEn);
    setDescriptionAr(cat.descriptionAr);
    setDescriptionEn(cat.descriptionEn);
    setImage(cat.image);
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await adminApi.uploadImageFile(file);
      setImage(res.url);
      onNotify('تم رفع صورة القسم');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'فشل رفع الصورة', true);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateCategoryPayload({ nameAr, nameEn });
    if (err) {
      onNotify(err, true);
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateCategory(editing.id, {
          nameAr,
          nameEn,
          descriptionAr,
          descriptionEn,
          image,
        });
        onNotify('تم تحديث القسم بنجاح');
        setEditing(null);
      } else {
        await adminApi.createCategory({
          nameAr,
          nameEn,
          descriptionAr,
          descriptionEn,
          image,
        });
        onNotify('تمت إضافة القسم الجديد');
        setIsCreating(false);
      }
      await onRefresh();
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : 'تعذر حفظ القسم',
        true
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    try {
      await adminApi.deleteCategory(cat.id);
      await onRefresh();
      onNotify(`تم حذف قسم "${cat.nameAr}"`);
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : 'تعذر حذف القسم',
        true
      );
    }
  };

  const showForm = isCreating || editing !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-[#142218]">
            إدارة الأقسام ({categories.length})
          </h2>
          <p className="text-xs text-[#526056] mt-0.5">
            أضف أو عدّل أقسام السوبر ماركت وصورها لتظهر مباشرة في شريط التصفح
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-sm font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة قسم جديد</span>
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#E2E7E0] rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#EEF2ED] pb-3">
            <h3 className="font-display text-base font-bold text-[#142218]">
              {editing ? `تعديل قسم: ${editing.nameAr}` : 'إضافة قسم جديد'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setIsCreating(false);
              }}
              className="p-1.5 text-[#526056] hover:text-[#142218] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="cat-name-ar" className="block text-sm font-semibold">
                اسم القسم (عربي) *
              </label>
              <input
                id="cat-name-ar"
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cat-name-en" className="block text-sm font-semibold">
                اسم القسم (إنجليزي)
              </label>
              <input
                id="cat-name-en"
                type="text"
                dir="ltr"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cat-desc-ar" className="block text-sm font-semibold">
                وصف مختصر (عربي)
              </label>
              <input
                id="cat-desc-ar"
                type="text"
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold">صورة القسم</label>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg overflow-hidden border border-[#E2E7E0] shrink-0">
                  <SmartImage src={image} alt={nameAr} className="w-full h-full object-cover" />
                </div>
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#0F5E36] text-[#0F5E36] text-xs font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'جاري الرفع...' : 'رفع صورة'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || uploading}
            className="px-5 py-2.5 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-sm font-bold cursor-pointer"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ القسم'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const count = products.filter((p) => p.categoryId === cat.id).length;
          return (
            <div
              key={cat.id}
              className="bg-white border border-[#E2E7E0] rounded-xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/9] bg-[#F1F4F0]">
                <SmartImage
                  src={cat.image}
                  alt={cat.nameAr}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-[#142218]">{cat.nameAr}</h3>
                    <span className="text-xs text-[#526056] tabular-nums">
                      {count} منتج
                    </span>
                  </div>
                  <p className="text-xs text-[#526056] mt-1">{cat.nameEn}</p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#EEF2ED]">
                  <button
                    type="button"
                    onClick={() => openEdit(cat)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#E2E7E0] hover:border-[#0F5E36] text-xs font-semibold text-[#142218] cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E7E0] hover:border-[#B91C1C] text-xs font-semibold text-[#526056] hover:text-[#B91C1C] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
