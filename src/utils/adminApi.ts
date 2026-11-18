import { auth } from '../lib/firebase';
import type {
  AdminDashboardStats,
  Category,
  NotificationChannelCapabilities,
  Order,
  OrderNotificationRecord,
  OrderStatus,
  Product,
  StoreSettings,
} from '../types/store';
import type { ProductInputPayload } from './adminLogic';
import type { RequiredNotificationEnvKey } from './notificationLogic';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('يرجى تسجيل الدخول بحساب المسؤول أولاً');
  }
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body as T;
}

export interface AdminDashboardPayload {
  stats: AdminDashboardStats;
  orders: Order[];
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  notifications: OrderNotificationRecord[];
  notificationCapabilities: NotificationChannelCapabilities;
}

export const adminApi = {
  verifyMe: () =>
    apiRequest<{ uid: string; email: string; role: string }>('/api/admin/me'),

  getDashboard: () => apiRequest<AdminDashboardPayload>('/api/admin/dashboard'),

  getNotifications: () =>
    apiRequest<{
      notifications: OrderNotificationRecord[];
      capabilities: NotificationChannelCapabilities;
    }>('/api/admin/notifications'),

  markAllNotificationsRead: () =>
    apiRequest<{ ok: boolean }>('/api/admin/notifications/read-all', {
      method: 'POST',
    }),

  sendTestNotification: () =>
    apiRequest<{
      ok: boolean;
      results: OrderNotificationRecord[];
      errors?: { channel: string; status: string; detail: string }[];
    }>('/api/admin/notifications/test', { method: 'POST' }),

  checkNotificationEnv: () =>
    apiRequest<{
      ok: boolean;
      status: Record<RequiredNotificationEnvKey, 'LOADED' | 'MISSING'>;
      missingKeys: string[];
      checkedAt: string;
    }>('/api/admin/notifications/env-check', { method: 'POST' }),

  uploadImageFile: async (file: File): Promise<{ id: string; url: string }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'));
      reader.readAsDataURL(file);
    });

    return apiRequest<{ id: string; url: string }>('/api/admin/upload', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        dataBase64: dataUrl,
      }),
    });
  },

  createProduct: (payload: ProductInputPayload) =>
    apiRequest<Product>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProduct: (id: string, payload: Partial<ProductInputPayload>) =>
    apiRequest<Product>(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteProduct: (id: string) =>
    apiRequest<{ deleted: boolean }>(
      `/api/admin/products/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),

  createCategory: (payload: {
    nameAr: string;
    nameEn?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    image?: string;
  }) =>
    apiRequest<Category>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCategory: (
    id: string,
    payload: {
      nameAr?: string;
      nameEn?: string;
      descriptionAr?: string;
      descriptionEn?: string;
      image?: string;
    }
  ) =>
    apiRequest<Category>(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteCategory: (id: string) =>
    apiRequest<{ deleted: boolean }>(
      `/api/admin/categories/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),

  updateOrderStatus: (orderNumber: string, status: OrderStatus) =>
    apiRequest<Order>(
      `/api/admin/orders/${encodeURIComponent(orderNumber)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    ),

  getSettings: () =>
    apiRequest<{
      settings: StoreSettings;
      allowlist: string[];
      notificationCapabilities: NotificationChannelCapabilities;
    }>('/api/admin/settings'),

  updateSettings: (payload: Partial<StoreSettings>) =>
    apiRequest<StoreSettings>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  addAllowlistEmail: (email: string) =>
    apiRequest<{ allowlist: string[] }>('/api/admin/allowlist', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  removeAllowlistEmail: (email: string) =>
    apiRequest<{ allowlist: string[] }>(
      `/api/admin/allowlist/${encodeURIComponent(email)}`,
      { method: 'DELETE' }
    ),
};
