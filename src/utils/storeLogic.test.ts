import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCartTotals,
  calculateDiscountPercent,
  filterAndSortProducts,
  formatEGP,
  generateOrderNumber,
  getEffectivePrice,
  getPaymentMethodLabel,
  isValidPaymentMethod,
  PAYMENT_TRANSFER_NUMBER,
  validateCheckoutForm,
} from './storeLogic';
import type { PaymentMethod, Product, StoreSettings } from '../types/store';

const sampleSettings: StoreSettings = {
  nameAr: 'سوبر ماركت الأندلس',
  nameEn: 'Al Andalus Supermarket',
  websiteTitle: 'سوبر ماركت الأندلس | Al Andalus Supermarket',
  logoUrl: '',
  phone: '01110688934',
  whatsappNumber: '201110688934',
  whatsappUrl: 'https://wa.me/201110688934',
  deliveryFee: 25,
  freeDeliveryThreshold: 500,
  minimumOrderAmount: 100,
  orderingEnabled: true,
  workingHoursAr: 'يومياً',
  workingHoursEn: 'Daily',
  addressAr: 'القاهرة',
  addressEn: 'Cairo',
};

const sampleProducts: Product[] = [
  {
    id: 'p1',
    sku: 'SKU-1',
    categoryId: 'fruits-veg',
    nameAr: 'طماطم بلدي طازجة',
    nameEn: 'Fresh Baladi Tomatoes',
    descriptionAr: 'طماطم حمراء طازجة قطف اليوم',
    descriptionEn: 'Fresh red tomatoes picked daily',
    unitAr: '1 كجم',
    unitEn: '1 kg',
    price: 30,
    discountPrice: 24,
    image: '/img1.jpg',
    stock: 20,
    isAvailable: true,
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: false,
  },
  {
    id: 'p2',
    sku: 'SKU-2',
    categoryId: 'dairy-cheese',
    nameAr: 'لبن كامل الدسم',
    nameEn: 'Whole Farm Milk',
    descriptionAr: 'حليب طبيعي معبأ طازج',
    descriptionEn: 'Fresh natural full-cream milk',
    unitAr: '1 لتر',
    unitEn: '1 Liter',
    price: 55,
    discountPrice: null,
    image: '/img2.jpg',
    stock: 10,
    isAvailable: true,
    isFeatured: false,
    isBestSeller: true,
    isNewArrival: true,
  },
  {
    id: 'p3',
    sku: 'SKU-3',
    categoryId: 'dairy-cheese',
    nameAr: 'جبنة فيتا بالزيتون',
    nameEn: 'Olive Feta Cheese',
    descriptionAr: 'جبنة بيضاء كريمية',
    descriptionEn: 'Creamy white cheese',
    unitAr: '500 جم',
    unitEn: '500g',
    price: 85,
    discountPrice: 70,
    image: '/img3.jpg',
    stock: 0,
    isAvailable: false,
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: false,
  },
];

test('discount percentage and effective price calculate accurately', () => {
  assert.equal(getEffectivePrice(sampleProducts[0]), 24);
  assert.equal(getEffectivePrice(sampleProducts[1]), 55);
  assert.equal(calculateDiscountPercent(30, 24), 20);
  assert.equal(calculateDiscountPercent(55, null), 0);
  assert.equal(calculateDiscountPercent(50, 60), 0);
});

test('cart totals compute subtotal, savings, delivery fee, and free delivery threshold', () => {
  const belowThreshold = calculateCartTotals(
    [
      { product: sampleProducts[0], quantity: 2 }, // 24 * 2 = 48 (orig 60)
      { product: sampleProducts[1], quantity: 2 }, // 55 * 2 = 110 (orig 110)
    ],
    sampleSettings
  );

  assert.equal(belowThreshold.itemCount, 4);
  assert.equal(belowThreshold.subtotal, 158);
  assert.equal(belowThreshold.originalSubtotal, 170);
  assert.equal(belowThreshold.totalSavings, 12);
  assert.equal(belowThreshold.deliveryFee, 25);
  assert.equal(belowThreshold.qualifiesForFreeDelivery, false);
  assert.equal(belowThreshold.freeDeliveryRemaining, 342);
  assert.equal(belowThreshold.meetsMinimumOrder, true);
  assert.equal(belowThreshold.grandTotal, 183);

  const freeDelivery = calculateCartTotals(
    [{ product: sampleProducts[1], quantity: 10 }], // 550
    sampleSettings
  );
  assert.equal(freeDelivery.qualifiesForFreeDelivery, true);
  assert.equal(freeDelivery.deliveryFee, 0);
  assert.equal(freeDelivery.grandTotal, 550);
});

