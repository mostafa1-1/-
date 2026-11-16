import type {
  CartItem,
  CheckoutFormInput,
  Language,
  PaymentMethod,
  Product,
  ProductFilterOptions,
  StoreSettings,
} from '../types/store.ts';

export const PAYMENT_TRANSFER_NUMBER = '01110688934';

export const PAYMENT_METHOD_META: Record<
  PaymentMethod,
  {
    ar: string;
    en: string;
    badgeClass: string;
    requiresTransfer: boolean;
  }
> = {
  cod: {
    ar: 'الدفع نقداً عند الاستلام',
    en: 'Cash on Delivery',
    badgeClass: 'bg-[#F1F4F0] text-[#142218] border-[#D4DDD1]',
    requiresTransfer: false,
  },
  vodafone_cash: {
    ar: 'فودافون كاش',
    en: 'Vodafone Cash',
    badgeClass: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
    requiresTransfer: true,
  },
  instapay: {
    ar: 'إنستا باي (InstaPay)',
    en: 'InstaPay',
    badgeClass: 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]',
    requiresTransfer: true,
  },
};

export function isValidPaymentMethod(value: unknown): value is PaymentMethod {
  return value === 'cod' || value === 'vodafone_cash' || value === 'instapay';
}

export function getPaymentMethodLabel(method: PaymentMethod, lang: Language): string {
  return PAYMENT_METHOD_META[method]?.[lang] ?? PAYMENT_METHOD_META.cod[lang];
}

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  originalSubtotal: number;
  totalSavings: number;
  deliveryFee: number;
  qualifiesForFreeDelivery: boolean;
  freeDeliveryRemaining: number;
  meetsMinimumOrder: boolean;
  minimumOrderRemaining: number;
  grandTotal: number;
}

export function getEffectivePrice(product: Pick<Product, 'price' | 'discountPrice'>): number {
  if (
    product.discountPrice !== null &&
    product.discountPrice > 0 &&
    product.discountPrice < product.price
  ) {
    return product.discountPrice;
  }
  return product.price;
}

export function calculateDiscountPercent(
  price: number,
  discountPrice: number | null
): number {
  if (discountPrice === null || discountPrice <= 0 || discountPrice >= price || price <= 0) {
    return 0;
  }
  return Math.round(((price - discountPrice) / price) * 100);
}

export function isProductPurchasable(product: Pick<Product, 'isAvailable' | 'stock'>): boolean {
  return product.isAvailable && product.stock > 0;
}

export function formatEGP(amount: number, lang: Language): string {
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString('en-US')
    : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return lang === 'ar' ? `${formatted} ج.م` : `${formatted} EGP`;
}

export function calculateCartTotals(
  items: CartItem[],
  settings: Pick<StoreSettings, 'deliveryFee' | 'freeDeliveryThreshold' | 'minimumOrderAmount'>
): CartTotals {
  let itemCount = 0;
  let subtotal = 0;
  let originalSubtotal = 0;

  for (const item of items) {
    const qty = Math.max(0, Math.floor(item.quantity));
    if (qty === 0) continue;
    const effective = getEffectivePrice(item.product);
    itemCount += qty;
    subtotal += effective * qty;
    originalSubtotal += item.product.price * qty;
  }

  subtotal = Math.round(subtotal * 100) / 100;
  originalSubtotal = Math.round(originalSubtotal * 100) / 100;
  const totalSavings = Math.max(0, Math.round((originalSubtotal - subtotal) * 100) / 100);

  const qualifiesForFreeDelivery =
    subtotal > 0 && subtotal >= settings.freeDeliveryThreshold;
  const deliveryFee =
    subtotal === 0 || qualifiesForFreeDelivery ? 0 : settings.deliveryFee;
  const freeDeliveryRemaining = Math.max(
    0,
    Math.round((settings.freeDeliveryThreshold - subtotal) * 100) / 100
  );

  const meetsMinimumOrder = subtotal >= settings.minimumOrderAmount;
  const minimumOrderRemaining = Math.max(
    0,
    Math.round((settings.minimumOrderAmount - subtotal) * 100) / 100
  );

  const grandTotal = Math.round((subtotal + deliveryFee) * 100) / 100;

  return {
    itemCount,
    subtotal,
    originalSubtotal,
    totalSavings,
    deliveryFee,
    qualifiesForFreeDelivery,
    freeDeliveryRemaining,
    meetsMinimumOrder,
    minimumOrderRemaining,
    grandTotal,
  };
}

