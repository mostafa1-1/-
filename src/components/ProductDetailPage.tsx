import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  ShoppingCart,
} from 'lucide-react';
import type { Category, Language, Product, StoreSettings } from '../types/store';
import { t } from '../data/translations';
import {
  buildProductShareData,
  calculateDiscountPercent,
  formatEGP,
  getEffectivePrice,
  isProductPurchasable,
} from '../utils/storeLogic';
import { ProductCard } from './ProductCard';
import { SmartImage } from './SmartImage';

interface ProductDetailPageProps {
  product: Product;
  category?: Category;
  relatedProducts: Product[];
  categories: Category[];
  lang: Language;
  settings: StoreSettings;
  onAddToCart: (product: Product, quantity: number) => void;
  onOpenProduct: (productId: string) => void;
  onBackToShop: () => void;
}

export function ProductDetailPage({
  product,
  category,
  relatedProducts,
  categories,
  lang,
  settings,
  onAddToCart,
  onOpenProduct,
  onBackToShop,
}: ProductDetailPageProps) {
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [shareFallbackOpen, setShareFallbackOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<'shared' | 'copied' | null>(null);
  const copy = t(lang);
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  const title = lang === 'ar' ? product.nameAr : product.nameEn;
  const desc = lang === 'ar' ? product.descriptionAr : product.descriptionEn;
  const unit = lang === 'ar' ? product.unitAr : product.unitEn;
  const catName = category ? (lang === 'ar' ? category.nameAr : category.nameEn) : '';
  const purchasable = isProductPurchasable(product);
  const effectivePrice = getEffectivePrice(product);
  const discountPercent = calculateDiscountPercent(product.price, product.discountPrice);
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const whatsappInquiryUrl = `${settings.whatsappUrl}?text=${encodeURIComponent(
    lang === 'ar'
      ? `أهلاً سوبر ماركت الأندلس، عاوز أسأل عن: ${product.nameAr}`
      : `Hello Al Andalus Supermarket, I would like to inquire about: ${product.nameEn}`
  )}`;

  const currentUrlOrOrigin =
    typeof window !== 'undefined' ? window.location.href || window.location.origin : '';
  const shareData = buildProductShareData(product, lang, currentUrlOrOrigin);

  const handleAdd = () => {
    if (!purchasable) return;
    onAddToCart(product, qty);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  };

  const handleShareClick = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url: shareData.url,
        });
        setShareStatus('shared');
        window.setTimeout(() => setShareStatus((prev) => (prev === 'shared' ? null : prev)), 2000);
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Non-abort error (e.g. blocked/unsupported in desktop context): reveal WhatsApp + Copy fallback
      }
    }
    setShareFallbackOpen((prev) => !prev);
  };

  const handleCopyLink = async () => {
    let copied = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const tempInput = document.createElement('textarea');
        tempInput.value = shareData.url;
        tempInput.setAttribute('readonly', '');
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        document.body.appendChild(tempInput);
        tempInput.select();
        copied = document.execCommand('copy');
        document.body.removeChild(tempInput);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setShareStatus('copied');
      window.setTimeout(() => setShareStatus((prev) => (prev === 'copied' ? null : prev)), 2000);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-12">
      <div>
        <button
          type="button"
          onClick={onBackToShop}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#526056] hover:text-[#0F5E36] transition-colors cursor-pointer"
        >
          <BackIcon className="w-4 h-4" aria-hidden="true" />
          <span>{copy.backToShop}</span>
        </button>
      </div>

      {/* Contiguous Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Product Image */}
        <div className="lg:col-span-6 bg-white border border-[#E2E7E0] rounded-2xl overflow-hidden">
          <div className="aspect-[4/3] w-full bg-[#F1F4F0] relative">
            <SmartImage
              src={product.image}
              alt={title}
              fallbackLabel={title}
              className="w-full h-full object-cover"
            />
            {discountPercent > 0 && purchasable && (
              <span className="absolute top-4 start-4 bg-[#B45309] text-white text-xs font-bold px-3 py-1.5 rounded-lg tabular-nums">
                {copy.savePercentPrefix} {discountPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Sticky Purchase Details */}
        <div className="lg:col-span-6 bg-white border border-[#E2E7E0] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-[#526056]">
              {catName && <span>{catName}</span>}
              {catName && <span aria-hidden="true">·</span>}
              <span>{unit}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{product.sku}</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142218] text-balance">
              {title}
            </h1>

            <p className="text-sm sm:text-base text-[#4A584E] leading-relaxed pt-1">{desc}</p>
          </div>

          {/* Price */}
          <div className="py-4 border-y border-[#EEF2ED] flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-[#0F5E36] tabular-nums">
              {formatEGP(effectivePrice, lang)}
            </span>
            {discountPercent > 0 && (
              <span className="text-base text-[#728075] line-through tabular-nums">
                {formatEGP(product.price, lang)}
              </span>
            )}
          </div>

          {/* Availability */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-[#526056] block">{copy.unitLabel}</span>
              <span className="font-semibold text-[#142218]">{unit}</span>
            </div>
            <div>
              <span className="text-xs text-[#526056] block">{copy.availabilityLabel}</span>
              <span
                className={`font-semibold ${
                  purchasable ? 'text-[#0F5E36]' : 'text-[#B91C1C]'
                }`}
              >
                {purchasable
                  ? `${copy.inStock} (${product.stock} ${copy.availableQty})`
                  : copy.outOfStock}
              </span>
            </div>
          </div>

          {/* Quantity & Add to Cart */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="inline-flex items-center justify-between border border-[#D4DDD1] rounded-xl bg-[#F9FAF8] h-12 px-2 sm:w-36">
              <button
                type="button"
                disabled={!purchasable || qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label={lang === 'ar' ? 'تقليل الكمية' : 'Decrease quantity'}
                className="w-9 h-9 inline-flex items-center justify-center text-[#3D4B41] hover:text-[#142218] disabled:opacity-40 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-base font-bold tabular-nums text-[#142218]">{qty}</span>
              <button
                type="button"
                disabled={!purchasable || qty >= product.stock}
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                aria-label={lang === 'ar' ? 'زيادة الكمية' : 'Increase quantity'}
                className="w-9 h-9 inline-flex items-center justify-center text-[#3D4B41] hover:text-[#142218] disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={!purchasable}
              onClick={handleAdd}
              className={`flex-1 h-12 px-6 rounded-xl text-base font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                !purchasable
                  ? 'bg-[#EEF2ED] text-[#728075] cursor-not-allowed'
                  : justAdded
                  ? 'bg-[#142218] text-white'
                  : 'bg-[#0F5E36] hover:bg-[#0B4A2A] text-white'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-5 h-5" aria-hidden="true" />
                  <span>{copy.addedFeedback}</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" aria-hidden="true" />
                  <span>{purchasable ? copy.addToCart : copy.outOfStock}</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleShareClick}
                aria-expanded={shareFallbackOpen}
                data-testid="share-product-btn"
                className="w-full h-11 px-4 rounded-xl border border-[#0F5E36]/30 bg-[#EEF5EE] hover:bg-[#E1EFE1] hover:border-[#0F5E36] text-[#0F5E36] text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {shareStatus === 'shared' ? (
                  <>
                    <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{copy.sharedFeedback}</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{copy.shareProduct}</span>
                  </>
                )}
              </button>

              <a
                href={shareData.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="share-whatsapp-btn"
                className="w-full h-11 px-4 rounded-xl border border-[#0F5E36]/30 bg-white hover:bg-[#EEF5EE] hover:border-[#0F5E36] text-[#0F5E36] text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{copy.shareViaWhatsapp}</span>
              </a>
            </div>

            {shareFallbackOpen && (
              <div
                data-testid="share-fallback-panel"
                className="p-3 rounded-xl bg-[#F9FAF8] border border-[#DCE5DA] flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <input
                  type="text"
                  readOnly
                  dir="ltr"
                  aria-label={copy.copyProductLink}
                  value={shareData.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 text-xs text-[#4A584E] px-2 py-1.5 bg-white border border-[#E2E7E0] rounded-lg focus:outline-none focus:border-[#0F5E36]"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  data-testid="copy-share-link-btn"
                  className="h-9 px-3.5 rounded-lg bg-[#142218] hover:bg-[#0F5E36] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                >
                  {shareStatus === 'copied' ? (
                    <>
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{copy.linkCopied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{copy.copyProductLink}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <a
              href={whatsappInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 px-4 rounded-xl border border-[#D4DDD1] hover:border-[#0F5E36] text-[#142218] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-[#0F5E36] shrink-0" aria-hidden="true" />
              <span>{copy.askOnWhatsapp}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="space-y-6 pt-4 border-t border-[#E2E7E0]">
          <h2 className="font-display text-2xl font-bold text-[#142218]">
            {copy.relatedProducts}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard
                key={rel.id}
                product={rel}
                category={categoryMap.get(rel.categoryId)}
                lang={lang}
                onAddToCart={onAddToCart}
                onOpenProduct={onOpenProduct}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
