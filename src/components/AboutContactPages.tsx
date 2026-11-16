import { useState, type FormEvent } from 'react';
import { CheckCircle2, Clock, MapPin, MessageCircle, Phone, ShieldCheck, Truck } from 'lucide-react';
import type { Language, StoreSettings } from '../types/store';
import { HERO_IMAGE } from '../data/catalog';
import { t } from '../data/translations';
import { SmartImage } from './SmartImage';

interface AboutPageProps {
  lang: Language;
  settings: StoreSettings;
  onBrowseShop: () => void;
}

export function AboutPage({ lang, settings, onBrowseShop }: AboutPageProps) {
  const copy = t(lang);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-5">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#142218] text-balance">
            {copy.aboutTitle}
          </h1>
          <p className="text-base text-[#0F5E36] font-semibold">{copy.aboutSubtitle}</p>
          <p className="text-sm sm:text-base text-[#4A584E] leading-relaxed">
            {lang === 'ar'
              ? 'في سوبر ماركت الأندلس نؤمن بأن مقاضي البيت اليومية تستحق أعلى معايير الجودة والاهتمام. منذ انطلاقنا ونحن نوفر لعملائنا تشكيلة شاملة من الخضروات والفواكه الطازجة، اللحوم البلدية، الألبان، والمواد التموينية والمنزلية بأسعار عادلة وخدمة توصيل موثوقة.'
              : 'At Al Andalus Supermarket, we believe everyday groceries deserve uncompromising quality and care. We bring families farm-fresh produce, local meats, dairy, and household essentials at transparent prices with dependable neighborhood delivery.'}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={onBrowseShop}
              className="px-6 py-3 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-sm font-bold transition-colors cursor-pointer"
            >
              {copy.shopNow}
            </button>
            <a
              href={`tel:${settings.phone}`}
              className="px-5 py-3 rounded-xl border border-[#D4DDD1] hover:border-[#0F5E36] text-[#142218] text-sm font-semibold inline-flex items-center gap-2 tabular-nums"
            >
              <Phone className="w-4 h-4 text-[#0F5E36]" />
              <span dir="ltr">{settings.phone}</span>
            </a>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="aspect-video rounded-2xl overflow-hidden border border-[#E2E7E0] bg-white">
            <SmartImage
              src={HERO_IMAGE}
              alt={copy.brandName}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: ShieldCheck,
            title: copy.promisePoint1Title,
            desc: copy.promisePoint1Desc,
          },
          {
            icon: Truck,
            title: copy.metricDelivery,
            desc:
              lang === 'ar'
                ? 'توصيل سريع مبرد ومرتب يحافظ على سلامة المنتجات حتى باب بيتك.'
                : 'Temperature-safe express delivery arranged neatly to your door.',
          },
          {
            icon: Clock,
            title: lang === 'ar' ? 'ساعات العمل' : 'Working Hours',
            desc: lang === 'ar' ? settings.workingHoursAr : settings.workingHoursEn,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white border border-[#E2E7E0] rounded-2xl p-6 space-y-2.5"
            >
              <Icon className="w-6 h-6 text-[#0F5E36]" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-[#142218]">{card.title}</h2>
              <p className="text-sm text-[#526056] leading-relaxed">{card.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface ContactPageProps {
  lang: Language;
  settings: StoreSettings;
}

export function ContactPage({ lang, settings }: ContactPageProps) {
  const copy = t(lang);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || phone.trim().length < 8 || message.trim().length < 5) {
      setError(
        lang === 'ar'
          ? 'يرجى كتابة الاسم ورقم الهاتف والرسالة بشكل صحيح.'
          : 'Please fill in your name, phone number, and message.'
      );
      return;
    }
    setError('');
    setSubmitted(true);
    setName('');
    setPhone('');
    setMessage('');
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <div className="border-b border-[#E2E7E0] pb-5">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142218]">
          {copy.contactTitle}
        </h1>
        <p className="text-sm text-[#526056] mt-1">{copy.contactSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E2E7E0] rounded-2xl p-6 space-y-5">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#0F5E36] mt-0.5 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-[#142218]">
                  {lang === 'ar' ? 'رقم التوصيل السريع' : 'Express Delivery Hotline'}
                </h2>
                <a
                  href={`tel:${settings.phone}`}
                  dir="ltr"
                  className="text-lg font-bold text-[#0F5E36] hover:underline tabular-nums inline-block mt-1"
                >
                  {settings.phone}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-[#0F5E36] mt-0.5 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-[#142218]">
                  {lang === 'ar' ? 'الطلب المباشر عبر واتساب' : 'WhatsApp Order Desk'}
                </h2>
                <a
                  href={settings.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-[#0F5E36] hover:underline inline-block mt-1"
                >
                  {copy.whatsappOrder} ({settings.phone})
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#0F5E36] mt-0.5 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-[#142218]">
                  {lang === 'ar' ? 'العنوان ونطاق التغطية' : 'Location & Coverage'}
                </h2>
                <p className="text-sm text-[#526056] mt-1">
                  {lang === 'ar' ? settings.addressAr : settings.addressEn}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#0F5E36] mt-0.5 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-[#142218]">
                  {lang === 'ar' ? 'مواعيد العمل' : 'Opening Hours'}
                </h2>
                <p className="text-sm text-[#526056] mt-1">
                  {lang === 'ar' ? settings.workingHoursAr : settings.workingHoursEn}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-[#E2E7E0] rounded-2xl p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-[#142218] mb-4">
            {lang === 'ar' ? 'أرسل لنا رسالة أو اقتراح' : 'Send Us a Message'}
          </h2>

          {submitted && (
            <div className="mb-5 p-4 rounded-xl bg-[#EEF5EE] border border-[#C9DEC9] flex items-center gap-2.5 text-sm text-[#0F5E36] font-medium">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>
                {lang === 'ar'
                  ? 'تم استلام رسالتك بنجاح! سيتواصل معك فريق خدمة العملاء قريباً.'
                  : 'Your message has been received! Our customer care team will reach out shortly.'}
              </span>
            </div>
          )}

          {error && (
            <p className="mb-4 text-xs text-[#B91C1C]" role="alert">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="contact-name" className="block text-sm font-semibold text-[#142218]">
                  {copy.fullNameLabel}
                </label>
                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm focus:outline-none focus:border-[#0F5E36]"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="contact-phone" className="block text-sm font-semibold text-[#142218]">
                  {copy.phoneLabel}
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm focus:outline-none focus:border-[#0F5E36]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contact-message" className="block text-sm font-semibold text-[#142218]">
                {lang === 'ar' ? 'الرسالة' : 'Message'}
              </label>
              <textarea
                id="contact-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3.5 rounded-lg border border-[#D4DDD1] bg-[#F9FAF8] text-sm focus:outline-none focus:border-[#0F5E36]"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-sm font-bold transition-colors cursor-pointer"
            >
              {lang === 'ar' ? 'إرسال الرسالة' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

interface NotFoundPageProps {
  lang: Language;
  onBackHome: () => void;
}

export function NotFoundPage({ lang, onBackHome }: NotFoundPageProps) {
  const copy = t(lang);
  return (
    <section className="max-w-2xl mx-auto px-4 sm:px-6 py-20 text-center">
      <div className="bg-white border border-[#E2E7E0] rounded-2xl p-10 space-y-4">
        <p className="text-4xl font-extrabold text-[#0F5E36] tabular-nums">404</p>
        <h1 className="font-display text-2xl font-bold text-[#142218]">{copy.notFoundTitle}</h1>
        <p className="text-sm text-[#526056]">{copy.notFoundDesc}</p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onBackHome}
            className="px-6 py-3 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {copy.backHome}
          </button>
        </div>
      </div>
    </section>
  );
}
