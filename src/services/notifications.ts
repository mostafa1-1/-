import nodemailer from 'nodemailer';
import type {
  NotificationChannel,
  NotificationDeliveryStatus,
  Order,
  OrderNotificationRecord,
  StoreSettings,
} from '../types/store.ts';
import {
  buildOrderEmailHtml,
  formatOrderNotificationSummary,
  getNotificationChannelCapabilities,
} from '../utils/notificationLogic.ts';
import { normalizePhoneDigits } from '../utils/adminLogic.ts';
import { db } from '../db/index.ts';
import { orderNotifications } from '../db/schema.ts';

type RealtimeBroadcaster = (event: {
  type: 'order:created';
  order: Order;
  notification: OrderNotificationRecord;
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

async function sendOrderEmail(
  order: Order,
  settings: StoreSettings
): Promise<OrderNotificationRecord> {
  const capabilities = getNotificationChannelCapabilities(process.env, settings);
  const recipient = capabilities.ownerNotificationEmail;

  if (settings.emailNotificationsEnabled === false) {
    return logNotificationAttempt({
      orderNumber: order.orderNumber,
      channel: 'email',
      recipient,
      status: 'unconfigured',
      detail: 'تم تعطيل إشعارات البريد الإلكتروني من إعدادات المتجر',
      isRead: true,
    });
  }

  const subject = `طلب جديد #${order.orderNumber} — ${order.totalAmount} ج.م | ${settings.nameAr}`;
  const html = buildOrderEmailHtml(order, settings);
  const text = formatOrderNotificationSummary(order, settings);

  // Provider 1: Resend API
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
          to: [recipient],
          subject,
          html,
          text,
        }),
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const errMsg =
          (body as { message?: string }).message || `Resend error (${resp.status})`;
        return logNotificationAttempt({
          orderNumber: order.orderNumber,
          channel: 'email',
          recipient,
          status: 'failed',
          detail: errMsg,
        });
      }
      return logNotificationAttempt({
        orderNumber: order.orderNumber,
        channel: 'email',
        recipient,
        status: 'sent',
        detail: `تم إرسال البريد عبر Resend (ID: ${(body as { id?: string }).id || 'ok'})`,
        isRead: true,
      });
    } catch (err) {
      return logNotificationAttempt({
        orderNumber: order.orderNumber,
        channel: 'email',
        recipient,
        status: 'failed',
        detail: err instanceof Error ? err.message : 'Resend request failed',
      });
    }
  }

  // Provider 2: SMTP / Gmail App Password via Nodemailer
  const smtpHost =
    process.env.SMTP_HOST?.trim() ||
    (process.env.GMAIL_USER?.trim() ? 'smtp.gmail.com' : '');
  const smtpUser =
    process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim() || '';
  const smtpPass =
    process.env.SMTP_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim() || '';

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
        process.env.EMAIL_FROM?.trim() || `${settings.nameAr} <${smtpUser}>`;
      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipient,
        subject,
        html,
        text,
      });

      return logNotificationAttempt({
        orderNumber: order.orderNumber,
        channel: 'email',
        recipient,
        status: 'sent',
        detail: `تم إرسال البريد عبر SMTP (${info.messageId})`,
        isRead: true,
      });
    } catch (err) {
      return logNotificationAttempt({
        orderNumber: order.orderNumber,
        channel: 'email',
        recipient,
        status: 'failed',
        detail: err instanceof Error ? err.message : 'SMTP delivery failed',
      });
    }
  }

  return logNotificationAttempt({
    orderNumber: order.orderNumber,
    channel: 'email',
    recipient,
    status: 'unconfigured',
    detail:
      'يلزم إضافة RESEND_API_KEY أو بيانات SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) في Secrets لتفعيل الإرسال التلقائي للبريد',
    isRead: true,
  });
}

async function sendWhatsAppCloudAlert(
  order: Order,
  settings: StoreSettings
): Promise<OrderNotificationRecord> {
  const token = process.env.WHATSAPP_CLOUD_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const adminTo = normalizePhoneDigits(
    process.env.WHATSAPP_ADMIN_TO?.trim() ||
      settings.whatsappNumber ||
      '201110688934'
  );

  if (!token || !phoneNumberId) {
    return logNotificationAttempt({
      orderNumber: order.orderNumber,
      channel: 'whatsapp_cloud',
      recipient: `+${adminTo}`,
      status: 'unconfigured',
      detail:
        'يلزم ربط WHATSAPP_CLOUD_TOKEN و WHATSAPP_PHONE_NUMBER_ID من Meta Business Cloud API لإرسال رسائل واتساب تلقائية',
      isRead: true,
    });
  }

  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  const summaryText = formatOrderNotificationSummary(order, settings);

  const payload = templateName
    ? {
        messaging_product: 'whatsapp',
        to: adminTo,
        type: 'template',
        template: {
          name: templateName,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'ar' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: order.orderNumber },
                { type: 'text', text: order.customer.fullName },
                { type: 'text', text: order.customer.phone },
                { type: 'text', text: `${order.totalAmount} ج.م` },
              ],
            },
          ],
        },
      }
    : {
        messaging_product: 'whatsapp',
        to: adminTo,
        type: 'text',
        text: { preview_url: false, body: summaryText },
      };

  try {
    const resp = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg =
        (body as { error?: { message?: string } }).error?.message ||
        `Meta Cloud API error (${resp.status})`;
      return logNotificationAttempt({
        orderNumber: order.orderNumber,
        channel: 'whatsapp_cloud',
        recipient: `+${adminTo}`,
        status: 'failed',
        detail: msg,
      });
    }
    const msgId =
      (body as { messages?: { id?: string }[] }).messages?.[0]?.id || 'accepted';
    return logNotificationAttempt({
      orderNumber: order.orderNumber,
      channel: 'whatsapp_cloud',
      recipient: `+${adminTo}`,
      status: 'sent',
      detail: `تم إرسال إشعار واتساب عبر Cloud API (${msgId})`,
      isRead: true,
    });
  } catch (err) {
    return logNotificationAttempt({
      orderNumber: order.orderNumber,
      channel: 'whatsapp_cloud',
      recipient: `+${adminTo}`,
      status: 'failed',
      detail: err instanceof Error ? err.message : 'WhatsApp Cloud request failed',
    });
  }
}

export async function dispatchNewOrderNotifications(
  order: Order,
  settings: StoreSettings
): Promise<OrderNotificationRecord[]> {
  const summary = formatOrderNotificationSummary(order, settings);

  // 1. Always create durable in-app admin notification and push via WebSocket
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

  // 2. Dispatch Email + WhatsApp Business Cloud API in parallel
  const [emailRecord, whatsappRecord] = await Promise.all([
    sendOrderEmail(order, settings),
    sendWhatsAppCloudAlert(order, settings),
  ]);

  return [inAppRecord, emailRecord, whatsappRecord];
}
