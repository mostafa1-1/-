import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { CartItem, Language, StoreSettings } from '../types/store';
import { t } from '../data/translations';
import { calculateCartTotals, formatEGP, getEffectivePrice } from '../utils/storeLogic';
import { SmartImage } from './SmartImage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  items: CartItem[];
  settings: StoreSettings;
  onUpdateQty: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onViewCartPage: () => void;
  onProceedToCheckout: () => void;
  onBrowseShop: () => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  lang,
  items,
  settings,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onViewCartPage,
  onProceedToCheckout,
  onBrowseShop,
}: CartDrawerProps) {
  if (!isOpen) return null;

  const copy = t(lang);
  const totals = calculateCartTotals(items, settings);
  const progressPercent = Math.min(
    100,
    Math.round((totals.subtotal / settings.freeDeliveryThreshold) * 100)
  );
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={copy.cartTitle}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#142218]/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-s border-[#E2E7E0]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E7E0] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#0F5E36]" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-[#142218]">
              {copy.cartTitle}{' '}
              <span className="text-sm font-medium text-[#526056] tabular-nums">
                ({totals.itemCount})
              </span>
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ar' ? 'إغلاق السلة' : 'Close cart'}
            className="w-10 h-10 rounded-lg inline-flex items-center justify-center text-[#526056] hover:bg-[#F1F4F0] hover:text-[#142218] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free delivery progress */}
        {items.length > 0 && (
          <div className="px-5 py-3 bg-[#F4F7F3] border-b border-[#E2E7E0]">
            <p className="text-xs font-medium text-[#142218] mb-2">
              {totals.qualifiesForFreeDelivery ? (
                <span className="text-[#0F5E36] font-semibold">{copy.freeDeliveryUnlocked}</span>
              ) : (
                <>
                  {copy.freeDeliveryProgress}{' '}
                  <strong className="text-[#0F5E36] tabular-nums">
                    {formatEGP(totals.freeDeliveryRemaining, lang)}
                  </strong>{' '}
                  {copy.freeDeliveryProgressEnd}
                </>
              )}
            </p>
            <div className="h-1.5 w-full bg-[#DCE4DA] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0F5E36] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-[#F1F4F0] flex items-center justify-center text-[#526056] mb-4">
                <ShoppingBag className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#142218] mb-2">
                {copy.cartEmptyTitle}
              </h3>
              <p className="text-sm text-[#526056] mb-6 max-w-xs">{copy.cartEmptyDesc}</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBrowseShop();
                }}
                className="px-5 py-2.5 rounded-lg bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {copy.continueShopping}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#EEF2ED]">
              {items.map(({ product, quantity }) => {
                const name = lang === 'ar' ? product.nameAr : product.nameEn;
                const unit = lang === 'ar' ? product.unitAr : product.unitEn;
                const unitPrice = getEffectivePrice(product);
                return (
                  <li key={product.id} className="py-4 flex gap-3.5 items-start">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#F1F4F0] shrink-0 border border-[#E2E7E0]">
                      <SmartImage
                        src={product.image}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[#142218] leading-snug line-clamp-2">
                        {name}
                      </h4>
                      <p className="text-xs text-[#526056] mt-0.5 tabular-nums">
                        {unit} · {formatEGP(unitPrice, lang)}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center border border-[#D7DFD4] rounded-lg bg-[#F9FAF8] h-8">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(product.id, quantity - 1)}
                            aria-label={
                              lang === 'ar' ? `تقليل كمية ${name}` : `Decrease ${name}`
                            }
                            className="w-7 h-full inline-flex items-center justify-center text-[#3D4B41] hover:text-[#142218] cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-semibold tabular-nums">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            disabled={quantity >= product.stock}
                            onClick={() => onUpdateQty(product.id, quantity + 1)}
                            aria-label={
                              lang === 'ar' ? `زيادة كمية ${name}` : `Increase ${name}`
                            }
                            className="w-7 h-full inline-flex items-center justify-center text-[#3D4B41] hover:text-[#142218] disabled:opacity-40 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#142218] tabular-nums">
                            {formatEGP(unitPrice * quantity, lang)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(product.id)}
                            aria-label={`${copy.removeItem} ${name}`}
                            className="p-1.5 text-[#728075] hover:text-[#B91C1C] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#E2E7E0] bg-[#F9FAF8] px-5 py-4 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#526056]">
                <span>{copy.subtotal}</span>
                <span className="tabular-nums font-medium text-[#142218]">
                  {formatEGP(totals.subtotal, lang)}
                </span>
              </div>
              {totals.totalSavings > 0 && (
                <div className="flex justify-between text-[#B45309]">
                  <span>{copy.youSaved}</span>
                  <span className="tabular-nums font-medium">
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
              <div className="pt-2 border-t border-[#E2E7E0] flex justify-between text-base font-bold text-[#142218]">
                <span>{copy.grandTotal}</span>
                <span className="tabular-nums text-[#0F5E36]">
                  {formatEGP(totals.grandTotal, lang)}
                </span>
              </div>
            </div>

            {!totals.meetsMinimumOrder && (
              <p className="text-xs text-[#B45309] bg-[#FEF3C7] px-3 py-2 rounded-lg">
                {copy.minOrderNotice} {formatEGP(settings.minimumOrderAmount, lang)}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={!totals.meetsMinimumOrder}
                onClick={() => {
                  onClose();
                  onProceedToCheckout();
                }}
                className="w-full py-3 px-4 rounded-lg bg-[#0F5E36] hover:bg-[#0B4A2A] disabled:bg-[#9EB4A7] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <span>{copy.proceedToCheckout}</span>
                <ArrowIcon className="w-4 h-4" aria-hidden="true" />
              </button>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewCartPage();
                  }}
                  className="text-xs font-semibold text-[#0F5E36] hover:underline py-1 cursor-pointer"
                >
                  {copy.viewFullCart}
                </button>
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-xs font-medium text-[#728075] hover:text-[#B91C1C] py-1 cursor-pointer"
                >
                  {copy.clearCart}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
