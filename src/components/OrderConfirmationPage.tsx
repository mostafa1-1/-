import { useState } from 'react';
import { Check, CheckCircle2, Copy, MessageCircle, Phone, Printer } from 'lucide-react';
import type { Language, Order, StoreSettings } from '../types/store';
import { t } from '../data/translations';
import {
  formatEGP,
  getPaymentMethodLabel,
  PAYMENT_METHOD_META,
  PAYMENT_TRANSFER_NUMBER,
} from '../utils/storeLogic';
import { buildCustomerWhatsappOrderUrl } from '../utils/notificationLogic';

interface OrderConfirmationPageProps {
  lang: Language;
  order: Order;
  settings: StoreSettings;
  onContinueShopping: () => void;
}

export function OrderConfirmationPage({
  lang,
  order,
  settings,
  onContinueShopping,
}: OrderConfirmationPageProps) {
  const copy = t(lang);
  const [copiedTransfer, setCopiedTransfer] = useState(false);

  const handleCopyTransferNumber = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_TRANSFER_NUMBER);
      setCopiedTransfer(true);
      window.setTimeout(() => setCopiedTransfer(false), 2000);
    } catch {
      setCopiedTransfer(true);
      window.setTimeout(() => setCopiedTransfer(false), 2000);
    }
  };

  const whatsappFollowupUrl = buildCustomerWhatsappOrderUrl(
    settings.whatsappNumber || '+201110688934',
    order,
    settings,
    lang
  );

  const formattedDate = new Date(order.createdAt).toLocaleString(
    lang === 'ar' ? 'ar-EG' : 'en-EG',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  );

  const paymentMeta = PAYMENT_METHOD_META[order.customer.paymentMethod];
  const isDigitalTransfer =
    order.customer.paymentMethod === 'vodafone_cash' ||
    order.customer.paymentMethod === 'instapay';

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="bg-white border border-[#E2E7E0] rounded-2xl p-6 sm:p-10 space-y-8">
        {/* Confirmation Header */}
        <div className="text-center space-y-3 border-b border-[#E2E7E0] pb-6">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#EEF5EE] text-[#0F5E36] flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <p className="text-xs font-bold text-[#0F5E36]">{copy.confirmationBadge}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142218]">
            {copy.confirmationTitle}
          </h1>
          <p className="text-sm text-[#526056]">{copy.confirmationSubtitle}</p>
        </div>

        {/* Order Meta Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F9FAF8] border border-[#E2E7E0] rounded-xl p-4 text-sm">
          <div>
            <span className="text-xs text-[#526056] block">{copy.orderNumberLabel}</span>
            <strong className="text-[#142218] tabular-nums" dir="ltr">
              {order.orderNumber}
            </strong>
          </div>
          <div>
            <span className="text-xs text-[#526056] block">{copy.orderDateLabel}</span>
            <strong className="text-[#142218]">{formattedDate}</strong>
          </div>
          <div>
            <span className="text-xs text-[#526056] block">{copy.orderStatusLabel}</span>
            <strong className="text-[#0F5E36]">{copy.statusPending}</strong>
          </div>
        </div>

        {/* Customer & Payment Info */}
        <div className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <h2 className="font-semibold text-[#142218]">
              {lang === 'ar' ? 'بيانات التوصيل والدفع' : 'Delivery & Payment Details'}
            </h2>
            <p className="text-[#3D4B41]">
              {order.customer.fullName} · <span dir="ltr">{order.customer.phone}</span>
            </p>
            <p className="text-[#526056]">
              {order.customer.neighborhood} — {order.customer.address}
            </p>
            {order.customer.instructions && (
              <p className="text-xs text-[#526056]">{order.customer.instructions}</p>
            )}
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#526056]">
                {copy.paymentMethodLabel}:
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-bold ${paymentMeta.badgeClass}`}
              >
                {getPaymentMethodLabel(order.customer.paymentMethod, lang)}
              </span>
              {order.customer.paymentReference && (
                <span className="text-xs text-[#3D4B41]">
                  ({lang === 'ar' ? 'المرجع:' : 'Ref:'}{' '}
                  <strong dir="ltr">{order.customer.paymentReference}</strong>)
                </span>
              )}
            </div>
          </div>

          {isDigitalTransfer && (
            <div className="rounded-xl border border-[#C9DEC9] bg-[#EEF5EE] p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#0F5E36]">
                  {lang === 'ar'
                    ? `بيانات التحويل (${getPaymentMethodLabel(order.customer.paymentMethod, 'ar')})`
                    : `${getPaymentMethodLabel(order.customer.paymentMethod, 'en')} Transfer Details`}
                </p>
                <p className="text-xs text-[#3D4B41]">
                  {lang === 'ar'
                    ? `حوّل مبلغ ${formatEGP(order.totalAmount, lang)} على رقم `
                    : `Please transfer ${formatEGP(order.totalAmount, lang)} to `}
                  <strong dir="ltr" className="tabular-nums text-[#142218]">
                    {PAYMENT_TRANSFER_NUMBER}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyTransferNumber}
                className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#C9DEC9] hover:border-[#0F5E36] text-xs font-semibold text-[#142218] cursor-pointer"
              >
                {copiedTransfer ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#0F5E36]" aria-hidden="true" />
                    <span className="text-[#0F5E36]">{copy.copiedNumber}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#526056]" aria-hidden="true" />
                    <span>{copy.copyNumber}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Itemized Receipt */}
        <div className="space-y-3">
          <h2 className="font-semibold text-[#142218] text-sm">{copy.orderSummary}</h2>
          <div className="border border-[#E2E7E0] rounded-xl overflow-hidden">
            <ul className="divide-y divide-[#EEF2ED]">
              {order.items.map((item) => (
                <li
                  key={item.productId}
                  className="px-4 py-3 flex items-center justify-between gap-4 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#142218]">
                      {lang === 'ar' ? item.nameAr : item.nameEn}
                    </p>
                    <p className="text-xs text-[#526056] tabular-nums">
                      {item.quantity} × {formatEGP(item.unitPrice, lang)}
                    </p>
                  </div>
                  <span className="font-semibold text-[#142218] tabular-nums shrink-0">
                    {formatEGP(item.lineTotal, lang)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="bg-[#F9FAF8] px-4 py-3 border-t border-[#E2E7E0] space-y-1.5 text-sm">
              <div className="flex justify-between text-[#526056]">
                <span>{copy.subtotal}</span>
                <span className="tabular-nums">{formatEGP(order.subtotal, lang)}</span>
              </div>
              <div className="flex justify-between text-[#526056]">
                <span>{copy.deliveryFee}</span>
                <span className="tabular-nums">
                  {order.deliveryFee === 0
                    ? copy.freeDelivery
                    : formatEGP(order.deliveryFee, lang)}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E2E7E0] flex justify-between font-bold text-base text-[#142218]">
                <span>{copy.grandTotal}</span>
                <span className="tabular-nums text-[#0F5E36]">
                  {formatEGP(order.totalAmount, lang)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="no-print flex flex-wrap items-center gap-3 pt-2">
          <a
            href={whatsappFollowupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-sm font-semibold transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{copy.contactAboutOrderWhatsapp}</span>
          </a>

          <a
            href={`tel:${settings.phone}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#D4DDD1] hover:border-[#0F5E36] text-[#142218] text-sm font-semibold transition-colors tabular-nums"
          >
            <Phone className="w-4 h-4 text-[#0F5E36]" />
            <span>{copy.contactAboutOrderCall}:</span>
            <span dir="ltr">{settings.phone}</span>
          </a>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D4DDD1] hover:bg-[#F1F4F0] text-[#142218] text-sm font-medium transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{copy.printReceipt}</span>
          </button>

          <button
            type="button"
            onClick={onContinueShopping}
            className="ms-auto text-sm font-semibold text-[#0F5E36] hover:underline cursor-pointer"
          >
            {copy.newOrderBtn}
          </button>
        </div>
      </div>
    </section>
  );
}
