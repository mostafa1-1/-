import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildContactMessageEmailHtml,
  buildCustomerWhatsappOrderUrl,
  buildOrderEmailHtml,
  buildStoreEventEmailHtml,
  buildWhatsAppTemplatePayload,
  formatContactNotificationSummary,
  formatOrderNotificationSummary,
  formatStoreEventSummary,
  getNotificationChannelCapabilities,
  getRequiredNotificationEnvStatus,
  resolveOwnerNotificationRecipients,
  sanitizeWhatsAppToken,
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

test('notifications include Vodafone Cash / InstaPay transfer number 01110688934 and reference', () => {
  const instapayOrder: Order = {
    ...sampleOrder,
    orderNumber: 'AND-261116-9099',
    customer: {
      ...sampleOrder.customer,
      paymentMethod: 'instapay',
      paymentReference: 'IPA-778899',
    },
  };

  const summary = formatOrderNotificationSummary(instapayOrder, sampleSettings);
  assert.match(summary, /إنستا باي/);
  assert.match(summary, /01110688934/);
  assert.match(summary, /IPA-778899/);

  const html = buildOrderEmailHtml(instapayOrder, sampleSettings);
  assert.ok(html.includes('إنستا باي'));
  assert.ok(html.includes('01110688934'));
  assert.ok(html.includes('IPA-778899'));

  const waUrl = buildCustomerWhatsappOrderUrl(
    '+201110688934',
    {
      ...sampleOrder,
      customer: {
        ...sampleOrder.customer,
        paymentMethod: 'vodafone_cash',
        paymentReference: '01012345678',
      },
    },
    sampleSettings,
    'en'
  );
  const decoded = decodeURIComponent(waUrl.split('?text=')[1]);
  assert.match(decoded, /Vodafone Cash/);
  assert.match(decoded, /01110688934/);
  assert.match(decoded, /01012345678/);
});

test('getRequiredNotificationEnvStatus reports LOADED vs MISSING for all 6 notification secrets', () => {
  const partial = getRequiredNotificationEnvStatus({
    GMAIL_USER: 'mostafaelfoly1000@gmail.com',
    GMAIL_APP_PASSWORD: '  ',
    WHATSAPP_CLOUD_TOKEN: 'EAAG_token',
  });
  assert.deepEqual(partial, {
    GMAIL_USER: 'LOADED',
    GMAIL_APP_PASSWORD: 'MISSING',
    WHATSAPP_CLOUD_TOKEN: 'LOADED',
    WHATSAPP_PHONE_NUMBER_ID: 'MISSING',
    WHATSAPP_ADMIN_TO: 'MISSING',
    WHATSAPP_TEMPLATE_NAME: 'MISSING',
  });

  const waDefault = buildWhatsAppTemplatePayload({ to: '201110688934' });
  assert.deepEqual(waDefault, {
    messaging_product: 'whatsapp',
    to: '201110688934',
    type: 'template',
    template: {
      name: 'hello_world',
      language: { code: 'en_US' },
    },
  });
  assert.equal('components' in waDefault.template, false);
});

test('sanitizeWhatsAppToken trims whitespace, quotes, newlines, and duplicate Bearer prefixes', () => {
  assert.equal(sanitizeWhatsAppToken(undefined), '');
  assert.equal(sanitizeWhatsAppToken('   '), '');
  assert.equal(sanitizeWhatsAppToken('""'), '');
  assert.equal(sanitizeWhatsAppToken('Bearer   '), '');
  assert.equal(
    sanitizeWhatsAppToken('  "Bearer EAAxyz123456\n"  '),
    'EAAxyz123456'
  );
  assert.equal(
    sanitizeWhatsAppToken("Bearer Bearer 'EAAabc\r\ndef'"),
    'EAAabcdef'
  );
  assert.equal(
    sanitizeWhatsAppToken('EAAGm0PX4ZCpsValidToken'),
    'EAAGm0PX4ZCpsValidToken'
  );
});

test('resolveOwnerNotificationRecipients deduplicates DB role emails, allowlist, and env fallbacks', () => {
  const result = resolveOwnerNotificationRecipients({
    dbRoleEmails: ['  Owner@Andalus.com ', 'admin2@andalus.com', 'not-an-email'],
    allowlistEmails: ['OWNER@andalus.com', 'partner@andalus.com', ''],
    settingsNotificationEmail: 'store@andalus.com',
    envGMAILUser: 'partner@andalus.com',
    envAdminEmail: 'superadmin@andalus.com',
    envOwnerNotificationEmail: 'store@andalus.com',
  });

  assert.deepEqual(result, [
    'owner@andalus.com',
    'admin2@andalus.com',
    'partner@andalus.com',
    'store@andalus.com',
    'superadmin@andalus.com',
  ]);
});

test('contact message and store event email builders format and escape fields safely', () => {
  const contactInput = {
    name: 'كريم <سعيد>',
    phone: '01110688934',
    message: 'عاوز طلب خضار طازة الساعة 5\nشكراً',
    createdAt: '2026-11-17T10:00:00.000Z',
  };
  const contactSummary = formatContactNotificationSummary(contactInput, sampleSettings);
  assert.match(contactSummary, /كريم <سعيد>/);
  assert.match(contactSummary, /01110688934/);
  assert.match(contactSummary, /عاوز طلب خضار طازة/);

  const contactHtml = buildContactMessageEmailHtml(contactInput, sampleSettings);
  assert.ok(!contactHtml.includes('<سعيد>'));
  assert.ok(contactHtml.includes('&lt;سعيد&gt;'));
  assert.ok(contactHtml.includes('01110688934'));
  assert.ok(contactHtml.includes('<br />'));

  const eventInput = {
    eventType: 'owner_admin_registered',
    title: 'تسجيل مالك / مسؤول جديد',
    actorEmail: 'newadmin@andalus.com',
    details: [
      { label: 'البريد الإلكتروني', value: 'newadmin@andalus.com' },
      { label: 'الصلاحية', value: 'admin <verified>' },
    ],
    createdAt: '2026-11-17T10:00:00.000Z',
  };
  const eventSummary = formatStoreEventSummary(eventInput, sampleSettings);
  assert.match(eventSummary, /newadmin@andalus\.com/);
  assert.match(eventSummary, /تسجيل مالك \/ مسؤول جديد/);

  const eventHtml = buildStoreEventEmailHtml(eventInput, sampleSettings);
  assert.ok(!eventHtml.includes('<verified>'));
  assert.ok(eventHtml.includes('&lt;verified&gt;'));
  assert.ok(eventHtml.includes('newadmin@andalus.com'));
});


