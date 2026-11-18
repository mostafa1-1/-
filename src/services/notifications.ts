import nodemailer from 'nodemailer';
import type {
  NotificationChannel,
  NotificationDeliveryStatus,
  Order,
  OrderNotificationRecord,
  StoreSettings,
} from '../types/store.ts';
import {
  buildContactMessageEmailHtml,
  buildOrderEmailHtml,
  buildStoreEventEmailHtml,
  buildWhatsAppTemplatePayload,
  formatContactNotificationSummary,
  formatOrderNotificationSummary,
  formatStoreEventSummary,
  getNotificationChannelCapabilities,
  resolveOwnerNotificationRecipients,
  sanitizeWhatsAppToken,
  type ContactNotificationInput,
  type StoreEventNotificationInput,
} from '../utils/notificationLogic.ts';
import { normalizePhoneDigits } from '../utils/adminLogic.ts';
import { db } from '../db/index.ts';
import { orderNotifications } from '../db/schema.ts';
import { getAdminStoreSettings, getAllOwnerAdminEmails } from '../db/repository.ts';

type RealtimeBroadcaster = (event: {
  type: 'order:created';
  order: Order;
  notification: OrderNotificationRecord;
  notificationErrors?: { channel: string; status: string; detail: string }[];
}) => void;

let broadcaster: RealtimeBroadcaster | null = null;

export function registerNotificationBroadcaster(fn: RealtimeBroadcaster): void {
  broadcaster = fn;
}

async function logNotificationAttempt(input: {
  orderNumber: string;
  channel: NotificationChannel;
  recipient: string;
  status: NotificationDeliveryStatus;
  detail: string;
  isRead?: boolean;
}): Promise<OrderNotificationRecord> {
  const [inserted] = await db
    .insert(orderNotifications)
    .values({
      orderNumber: input.orderNumber,
      channel: input.channel,
      recipient: input.recipient,
      status: input.status,
      detail: input.detail,
      isRead: input.isRead ?? false,
    })
    .returning();

  return {
    id: inserted.id,
    orderNumber: inserted.orderNumber,
    channel: inserted.channel as NotificationChannel,
    recipient: inserted.recipient,
    status: inserted.status as NotificationDeliveryStatus,
    detail: inserted.detail,
    isRead: inserted.isRead,
    createdAt: inserted.createdAt
      ? inserted.createdAt.toISOString()
      : new Date().toISOString(),
  };
}

export async function resolveDynamicOwnerEmails(
  settings: Pick<StoreSettings, 'notificationEmail' | 'whatsappNumber'>
): Promise<string[]> {
  const capabilities = getNotificationChannelCapabilities(process.env, settings);
  const { roleEmails, allowlistEmails } = await getAllOwnerAdminEmails();

  const recipients = resolveOwnerNotificationRecipients({
    dbRoleEmails: roleEmails,
    allowlistEmails,
    settingsNotificationEmail: settings.notificationEmail,
    envGMAILUser: process.env.GMAIL_USER,
    envAdminEmail: process.env.ADMIN_EMAIL,
    envOwnerNotificationEmail:
      process.env.OWNER_NOTIFICATION_EMAIL || capabilities.ownerNotificationEmail,
  });

  return recipients.length > 0
    ? recipients
    : [capabilities.ownerNotificationEmail];
}