test('filtering and sorting handles Arabic/English search, category, discount, and price sort', () => {
  const searchArabic = filterAndSortProducts(sampleProducts, { query: 'طماطم' });
  assert.equal(searchArabic.length, 1);
  assert.equal(searchArabic[0].id, 'p1');

  const discountedOnly = filterAndSortProducts(sampleProducts, { onlyDiscounted: true });
  assert.equal(discountedOnly.length, 2);

  const availableOnly = filterAndSortProducts(sampleProducts, { onlyAvailable: true });
  assert.equal(availableOnly.length, 2);

  const priceAsc = filterAndSortProducts(sampleProducts, { sortBy: 'price-asc' });
  assert.deepEqual(
    priceAsc.map((p) => p.id),
    ['p1', 'p2', 'p3']
  );

  const priceDesc = filterAndSortProducts(sampleProducts, { sortBy: 'price-desc' });
  assert.deepEqual(
    priceDesc.map((p) => p.id),
    ['p3', 'p2', 'p1']
  );
});

test('checkout validation rejects incomplete fields and invalid phone numbers', () => {
  const emptyErrors = validateCheckoutForm(
    {
      fullName: '',
      phone: '',
      neighborhood: '',
      address: '',
      instructions: '',
      paymentMethod: 'cod',
    },
    'ar'
  );
  assert.ok(emptyErrors.fullName);
  assert.ok(emptyErrors.phone);
  assert.ok(emptyErrors.neighborhood);
  assert.ok(emptyErrors.address);

  const validErrors = validateCheckoutForm(
    {
      fullName: 'أحمد محمود',
      phone: '01110688934',
      neighborhood: 'المعادي',
      address: 'شارع 9، عمارة 14، الدور الثالث',
      instructions: 'الاتصال قبل الوصول',
      paymentMethod: 'cod',
    },
    'ar'
  );
  assert.deepEqual(validErrors, {});
});

test('currency formatting and order number generator return expected formats', () => {
  assert.equal(formatEGP(120, 'ar'), '120 ج.م');
  assert.equal(formatEGP(120, 'en'), '120 EGP');
  assert.match(generateOrderNumber(new Date('2026-11-16T10:00:00Z')), /^AND-261116-\d{4}$/);
});

test('payment method helpers validate cod, vodafone_cash, and instapay and provide AR/EN labels', () => {
  assert.equal(PAYMENT_TRANSFER_NUMBER, '01110688934');
  assert.equal(isValidPaymentMethod('cod'), true);
  assert.equal(isValidPaymentMethod('vodafone_cash'), true);
  assert.equal(isValidPaymentMethod('instapay'), true);
  assert.equal(isValidPaymentMethod('credit_card'), false);

  assert.equal(getPaymentMethodLabel('vodafone_cash', 'ar'), 'فودافون كاش');
  assert.equal(getPaymentMethodLabel('instapay', 'en'), 'InstaPay');

  const validVodafone = validateCheckoutForm(
    {
      fullName: 'أحمد محمود',
      phone: '01110688934',
      neighborhood: 'المعادي',
      address: 'شارع 9، عمارة 14، الدور الثالث',
      instructions: '',
      paymentMethod: 'vodafone_cash',
      paymentReference: '01012345678',
    },
    'ar'
  );
  assert.deepEqual(validVodafone, {});

  const invalidMethodErrors = validateCheckoutForm(
    {
      fullName: 'أحمد محمود',
      phone: '01110688934',
      neighborhood: 'المعادي',
      address: 'شارع 9، عمارة 14، الدور الثالث',
      instructions: '',
      paymentMethod: 'invalid' as PaymentMethod,
      paymentReference: 'x'.repeat(85),
    },
    'en'
  );
  assert.ok(invalidMethodErrors.paymentMethod);
  assert.ok(invalidMethodErrors.paymentReference);

  const partialPayloadErrors = validateCheckoutForm(
    {} as unknown as Parameters<typeof validateCheckoutForm>[0],
    'en'
  );
  assert.ok(partialPayloadErrors.fullName);
  assert.ok(partialPayloadErrors.phone);
  assert.ok(partialPayloadErrors.paymentMethod);
});
