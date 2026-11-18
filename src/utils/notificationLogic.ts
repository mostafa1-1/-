import type {
  Language,
  NotificationChannelCapabilities,
  Order,
  StoreSettings,
} from '../types/store.ts';
import { buildWhatsappUrl } from './adminLogic.ts';
import { getPaymentMethodLabel, PAYMENT_TRANSFER_NUMBER } from './storeLogic.ts';

function escapeHtml(raw: string): string {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatOrderTimestamp(isoDate: string, lang: Language = 'ar'): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo',
  });
}

function formatPaymentDetailsLine(order: Order, lang: Language): string {
  const methodLabel = getPaymentMethodLabel(order.customer.paymentMethod, lang);
  const transferSuffix =
    order.customer.paymentMethod === 'vodafone_cash' ||
    order.customer.paymentMethod === 'instapay'
      ? lang === 'ar'
        ? ` (رقم التحويل: ${PAYMENT_TRANSFER_NUMBER})`
        : ` (Transfer to: ${PAYMENT_TRANSFER_NUMBER})`
      : '';
  const refSuffix = order.customer.paymentReference?.trim()
    ? lang === 'ar'
      ? ` — مرجع/رقم المحول: ${order.customer.paymentReference.trim()}`
      : ` — Ref/Sender: ${order.customer.paymentReference.trim()}`
    : '';
  return `${methodLabel}${transferSuffix}${refSuffix}`;
}