async function deliverEmailToAllOwners(input: {
  referenceKey: string;
  subject: string;
  html: string;
  text: string;
  settings: StoreSettings;
}): Promise<{
  recipients: string[];
  recipientLabel: string;
  status: NotificationDeliveryStatus;
  detail: string;
}> {
  const recipients = await resolveDynamicOwnerEmails(input.settings);
  const recipientLabel = recipients.join(', ');

  if (input.settings.emailNotificationsEnabled === false) {
    console.log(
      `[Notifications][Email] Skipped (${input.referenceKey}): email notifications disabled in settings`
    );
    return {
      recipients,
      recipientLabel,
      status: 'unconfigured',
      detail: 'تم تعطيل إشعارات البريد الإلكتروني من إعدادات المتجر',
    };
  }

  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.trim();

  // Provider 1: Gmail via Nodemailer (service: 'gmail')
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      const fromAddress =
        process.env.EMAIL_FROM?.trim() || `${input.settings.nameAr} <${gmailUser}>`;
      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipientLabel,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });

      console.log(
        `[Notifications][Gmail] Delivered (${input.referenceKey}) to ${recipients.length} owner/admin recipient(s) [${recipientLabel}] (messageId: ${info.messageId})`
      );
      return {
        recipients,
        recipientLabel,
        status: 'sent',
        detail: `تم إرسال البريد عبر Gmail إلى ${recipients.length} مستلم (${recipientLabel}) (${info.messageId})`,
      };
    } catch (err) {
      const errDetail =
        err instanceof Error
          ? `${err.message}${(err as { response?: string }).response ? ` | ${(err as { response?: string }).response}` : ''}`
          : String(err);
      console.error(
        `[Notifications][Gmail] Failed (${input.referenceKey}) -> [${recipientLabel}]:`,
        err
      );
      return {
        recipients,
        recipientLabel,
        status: 'failed',
        detail: `Gmail Error: ${errDetail}`,
      };
    }
  }

  // Provider 2: Standard SMTP via Nodemailer
  const smtpHost = process.env.SMTP_HOST?.trim() || '';
  const smtpUser = process.env.SMTP_USER?.trim() || '';
  const smtpPass = process.env.SMTP_PASS?.trim() || '';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const port = Number(process.env.SMTP_PORT || 465);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure: port === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      const fromAddress =
        process.env.EMAIL_FROM?.trim() || `${input.settings.nameAr} <${smtpUser}>`;
      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipientLabel,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });

      console.log(
        `[Notifications][SMTP] Delivered (${input.referenceKey}) to ${recipients.length} owner/admin recipient(s) [${recipientLabel}] (messageId: ${info.messageId})`
      );
      return {
        recipients,
        recipientLabel,
        status: 'sent',
        detail: `تم إرسال البريد عبر SMTP إلى ${recipients.length} مستلم (${info.messageId})`,
      };
    } catch (err) {
      const errDetail = err instanceof Error ? err.message : String(err);
      console.error(
        `[Notifications][SMTP] Failed (${input.referenceKey}) -> [${recipientLabel}]:`,
        err
      );
      return {
        recipients,
        recipientLabel,
        status: 'failed',
        detail: `SMTP Error: ${errDetail}`,
      };
    }
  }

  // Provider 3: Resend API
  if (process.env.RESEND_API_KEY?.trim()) {
    try {
      const fromAddress =
        process.env.EMAIL_FROM?.trim() ||
        'Al Andalus Supermarket <onboarding@resend.dev>';
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: recipients,
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const errMsg = `Resend HTTP ${resp.status}: ${JSON.stringify(body)}`;
        console.error(
          `[Notifications][Resend] Failed (${input.referenceKey}) -> [${recipientLabel}]:`,
          errMsg
        );
        return {
          recipients,
          recipientLabel,
          status: 'failed',
          detail: errMsg,
        };
      }
      const id = (body as { id?: string }).id || 'ok';
      console.log(
        `[Notifications][Resend] Delivered (${input.referenceKey}) to ${recipients.length} owner/admin recipient(s) [${recipientLabel}] (ID: ${id})`
      );
      return {
        recipients,
        recipientLabel,
        status: 'sent',
        detail: `تم إرسال البريد عبر Resend إلى ${recipients.length} مستلم (ID: ${id})`,
      };
    } catch (err) {
      const errDetail = err instanceof Error ? err.message : 'Resend request failed';
      console.error(
        `[Notifications][Resend] Request error (${input.referenceKey}):`,
        err
      );
      return {
        recipients,
        recipientLabel,
        status: 'failed',
        detail: `Resend Error: ${errDetail}`,
      };
    }
  }

  const missingEmailMsg =
    'GMAIL_USER أو GMAIL_APP_PASSWORD غير متوفرين في process.env على الخادم (تأكد من إضافتها في AI Studio Secrets وإعادة التشغيل).';
  console.warn(
    `[Notifications][Email] Unconfigured (${input.referenceKey}) intended for [${recipientLabel}]: ${missingEmailMsg}`
  );
  return {
    recipients,
    recipientLabel,
    status: 'unconfigured',
    detail: missingEmailMsg,
  };
}

async function sendOrderEmail(
  order: Order,
  settings: StoreSettings
): Promise<OrderNotificationRecord> {
  const delivery = await deliverEmailToAllOwners({
    referenceKey: order.orderNumber,
    subject: `طلب جديد #${order.orderNumber} — ${order.totalAmount} ج.م | ${settings.nameAr}`,
    html: buildOrderEmailHtml(order, settings),
    text: formatOrderNotificationSummary(order, settings),
    settings,
  });

  return logNotificationAttempt({
    orderNumber: order.orderNumber,
    channel: 'email',
    recipient: delivery.recipientLabel,
    status: delivery.status,
    detail: delivery.detail,
    isRead: delivery.status === 'sent' || delivery.status === 'unconfigured',
  });
}

