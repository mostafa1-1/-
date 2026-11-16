import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { BellRing, CheckCircle2, Mail, MessageCircle, Plus, Trash2, Upload } from 'lucide-react';
import type {
  NotificationChannelCapabilities,
  OrderNotificationRecord,
  StoreSettings,
} from '../../types/store';
import { adminApi } from '../../utils/adminApi';
import { validateSettingsPayload } from '../../utils/adminLogic';
import { SmartImage } from '../SmartImage';

interface AdminSettingsSectionProps {
  settings: StoreSettings;
  notificationCapabilities?: NotificationChannelCapabilities;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

export function AdminSettingsSection({
  settings,
  notificationCapabilities,
  onRefresh,
  onNotify,
}: AdminSettingsSectionProps) {
  const [form, setForm] = useState<StoreSettings>(settings);
  const [allowlist, setAllowlist] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<
    NotificationChannelCapabilities | undefined
  >(notificationCapabilities);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [testingNotifications, setTestingNotifications] = useState(false);
  const [testResults, setTestResults] = useState<OrderNotificationRecord[] | null>(
    null
  );

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  useEffect(() => {
    if (notificationCapabilities) {
      setCapabilities(notificationCapabilities);
    }
  }, [notificationCapabilities]);

  useEffect(() => {
    adminApi
      .getSettings()
      .then((res) => {
        setAllowlist(res.allowlist);
        setCapabilities(res.notificationCapabilities);
      })
      .catch(() => {});
  }, []);

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await adminApi.uploadImageFile(file);
      setForm((prev) => ({ ...prev, logoUrl: res.url }));
      onNotify('تم رفع شعار السوبر ماركت بنجاح');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'فشل رفع الشعار', true);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateSettingsPayload(form);
    if (err) {
      onNotify(err, true);
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateSettings(form);
      await onRefresh();
      onNotify('تم حفظ إعدادات الموقع وتحديث المتجر بالكامل فوراً');
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : 'تعذر حفظ الإعدادات',
        true
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    try {
      const res = await adminApi.addAllowlistEmail(newAdminEmail);
      setAllowlist(res.allowlist);
      setNewAdminEmail('');
      onNotify('تمت إضافة البريد إلى صلاحيات الإدارة');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذر الإضافة', true);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    try {
      const res = await adminApi.removeAllowlistEmail(email);
      setAllowlist(res.allowlist);
      onNotify('تمت إزالة البريد من صلاحيات الإدارة');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذر الإزالة', true);
    }
  };

  const handleTestNotifications = async () => {
    setTestingNotifications(true);
    try {
      const res = await adminApi.sendTestNotification();
      setTestResults(res.results);
      await onRefresh();
      onNotify('تم إرسال التنبيه التجريبي وتسجيل نتيجة كل قناة');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذر إرسال التنبيه التجريبي', true);
    } finally {
      setTestingNotifications(false);
    }
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSave}
        className="bg-white border border-[#E2E7E0] rounded-xl p-6 sm:p-8 space-y-6"
      >
        <div className="border-b border-[#E2E7E0] pb-4">
          <h2 className="font-display text-xl font-bold text-[#142218]">
            إعدادات الموقع والهوية التجارية
          </h2>
          <p className="text-xs text-[#526056] mt-1">
            يتم تطبيق الاسم والشعار وأرقام التواصل ورسوم التوصيل تلقائياً على جميع صفحات العملاء
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label htmlFor="set-name-ar" className="block text-sm font-semibold">
              اسم السوبر ماركت (بالعربية) *
            </label>
            <input
              id="set-name-ar"
              type="text"
              required
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="set-name-en" className="block text-sm font-semibold">
              اسم السوبر ماركت (بالإنجليزية) *
            </label>
            <input
              id="set-name-en"
              type="text"
              dir="ltr"
              required
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="set-title" className="block text-sm font-semibold">
              عنوان الموقع في المتصفح (Website Title)
            </label>
            <input
              id="set-title"
              type="text"
              value={form.websiteTitle}
              onChange={(e) => setForm({ ...form, websiteTitle: e.target.value })}
              className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm"
            />
          </div>

