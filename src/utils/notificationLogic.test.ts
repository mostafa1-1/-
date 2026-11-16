import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCustomerWhatsappOrderUrl,
  buildOrderEmailHtml,
  formatOrderNotificationSummary,
  getNotificationChannelCapabilities,
} from './notificationLogic.ts';
import type { Order, StoreSettings } from '../types/store.ts';

const sampleSettings: StoreSettings = {
  nameAr: 'سوبر ماركت الأندلس',
  nameEn: 'Al Andalus Supermarket',
  websiteTitle: 'سوبر ماركت الأندلس',
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
  notificationEmail: 'mostafaelfoly1000@gmail.com',
  emailNotificationsEnabled: true,
};

const sampleOrder: Order = {
  orderNumber: 'AND-261116-9012',
  createdAt: '2026-11-16T12:30:00.000Z',
  status: 'pending',
  customer: {
    fullName: 'محمود <اختبار> علي',
    phone: '01110688934',
    neighborhood: 'مدينة نصر',
    address: 'شارع عباس العقاد عمارة 10',
    instructions: 'الدور الرابع',
    paymentMethod: 'cod',
  },
  items: [
    {
      productId: 'p1',
      nameAr: 'طماطم بلدي طازجة',
      nameEn: 'Fresh Baladi Tomatoes',
      unitPrice: 22,
      quantity: 3,
      lineTotal: 66,
      image: '/img.jpg',
    },
    {
      productId: 'p2',
      nameAr: 'لبن كامل الدسم 1 لتر',
      nameEn: 'Full Cream Milk 1L',
      unitPrice: 44,
      quantity: 2,
      lineTotal: 88,
      image: '/img2.jpg',
    },
  ],
  subtotal: 154,
  deliveryFee: 25,
  totalSavings: 10,
  totalAmount: 179,
};

test('formatOrderNotificationSummary includes all required order fields', () => {
  const summary = formatOrderNotificationSummary(sampleOrder, sampleSettings);
  assert.match(summary, /AND-261116-9012/);
  assert.match(summary, /محمود <اختبار> علي/);
  assert.match(summary, /01110688934/);
  assert.match(summary, /مدينة نصر — شارع عباس العقاد عمارة 10/);
  assert.match(summary, /طماطم بلدي طازجة × 3/);
  assert.match(summary, /لبن كامل الدسم 1 لتر × 2/);
  assert.match(summary, /179 ج\.م/);
  assert.match(summary, /التاريخ والوقت:/);
});

test('buildOrderEmailHtml escapes customer input and includes itemized totals', () => {
  const html = buildOrderEmailHtml(sampleOrder, sampleSettings);
  assert.ok(!html.includes('<اختبار>'), 'Raw HTML brackets must be escaped');
  assert.ok(html.includes('&lt;اختبار&gt;'));
  assert.ok(html.includes('AND-261116-9012'));
  assert.ok(html.includes('179 ج.م'));
});

test('buildCustomerWhatsappOrderUrl targets +201110688934 and encodes order payload', () => {
  const url = buildCustomerWhatsappOrderUrl(
    '+201110688934',
    sampleOrder,
    sampleSettings,
    'ar'
  );
  assert.ok(url.startsWith('https://wa.me/201110688934?text='));
  const decoded = decodeURIComponent(url.split('?text=')[1]);
  assert.match(decoded, /AND-261116-9012/);
  assert.match(decoded, /179 ج\.م/);
  assert.match(decoded, /طماطم بلدي طازجة × 3/);
});

test('getNotificationChannelCapabilities accurately reflects configured providers', () => {
  const unconfigured = getNotificationChannelCapabilities({}, sampleSettings);
  assert.equal(unconfigured.emailConfigured, false);
  assert.equal(unconfigured.emailProvider, 'none');
  assert.equal(unconfigured.whatsappCloudConfigured, false);
  assert.equal(unconfigured.inAppRealtime, true);

  const resendAndWa = getNotificationChannelCapabilities(
    {
      RESEND_API_KEY: 're_test_123',
      WHATSAPP_CLOUD_TOKEN: 'EAAG_test',
      WHATSAPP_PHONE_NUMBER_ID: '123456789',
    },
    sampleSettings
  );
  assert.equal(resendAndWa.emailConfigured, true);
  assert.equal(resendAndWa.emailProvider, 'resend');
  assert.equal(resendAndWa.whatsappCloudConfigured, true);
});