async function sendWhatsAppCloudAlert(
  order: Order,
  settings: StoreSettings
): Promise<OrderNotificationRecord> {
  const cleanToken = sanitizeWhatsAppToken(process.env.WHATSAPP_CLOUD_TOKEN);
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const adminTo = normalizePhoneDigits(
    process.env.WHATSAPP_ADMIN_TO?.trim() ||
      settings.whatsappNumber ||
      '201110688934'
  );

  if (!cleanToken || !phoneNumberId) {
    const missingWaMsg =
      'WHATSAPP_CLOUD_TOKEN أو WHATSAPP_PHONE_NUMBER_ID غير متوفرين أو غير صالحين في process.env على الخادم (تأكد من إضافتهما في AI Studio Secrets وإعادة التشغيل).';
    console.warn(`[Notifications][WhatsApp] Unconfigured for ${order.orderNumber}: ${missingWaMsg}`);
    return logNotificationAttempt({
      orderNumber: order.orderNumber,
      channel: 'whatsapp_cloud',
      recipient: `+${adminTo}`,
      status: 'unconfigured',
      detail: missingWaMsg,
      isRead: true,
    });
  }

  const payload = buildWhatsAppTemplatePayload({
    to: adminTo,
    templateName: process.env.WHATSAPP_TEMPLATE_NAME,
    templateLang: process.env.WHATSAPP_TEMPLATE_LANG,
  });

  const tokenPrefix = cleanToken.slice(0, 6);
  console.log(
    `[Notifications][WhatsApp] Sending order=${order.orderNumber} to=+${adminTo} phoneNumberId=${phoneNumberId} template=${payload.template.name} tokenPrefix=${tokenPrefix}... tokenLength=${cleanToken.length}`
  );

  try {
    const resp = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const metaErrorJson = JSON.stringify(body);
      console.error(
        `[Notifications][WhatsApp] Meta Cloud API HTTP ${resp.status} for ${order.orderNumber} -> ${adminTo}:`,
        metaErrorJson
      );
      return logNotificationAttempt({
        orderNumber: order.orderNumber,
        channel: 'whatsapp_cloud',
        recipient: `+${adminTo}`,
        status: 'failed',
        detail: `Meta API HTTP ${resp.status}: ${metaErrorJson}`,
      });
    }
    const msgId =
      (body as { messages?: { id?: string }[] }).messages?.[0]?.id || 'accepted';
    console.log(
      `[Notifications][WhatsApp] Sent template "${payload.template.name}" (${payload.template.language.code}) to ${adminTo} for ${order.orderNumber} (msgId: ${msgId})`
    );
    return logNotificationAttempt({
      orderNumber: order.orderNumber,
      channel: 'whatsapp_cloud',
      recipient: `+${adminTo}`,
      status: 'sent',
      detail: `تم إرسال إشعار واتساب (${payload.template.name}) عبر Cloud API (${msgId})`,
      isRead: true,
    });
  } catch (err) {
    const errDetail = err instanceof Error ? err.message : 'WhatsApp Cloud request failed';
    console.error(
      `[Notifications][WhatsApp] Network/Request error for ${order.orderNumber}:`,
      err
    );
    return logNotificationAttempt({
      orderNumber: order.orderNumber,
      channel: 'whatsapp_cloud',
      recipient: `+${adminTo}`,
      status: 'failed',
      detail: `WhatsApp Error: ${errDetail}`,
    });
  }
}

export async function dispatchNewOrderNotifications(
  order: Order,
  settings: StoreSettings
): Promise<OrderNotificationRecord[]> {
  const summary = formatOrderNotificationSummary(order, settings);

  // 1. Always create durable in-app admin notification and run Email + WhatsApp APIs in parallel
  const [inAppRecord, emailRecord, whatsappRecord] = await Promise.all([
    logNotificationAttempt({
      orderNumber: order.orderNumber,
      channel: 'in_app',
      recipient: 'admin-dashboard',
      status: 'sent',
      detail: summary,
      isRead: false,
    }),
    sendOrderEmail(order, settings),
    sendWhatsAppCloudAlert(order, settings),
  ]);

  const notificationErrors = [emailRecord, whatsappRecord]
    .filter((r) => r.status !== 'sent')
    .map((r) => ({ channel: r.channel, status: r.status, detail: r.detail }));

  if (broadcaster) {
    broadcaster({
      type: 'order:created',
      order,
      notification: inAppRecord,
      ...(notificationErrors.length > 0 ? { notificationErrors } : {}),
    });
  }

  return [inAppRecord, emailRecord, whatsappRecord];
}

