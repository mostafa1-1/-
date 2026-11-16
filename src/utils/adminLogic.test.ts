import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsappUrl,
  computeDashboardMetrics,
  formatOrdersCsv,
  validateProductPayload,
  validateSettingsPayload,
} from './adminLogic';
import type { Category, Order, Product } from '../types/store';

const categories: Category[] = [
  {
    id: 'fruits-veg',
    slug: 'fruits-vegetables',
    nameAr: 'فواكه وخضروات',
    nameEn: 'Fruits & Vegetables',
    descriptionAr: '',
    descriptionEn: '',
    image: '/img.jpg',
    accentTone: '',
  },
];

const products: Product[] = [
  {
    id: 'p1',
    sku: 'SKU-1',
    categoryId: 'fruits-veg',
    nameAr: 'طماطم',
    nameEn: 'Tomatoes',
    descriptionAr: '',
    descriptionEn: '',
    unitAr: '1 كجم',
    unitEn: '1 kg',
    price: 30,
    discountPrice: 25,
    image: '/img.jpg',
    stock: 4,
    isAvailable: true,
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: false,
  },
  {
    id: 'p2',
    sku: 'SKU-2',
    categoryId: 'fruits-veg',
    nameAr: 'خيار',
    nameEn: 'Cucumber',
    descriptionAr: '',
    descriptionEn: '',
    unitAr: '1 كجم',
    unitEn: '1 kg',
    price: 20,
    discountPrice: null,
    image: '/img.jpg',
    stock: 0,
    isAvailable: false,
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: false,
  },
];

const orders: Order[] = [
  {
    orderNumber: 'AND-261116-1001',
    createdAt: '2026-11-16T10:00:00Z',
    status: 'delivered',
    customer: {
      fullName: 'أحمد علي',
      phone: '01110688934',
      neighborhood: 'المعادي',
      address: 'شارع 9',
      instructions: '',
      paymentMethod: 'cod',
    },
    items: [
      {
        productId: 'p1',
        nameAr: 'طماطم',
        nameEn: 'Tomatoes',
        unitPrice: 25,
        quantity: 3,
        lineTotal: 75,
        image: '/img.jpg',
      },
    ],
    subtotal: 75,
    deliveryFee: 25,
    totalSavings: 15,
    totalAmount: 100,
  },
  {
    orderNumber: 'AND-261116-1002',
    createdAt: '2026-11-16T11:00:00Z',
    status: 'cancelled',
    customer: {
      fullName: 'سارة حسن',
      phone: '01000000000',
      neighborhood: 'الدقي',
      address: 'شارع التحرير',
      instructions: '',
      paymentMethod: 'cod',
    },
    items: [
      {
        productId: 'p2',
        nameAr: 'خيار',
        nameEn: 'Cucumber',
        unitPrice: 20,
        quantity: 2,
        lineTotal: 40,
        image: '/img.jpg',
      },
    ],
    subtotal: 40,
    deliveryFee: 25,
    totalSavings: 0,
    totalAmount: 65,
  },
];

test('computeDashboardMetrics aggregates revenue excluding cancelled orders and identifies low stock', () => {
  const stats = computeDashboardMetrics(products, categories, orders, 10);
  assert.equal(stats.totalProducts, 2);
  assert.equal(stats.totalCategories, 1);
  assert.equal(stats.totalOrders, 2);
  assert.equal(stats.completedOrders, 1);
  assert.equal(stats.pendingOrders, 0);
  assert.equal(stats.totalRevenue, 100);
  assert.equal(stats.outOfStockCount, 1);
  assert.equal(stats.lowStockProducts.length, 2);
  assert.equal(stats.bestSellingProducts[0].productId, 'p1');
  assert.equal(stats.bestSellingProducts[0].totalQuantity, 3);
});

test('formatOrdersCsv produces UTF-8 BOM CSV with escaped values', () => {
  const csv = formatOrdersCsv([orders[0]], 'ar');
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('AND-261116-1001'));
  assert.ok(csv.includes('أحمد علي'));
  assert.ok(csv.includes('تم التسليم'));
});

test('buildWhatsappUrl normalizes Egyptian numbers properly', () => {
  assert.equal(buildWhatsappUrl('01110688934'), 'https://wa.me/201110688934');
  assert.equal(buildWhatsappUrl('201110688934'), 'https://wa.me/201110688934');
});

test('validateProductPayload and validateSettingsPayload reject invalid payloads', () => {
  assert.ok(
    validateProductPayload({
      nameAr: '',
      categoryId: 'fruits-veg',
      price: 50,
      discountPrice: null,
      stock: 5,
      image: '',
    })
  );
  assert.ok(
    validateProductPayload({
      nameAr: 'تفاح',
      categoryId: 'fruits-veg',
      price: 50,
      discountPrice: 60,
      stock: 5,
      image: '',
    })
  );
  assert.equal(
    validateProductPayload({
      nameAr: 'تفاح',
      categoryId: 'fruits-veg',
      price: 50,
      discountPrice: 40,
      stock: 5,
      image: '',
    }),
    null
  );

  assert.ok(validateSettingsPayload({ nameAr: 'أ', nameEn: 'Store', phone: '0111' }));
});
