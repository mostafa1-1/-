import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  Bell,
  Boxes,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  RefreshCw,
  Settings,
  ShoppingCart,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { auth, googleAuthProvider } from '../../lib/firebase';
import { adminApi, type AdminDashboardPayload } from '../../utils/adminApi';
import { computeDashboardMetrics } from '../../utils/adminLogic';
import { playOrderAlertSound } from '../../utils/soundAlert';
import { formatEGP } from '../../utils/storeLogic';
import type { Order, OrderNotificationRecord } from '../../types/store';
import { AdminOverviewSection } from './AdminOverviewSection';
import { AdminProductsSection } from './AdminProductsSection';
import { AdminCategoriesSection } from './AdminCategoriesSection';
import { AdminOrdersSection } from './AdminOrdersSection';
import { AdminInventorySection } from './AdminInventorySection';
import { AdminSettingsSection } from './AdminSettingsSection';

const SOUND_STORAGE_KEY = 'andalus_admin_sound_v1';

type AdminTab =
  | 'dashboard'
  | 'products'
  | 'add-product'
  | 'categories'
  | 'orders'
  | 'inventory'
  | 'settings';

interface AdminDashboardProps {
  onStoreUpdated: () => Promise<void>;
  onNavigateStorefront: () => void;
}

export function AdminDashboard({
  onStoreUpdated,
  onNavigateStorefront,
}: AdminDashboardProps) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authorizedAdmin, setAuthorizedAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [data, setData] = useState<AdminDashboardPayload | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [notice, setNotice] = useState<{ text: string; isError: boolean } | null>(
    null
  );

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SOUND_STORAGE_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
    } catch {
      // ignore storage errors
    }
  }, [soundEnabled]);

  const [notifOpen, setNotifOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveAlertOrder, setLiveAlertOrder] = useState<Order | null>(null);
  const [focusOrderNumber, setFocusOrderNumber] = useState<string | null>(null);

  const notify = (text: string, isError = false) => {
    setNotice({ text, isError });
    window.setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 3200);
  };

  const loadAdminData = useCallback(async () => {
    setLoadingData(true);
    try {
      const payload = await adminApi.getDashboard();
      setData(payload);
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'تعذر تحميل بيانات لوحة التحكم',
        true
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadAdminData(), onStoreUpdated()]);
  }, [loadAdminData, onStoreUpdated]);

  // Real-time WebSocket connection for instant new order alerts
  useEffect(() => {
    if (!authorizedAdmin || !authUser) return;
    let active = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let attempt = 0;

    const connect = async () => {
      if (!active) return;
      try {
        const token = await authUser.getIdToken();
        if (!active) return;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/admin?token=${encodeURIComponent(token)}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!active) return;
          const wasReconnect = attempt > 0;
          attempt = 0;
          setWsConnected(true);
          if (wasReconnect) {
            void loadAdminData();
          }
        };

        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(String(evt.data)) as {
              type?: string;
              order?: Order;
              notification?: OrderNotificationRecord;
            };
            if (msg.type === 'order:created' && msg.order && msg.notification) {
              const incomingOrder = msg.order;
              const incomingNotif = msg.notification;
              const isTestAlert = incomingOrder.orderNumber.startsWith('TEST-');

              setData((prev) => {
                if (!prev) return prev;
                const alreadyExists = prev.orders.some(
                  (o) => o.orderNumber === incomingOrder.orderNumber
                );
                const nextOrders =
                  isTestAlert || alreadyExists
                    ? prev.orders
                    : [incomingOrder, ...prev.orders];
                const nextNotifications = prev.notifications.some(
                  (n) => n.id === incomingNotif.id
                )
                  ? prev.notifications
                  : [incomingNotif, ...prev.notifications].slice(0, 60);
                const nextStats = computeDashboardMetrics(
                  prev.products,
                  prev.categories,
                  nextOrders
                );
                return {
                  ...prev,
                  orders: nextOrders,
                  notifications: nextNotifications,
                  stats: nextStats,
                };
              });

              setLiveAlertOrder(incomingOrder);
              if (soundEnabledRef.current) {
                playOrderAlertSound();
              }
              if (!isTestAlert) {
                void onStoreUpdated();
              }
            }
          } catch {
            // ignore malformed socket frame
          }
        };

        ws.onclose = () => {
          if (!active) return;
          setWsConnected(false);
          const delay = Math.min(15000, 1500 * Math.pow(2, attempt));
          attempt += 1;
          reconnectTimer = window.setTimeout(connect, delay);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        setWsConnected(false);
      }
    };

    void connect();

    return () => {
      active = false;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      ws?.close();
      setWsConnected(false);
    };
  }, [authorizedAdmin, authUser, loadAdminData, onStoreUpdated]);

  const unreadInAppCount = useMemo(() => {
    if (!data) return 0;
    return data.notifications.filter(
      (n) => n.channel === 'in_app' && !n.isRead
    ).length;
  }, [data]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      playOrderAlertSound();
      notify('تم تفعيل صوت التنبيه للطلبات الجديدة');
    } else {
      notify('تم كتم صوت التنبيهات');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await adminApi.markAllNotificationsRead();
      setData((prev) =>
        prev
          ? {
              ...prev,
              notifications: prev.notifications.map((n) => ({
                ...n,
                isRead: true,
              })),
            }
          : prev
      );
    } catch {
      // ignore
    }
  };

  const handleOpenOrderFromNotif = (orderNumber: string) => {
    setNotifOpen(false);
    setLiveAlertOrder(null);
    setFocusOrderNumber(orderNumber);
    setActiveTab('orders');
  };

  useEffect(() => {
    const prevDir = document.documentElement.dir;
    const prevLang = document.documentElement.lang;
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
    return () => {
      document.documentElement.dir = prevDir;
      document.documentElement.lang = prevLang;
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setAuthError(null);
      if (!user) {
        setAuthorizedAdmin(false);
        setData(null);
        setAuthReady(true);
        return;
      }

      try {
        await adminApi.verifyMe();
        setAuthorizedAdmin(true);
        setAuthReady(true);
        await loadAdminData();
      } catch (err) {
        setAuthorizedAdmin(false);
        setAuthError(
          err instanceof Error
            ? err.message
            : 'هذا الحساب غير مصرح له بالدخول إلى لوحة الإدارة'
        );
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [loadAdminData]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'تعذر إتمام تسجيل الدخول عبر Google'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setAuthorizedAdmin(false);
    setData(null);
  };

  const sidebarItems: {
    id: AdminTab;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'products', label: 'إدارة المنتجات', icon: Package },
    { id: 'add-product', label: 'إضافة منتج', icon: PlusCircle },
    { id: 'categories', label: 'الأقسام', icon: FolderTree },
    {
      id: 'orders',
      label: 'الطلبات',
      icon: ShoppingCart,
      badge: data?.stats.pendingOrders || undefined,
    },
    {
      id: 'inventory',
      label: 'المخزون',
      icon: Boxes,
      badge: data?.stats.lowStockProducts.length || undefined,
    },
    { id: 'settings', label: 'إعدادات الموقع', icon: Settings },
  ];

  // Loading auth state
  if (!authReady) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#F9FAF8] flex items-center justify-center p-6"
      >
        <div className="bg-white border border-[#E2E7E0] rounded-2xl p-8 text-center space-y-3 max-w-sm w-full">
          <div className="w-10 h-10 border-2 border-[#0F5E36] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#526056]">
            جاري التحقق من صلاحيات الإدارة...
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated or Unauthorized Admin Login Gate
  if (!authUser || !authorizedAdmin) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#F9FAF8] flex items-center justify-center p-4"
      >
        <div className="bg-white border border-[#E2E7E0] rounded-2xl p-8 sm:p-10 max-w-md w-full space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EEF5EE] text-[#0F5E36] flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="font-display text-2xl font-bold text-[#142218]">
              لوحة تحكم سوبر ماركت الأندلس
            </h1>
            <p className="text-sm text-[#526056] leading-relaxed">
              منطقة مخصصة لإدارة المنتجات، الأسعار، الطلبات، وإعدادات المتجر. يرجى تسجيل
              الدخول بحساب المسؤول المصرح له.
            </p>
          </div>

          {authError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-xs font-medium text-[#991B1B]"
            >
              {authError}
            </div>
          )}

          {authUser && !authorizedAdmin ? (
            <div className="space-y-3">
              <p className="text-xs text-center text-[#526056]" dir="ltr">
                Signed in as: {authUser.email}
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3 px-4 rounded-xl bg-[#142218] text-white text-sm font-semibold cursor-pointer"
              >
                تسجيل الخروج والمحاولة بحساب آخر
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={signingIn}
              onClick={handleGoogleSignIn}
              className="w-full py-3.5 px-5 rounded-xl bg-[#0F5E36] hover:bg-[#0B4A2A] disabled:opacity-60 text-white text-sm font-bold transition-colors cursor-pointer"
            >
              {signingIn ? 'جاري فتح نافذة تسجيل الدخول...' : 'تسجيل الدخول بحساب Google للمسؤول'}
            </button>
          )}

          <div className="pt-4 border-t border-[#EEF2ED] text-center">
            <button
              type="button"
              onClick={onNavigateStorefront}
              className="text-xs font-semibold text-[#0F5E36] hover:underline cursor-pointer"
            >
              العودة إلى متجر العملاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentTabMeta = sidebarItems.find((i) => i.id === activeTab);

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5F7F4] flex text-[#142218]">
      {/* Desktop Sidebar (260px) */}
      <aside className="no-print hidden lg:flex w-[260px] bg-white border-e border-[#E2E7E0] flex-col shrink-0 sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-[#E2E7E0]">
          <p className="font-display text-lg font-bold text-[#0F5E36] truncate">
            {data?.settings.nameAr || 'سوبر ماركت الأندلس'}
          </p>
          <p className="text-xs text-[#526056] mt-0.5 truncate" dir="ltr">
            {authUser.email}
          </p>
        </div>

        <nav aria-label="قائمة الإدارة" className="flex-1 p-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0F5E36] text-white'
                    : 'text-[#3D4B41] hover:bg-[#F1F4F0] hover:text-[#142218]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded tabular-nums ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-[#FEF3C7] text-[#92400E]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#E2E7E0] space-y-1.5">
          <button
            type="button"
            onClick={onNavigateStorefront}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#0F5E36] hover:bg-[#EEF5EE] cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>عرض موقع العملاء</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#B91C1C] hover:bg-[#FEE2E2] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#142218]/45"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 w-72 bg-white h-full flex flex-col border-e border-[#E2E7E0]">
            <div className="px-4 py-4 border-b border-[#E2E7E0] flex items-center justify-between">
              <span className="font-display font-bold text-[#0F5E36]">
                لوحة الإدارة
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F1F4F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                      active
                        ? 'bg-[#0F5E36] text-white'
                        : 'text-[#3D4B41] hover:bg-[#F1F4F0]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-[#E2E7E0] space-y-1.5">
              <button
                type="button"
                onClick={onNavigateStorefront}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#0F5E36]"
              >
                <ExternalLink className="w-4 h-4" />
                <span>عرض موقع العملاء</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#B91C1C]"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print bg-white border-b border-[#E2E7E0] px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="فتح القائمة"
              className="lg:hidden p-2 rounded-lg border border-[#E2E7E0]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg sm:text-xl font-bold text-[#142218]">
              {currentTabMeta?.label}
            </h1>
          </div>

          <div className="flex items-center gap-2 relative">
            <button
              type="button"
              onClick={handleToggleSound}
              aria-label={soundEnabled ? 'كتم صوت التنبيهات' : 'تفعيل صوت التنبيهات'}
              title={soundEnabled ? 'صوت التنبيه مفعّل' : 'صوت التنبيه مكتوم'}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                soundEnabled
                  ? 'border-[#C9DEC9] bg-[#EEF5EE] text-[#0F5E36]'
                  : 'border-[#E2E7E0] bg-white text-[#526056]'
              }`}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {soundEnabled ? 'الصوت مفعّل' : 'الصوت مكتوم'}
              </span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label="إشعارات الطلبات"
                className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#E2E7E0] hover:border-[#0F5E36] bg-white text-[#142218] cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {(unreadInAppCount > 0 || (data?.stats.pendingOrders || 0) > 0) && (
                  <span
                    data-testid="admin-notif-badge"
                    className="absolute -top-1.5 -end-1.5 min-w-[20px] h-5 px-1 rounded-full bg-[#B91C1C] text-white text-[11px] font-bold flex items-center justify-center tabular-nums"
                  >
                    {unreadInAppCount > 0
                      ? unreadInAppCount
                      : data?.stats.pendingOrders}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute top-12 end-0 w-80 sm:w-96 bg-white border border-[#E2E7E0] rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E2E7E0] flex items-center justify-between bg-[#F9FAF8]">
                    <div>
                      <p className="text-sm font-bold text-[#142218]">
                        إشعارات الطلبات
                      </p>
                      <p className="text-[11px] text-[#526056]">
                        {wsConnected
                          ? 'متصل فوري بالخادم'
                          : 'جاري المزامنة مع الخادم...'}
                      </p>
                    </div>
                    {unreadInAppCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-[#0F5E36] hover:underline cursor-pointer"
                      >
                        تحديد الكل كمقروء
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-[#EEF2ED]">
                    {!data ||
                    data.notifications.filter((n) => n.channel === 'in_app').length ===
                      0 ? (
                      <div className="p-6 text-center text-xs text-[#526056]">
                        لا توجد تنبيهات طلبات بعد.
                      </div>
                    ) : (
                      data.notifications
                        .filter((n) => n.channel === 'in_app')
                        .slice(0, 15)
                        .map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3.5 text-xs space-y-1.5 ${
                              notif.isRead ? 'bg-white' : 'bg-[#EEF5EE]/60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                dir="ltr"
                                className="font-bold text-[#0F5E36] tabular-nums"
                              >
                                {notif.orderNumber}
                              </span>
                              <span className="text-[11px] text-[#526056]">
                                {new Date(notif.createdAt).toLocaleString('ar-EG', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>
                            <p className="text-[#3D4B41] whitespace-pre-line line-clamp-3 leading-relaxed">
                              {notif.detail}
                            </p>
                            {!notif.orderNumber.startsWith('TEST-') && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenOrderFromNotif(notif.orderNumber)
                                }
                                className="text-[11px] font-bold text-[#0F5E36] hover:underline cursor-pointer"
                              >
                                فتح تفاصيل الطلب ←
                              </button>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={refreshAll}
              disabled={loadingData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E2E7E0] hover:border-[#0F5E36] text-xs font-semibold text-[#142218] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>
            <button
              type="button"
              onClick={onNavigateStorefront}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#EEF5EE] text-[#0F5E36] text-xs font-bold cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>المتجر</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {liveAlertOrder && (
            <div
              role="alert"
              className="no-print mb-5 p-4 rounded-2xl bg-[#0F5E36] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md"
            >
              <div className="space-y-1">
                <p className="text-sm font-bold">
                  تنبيه طلب جديد وارد الآن:{' '}
                  <span dir="ltr" className="tabular-nums underline">
                    {liveAlertOrder.orderNumber}
                  </span>
                </p>
                <p className="text-xs text-[#D5EBD8]">
                  {liveAlertOrder.customer.fullName} ·{' '}
                  <span dir="ltr">{liveAlertOrder.customer.phone}</span> ·{' '}
                  {liveAlertOrder.customer.neighborhood} — الإجمالي:{' '}
                  <strong className="tabular-nums">
                    {formatEGP(liveAlertOrder.totalAmount, 'ar')}
                  </strong>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!liveAlertOrder.orderNumber.startsWith('TEST-') && (
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenOrderFromNotif(liveAlertOrder.orderNumber)
                    }
                    className="px-3.5 py-2 rounded-xl bg-white text-[#0F5E36] text-xs font-bold cursor-pointer"
                  >
                    عرض الطلب والفاتورة
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLiveAlertOrder(null)}
                  aria-label="إغلاق التنبيه"
                  className="p-2 rounded-lg hover:bg-white/15 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {notice && (
            <div
              role="status"
              className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium border ${
                notice.isError
                  ? 'bg-[#FEE2E2] border-[#FECACA] text-[#991B1B]'
                  : 'bg-[#EEF5EE] border-[#C9DEC9] text-[#0F5E36]'
              }`}
            >
              {notice.text}
            </div>
          )}

          {!data ? (
            <div className="bg-white border border-[#E2E7E0] rounded-xl p-12 text-center text-sm text-[#526056]">
              جاري تحميل بيانات السوبر ماركت...
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <AdminOverviewSection
                  stats={data.stats}
                  onGoToOrders={() => setActiveTab('orders')}
                  onGoToInventory={() => setActiveTab('inventory')}
                />
              )}

              {(activeTab === 'products' || activeTab === 'add-product') && (
                <AdminProductsSection
                  products={data.products}
                  categories={data.categories}
                  mode={activeTab === 'add-product' ? 'add' : 'list'}
                  onSwitchToAdd={() => setActiveTab('add-product')}
                  onSwitchToList={() => setActiveTab('products')}
                  onRefresh={refreshAll}
                  onNotify={notify}
                />
              )}

              {activeTab === 'categories' && (
                <AdminCategoriesSection
                  categories={data.categories}
                  products={data.products}
                  onRefresh={refreshAll}
                  onNotify={notify}
                />
              )}

              {activeTab === 'orders' && (
                <AdminOrdersSection
                  orders={data.orders}
                  notifications={data.notifications}
                  initialOrderNumber={focusOrderNumber}
                  onClearInitialOrder={() => setFocusOrderNumber(null)}
                  onRefresh={refreshAll}
                  onNotify={notify}
                />
              )}

              {activeTab === 'inventory' && (
                <AdminInventorySection
                  products={data.products}
                  onRefresh={refreshAll}
                  onNotify={notify}
                />
              )}

              {activeTab === 'settings' && (
                <AdminSettingsSection
                  settings={data.settings}
                  notificationCapabilities={data.notificationCapabilities}
                  onRefresh={refreshAll}
                  onNotify={notify}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
