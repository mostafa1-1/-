import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import type { Category, Language, Product, RouteView, StoreSettings } from '../types/store';
import { HERO_IMAGE } from '../data/catalog';
import { t } from '../data/translations';
import { filterAndSortProducts } from '../utils/storeLogic';
import { ProductCard } from './ProductCard';
import { SmartImage } from './SmartImage';

interface HomePageProps {
  lang: Language;
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  onNavigate: (route: RouteView) => void;
  onSearchSubmit: (query: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onOpenProduct: (productId: string) => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

type HomeCollectionTab = 'bestsellers' | 'offers' | 'newest' | 'featured';

export function HomePage({
  lang,
  settings,
  categories,
  products,
  onNavigate,
  onSearchSubmit,
  onSelectCategory,
  onOpenProduct,
  onAddToCart,
}: HomePageProps) {
  const [heroSearch, setHeroSearch] = useState('');
  const [activeTab, setActiveTab] = useState<HomeCollectionTab>('bestsellers');
  const copy = t(lang);
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  const handleHeroSearch = (e: FormEvent) => {
    e.preventDefault();
    onSearchSubmit(heroSearch);
  };

  // Show top 6 curated categories on homepage with direct link to all 12
  const showcaseCategories = categories.slice(0, 6);

  const displayedProducts = (() => {
    if (activeTab === 'offers') {
      return filterAndSortProducts(products, { onlyDiscounted: true, onlyAvailable: true }).slice(0, 8);
    }
    if (activeTab === 'newest') {
      return filterAndSortProducts(products, { sortBy: 'newest', onlyAvailable: true }).slice(0, 8);
    }
    if (activeTab === 'featured') {
      return filterAndSortProducts(products, { sortBy: 'featured', onlyAvailable: true }).slice(0, 8);
    }
    return filterAndSortProducts(products, { sortBy: 'bestsellers', onlyAvailable: true }).slice(0, 8);
  })();

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="space-y-16">
      {/* SECTION 1: Storefront Hero Split */}
      <section className="bg-white border-b border-[#E2E7E0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* Editorial Copy + Search + Primary CTA */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-sm font-semibold text-[#0F5E36]">{copy.heroKicker}</p>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-[#142218] leading-[1.2] text-balance">
                {copy.heroTitle}
              </h1>

              <p className="text-base text-[#4A584E] leading-relaxed max-w-xl">
                {copy.heroSubtitle}
              </p>

              {/* Quick Instant Search Bar */}
              <form onSubmit={handleHeroSearch} className="relative max-w-xl">
                <label htmlFor="hero-search" className="sr-only">
                  {copy.searchPlaceholder}
                </label>
                <div className="flex items-center bg-[#F9FAF8] border border-[#D4DDD1] rounded-xl p-1.5 focus-within:border-[#0F5E36] focus-within:ring-2 focus-within:ring-[#0F5E36]/15 transition-all">
                  <Search className="w-5 h-5 text-[#526056] mx-2.5 shrink-0" aria-hidden="true" />
                  <input
                    id="hero-search"
                    type="search"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    placeholder={copy.searchPlaceholder}
                    className="w-full bg-transparent text-sm text-[#142218] placeholder:text-[#728075] focus:outline-none py-2"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#142218] hover:bg-[#0F5E36] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {lang === 'ar' ? 'بحث' : 'Search'}
                  </button>
                </div>
              </form>

              {/* Primary CTA & Direct Delivery Links */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('shop')}
                  className="px-6 py-3.5 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-sm sm:text-base font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{copy.shopNow}</span>
                  <ArrowIcon className="w-4 h-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('offers')}
                  className="px-5 py-3.5 rounded-xl bg-[#F1F4F0] hover:bg-[#E4EAE2] text-[#142218] text-sm sm:text-base font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copy.browseOffers}
                </button>

                <a
                  href={`tel:${settings.phone}`}
                  className="px-4 py-3.5 rounded-xl border border-[#D4DDD1] hover:border-[#0F5E36] text-[#142218] text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 tabular-nums"
                >
                  <Phone className="w-4 h-4 text-[#0F5E36]" aria-hidden="true" />
                  <span dir="ltr">{settings.phone}</span>
                </a>
              </div>
            </div>

            {/* Hero Photography */}
            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[260px] sm:min-h-[340px] rounded-2xl overflow-hidden bg-[#F1F4F0] border border-[#E2E7E0]">
                <SmartImage
                  src={HERO_IMAGE}
                  alt={copy.brandName}
                  fallbackLabel={copy.brandName}
                  className="w-full h-full lg:h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Full-width 3-column Trust Metrics Strip below Hero Split */}
          <div className="mt-10 pt-8 border-t border-[#E2E7E0] grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#EEF5EE] text-[#0F5E36] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#142218] tabular-nums">
                  {lang === 'ar' ? `أكثر من ${products.length} منتج` : `${products.length}+ ${copy.productsCountSuffix}`}
                </p>
                <p className="text-xs text-[#526056]">{copy.metricFresh}</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#EEF5EE] text-[#0F5E36] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#142218] tabular-nums">
                  {copy.metricDeliveryValue}
                </p>
                <p className="text-xs text-[#526056]">{copy.metricDelivery}</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#EEF5EE] text-[#0F5E36] flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-bold text-[#142218]">{copy.metricPaymentValue}</p>
                <p className="text-xs text-[#526056]">{copy.metricPayment}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Supermarket Departments Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#142218]">
              {copy.categoriesSectionTitle}
            </h2>
            <p className="text-sm text-[#526056] mt-1">{copy.categoriesSectionSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('categories')}
            className="text-sm font-semibold text-[#0F5E36] hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{copy.viewAllCategories}</span>
            <ArrowIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {showcaseCategories.map((cat) => {
            const count = products.filter((p) => p.categoryId === cat.id).length;
            const catTitle = lang === 'ar' ? cat.nameAr : cat.nameEn;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className="group bg-white border border-[#E2E7E0] rounded-xl overflow-hidden text-start transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0F5E36]/40 hover:shadow-sm cursor-pointer"
              >
                <div className="aspect-[4/3] w-full bg-[#F1F4F0] overflow-hidden">
                  <SmartImage
                    src={cat.image}
                    alt={catTitle}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-[#142218] group-hover:text-[#0F5E36] transition-colors truncate">
                    {catTitle}
                  </h3>
                  <p className="text-xs text-[#526056] mt-0.5 tabular-nums">
                    {count} {copy.productsCountSuffix}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: Curated Collection (Best Sellers / Special Offers / New Arrivals / Featured) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EEF2ED] rounded-xl self-start">
            {(
              [
                { id: 'bestsellers', label: copy.tabBestSellers },
                { id: 'offers', label: copy.tabOffers },
                { id: 'newest', label: copy.tabNewArrivals },
                { id: 'featured', label: copy.tabFeatured },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#0F5E36] shadow-sm'
                      : 'text-[#526056] hover:text-[#142218]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="text-sm font-semibold text-[#0F5E36] hover:underline inline-flex items-center gap-1.5 self-start lg:self-auto whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{copy.viewAllProducts}</span>
            <ArrowIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              category={categoryMap.get(product.categoryId)}
              lang={lang}
              onAddToCart={onAddToCart}
              onOpenProduct={onOpenProduct}
            />
          ))}
        </div>
      </section>

      {/* SECTION 4: Supermarket Freshness & Direct Delivery Promise */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-[#EEF5EE] border border-[#D8E5D8] rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#142218] text-balance">
              {copy.promiseTitle}
            </h2>
            <p className="text-sm sm:text-base text-[#3D4B41] leading-relaxed">
              {copy.promiseBody}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={`tel:${settings.phone}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-sm font-semibold transition-colors tabular-nums"
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                <span>{copy.callNow}:</span>
                <span dir="ltr">{settings.phone}</span>
              </a>
              <a
                href={settings.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-[#C9D9C9] hover:border-[#0F5E36] text-[#142218] text-sm font-semibold transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#0F5E36]" aria-hidden="true" />
                <span>{copy.whatsappOrder}</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: copy.promisePoint1Title, desc: copy.promisePoint1Desc },
              { title: copy.promisePoint2Title, desc: copy.promisePoint2Desc },
              { title: copy.promisePoint3Title, desc: copy.promisePoint3Desc },
            ].map((point) => (
              <div
                key={point.title}
                className="bg-white rounded-xl p-5 border border-[#DDE7DD] space-y-2"
              >
                <h3 className="text-sm font-bold text-[#142218]">{point.title}</h3>
                <p className="text-xs text-[#526056] leading-relaxed">{point.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