export async function dispatchNewOrderNotificationsAsync(
  order: Order,
  settings: StoreSettings
): Promise<void> {
  const summary = formatOrderNotificationSummary(order, settings);

  // Persist instant in-app admin alert + notify open WebSocket clients right away
  const inAppRecord = await logNotificationAttempt({
    orderNumber: order.orderNumber,
    channel: 'in_app',
    recipient: 'admin-dashboard',
    status: 'sent',
    detail: summary,
    isRead: false,
  });

  if (broadcaster) {
    broadcaster({
      type: 'order:created',
      order,
      notification: inAppRecord,
    });
  }

  // Run external Email (all Owner/Admin recipients) + WhatsApp asynchronously in background
  void Promise.allSettled([
    sendOrderEmail(order, settings),
    sendWhatsAppCloudAlert(order, settings),
  ])
    .then((outcomes) => {
      for (const outcome of outcomes) {
        if (outcome.status === 'fulfilled') {
          const rec = outcome.value;
          if (rec.status === 'sent') {
            console.log(
              `[Orders][${order.orderNumber}] Async ${rec.channel} delivery status=sent -> ${rec.recipient}`
            );
          } else {
            console.warn(
              `[Orders][${order.orderNumber}] Async ${rec.channel} delivery status=${rec.status}: ${rec.detail}`
            );
          }
        } else {
          console.error(
            `[Orders][${order.orderNumber}] Async external notification rejected:`,
            outcome.reason
          );
        }
      }
    })
    .catch((err) => {
      console.error(
        `[Orders][${order.orderNumber}] Unexpected error in async notification dispatcher:`,
        err
      );
    });
}

export function dispatchContactMessageNotificationsAsync(
  input: ContactNotificationInput,
  settings: StoreSettings
): void {
  const refCode = `CONTACT-${Date.now().toString().slice(-6)}`;
  const summary = formatContactNotificationSummary(input, settings);
  const html = buildContactMessageEmailHtml(input, settings);

  void (async () => {
    try {
      await logNotificationAttempt({
        orderNumber: refCode,
        channel: 'in_app',
        recipient: 'admin-dashboard',
        status: 'sent',
        detail: summary,
        isRead: false,
      });

      const delivery = await deliverEmailToAllOwners({
        referenceKey: refCode,
        subject: `رسالة جديدة من ${input.name.trim()} (${input.phone.trim()}) | ${settings.nameAr}`,
        html,
        text: summary,
        settings,
      });

      await logNotificationAttempt({
        orderNumber: refCode,
        channel: 'email',
        recipient: delivery.recipientLabel,
        status: delivery.status,
        detail: delivery.detail,
        isRead: delivery.status === 'sent' || delivery.status === 'unconfigured',
      });

      console.log(
        `[Contact][${refCode}] Async email delivery status=${delivery.status} recipients=[${delivery.recipientLabel}]`
      );
    } catch (err) {
      console.error(`[Contact][${refCode}] Async notification error:`, err);
    }
  })();
}

export function dispatchStoreEventNotificationsAsync(
  input: StoreEventNotificationInput,
  settings?: StoreSettings
): void {
  const refCode = `EVENT-${Date.now().toString().slice(-6)}`;

  void (async () => {
    try {
      const resolvedSettings = settings || (await getAdminStoreSettings());
      const summary = formatStoreEventSummary(input, resolvedSettings);
      const html = buildStoreEventEmailHtml(input, resolvedSettings);

      await logNotificationAttempt({
        orderNumber: refCode,
        channel: 'in_app',
        recipient: 'admin-dashboard',
        status: 'sent',
        detail: summary,
        isRead: false,
      });

      const delivery = await deliverEmailToAllOwners({
        referenceKey: refCode,
        subject: `${input.title} | ${resolvedSettings.nameAr}`,
        html,
        text: summary,
        settings: resolvedSettings,
      });

      await logNotificationAttempt({
        orderNumber: refCode,
        channel: 'email',
        recipient: delivery.recipientLabel,
        status: delivery.status,
        detail: delivery.detail,
        isRead: delivery.status === 'sent' || delivery.status === 'unconfigured',
      });

      console.log(
        `[StoreEvent][${input.eventType}][${refCode}] Async email delivery status=${delivery.status} recipients=[${delivery.recipientLabel}]`
      );
    } catch (err) {
      console.error(
        `[StoreEvent][${input.eventType}][${refCode}] Async notification error:`,
        err
      );
    }
  })();
}
