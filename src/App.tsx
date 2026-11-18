import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import type {
  CartItem,
  Category,
  CheckoutFormInput,
  Language,
  Order,
  Product,
  ProductSortOption,
  RouteView,
  StoreSettings,
} from './types/store';
import { STORE_SETTINGS } from './data/catalog';
import { t } from './data/translations';
import { calculateCartTotals, isProductPurchasable } from './utils/storeLogic';
import { buildWhatsappUrl } from './utils/adminLogic';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { HomePage } from './components/HomePage';
import { ShopPage } from './components/ShopPage';
import { CategoriesPage } from './components/CategoriesPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CartPage } from './components/CartPage';
import { CheckoutPage } from './components/CheckoutPage';
import { OrderConfirmationPage } from './components/OrderConfirmationPage';
import { AboutPage, ContactPage, NotFoundPage } from './components/AboutContactPages';
import { AdminDashboard } from './components/admin/AdminDashboard';

const CART_STORAGE_KEY = 'andalus_cart_v1';
const LANG_STORAGE_KEY = 'andalus_lang_v1';

function parseRouteString(rawPath: string): { view: RouteView; productId: string | null } {
  const raw = rawPath.replace(/^[/#]+|\/+$/g, '').trim();
  if (!raw || raw === 'home') return { view: 'home', productId: null };
  if (raw === 'shop') return { view: 'shop', productId: null };
  if (raw === 'categories') return { view: 'categories', productId: null };
  if (raw === 'offers') return { view: 'offers', productId: null };
  if (raw === 'cart') return { view: 'cart', productId: null };
  if (raw === 'checkout') return { view: 'checkout', productId: null };
  if (raw === 'confirmation') return { view: 'confirmation', productId: null };
  if (raw === 'about') return { view: 'about', productId: null };
  if (raw === 'contact') return { view: 'contact', productId: null };
  if (raw === 'admin') return { view: 'admin', productId: null };
  if (raw.startsWith('product/')) {
    const id = decodeURIComponent(raw.slice('product/'.length));
    return { view: 'product', productId: id || null };
  }
  return { view: 'not-found', productId: null };
}

function parseCurrentRoute(): { view: RouteView; productId: string | null } {
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (pathname) {
    return parseRouteString(pathname);
  }
  if (window.location.hash) {
    return parseRouteString(window.location.hash);
  }
  return { view: 'home', productId: null };
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      return saved === 'en' ? 'en' : 'ar';
    } catch {
      return 'ar';
    }
  });

  const [route, setRoute] = useState<RouteView>(() => parseCurrentRoute().view);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    () => parseCurrentRoute().productId
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(STORE_SETTINGS);
  const [storeLoaded, setStoreLoaded] = useState(false);
  const [storeLoadError, setStoreLoadError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const cartHydratedRef = useRef(false);
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  const rotateIdempotencyKey = useCallback(() => {
    const next =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setCheckoutIdempotencyKey(next);
  }, []);

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [orderAlertToast, setOrderAlertToast] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Shop filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState<ProductSortOption>('featured');

  const reconcileCartWithProducts = useCallback((liveProducts: Product[]) => {
    const productMap = new Map(liveProducts.map((p) => [p.id, p]));
    if (!cartHydratedRef.current) {
      cartHydratedRef.current = true;
      try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved) as { productId: string; quantity: number }[];
        const hydrated = parsed
          .map((entry) => {
            const liveProd = productMap.get(entry.productId);
            if (!liveProd || !isProductPurchasable(liveProd)) return null;
            return {
              product: liveProd,
              quantity: Math.max(1, Math.min(liveProd.stock, entry.quantity)),
            };
          })
          .filter((x): x is CartItem => x !== null);
        setCart(hydrated);
      } catch {
        // ignore storage parse issues
      }
      return;
    }

    setCart((prev) =>
      prev
        .map((item) => {
          const liveProd = productMap.get(item.product.id);
          if (!liveProd || !isProductPurchasable(liveProd)) return null;
          return {
            product: liveProd,
            quantity: Math.max(1, Math.min(liveProd.stock, item.quantity)),
          };
        })
        .filter((x): x is CartItem => x !== null)
    );
  }, []);

  const refreshStoreData = useCallback(async () => {
    try {
      const response = await fetch('/api/store', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('معلش مش عارفين نوصل لسيرفر المتجر دلوقتي');
      }
      const data = (await response.json()) as {
        settings: StoreSettings;
        categories: Category[];
        products: Product[];
      };
      setSettings(data.settings);
      setCategories(data.categories);
      setProducts(data.products);
      reconcileCartWithProducts(data.products);
      setStoreLoadError(null);
      setStoreLoaded(true);
    } catch (err) {
      setStoreLoadError(
        err instanceof Error ? err.message : 'معلش حصل مشكلة في تحميل المنتجات'
      );
      setStoreLoaded(true);
    }
  }, [reconcileCartWithProducts]);

  useEffect(() => {
    void refreshStoreData();
  }, [refreshStoreData]);

  // Refresh catalog automatically when tab regains focus so admin edits reflect immediately
  useEffect(() => {
    const onFocus = () => {
      if (route !== 'admin') {
        void refreshStoreData();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshStoreData, route]);

  // Sync HTML dir, lang, and document title
  useEffect(() => {
    if (route === 'admin') {
      document.documentElement.lang = 'ar';
      document.documentElement.dir = 'rtl';
      document.title = `لوحة الإدارة | ${settings.websiteTitle || settings.nameAr}`;
      return;
    }
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title =
      settings.websiteTitle ||
      (lang === 'ar' ? settings.nameAr : settings.nameEn);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore storage errors
    }
  }, [lang, route, settings.nameAr, settings.nameEn, settings.websiteTitle]);

  // Persist cart in localStorage once hydrated from live DB products
  useEffect(() => {
    if (!cartHydratedRef.current) return;
    try {
      const minimal = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(minimal));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  // Listen to browser popstate / hashchange
  useEffect(() => {
    const onLocationChange = () => {
      const parsed = parseCurrentRoute();
      setRoute(parsed.view);
      setSelectedProductId(parsed.productId);
    };
    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);
    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }, []);

  const navigate = useCallback(
    (nextRoute: RouteView, productId: string | null = null) => {
      setRoute(nextRoute);
      setSelectedProductId(productId);
      setCheckoutError(null);

      const targetPath =
        nextRoute === 'home'
          ? '/'
          : nextRoute === 'product' && productId
          ? `/product/${encodeURIComponent(productId)}`
          : `/${nextRoute}`;

      if (window.location.pathname !== targetPath || window.location.hash) {
        window.history.pushState({}, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const handleAddToCart = (product: Product, quantity: number) => {
    if (!isProductPurchasable(product)) return;
    rotateIdempotencyKey();
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + quantity);
        return prev.map((item) =>
          item.product.id === product.id
            ? { product, quantity: nextQty }
            : item
        );
      }
      return [...prev, { product, quantity: Math.min(product.stock, quantity) }];
    });
    const title = lang === 'ar' ? product.nameAr : product.nameEn;
    showToast(
      lang === 'ar' ? `حطينا "${title}" في السلة` : `Added "${title}" to your cart`
    );
  };

  const handleUpdateQty = (productId: string, quantity: number) => {
    rotateIdempotencyKey();
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(item.product.stock, quantity) }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    rotateIdempotencyKey();
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    rotateIdempotencyKey();
    setCart([]);
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setOnlyDiscounted(false);
    navigate('shop');
  };

  const handleSearchFromHero = (query: string) => {
    setSearchQuery(query);
    setSelectedCategoryId(null);
    navigate('shop');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId(null);
    setOnlyDiscounted(false);
    setOnlyAvailable(false);
    setSortBy('featured');
  };

  const handlePlaceOrder = async (customer: CheckoutFormInput) => {
    if (isPlacingOrder) return;
    setIsPlacingOrder(true);
    setCheckoutError(null);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          lang,
          idempotencyKey: checkoutIdempotencyKey,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          (payload as { error?: string }).error ||
          (lang === 'ar'
            ? 'معلش الطلب متحفظش.. جرب تبعته تاني.'
            : 'Could not save your order to the database. Please try again.');
        setCheckoutError(message);
        await refreshStoreData();
        return;
      }

      const createdOrder = payload as Order & {
        notificationErrors?: { channel: string; status: string; detail: string }[];
      };
      if (!createdOrder || !createdOrder.orderNumber) {
        setCheckoutError(
          lang === 'ar'
            ? 'حصل رد مش متوقع من السيرفر.. اتأكد من طلبك أو كلمنا على التليفون.'
            : 'Unexpected server response. Please verify your order or call us.'
        );
        return;
      }

      if (createdOrder.notificationErrors && createdOrder.notificationErrors.length > 0) {
        const errDetails = createdOrder.notificationErrors
          .map((e) => `[${e.channel}: ${e.status}] ${e.detail}`)
          .join(' | ');
        const alertMsg =
          lang === 'ar'
            ? `طلبك اتسجل، بس بعض تنبيهات المتجر موصلتش: ${errDetails}`
            : `Order saved, but store notification delivery reported errors: ${errDetails}`;
        setOrderAlertToast(alertMsg);
        window.setTimeout(() => {
          setOrderAlertToast((prev) => (prev === alertMsg ? null : prev));
        }, 9000);
      }

      setLastOrder(createdOrder);
      setCart([]);
      rotateIdempotencyKey();
      void refreshStoreData();
      navigate('confirmation');
    } catch {
      setCheckoutError(
        lang === 'ar'
          ? 'مفيش اتصال بالسيرفر دلوقتي.. جرب تبعت طلبك تاني.'
          : 'Network error while submitting your order. Your order was not confirmed.'
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const totals = useMemo(() => calculateCartTotals(cart, settings), [cart, settings]);
  const copy = t(lang);

  if (route === 'admin') {
    return (
      <AdminDashboard
        onStoreUpdated={refreshStoreData}
        onNavigateStorefront={() => {
          void refreshStoreData();
          navigate('home');
        }}
      />
    );
  }

  const selectedProduct = selectedProductId
    ? products.find((p) => p.id === selectedProductId) || null
    : null;

  const relatedProducts = selectedProduct
    ? products
        .filter(
          (p) => p.categoryId === selectedProduct.categoryId && p.id !== selectedProduct.id
        )
        .slice(0, 4)
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAF8] text-[#142218]">
      <Header
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
        activeRoute={route}
        onNavigate={(r) => {
          if (r === 'offers') {
            setOnlyDiscounted(true);
            setSelectedCategoryId(null);
          } else if (r === 'shop') {
            setOnlyDiscounted(false);
          }
          navigate(r);
        }}
        cartCount={totals.itemCount}
        onOpenCart={() => setCartDrawerOpen(true)}
        settings={settings}
      />

      <main className="flex-1">
        {!storeLoaded ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-[#0F5E36] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-[#526056]">
              {lang === 'ar'
                ? 'بنجهزلك منتجات سوبر ماركت الأندلس...'
                : 'Loading Al Andalus Supermarket catalog...'}
            </p>
          </div>
        ) : storeLoadError && products.length === 0 ? (
          <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
            <div className="bg-white border border-[#E2E7E0] rounded-2xl p-8 space-y-4">
              <p className="text-sm font-semibold text-[#B91C1C]">{storeLoadError}</p>
              <button
                type="button"
                onClick={() => void refreshStoreData()}
                className="px-5 py-2.5 rounded-xl bg-[#0F5E36] text-white text-sm font-semibold cursor-pointer"
              >
                {lang === 'ar' ? 'جرّب تاني' : 'Retry'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {route === 'home' && (
              <HomePage
                lang={lang}
                settings={settings}
                categories={categories}
                products={products}
                onNavigate={(r) => navigate(r)}
                onSearchSubmit={handleSearchFromHero}
                onSelectCategory={handleSelectCategory}
                onOpenProduct={(id) => navigate('product', id)}
                onAddToCart={handleAddToCart}
              />
            )}

            {(route === 'shop' || route === 'offers') && (
              <ShopPage
                lang={lang}
                categories={categories}
                products={products}
                searchQuery={searchQuery}
                selectedCategoryId={selectedCategoryId}
                onlyDiscounted={onlyDiscounted}
                onlyAvailable={onlyAvailable}
                sortBy={sortBy}
                onSearchChange={setSearchQuery}
                onCategoryChange={setSelectedCategoryId}
                onToggleDiscounted={setOnlyDiscounted}
                onToggleAvailable={setOnlyAvailable}
                onSortChange={setSortBy}
                onResetFilters={handleResetFilters}
                onAddToCart={handleAddToCart}
                onOpenProduct={(id) => navigate('product', id)}
                isOffersView={route === 'offers'}
              />
            )}

            {route === 'categories' && (
              <CategoriesPage
                lang={lang}
                categories={categories}
                products={products}
                onSelectCategory={handleSelectCategory}
              />
            )}

            {route === 'product' &&
              (selectedProduct ? (
                <ProductDetailPage
                  key={selectedProduct.id}
                  product={selectedProduct}
                  category={categories.find((c) => c.id === selectedProduct.categoryId)}
                  relatedProducts={relatedProducts}
                  categories={categories}
                  lang={lang}
                  settings={settings}
                  onAddToCart={handleAddToCart}
                  onOpenProduct={(id) => navigate('product', id)}
                  onBackToShop={() => navigate('shop')}
                />
              ) : (
                <NotFoundPage lang={lang} onBackHome={() => navigate('home')} />
              ))}

            {route === 'cart' && (
              <CartPage
                lang={lang}
                items={cart}
                settings={settings}
                onUpdateQty={handleUpdateQty}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                onProceedToCheckout={() => navigate('checkout')}
                onBrowseShop={() => navigate('shop')}
              />
            )}

            {route === 'checkout' && (
              <CheckoutPage
                lang={lang}
                items={cart}
                settings={settings}
                onPlaceOrder={handlePlaceOrder}
                onBrowseShop={() => navigate('shop')}
                isSubmitting={isPlacingOrder}
                serverError={checkoutError}
              />
            )}

            {route === 'confirmation' &&
              (lastOrder ? (
                <OrderConfirmationPage
                  lang={lang}
                  order={lastOrder}
                  settings={settings}
                  onContinueShopping={() => navigate('shop')}
                />
              ) : (
                <NotFoundPage lang={lang} onBackHome={() => navigate('home')} />
              ))}

            {route === 'about' && (
              <AboutPage
                lang={lang}
                settings={settings}
                onBrowseShop={() => navigate('shop')}
              />
            )}

            {route === 'contact' && <ContactPage lang={lang} settings={settings} />}

            {route === 'not-found' && (
              <NotFoundPage lang={lang} onBackHome={() => navigate('home')} />
            )}
          </>
        )}
      </main>

      <Footer
        lang={lang}
        settings={settings}
        categories={categories}
        onNavigate={(r) => navigate(r)}
        onSelectCategory={handleSelectCategory}
      />

      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        lang={lang}
        items={cart}
        settings={settings}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onViewCartPage={() => navigate('cart')}
        onProceedToCheckout={() => navigate('checkout')}
        onBrowseShop={() => navigate('shop')}
      />

      {/* Direct WhatsApp Floating Button (+201110688934) */}
      <a
        href={`${buildWhatsappUrl(settings.whatsappNumber || '+201110688934')}?text=${encodeURIComponent(
          lang === 'ar'
            ? `أهلاً ${settings.nameAr}، عاوز أسأل أو أطلب أوردر على واتساب`
            : `Hello ${settings.nameEn}, I would like to inquire or place an order`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={lang === 'ar' ? 'كلمنا على واتساب +201110688934' : 'Chat on WhatsApp +201110688934'}
        data-testid="floating-whatsapp-btn"
        className="no-print fixed bottom-5 end-5 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#0F5E36] hover:bg-[#0B4A2A] text-white text-sm font-bold shadow-lg transition-colors"
      >
        <MessageCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">{copy.whatsappOrder}</span>
      </a>

      {/* Order notification API warning toast */}
      {orderAlertToast && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="order-notification-error-toast"
          className="no-print fixed bottom-20 start-5 end-5 sm:end-auto sm:w-[32rem] sm:max-w-[calc(100vw-2.5rem)] z-50 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs sm:text-sm font-medium px-4 py-3 rounded-xl shadow-lg flex items-start justify-between gap-3"
        >
          <span className="min-w-0 flex-1 whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed">
            {orderAlertToast}
          </span>
          <button
            type="button"
            onClick={() => setOrderAlertToast(null)}
            aria-label={lang === 'ar' ? 'إغلاق التنبيه' : 'Dismiss alert'}
            className="text-xs font-bold text-[#991B1B] hover:underline cursor-pointer shrink-0 p-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Non-intrusive cart feedback toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-5 start-5 z-50 bg-[#142218] text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-3"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setCartDrawerOpen(true)}
            className="text-xs font-bold text-[#A7F3D0] hover:underline cursor-pointer whitespace-nowrap shrink-0"
          >
            {copy.viewFullCart}
          </button>
        </div>
      )}
    </div>
  );
}