          {/* Logo Upload */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold">شعار السوبر ماركت (Logo)</label>
            <div className="flex items-center gap-3">
              {form.logoUrl && (
                <div className="w-11 h-11 rounded-lg overflow-hidden border border-[#E2E7E0] shrink-0">
                  <SmartImage
                    src={form.logoUrl}
                    alt={form.nameAr}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-[#0F5E36] text-[#0F5E36] text-xs font-semibold cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{uploadingLogo ? 'جاري الرفع...' : 'رفع شعار'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="sr-only"
                />
              </label>
              {form.logoUrl && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, logoUrl: '' })}
                  className="text-xs text-[#B91C1C] hover:underline cursor-pointer"
                >
                  إزالة الشعار
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="set-phone" className="block text-sm font-semibold">
              رقم هاتف التوصيل *
            </label>
            <input
              id="set-phone"
              type="tel"
              dir="ltr"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="set-wa" className="block text-sm font-semibold">
              رقم الواتساب (بالصيغة الدولية مثل 201110688934)
            </label>
            <input
              id="set-wa"
              type="tel"
              dir="ltr"
              value={form.whatsappNumber}
              onChange={(e) =>
                setForm({ ...form, whatsappNumber: e.target.value })
              }
              className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="set-addr-ar" className="block text-sm font-semibold">
              العنوان (عربي)
            </label>
            <input
              id="set-addr-ar"
              type="text"
              value={form.addressAr}
              onChange={(e) => setForm({ ...form, addressAr: e.target.value })}
              className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="set-addr-en" className="block text-sm font-semibold">
              العنوان (إنجليزي)
            </label>
            <input
              id="set-addr-en"
              type="text"
              dir="ltr"
              value={form.addressEn}
              onChange={(e) => setForm({ ...form, addressEn: e.target.value })}
              className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 md:col-span-2">
            <div className="space-y-1.5">
              <label htmlFor="set-fee" className="block text-sm font-semibold">
                رسوم التوصيل (ج.م)
              </label>
              <input
                id="set-fee"
                type="number"
                min="0"
                dir="ltr"
                value={form.deliveryFee}
                onChange={(e) =>
                  setForm({ ...form, deliveryFee: Number(e.target.value) })
                }
                className="w-full h-11 px-3 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="set-free" className="block text-sm font-semibold">
                التوصيل المجاني فوق (ج.م)
              </label>
              <input
                id="set-free"
                type="number"
                min="0"
                dir="ltr"
                value={form.freeDeliveryThreshold}
                onChange={(e) =>
                  setForm({
                    ...form,
                    freeDeliveryThreshold: Number(e.target.value),
                  })
                }
                className="w-full h-11 px-3 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="set-min" className="block text-sm font-semibold">
                الحد الأدنى للطلب (ج.م)
              </label>
              <input
                id="set-min"
                type="number"
                min="0"
                dir="ltr"
                value={form.minimumOrderAmount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    minimumOrderAmount: Number(e.target.value),
                  })
                }
                className="w-full h-11 px-3 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm tabular-nums"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[#EEF2ED] pt-5 grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
          <div className="space-y-1.5">
            <label htmlFor="set-notif-email" className="block text-sm font-semibold">
              بريد المالك لاستلام إشعارات الطلبات
            </label>
            <input
              id="set-notif-email"
              type="email"
              dir="ltr"
              value={form.notificationEmail ?? 'mostafaelfoly1000@gmail.com'}
              onChange={(e) =>
                setForm({ ...form, notificationEmail: e.target.value })
              }
              placeholder="mostafaelfoly1000@gmail.com"
              className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm"
            />
          </div>

          <div className="space-y-2.5 pb-1">
            <label className="inline-flex items-center gap-2.5 text-sm font-semibold text-[#142218] cursor-pointer">
              <input
                type="checkbox"
                checked={form.emailNotificationsEnabled ?? true}
                onChange={(e) =>
                  setForm({ ...form, emailNotificationsEnabled: e.target.checked })
                }
                className="w-4 h-4 accent-[#0F5E36]"
              />
              <span>إرسال بريد إلكتروني تلقائي للمالك مع كل طلب جديد</span>
            </label>

            <label className="block">
              <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-[#142218] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.orderingEnabled}
                  onChange={(e) =>
                    setForm({ ...form, orderingEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#0F5E36]"
                />
                <span>تفعيل استقبال الطلبات الأونلاين من العملاء</span>
              </span>
            </label>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={saving || uploadingLogo}
            className="px-6 py-3 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-sm font-bold cursor-pointer"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ إعدادات الموقع'}
          </button>
        </div>
      </form>

      {/* Notification Channels Status & Live Test */}
      <div className="bg-white border border-[#E2E7E0] rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF2ED] pb-4">
          <div>
            <h3 className="font-display text-lg font-bold text-[#142218]">
              حالة قنوات إشعارات الطلبات
            </h3>
            <p className="text-xs text-[#526056] mt-0.5">
              حالة الربط الفعلية على الخادم بدون كشف مفاتيح الربط السرية
            </p>
          </div>
          <button
            type="button"
            disabled={testingNotifications}
            onClick={handleTestNotifications}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
          >
            <BellRing className="w-4 h-4" />
            <span>
              {testingNotifications
                ? 'جاري الاختبار...'
                : 'إرسال تنبيه تجريبي الآن'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="border border-[#E2E7E0] rounded-xl p-4 bg-[#F9FAF8] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#142218] inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#0F5E36]" />
                تنبيهات لوحة التحكم الفورية
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534]">
                مفعّل
              </span>
            </div>
            <p className="text-xs text-[#526056] leading-relaxed">
              تظهر فوراً عبر WebSocket مع شارة الطلبات قيد الانتظار وصوت التنبيه عند فتح اللوحة.
            </p>
          </div>

          <div className="border border-[#E2E7E0] rounded-xl p-4 bg-[#F9FAF8] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#142218] inline-flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[#0F5E36]" />
                إشعارات البريد الإلكتروني
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  capabilities?.emailConfigured
                    ? 'bg-[#DCFCE7] text-[#166534]'
                    : 'bg-[#FEF3C7] text-[#92400E]'
                }`}
              >
                {capabilities?.emailConfigured
                  ? `مفعّل (${capabilities.emailProvider})`
                  : 'يحتاج مفاتيح الخادم'}
              </span>
            </div>
            <p className="text-xs text-[#526056] leading-relaxed">
              {capabilities?.emailConfigured
                ? `يرسل تلقائياً إلى ${capabilities.ownerNotificationEmail}`
                : 'أضف RESEND_API_KEY أو بيانات SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) في Secrets لتفعيل الإرسال التلقائي.'}
            </p>
          </div>

          <div className="border border-[#E2E7E0] rounded-xl p-4 bg-[#F9FAF8] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#142218] inline-flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-[#0F5E36]" />
                WhatsApp Business Cloud API
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  capabilities?.whatsappCloudConfigured
                    ? 'bg-[#DCFCE7] text-[#166534]'
                    : 'bg-[#FEF3C7] text-[#92400E]'
                }`}
              >
                {capabilities?.whatsappCloudConfigured
                  ? 'مفعّل'
                  : 'يحتاج مفاتيح Meta'}
              </span>
            </div>
            <p className="text-xs text-[#526056] leading-relaxed">
              {capabilities?.whatsappCloudConfigured
                ? 'يرسل تنبيهاً تلقائياً لواتساب المالك فور تأكيد أي طلب.'
                : 'رابط واتساب للعملاء (+201110688934) يعمل دائماً؛ أما التنبيه التلقائي لصاحب المتجر فيتطلب WHATSAPP_CLOUD_TOKEN و WHATSAPP_PHONE_NUMBER_ID.'}
            </p>
          </div>
        </div>

        {testResults && (
          <div className="border border-[#C9DEC9] bg-[#EEF5EE] rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-[#0F5E36]">نتائج التنبيه التجريبي:</p>
            <ul className="space-y-1 text-xs text-[#142218]">
              {testResults.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{r.channel}</span>
                  <span className="text-[#3D4B41] truncate flex-1">{r.detail}</span>
                  <span className="font-bold shrink-0">{r.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Admin Access Control */}
      <div className="bg-white border border-[#E2E7E0] rounded-xl p-6 space-y-4">
        <div>
          <h3 className="font-display text-lg font-bold text-[#142218]">
            صلاحيات الدخول إلى لوحة التحكم
          </h3>
          <p className="text-xs text-[#526056] mt-0.5">
            حسابات Google المصرح لها بالدخول إلى /admin وإدارة المتجر
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            dir="ltr"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            placeholder="admin@example.com"
            className="flex-1 min-w-[220px] max-w-sm h-10 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm"
          />
          <button
            type="button"
            onClick={handleAddAdmin}
            className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg bg-[#142218] text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مسؤول</span>
          </button>
        </div>

        <ul className="divide-y divide-[#EEF2ED]">
          {allowlist.map((email) => (
            <li
              key={email}
              className="py-2.5 flex items-center justify-between text-sm"
            >
              <span dir="ltr" className="font-medium text-[#142218]">
                {email}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveAdmin(email)}
                className="p-1.5 text-[#526056] hover:text-[#B91C1C] cursor-pointer"
                aria-label={`إزالة ${email}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
