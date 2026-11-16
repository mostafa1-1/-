import { useState } from 'react';
import { Check, Minus, Plus, ShoppingCart } from 'lucide-react';
import type { Category, Language, Product } from '../types/store';
import { t } from '../data/translations';
import {
  calculateDiscountPercent,
  formatEGP,
  getEffectivePrice,
  isProductPurchasable,
} from '../utils/storeLogic';
import { SmartImage } from './SmartImage';

interface ProductCardProps {
  product: Product;
  category?: Category;
  lang: Language;
  onAddToCart: (product: Product, quantity: number) => void;
  onOpenProduct: (productId: string) => void;
}

export function ProductCard({
  product,
  category,
  lang,
  onAddToCart,
  onOpenProduct,
}: ProductCardProps) {
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const copy = t(lang);

  const purchasable = isProductPurchasable(product);
  const discountPercent = calculateDiscountPercent(product.price, product.discountPrice);
  const effectivePrice = getEffectivePrice(product);
  const title = lang === 'ar' ? product.nameAr : product.nameEn;
  const unit = lang === 'ar' ? product.unitAr : product.unitEn;
  const catName = category
    ? lang === 'ar'
      ? category.nameAr
      : category.nameEn
    : '';

  const handleAdd = () => {
    if (!purchasable) return;
    onAddToCart(product, qty);
    setJustAdded(true);
    setQty(1);
    window.setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <article
      data-testid={`product-card-${product.id}`}
      className="group bg-white border border-[#E2E7E0] rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Product Photography (4:3 uniform aspect ratio) */}
      <button
        type="button"
        onClick={() => onOpenProduct(product.id)}
        aria-label={title}
        className="relative aspect-[4/3] w-full bg-[#F1F4F0] overflow-hidden cursor-pointer block text-start"
      >
        <SmartImage
          src={product.image}
          alt={title}
          fallbackLabel={title}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
            !purchasable ? 'opacity-60 grayscale-[30%]' : ''
          }`}
        />

        {/* Maximum 1 subtle tag on image */}
        {discountPercent > 0 && purchasable ? (
          <span className="absolute top-3 start-3 bg-[#B45309] text-white text-xs font-semibold px-2.5 py-1 rounded tabular-nums">
            {copy.savePercentPrefix} {discountPercent}%
          </span>
        ) : !purchasable ? (
          <span className="absolute top-3 start-3 bg-[#142218]/85 text-white text-xs font-medium px-2.5 py-1 rounded">
            {copy.outOfStock}
          </span>
        ) : null}
      </button>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Clean unboxed metadata with typographic separator */}
        <div className="flex items-center gap-1.5 text-xs text-[#526056] truncate">
          {catName && <span className="truncate">{catName}</span>}
          {catName && <span aria-hidden="true">·</span>}
          <span className="shrink-0">{unit}</span>
        </div>

        {/* Product Title */}
        <h3 className="text-base font-semibold text-[#142218] leading-snug line-clamp-2 min-h-[2.75rem]">
          <button
            type="button"
            onClick={() => onOpenProduct(product.id)}
            className="text-start hover:text-[#0F5E36] transition-colors cursor-pointer"
          >
            {title}
          </button>
        </h3>

        {/* Price Row */}
        <div className="mt-auto pt-1 flex items-baseline gap-2.5">
          <span className="text-lg font-bold text-[#0F5E36] tabular-nums">
            {formatEGP(effectivePrice, lang)}
          </span>
          {discountPercent > 0 && (
            <span className="text-xs text-[#728075] line-through tabular-nums">
              {formatEGP(product.price, lang)}
            </span>
          )}
        </div>

        {/* Quantity Selector + Add to Cart */}
        <div className="pt-2 border-t border-[#EEF2ED] flex items-center gap-2">
          <div className="inline-flex items-center border border-[#D7DFD4] rounded-lg bg-[#F9FAF8] h-10 shrink-0">
            <button
              type="button"
              disabled={!purchasable || qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label={lang === 'ar' ? `تقليل كمية ${title}` : `Decrease ${title} quantity`}
              className="w-8 h-full inline-flex items-center justify-center text-[#3D4B41] hover:text-[#142218] disabled:opacity-40 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-7 text-center text-sm font-semibold tabular-nums text-[#142218]">
              {qty}
            </span>
            <button
              type="button"
              disabled={!purchasable || qty >= product.stock}
              onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
              aria-label={lang === 'ar' ? `زيادة كمية ${title}` : `Increase ${title} quantity`}
              className="w-8 h-full inline-flex items-center justify-center text-[#3D4B41] hover:text-[#142218] disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            disabled={!purchasable}
            onClick={handleAdd}
            className={`flex-1 h-10 px-3 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              !purchasable
                ? 'bg-[#EEF2ED] text-[#728075] cursor-not-allowed'
                : justAdded
                ? 'bg-[#142218] text-white'
                : 'bg-[#0F5E36] hover:bg-[#0B4A2A] text-white'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>{copy.addedFeedback}</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                <span>{purchasable ? copy.addToCart : copy.outOfStock}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
