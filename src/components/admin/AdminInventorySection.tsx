import { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import type { Product } from '../../types/store';
import { adminApi } from '../../utils/adminApi';

interface AdminInventorySectionProps {
  products: Product[];
  onRefresh: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

export function AdminInventorySection({
  products,
  onRefresh,
  onNotify,
}: AdminInventorySectionProps) {
  const [draftStock, setDraftStock] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const sorted = [...products].sort((a, b) => a.stock - b.stock);

  const handleSaveStock = async (product: Product, newStock: number) => {
    const cleanStock = Math.max(0, Math.floor(newStock));
    setSavingId(product.id);
    try {
      await adminApi.updateProduct(product.id, {
        stock: cleanStock,
        isAvailable: cleanStock > 0,
      });
      await onRefresh();
      onNotify(`تم تحديث مخزون "${product.nameAr}" إلى ${cleanStock}`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذر تحديث المخزون', true);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-4 flex items-center gap-3 text-sm text-[#92400E]">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span>
          يتم إيقاف طلب أي منتج تلقائياً في المتجر عندما تصل كميته إلى <strong>0</strong>، وعند
          زيادة المخزون يعود متاحاً للعملاء فوراً.
        </span>
      </div>

      <div className="bg-white border border-[#E2E7E0] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-[#F9FAF8] text-xs text-[#526056] border-b border-[#E2E7E0]">
              <tr>
                <th className="py-3 px-4 text-start font-semibold">المنتج</th>
                <th className="py-3 px-4 text-start font-semibold">الكمية الحالية</th>
                <th className="py-3 px-4 text-start font-semibold">تحديث الكمية</th>
                <th className="py-3 px-4 text-start font-semibold">الحالة بالموقع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2ED]">
              {sorted.map((prod) => {
                const value = draftStock[prod.id] ?? prod.stock;
                return (
                  <tr key={prod.id} className="hover:bg-[#F9FAF8]">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#142218]">{prod.nameAr}</p>
                      <p className="text-xs text-[#526056] tabular-nums">{prod.sku}</p>
                    </td>
                    <td className="py-3 px-4 font-bold tabular-nums">
                      <span
                        className={
                          prod.stock <= 0
                            ? 'text-[#B91C1C]'
                            : prod.stock <= 10
                            ? 'text-[#B45309]'
                            : 'text-[#0F5E36]'
                        }
                      >
                        {prod.stock}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          dir="ltr"
                          value={value}
                          onChange={(e) =>
                            setDraftStock((prev) => ({
                              ...prev,
                              [prod.id]: Number(e.target.value),
                            }))
                          }
                          aria-label={`مخزون ${prod.nameAr}`}
                          className="w-24 h-9 px-2.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm tabular-nums"
                        />
                        <button
                          type="button"
                          disabled={savingId === prod.id}
                          onClick={() => handleSaveStock(prod, value)}
                          className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-xs font-semibold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>حفظ</span>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded border ${
                          prod.isAvailable && prod.stock > 0
                            ? 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
                            : 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
                        }`}
                      >
                        {prod.isAvailable && prod.stock > 0 ? 'متاح للطلب' : 'مغلق (نفذ)'}
                      </span>
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
