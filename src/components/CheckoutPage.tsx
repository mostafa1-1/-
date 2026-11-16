import { useState, type FormEvent } from 'react';
import { Banknote, CheckCircle2 } from 'lucide-react';
import type {
  CartItem,
  CheckoutFormInput,
  Language,
  StoreSettings,
} from '../types/store';
import { NEIGHBORHOOD_SUGGESTIONS } from '../data/catalog';
import { t } from '../data/translations';
import {
  calculateCartTotals,
  formatEGP,
  getEffectivePrice,
  validateCheckoutForm,
  type CheckoutValidationErrors,
} from '../utils/storeLogic';

interface CheckoutPageProps {
  lang: Language;
  items: CartItem[];
  settings: StoreSettings;
  onPlaceOrder: (form: CheckoutFormInput) => Promise<void> | void;
  onBrowseShop: () => void;
  isSubmitting?: boolean;
  serverError?: string | null;
}

export function CheckoutPage({
  lang,
  items,
  settings,
  onPlaceOrder,
  onBrowseShop,
  isSubmitting = false,
  serverError = null,
}: CheckoutPageProps) {
  const copy = t(lang);
  const totals = calculateCartTotals(items, settings);

  const [form, setForm] = useState<CheckoutFormInput>({
    fullName: '',
    phone: '',
    neighborhood: '',
    address: '',
    instructions: '',
    paymentMethod: 'cod',
  });
  const [errors, setErrors] = useState<CheckoutValidationErrors>({});

  if (items.length === 0) {
    return (
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-white border border-[#E2E7E0] rounded-2xl p-10 space-y-4">
          <h1 className="font-display text-2xl font-bold text-[#142218]">
            {copy.cartEmptyTitle}
          </h1>
          <p className="text-sm text-[#526056]">{copy.cartEmptyDesc}</p>
          <button
            type="button"
            onClick={onBrowseShop}
            className="px-6 py-3 rounded-xl bg-[#0F5E36] text-white text-sm font-semibold hover:bg-[#0B4A2A] transition-colors cursor-pointer"
          >
            {copy.continueShopping}
          </button>
        </div>
      </section>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !settings.orderingEnabled) {
      return;
    }
    const validationErrors = validateCheckoutForm(form, lang);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    if (!totals.meetsMinimumOrder) {
      return;
    }
    void onPlaceOrder(form);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <div className="border-b border-[#E2E7E0] pb-5">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142218]">
          {copy.checkoutTitle}
        </h1>
        <p className="text-sm text-[#526056] mt-1">{copy.checkoutSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Customer Delivery Form */}
        <div className="lg:col-span-7 bg-white border border-[#E2E7E0] rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="checkout-name" className="block text-sm font-semibold text-[#142218]">
                {copy.fullNameLabel}
              </label>
              <input
                id="checkout-name"
                type="text"
                required
                value={form.fullName}
                onChange={(e) => {
                  setForm({ ...form, fullName: e.target.value });
                  if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                }}
                placeholder={copy.fullNamePlaceholder}
                className={`w-full h-11 px-3.5 rounded-lg border text-sm bg-[#F9FAF8] focus:outline-none focus:bg-white ${
                  errors.fullName
                    ? 'border-[#B91C1C]'
                    : 'border-[#D4DDD1] focus:border-[#0F5E36]'
                }`}
              />
              {errors.fullName && (
                <p className="text-xs text-[#B91C1C]" role="alert">
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label htmlFor="checkout-phone" className="block text-sm font-semibold text-[#142218]">
                {copy.phoneLabel}
              </label>
              <input
                id="checkout-phone"
                type="tel"
                dir="ltr"
                required
                value={form.phone}
                onChange={(e) => {
                  setForm({ ...form, phone: e.target.value });
                  if (errors.phone) setErrors({ ...errors, phone: undefined });
                }}
                placeholder={copy.phonePlaceholder}
                className={`w-full h-11 px-3.5 rounded-lg border text-sm bg-[#F9FAF8] focus:outline-none focus:bg-white ${
                  errors.phone
                    ? 'border-[#B91C1C]'
                    : 'border-[#D4DDD1] focus:border-[#0F5E36]'
                }`}
              />
              {errors.phone && (
                <p className="text-xs text-[#B91C1C]" role="alert">
                  {errors.phone}
                </p>
              )}
            </div>
          </div>

          {/* Neighborhood */}
          <div className="space-y-1.5">
            <label
              htmlFor="checkout-neighborhood"
              className="block text-sm font-semibold text-[#142218]"
            >
              {copy.neighborhoodLabel}
            </label>
            <input
              id="checkout-neighborhood"
              type="text"
              list="andalus-neighborhoods"
              required
              value={form.neighborhood}
              onChange={(e) => {
                setForm({ ...form, neighborhood: e.target.value });
                if (errors.neighborhood) setErrors({ ...errors, neighborhood: undefined });
              }}
              placeholder={copy.neighborhoodPlaceholder}
              className={`w-full h-11 px-3.5 rounded-lg border text-sm bg-[#F9FAF8] focus:outline-none focus:bg-white ${
                errors.neighborhood
                  ? 'border-[#B91C1C]'
                  : 'border-[#D4DDD1] focus:border-[#0F5E36]'
              }`}
            />
            <datalist id="andalus-neighborhoods">
              {NEIGHBORHOOD_SUGGESTIONS.map((n) => (
                <option key={n.en} value={lang === 'ar' ? n.ar : n.en} />
              ))}
            </datalist>
            {errors.neighborhood && (
              <p className="text-xs text-[#B91C1C]" role="alert">
                {errors.neighborhood}
              </p>
            )}
          </div>

          {/* Detailed Address */}
          <div className="space-y-1.5">
            <label htmlFor="checkout-address" className="block text-sm font-semibold text-[#142218]">
              {copy.addressLabel}
            </label>
            <textarea
              id="checkout-address"
              rows={2}
              required
              value={form.address}
              onChange={(e) => {
                setForm({ ...form, address: e.target.value });
                if (errors.address) setErrors({ ...errors, address: undefined });
              }}
              placeholder={copy.addressPlaceholder}
              className={`w-full p-3.5 rounded-lg border text-sm bg-[#F9FAF8] focus:outline-none focus:bg-white ${
                errors.address
                  ? 'border-[#B91C1C]'
                  : 'border-[#D4DDD1] focus:border-[#0F5E36]'
              }`}
            />
            {errors.address && (
              <p className="text-xs text-[#B91C1C]" role="alert">
                {errors.address}
              </p>
            )}
          </div>

          {/* Delivery Instructions */}
          <div className="space-y-1.5">
            <label
              htmlFor="checkout-instructions"
              className="block text-sm font-semibold text-[#142218]"
            >
              {copy.instructionsLabel}
            </label>
            <input
              id="checkout-instructions"
              type="text"
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder={copy.instructionsPlaceholder}
              className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm focus:outline-none focus:bg-white focus:border-[#0F5E36]"
            />
          </div>

          {/* Payment Method */}
          <div className="pt-2 space-y-2.5">
            <span className="block text-sm font-semibold text-[#142218]">
              {copy.paymentMethodLabel}
            </span>
            <div className="p-4 rounded-xl border border-[#0F5E36] bg-[#EEF5EE] flex items-start gap-3">
              <Banknote className="w-5 h-5 text-[#0F5E36] mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#142218]">{copy.paymentCod}</span>
                  <CheckCircle2 className="w-4 h-4 text-[#0F5E36]" aria-hidden="true" />
                </div>
                <p className="text-xs text-[#3D4B41] mt-1">{copy.paymentCodDesc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary & Submit */}
        <aside className="lg:col-span-5 bg-white border border-[#E2E7E0] rounded-2xl p-6 sm:p-7 space-y-5">
          <h2 className="font-display text-lg font-bold text-[#142218]">{copy.orderSummary}</h2>

          <ul className="divide-y divide-[#EEF2ED] max-h-72 overflow-y-auto">
            {items.map(({ product, quantity }) => {
              const name = lang === 'ar' ? product.nameAr : product.nameEn;
              const unitPrice = getEffectivePrice(product);
              return (
                <li key={product.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-[#142218] truncate">{name}</p>
                    <p className="text-xs text-[#526056] tabular-nums">
                      {quantity} × {formatEGP(unitPrice, lang)}
                    </p>
                  </div>
                  <span className="font-semibold text-[#142218] tabular-nums shrink-0">
                    {formatEGP(unitPrice * quantity, lang)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="pt-3 border-t border-[#E2E7E0] space-y-2 text-sm">
            <div className="flex justify-between text-[#526056]">
              <span>{copy.subtotal}</span>
              <span className="tabular-nums text-[#142218] font-medium">
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
              <span className="tabular-nums text-[#142218] font-medium">
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

          {!settings.orderingEnabled && (
            <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3 py-2.5 rounded-lg" role="alert">
              {lang === 'ar'
                ? `الطلبات الإلكترونية متوقفة مؤقتاً. يمكنك الطلب مباشرة عبر الهاتف ${settings.phone}.`
                : `Online ordering is temporarily paused. Please call ${settings.phone} directly.`}
            </p>
          )}

          {!totals.meetsMinimumOrder && (
            <p className="text-xs text-[#B45309] bg-[#FEF3C7] px-3 py-2.5 rounded-lg">
              {copy.minOrderNotice} {formatEGP(settings.minimumOrderAmount, lang)}
            </p>
          )}

          {serverError && (
            <p className="text-xs text-[#991B1B] bg-[#FEE2E2] px-3 py-2.5 rounded-lg" role="alert">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={!totals.meetsMinimumOrder || !settings.orderingEnabled || isSubmitting}
            className="w-full py-3.5 px-6 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] disabled:bg-[#9EB4A7] text-white text-base font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? lang === 'ar'
                ? 'جاري إرسال الطلب...'
                : 'Submitting order...'
              : copy.placeOrderBtn}
          </button>
        </aside>
      </form>
    </section>
  );
}
