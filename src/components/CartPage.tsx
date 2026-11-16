import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import type { CartItem, Language, StoreSettings } from '../types/store';
import { t } from '../data/translations';
import { calculateCartTotals, formatEGP, getEffectivePrice } from '../utils/storeLogic';
import { SmartImage } from './SmartImage';

interface CartPageProps {
  lang: Language;
  items: CartItem[];
  settings: StoreSettings;
  onUpdateQty: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  onBrowseShop: () => void;
}

export function CartPage({
  lang,
  items,
  settings,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  onBrowseShop,
}: CartPageProps) {
  const copy = t(lang);
  const totals = calculateCartTotals(items, settings);
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  if (items.length === 0) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-white border border-[#E2E7E0] rounded-2xl p-10 sm:p-14 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#F1F4F0] text-[#526056] flex items-center justify-center">
            <ShoppingBag className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#142218]">
            {copy.cartEmptyTitle}
          </h1>
          <p className="text-sm text-[#526056] max-w-md mx-auto">{copy.cartEmptyDesc}</p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onBrowseShop}
              className="px-6 py-3 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {copy.continueShopping}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E7E0] pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142218]">
            {copy.cartTitle}
          </h1>
          <p className="text-sm text-[#526056] mt-1 tabular-nums">
            {totals.itemCount} {copy.productsCountSuffix}
          </p>
        </div>

        <button
          type="button"
          onClick={onClearCart}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E2E7E0] bg-white hover:border-[#B91C1C] hover:text-[#B91C1C] text-xs sm:text-sm font-medium text-[#526056] transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          <span>{copy.clearCart}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items */}
        <div className="lg:col-span-8 bg-white border border-[#E2E7E0] rounded-2xl divide-y divide-[#EEF2ED]">
          {items.map(({ product, quantity }) => {
            const name = lang === 'ar' ? product.nameAr : product.nameEn;
            const unit = lang === 'ar' ? product.unitAr : product.unitEn;
            const unitPrice = getEffectivePrice(product);
            return (
              <div
                key={product.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F1F4F0] border border-[#E2E7E0] shrink-0">
                    <SmartImage
                      src={product.image}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-[#142218] truncate">{name}</h2>
                    <p className="text-xs text-[#526056] mt-1 tabular-nums">
                      {unit} · {formatEGP(unitPrice, lang)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="inline-flex items-center border border-[#D4DDD1] rounded-lg bg-[#F9FAF8] h-10">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(product.id, quantity - 1)}
                      aria-label={lang === 'ar' ? `تقليل ${name}` : `Decrease ${name}`}
                      className="w-9 h-full inline-flex items-center justify-center text-[#3D4B41] hover:text-[#142218] cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-9 text-center text-sm font-semibold tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={quantity >= product.stock}
                      onClick={() => onUpdateQty(product.id, quantity + 1)}
                      aria-label={lang === 'ar' ? `زيادة ${name}` : `Increase ${name}`}
                      className="w-9 h-full inline-flex items-center justify-center text-[#3D4B41] hover:text-[#142218] disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-base font-bold text-[#142218] tabular-nums min-w-[90px] text-end">
                    {formatEGP(unitPrice * quantity, lang)}
                  </span>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(product.id)}
                    aria-label={`${copy.removeItem} ${name}`}
                    className="p-2 text-[#728075] hover:text-[#B91C1C] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Panel */}
        <aside className="lg:col-span-4 bg-white border border-[#E2E7E0] rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-[#142218]">{copy.orderSummary}</h2>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-[#526056]">
              <span>{copy.subtotal}</span>
              <span className="tabular-nums font-medium text-[#142218]">
                {formatEGP(totals.subtotal, lang)}
              </span>
            </div>
            {totals.totalSavings > 0 && (
              <div className="flex justify-between text-[#B45309]">
                <span>{copy.youSaved}</span>
                <span className="tabular-nums font-semibold">
                  {formatEGP(totals.totalSavings, lang)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[#526056]">
              <span>{copy.deliveryFee}</span>
              <span className="tabular-nums font-medium text-[#142218]">
                {totals.deliveryFee === 0
                  ? copy.freeDelivery
                  : formatEGP(totals.deliveryFee, lang)}
              </span>
            </div>
            <div className="pt-3 border-t border-[#E2E7E0] flex justify-between text-base font-bold text-[#142218]">
              <span>{copy.grandTotal}</span>
              <span className="tabular-nums text-[#0F5E36]">
                {formatEGP(totals.grandTotal, lang)}
              </span>
            </div>
          </div>

          {!totals.meetsMinimumOrder && (
            <p className="text-xs text-[#B45309] bg-[#FEF3C7] px-3 py-2.5 rounded-lg">
              {copy.minOrderNotice} {formatEGP(settings.minimumOrderAmount, lang)}
            </p>
          )}

          <button
            type="button"
            disabled={!totals.meetsMinimumOrder}
            onClick={onProceedToCheckout}
            className="w-full py-3.5 px-5 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] disabled:bg-[#9EB4A7] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{copy.proceedToCheckout}</span>
            <ArrowIcon className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onBrowseShop}
            className="w-full py-2.5 px-4 rounded-xl border border-[#D4DDD1] hover:bg-[#F1F4F0] text-sm font-semibold text-[#142218] transition-colors cursor-pointer"
          >
            {copy.continueShopping}
          </button>
        </aside>
      </div>
    </section>
  );
}