export function formatOrderNotificationSummary(
  order: Order,
  settings: StoreSettings
): string {
  const dateStr = formatOrderTimestamp(order.createdAt, 'ar');
  const fullAddress = `${order.customer.neighborhood} — ${order.customer.address}`;
  const itemsText = order.items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.nameAr} × ${item.quantity} = ${item.lineTotal} ج.م`
    )
    .join('\n');

  const paymentSummary = formatPaymentDetailsLine(order, 'ar');

  const lines = [
    `طلب جديد - ${settings.nameAr}`,
    `رقم الطلب: ${order.orderNumber}`,
    `التاريخ والوقت: ${dateStr}`,
    `العميل: ${order.customer.fullName}`,
    `الهاتف: ${order.customer.phone}`,
    `العنوان: ${fullAddress}`,
    `طريقة الدفع: ${paymentSummary}`,
    order.customer.instructions
      ? `ملاحظات التوصيل: ${order.customer.instructions}`
      : null,
    `المنتجات:`,
    itemsText,
    `المجموع الفرعي: ${order.subtotal} ج.م`,
    `رسوم التوصيل: ${order.deliveryFee === 0 ? 'مجاني' : `${order.deliveryFee} ج.م`}`,
    `الإجمالي المطلوب: ${order.totalAmount} ج.م`,
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildOrderEmailHtml(
  order: Order,
  settings: StoreSettings
): string {
  const dateStr = formatOrderTimestamp(order.createdAt, 'ar');
  const fullAddress = `${order.customer.neighborhood} — ${order.customer.address}`;
  const paymentSummary = formatPaymentDetailsLine(order, 'ar');

  const rowsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E7E0;font-weight:600;color:#142218;">${escapeHtml(item.nameAr)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E7E0;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E7E0;text-align:left;">${item.unitPrice} ج.م</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E7E0;text-align:left;font-weight:700;color:#0F5E36;">${item.lineTotal} ج.م</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#F5F7F4;font-family:Tahoma,Arial,sans-serif;color:#142218;">
  <div style="max-width:620px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E7E0;border-radius:12px;overflow:hidden;">
    <div style="background:#0F5E36;color:#FFFFFF;padding:20px 24px;">
      <h1 style="margin:0;font-size:20px;">طلب جديد وارد — ${escapeHtml(settings.nameAr)}</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">رقم الطلب: <strong dir="ltr">${escapeHtml(order.orderNumber)}</strong> · ${escapeHtml(dateStr)}</p>
    </div>
    <div style="padding:24px;space-y:16px;">
      <div style="background:#F9FAF8;border:1px solid #E2E7E0;border-radius:8px;padding:14px 16px;margin-bottom:18px;font-size:14px;line-height:1.7;">
        <div><strong>اسم العميل:</strong> ${escapeHtml(order.customer.fullName)}</div>
        <div><strong>رقم الهاتف:</strong> <span dir="ltr">${escapeHtml(order.customer.phone)}</span></div>
        <div><strong>عنوان التوصيل:</strong> ${escapeHtml(fullAddress)}</div>
        <div><strong>طريقة الدفع:</strong> ${escapeHtml(paymentSummary)}</div>
        ${
          order.customer.instructions
            ? `<div><strong>ملاحظات إضافية:</strong> ${escapeHtml(order.customer.instructions)}</div>`
            : ''
        }
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px;">
        <thead>
          <tr style="background:#F1F4F0;color:#3D4B41;font-size:12px;">
            <th style="padding:10px 12px;text-align:right;">المنتج</th>
            <th style="padding:10px 12px;text-align:center;">الكمية</th>
            <th style="padding:10px 12px;text-align:left;">السعر</th>
            <th style="padding:10px 12px;text-align:left;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <div style="background:#EEF5EE;border:1px solid #C9DEC9;border-radius:8px;padding:14px 16px;font-size:14px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span>المجموع الفرعي: </span><strong>${order.subtotal} ج.م</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span>رسوم التوصيل: </span><strong>${order.deliveryFee === 0 ? 'مجاني' : `${order.deliveryFee} ج.م`}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:17px;color:#0F5E36;padding-top:8px;border-top:1px solid #C9DEC9;">
          <span><strong>الإجمالي (${escapeHtml(getPaymentMethodLabel(order.customer.paymentMethod, 'ar'))}):</strong> </span><strong>${order.totalAmount} ج.م</strong>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildCustomerWhatsappOrderUrl(
  whatsappNumber: string,
  order: Order,
  settings: StoreSettings,
  lang: Language = 'ar'
): string {
  const baseUrl = buildWhatsappUrl(whatsappNumber || '+201110688934');
  const dateStr = formatOrderTimestamp(order.createdAt, lang);
  const fullAddress = `${order.customer.neighborhood} — ${order.customer.address}`;
  const paymentSummary = formatPaymentDetailsLine(order, lang);
  const itemLines = order.items
    .map((item) =>
      lang === 'ar'
        ? `- ${item.nameAr} × ${item.quantity} (${item.lineTotal} ج.م)`
        : `- ${item.nameEn} × ${item.quantity} (${item.lineTotal} EGP)`
    )
    .join('\n');

  const text =
    lang === 'ar'
      ? [
          `مرحباً ${settings.nameAr}، تم تأكيد طلبي رقم: ${order.orderNumber}`,
          `التاريخ: ${dateStr}`,
          `الاسم: ${order.customer.fullName}`,
          `الهاتف: ${order.customer.phone}`,
          `العنوان: ${fullAddress}`,
          `طريقة الدفع: ${paymentSummary}`,
          `المنتجات:`,
          itemLines,
          `الإجمالي: ${order.totalAmount} ج.م`,
        ].join('\n')
      : [
          `Hello ${settings.nameEn}, following up on order: ${order.orderNumber}`,
          `Date: ${dateStr}`,
          `Name: ${order.customer.fullName}`,
          `Phone: ${order.customer.phone}`,
          `Address: ${fullAddress}`,
          `Payment Method: ${paymentSummary}`,
          `Items:`,
          itemLines,
          `Total: ${order.totalAmount} EGP`,
        ].join('\n');

  return `${baseUrl}?text=${encodeURIComponent(text)}`;
}

export const REQUIRED_NOTIFICATION_ENV_KEYS = [
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
  'WHATSAPP_CLOUD_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_ADMIN_TO',
  'WHATSAPP_TEMPLATE_NAME',
] as const;

export type RequiredNotificationEnvKey =
  (typeof REQUIRED_NOTIFICATION_ENV_KEYS)[number];

export function sanitizeWhatsAppToken(rawToken?: string): string {
  if (!rawToken) return '';
  let token = rawToken.trim();
  while (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  token = token.replace(/^(?:Bearer(?:\s+|$))+/i, '').trim();
  while (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  return token.replace(/\s+/g, '');
}

export function getRequiredNotificationEnvStatus(
  env: Record<string, string | undefined>
): Record<RequiredNotificationEnvKey, 'LOADED' | 'MISSING'> {
  return {
    GMAIL_USER: env.GMAIL_USER?.trim() ? 'LOADED' : 'MISSING',
    GMAIL_APP_PASSWORD: env.GMAIL_APP_PASSWORD?.trim() ? 'LOADED' : 'MISSING',
    WHATSAPP_CLOUD_TOKEN: sanitizeWhatsAppToken(env.WHATSAPP_CLOUD_TOKEN)
      ? 'LOADED'
      : 'MISSING',
    WHATSAPP_PHONE_NUMBER_ID: env.WHATSAPP_PHONE_NUMBER_ID?.trim()
      ? 'LOADED'
      : 'MISSING',
    WHATSAPP_ADMIN_TO: env.WHATSAPP_ADMIN_TO?.trim() ? 'LOADED' : 'MISSING',
    WHATSAPP_TEMPLATE_NAME: env.WHATSAPP_TEMPLATE_NAME?.trim()
      ? 'LOADED'
      : 'MISSING',
  };
}

export function buildWhatsAppTemplatePayload(input: {
  to: string;
  templateName?: string;
  templateLang?: string;
}) {
  const cleanName = input.templateName?.trim() || 'hello_world';
  const cleanLang = input.templateLang?.trim() || 'en_US';
  return {
    messaging_product: 'whatsapp' as const,
    to: input.to,
    type: 'template' as const,
    template: {
      name: cleanName,
      language: { code: cleanLang },
    },
  };
}

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function resolveOwnerNotificationRecipients(input: {
  dbRoleEmails?: readonly string[];
  allowlistEmails?: readonly string[];
  settingsNotificationEmail?: string | null;
  envGMAILUser?: string | null;
  envAdminEmail?: string | null;
  envOwnerNotificationEmail?: string | null;
}): string[] {
  const seen = new Set<string>();
  const recipients: string[] = [];

  const candidates = [
    ...(input.dbRoleEmails || []),
    ...(input.allowlistEmails || []),
    input.settingsNotificationEmail,
    input.envGMAILUser,
    input.envAdminEmail,
    input.envOwnerNotificationEmail,
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const normalized = raw.trim().toLowerCase();
    if (!normalized || !EMAIL_FORMAT_REGEX.test(normalized)) continue;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      recipients.push(normalized);
    }
  }

  return recipients;
}

export interface ContactNotificationInput {
  name: string;
  phone: string;
  message: string;
  createdAt?: string;
}

export function formatContactNotificationSummary(
  input: ContactNotificationInput,
  settings: Pick<StoreSettings, 'nameAr'>
): string {
  const dateStr = formatOrderTimestamp(
    input.createdAt || new Date().toISOString(),
    'ar'
  );
  return [
    `رسالة جديدة من نموذج تواصل معنا — ${settings.nameAr}`,
    `التاريخ والوقت: ${dateStr}`,
    `الاسم: ${input.name.trim()}`,
    `رقم الهاتف: ${input.phone.trim()}`,
    `نص الرسالة:`,
    input.message.trim(),
  ].join('\n');
}

export function buildContactMessageEmailHtml(
  input: ContactNotificationInput,
  settings: Pick<StoreSettings, 'nameAr'>
): string {
  const dateStr = formatOrderTimestamp(
    input.createdAt || new Date().toISOString(),
    'ar'
  );
  const safeName = escapeHtml(input.name.trim());
  const safePhone = escapeHtml(input.phone.trim());
  const safeMessage = escapeHtml(input.message.trim()).replace(/\n/g, '<br />');

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#F5F7F4;font-family:Tahoma,Arial,sans-serif;color:#142218;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E7E0;border-radius:12px;overflow:hidden;">
    <div style="background:#0F5E36;color:#FFFFFF;padding:20px 24px;">
      <h1 style="margin:0;font-size:20px;">رسالة جديدة من عميل — ${escapeHtml(settings.nameAr)}</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">${escapeHtml(dateStr)}</p>
    </div>
    <div style="padding:24px;">
      <div style="background:#F9FAF8;border:1px solid #E2E7E0;border-radius:8px;padding:14px 16px;margin-bottom:16px;font-size:14px;line-height:1.8;">
        <div><strong>اسم المرسل:</strong> ${safeName}</div>
        <div><strong>رقم الهاتف:</strong> <span dir="ltr">${safePhone}</span></div>
      </div>
      <div style="background:#EEF5EE;border:1px solid #C9DEC9;border-radius:8px;padding:16px;font-size:14px;line-height:1.8;color:#142218;">
        <div style="font-weight:700;color:#0F5E36;margin-bottom:6px;">محتوى الرسالة / الاقتراح:</div>
        <div>${safeMessage}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export interface StoreEventNotificationInput {
  eventType: string;
  title: string;
  details: { label: string; value: string }[];
  actorEmail?: string;
  createdAt?: string;
}

export function formatStoreEventSummary(
  input: StoreEventNotificationInput,
  settings: Pick<StoreSettings, 'nameAr'>
): string {
  const dateStr = formatOrderTimestamp(
    input.createdAt || new Date().toISOString(),
    'ar'
  );
  const lines = [
    `تنبيه إداري (${input.title}) — ${settings.nameAr}`,
    `نوع الحدث: ${input.eventType}`,
    `التاريخ والوقت: ${dateStr}`,
    input.actorEmail ? `بواسطة: ${input.actorEmail}` : null,
    ...input.details.map((d) => `${d.label}: ${d.value}`),
  ].filter(Boolean);
  return lines.join('\n');
}

export function buildStoreEventEmailHtml(
  input: StoreEventNotificationInput,
  settings: Pick<StoreSettings, 'nameAr'>
): string {
  const dateStr = formatOrderTimestamp(
    input.createdAt || new Date().toISOString(),
    'ar'
  );
  const rowsHtml = input.details
    .map(
      (d) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E7E0;font-weight:700;color:#3D4B41;width:36%;">${escapeHtml(d.label)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E7E0;color:#142218;">${escapeHtml(d.value)}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#F5F7F4;font-family:Tahoma,Arial,sans-serif;color:#142218;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E7E0;border-radius:12px;overflow:hidden;">
    <div style="background:#142218;color:#FFFFFF;padding:20px 24px;">
      <h1 style="margin:0;font-size:19px;">${escapeHtml(input.title)} — ${escapeHtml(settings.nameAr)}</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:0.85;">${escapeHtml(dateStr)}</p>
    </div>
    <div style="padding:24px;">
      ${
        input.actorEmail
          ? `<div style="background:#EEF5EE;border:1px solid #C9DEC9;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;"><strong>الحساب المنفّذ:</strong> <span dir="ltr">${escapeHtml(input.actorEmail)}</span></div>`
          : ''
      }
      <table style="width:100%;border-collapse:collapse;font-size:14px;background:#F9FAF8;border:1px solid #E2E7E0;border-radius:8px;overflow:hidden;">
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

export function getNotificationChannelCapabilities(
  env: Record<string, string | undefined>,
  settings: Pick<StoreSettings, 'notificationEmail' | 'whatsappNumber'>
): NotificationChannelCapabilities {
  const hasResend = Boolean(env.RESEND_API_KEY?.trim());
  const hasSmtp = Boolean(
    (env.SMTP_HOST?.trim() && env.SMTP_USER?.trim() && env.SMTP_PASS?.trim()) ||
      (env.GMAIL_USER?.trim() && env.GMAIL_APP_PASSWORD?.trim())
  );
  const hasWaCloud = Boolean(
    sanitizeWhatsAppToken(env.WHATSAPP_CLOUD_TOKEN) &&
      env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  );

  return {
    inAppRealtime: true,
    emailProvider: hasResend ? 'resend' : hasSmtp ? 'smtp' : 'none',
    emailConfigured: hasResend || hasSmtp,
    whatsappCloudConfigured: hasWaCloud,
    ownerNotificationEmail:
      env.GMAIL_USER?.trim() ||
      env.ADMIN_EMAIL?.trim() ||
      settings.notificationEmail?.trim() ||
      env.OWNER_NOTIFICATION_EMAIL?.trim() ||
      'mostafaelfoly1000@gmail.com',
    whatsappPublicNumber: '+201110688934',
  };
}