export function filterAndSortProducts(
  products: Product[],
  options: ProductFilterOptions = {}
): Product[] {
  const {
    query = '',
    categoryId = null,
    onlyDiscounted = false,
    onlyAvailable = false,
    sortBy = 'featured',
  } = options;

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = products.filter((product) => {
    if (categoryId && product.categoryId !== categoryId) {
      return false;
    }

    if (onlyDiscounted && calculateDiscountPercent(product.price, product.discountPrice) === 0) {
      return false;
    }

    if (onlyAvailable && !isProductPurchasable(product)) {
      return false;
    }

    if (normalizedQuery) {
      const haystack = [
        product.nameAr,
        product.nameEn,
        product.descriptionAr,
        product.descriptionEn,
        product.sku,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === 'price-asc') {
      return getEffectivePrice(a) - getEffectivePrice(b);
    }
    if (sortBy === 'price-desc') {
      return getEffectivePrice(b) - getEffectivePrice(a);
    }
    if (sortBy === 'bestsellers') {
      if (a.isBestSeller !== b.isBestSeller) return a.isBestSeller ? -1 : 1;
      return a.nameEn.localeCompare(b.nameEn);
    }
    if (sortBy === 'newest') {
      if (a.isNewArrival !== b.isNewArrival) return a.isNewArrival ? -1 : 1;
      return b.id.localeCompare(a.id);
    }
    // featured default: available first, featured first, then best sellers
    const aAvail = isProductPurchasable(a) ? 1 : 0;
    const bAvail = isProductPurchasable(b) ? 1 : 0;
    if (aAvail !== bAvail) return bAvail - aAvail;
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    if (a.isBestSeller !== b.isBestSeller) return a.isBestSeller ? -1 : 1;
    return 0;
  });
}

export type CheckoutValidationErrors = Partial<Record<keyof CheckoutFormInput, string>>;

export function validateCheckoutForm(
  input: CheckoutFormInput,
  lang: Language
): CheckoutValidationErrors {
  const errors: CheckoutValidationErrors = {};
  const trimmedName = String(input?.fullName || '').trim();
  const cleanPhone = String(input?.phone || '').replace(/[\s\-()]/g, '');
  const trimmedNeighborhood = String(input?.neighborhood || '').trim();
  const trimmedAddress = String(input?.address || '').trim();

  if (trimmedName.length < 3) {
    errors.fullName =
      lang === 'ar'
        ? 'يرجى إدخال الاسم بالكامل (3 أحرف على الأقل)'
        : 'Please enter your full name (at least 3 characters)';
  }

  // Egyptian mobile format: 010/011/012/015 + 8 digits, or landline/international
  const egyptPhoneRegex = /^(?:\+?20)?0?1[0125][0-9]{8}$/;
  if (!cleanPhone) {
    errors.phone =
      lang === 'ar' ? 'يرجى إدخال رقم الهاتف للتواصل' : 'Please enter your phone number';
  } else if (!egyptPhoneRegex.test(cleanPhone) && !/^[0-9]{8,14}$/.test(cleanPhone)) {
    errors.phone =
      lang === 'ar'
        ? 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01110688934)'
        : 'Please enter a valid Egyptian phone number (e.g. 01110688934)';
  }

  if (trimmedNeighborhood.length < 2) {
    errors.neighborhood =
      lang === 'ar' ? 'يرجى تحديد المنطقة أو الحي' : 'Please enter your neighborhood or area';
  }

  if (trimmedAddress.length < 8) {
    errors.address =
      lang === 'ar'
        ? 'يرجى إدخال العنوان بالتفصيل (الشارع، رقم العمارة، الدور)'
        : 'Please enter a detailed delivery address (street, building, floor)';
  }

  if (!isValidPaymentMethod(input.paymentMethod)) {
    errors.paymentMethod =
      lang === 'ar'
        ? 'يرجى اختيار طريقة دفع صحيحة'
        : 'Please select a valid payment method';
  }

  const trimmedRef = (input.paymentReference || '').trim();
  if (trimmedRef.length > 80) {
    errors.paymentReference =
      lang === 'ar'
        ? 'مرجع التحويل طويل جداً (الحد الأقصى 80 حرفاً)'
        : 'Transfer reference is too long (max 80 characters)';
  }

  return errors;
}

export function generateOrderNumber(now: Date = new Date()): string {
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `AND-${y}${m}${d}-${rand}`;
}
