import { useState } from 'react';
import { Menu, MessageCircle, Phone, ShoppingBag, X } from 'lucide-react';
import type { Language, RouteView, StoreSettings } from '../types/store';
import { t } from '../data/translations';
import { formatEGP } from '../utils/storeLogic';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  activeRoute: RouteView;
  onNavigate: (route: RouteView) => void;
  cartCount: number;
  onOpenCart: () => void;
  settings: StoreSettings;
}

export function Header({
  lang,
  onToggleLang,
  activeRoute,
  onNavigate,
  cartCount,
  onOpenCart,
  settings,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const copy = t(lang);

  const navItems: { route: RouteView; label: string }[] = [
    { route: 'home', label: copy.navHome },
    { route: 'shop', label: copy.navShop },
    { route: 'categories', label: copy.navCategories },
    { route: 'offers', label: copy.navOffers },
    { route: 'contact', label: copy.navContact },
  ];

  const handleNavClick = (route: RouteView) => {
    setMobileMenuOpen(false);
    onNavigate(route);
  };

  return (
    <div className="no-print">
      {/* Slim non-sticky utility bar (<= 36px) for delivery hotline, WhatsApp & language switch */}
      <div className="bg-[#142218] text-[#F1F4F0] text-xs border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <a
              href={`tel:${settings.phone}`}
              className="inline-flex items-center gap-1.5 text-white hover:text-[#D97706] transition-colors whitespace-nowrap shrink-0 tabular-nums font-medium"
            >
              <Phone className="w-3.5 h-3.5" aria-hidden="true" />
              <span dir="ltr">{settings.phone}</span>
            </a>
            <span className="hidden sm:inline text-white/30" aria-hidden="true">
              |
            </span>
            <a
              href={settings.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-[#A7F3D0] hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{copy.whatsappOrder}</span>
            </a>
            <span className="hidden lg:inline text-white/30" aria-hidden="true">
              |
            </span>
            <span className="hidden lg:inline text-[#D5DDD3] truncate">
              {copy.topBannerFreeDelivery}{' '}
              <strong className="text-white tabular-nums">
                {formatEGP(settings.freeDeliveryThreshold, lang)}
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleLang}
            aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            className="px-2.5 py-1 text-xs font-medium text-white/90 hover:text-white border border-white/20 rounded hover:border-white/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copy.switchLangLabel}
          </button>
        </div>
      </div>

      {/* Main Sticky Header adhering to 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E7E0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark (+ optional dynamic logo) */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('home');
            }}
            className="inline-flex items-center gap-2.5 font-display text-lg sm:text-xl font-bold tracking-tight text-[#0F5E36] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#0F5E36] rounded"
          >
            {settings.logoUrl && (
              <img
                src={settings.logoUrl}
                alt={lang === 'ar' ? settings.nameAr : settings.nameEn}
                className="w-8 h-8 rounded-lg object-cover shrink-0 border border-[#E2E7E0]"
              />
            )}
            <span>{lang === 'ar' ? settings.nameAr : settings.nameEn}</span>
          </a>

          {/* Zone 2: 5 Concise Single-line Text Navigation Links */}
          <nav
            aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#3D4B41]"
          >
            {navItems.map((item) => {
              const isActive = activeRoute === item.route;
              return (
                <a
                  key={item.route}
                  href={item.route === 'home' ? '/' : `/${item.route}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.route);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                    isActive
                      ? 'text-[#0F5E36] border-[#0F5E36] font-semibold'
                      : 'border-transparent hover:text-[#142218] hover:border-[#C5D0C3]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action (Cart CTA) + Mobile Menu Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`${copy.cartButton} (${cartCount})`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F5E36] hover:bg-[#0B4A2A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F5E36] min-h-[40px]"
            >
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              <span>{copy.cartButton}</span>
              <span
                data-testid="cart-count-badge"
                className="tabular-nums text-xs font-bold bg-white/20 px-1.5 py-0.5 rounded"
              >
                {cartCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#E2E7E0] text-[#142218] hover:bg-[#F1F4F0] transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E2E7E0] bg-white px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = activeRoute === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => handleNavClick(item.route)}
                  className={`w-full text-start px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#EEF5EE] text-[#0F5E36] font-semibold'
                      : 'text-[#142218] hover:bg-[#F1F4F0]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => handleNavClick('about')}
              className="w-full text-start px-3 py-2.5 rounded-lg text-sm font-medium text-[#142218] hover:bg-[#F1F4F0] transition-colors cursor-pointer"
            >
              {copy.navAbout}
            </button>
            <div className="pt-2 mt-2 border-t border-[#E2E7E0] flex items-center gap-2">
              <a
                href={`tel:${settings.phone}`}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#F1F4F0] text-[#142218] text-xs font-semibold"
              >
                <Phone className="w-4 h-4 text-[#0F5E36]" />
                <span dir="ltr">{settings.phone}</span>
              </a>
              <a
                href={settings.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#0F5E36]/10 text-[#0F5E36] text-xs font-semibold"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{copy.whatsappOrder}</span>
              </a>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
