import { MessageCircle, Phone } from 'lucide-react';
import type { Category, Language, RouteView, StoreSettings } from '../types/store';
import { t } from '../data/translations';

interface FooterProps {
  lang: Language;
  settings: StoreSettings;
  categories: Category[];
  onNavigate: (route: RouteView) => void;
  onSelectCategory: (categoryId: string) => void;
}

export function Footer({
  lang,
  settings,
  categories,
  onNavigate,
  onSelectCategory,
}: FooterProps) {
  const copy = t(lang);
  const topCategories = categories.slice(0, 6);

  return (
    <footer className="no-print bg-[#142218] text-[#D5DDD3] mt-16 border-t border-[#243629]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Column 1: Brand Summary */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            {settings.logoUrl && (
              <img
                src={settings.logoUrl}
                alt={lang === 'ar' ? settings.nameAr : settings.nameEn}
                className="w-9 h-9 rounded-lg object-cover shrink-0 bg-white"
              />
            )}
            <h2 className="font-display text-xl font-bold text-white">
              {lang === 'ar' ? settings.nameAr : settings.nameEn}
            </h2>
          </div>
          <p className="text-sm text-[#B8C4B6] leading-relaxed">
            {lang === 'ar'
              ? 'سوبر ماركت الأندلس.. كل اللي محتاجه لبيتك طازة وبأحسن سعر لحد بابك.'
              : 'Your trusted neighborhood grocery destination for fresh produce, dairy, meats, and home essentials with fast delivery.'}
          </p>
          <p className="text-xs text-[#91A18F]">
            {lang === 'ar' ? settings.workingHoursAr : settings.workingHoursEn}
          </p>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-4">
            {lang === 'ar' ? 'روابط سريعة' : 'Quick Links'}
          </h3>
          <ul className="space-y-2.5 text-sm">
            {[
              { route: 'home' as RouteView, label: copy.navHome },
              { route: 'shop' as RouteView, label: copy.navShop },
              { route: 'categories' as RouteView, label: copy.navCategories },
              { route: 'offers' as RouteView, label: copy.navOffers },
              { route: 'about' as RouteView, label: copy.navAbout },
              { route: 'contact' as RouteView, label: copy.navContact },
              {
                route: 'admin' as RouteView,
                label: lang === 'ar' ? 'لوحة الإدارة' : 'Admin Portal',
              },
            ].map((item) => (
              <li key={item.route}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.route)}
                  className="text-[#B8C4B6] hover:text-white transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3: Top Categories */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-4">
            {copy.categoriesSectionTitle}
          </h3>
          <ul className="space-y-2.5 text-sm">
            {topCategories.map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className="text-[#B8C4B6] hover:text-white transition-colors cursor-pointer"
                >
                  {lang === 'ar' ? cat.nameAr : cat.nameEn}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4: Direct Delivery Contact */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">
            {lang === 'ar' ? 'اطلب بالتليفون أو واتساب' : 'Direct Delivery Desk'}
          </h3>
          <p className="text-xs text-[#B8C4B6] leading-relaxed">
            {lang === 'ar' ? settings.addressAr : settings.addressEn}
          </p>
          <div className="flex flex-col gap-2.5">
            <a
              href={`tel:${settings.phone}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#142218] text-sm font-semibold hover:bg-[#F1F4F0] transition-colors tabular-nums"
            >
              <Phone className="w-4 h-4 text-[#0F5E36]" />
              <span dir="ltr">{settings.phone}</span>
            </a>
            <a
              href={settings.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F5E36] text-white text-sm font-semibold hover:bg-[#147444] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{copy.whatsappOrder}</span>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#91A18F]">
          <span>
            © {new Date().getFullYear()}{' '}
            {lang === 'ar'
              ? `جميع الحقوق محفوظة لـ ${settings.nameAr}`
              : `All rights reserved to ${settings.nameEn}`}
          </span>
          <span dir="ltr">
            {settings.nameEn} · {settings.phone}
          </span>
        </div>
      </div>
    </footer>
  );
}
