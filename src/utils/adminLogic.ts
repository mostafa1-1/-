import type {
  AdminDashboardStats,
  Category,
  Language,
  Order,
  OrderStatus,
  Product,
  StoreSettings,
} from '../types/store.ts';
import { getPaymentMethodLabel } from './storeLogic.ts';

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { ar: string; en: string; badgeClass: string }
> = {
  pending: {
    ar: 'قيد الانتظار',
    en: 'Pending',
    badgeClass: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  },
  confirmed: {
    ar: 'تم التأكيد',
    en: 'Confirmed',
    badgeClass: 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]',
  },
  preparing: {
    ar: 'جاري التجهيز',
    en: 'Preparing',
    badgeClass: 'bg-[#E0E7FF] text-[#3730A3] border-[#C7D2FE]',
  },
  out_for_delivery: {
    ar: 'خرج للتوصيل',
    en: 'Out for Delivery',
    badgeClass: 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]',
  },
  delivered: {
    ar: 'تم التسليم',
    en: 'Delivered',
    badgeClass: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
  },
  cancelled: {
    ar: 'ملغي',
    en: 'Cancelled',
    badgeClass: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
  },
};

export function getOrderStatusLabel(status: OrderStatus, lang: Language): string {
  return ORDER_STATUS_META[status]?.[lang] ?? status;
}

export function normalizePhoneDigits(whatsappNumberOrPhone: string): string {
  const digits = whatsappNumberOrPhone.replace(/\D/g, '');
  if (!digits) return '201110688934';
  if (digits.startsWith('01') && digits.length === 11) {
    return `2${digits}`;
  }
  return digits;
}

export function buildWhatsappUrl(whatsappNumberOrPhone: string): string {
  return `https://wa.me/${normalizePhoneDigits(whatsappNumberOrPhone)}`;
}

export function computeDashboardMetrics(
  products: Product[],
  categories: Category[],
  orders: Order[],
  lowStockThreshold = 10
): AdminDashboardStats {
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const completedOrders = orders.filter((o) => o.status === 'delivered').length;
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  const lowStockProducts = products
    .filter((p) => p.stock <= lowStockThreshold)
    .sort((a, b) => a.stock - b.stock);

  const outOfStockCount = products.filter(
    (p) => !p.isAvailable || p.stock <= 0
  ).length;

  const salesMap = new Map<
    string,
    {
      productId: string;
      nameAr: string;
      nameEn: string;
      totalQuantity: number;
      totalSales: number;
    }
  >();

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    for (const item of order.items) {
      const existing = salesMap.get(item.productId);
      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.totalSales =
          Math.round((existing.totalSales + item.lineTotal) * 100) / 100;
      } else {
        salesMap.set(item.productId, {
          productId: item.productId,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          totalQuantity: item.quantity,
          totalSales: item.lineTotal,
        });
      }
    }
  }

  const bestSellingProducts = Array.from(salesMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 6);

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 8);

  return {
    totalProducts: products.length,
    totalCategories: categories.length,
    totalOrders: orders.length,
    pendingOrders,
    completedOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    lowStockProducts,
    outOfStockCount,
    bestSellingProducts,
    recentOrders,
  };
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatOrdersCsv(orders: Order[], lang: Language): string {
  const headers =
    lang === 'ar'
      ? [
          'رقم الطلب',
          'التاريخ',
          'الحالة',
          'طريقة الدفع',
          'مرجع التحويل',
          'اسم العميل',
          'الهاتف',
          'المنطقة',
          'العنوان',
          'المنتجات',
          'المجموع الفرعي',
          'التوصيل',
          'الإجمالي (ج.م)',
        ]
      : [
          'Order Number',
          'Date',
          'Status',
          'Payment Method',
          'Payment Reference',
          'Customer Name',
          'Phone',
          'Neighborhood',
          'Address',
          'Items',
          'Subtotal',
          'Delivery Fee',
          'Total (EGP)',
        ];

  const rows = orders.map((order) => {
    const itemsSummary = order.items
      .map(
        (i) =>
          `${lang === 'ar' ? i.nameAr : i.nameEn} (x${i.quantity})`
      )
      .join(' | ');

    return [
      order.orderNumber,
      order.createdAt,
      getOrderStatusLabel(order.status, lang),
      getPaymentMethodLabel(order.customer.paymentMethod, lang),
      order.customer.paymentReference || '',
      order.customer.fullName,
      order.customer.phone,
      order.customer.neighborhood,
      order.customer.address,
      itemsSummary,
      order.subtotal,
      order.deliveryFee,
      order.totalAmount,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  // UTF-8 BOM ensures Excel opens Arabic characters cleanly
  return `\uFEFF${[headers.map(escapeCsvCell).join(','), ...rows].join('\r\n')}`;
}

export interface ProductInputPayload {
  nameAr: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  unitAr?: string;
  unitEn?: string;
  categoryId: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  image: string;
  sku?: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
}

export function validateProductPayload(
  input: ProductInputPayload
): string | null {
  if (!input.nameAr || input.nameAr.trim().length < 2) {
    return 'اسم المنتج مطلوب (حرفان على الأقل)';
  }
  if (!input.categoryId || !input.categoryId.trim()) {
    return 'يرجى اختيار قسم المنتج';
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return 'سعر المنتج يجب أن يكون أكبر من صفر';
  }
  if (
    input.discountPrice !== null &&
    (!Number.isFinite(input.discountPrice) ||
      input.discountPrice <= 0 ||
      input.discountPrice >= input.price)
  ) {
    return 'سعر الخصم يجب أن يكون أكبر من صفر وأقل من السعر الأصلي';
  }
  if (!Number.isFinite(input.stock) || input.stock < 0) {
    return 'الكمية المتاحة في المخزون يجب أن تكون 0 أو أكثر';
  }
  return null;
}

export function validateCategoryPayload(input: {
  nameAr: string;
  nameEn?: string;
}): string | null {
  if (!input.nameAr || input.nameAr.trim().length < 2) {
    return 'اسم القسم بالعربية مطلوب';
  }
  return null;
}

export function validateSettingsPayload(
  input: Partial<StoreSettings>
): string | null {
  if (!input.nameAr || input.nameAr.trim().length < 2) {
    return 'اسم السوبر ماركت بالعربية مطلوب';
  }
  if (!input.nameEn || input.nameEn.trim().length < 2) {
    return 'اسم السوبر ماركت بالإنجليزية مطلوب';
  }
  if (!input.phone || input.phone.trim().length < 6) {
    return 'رقم الهاتف مطلوب';
  }
  if (
    input.deliveryFee === undefined ||
    !Number.isFinite(input.deliveryFee) ||
    input.deliveryFee < 0
  ) {
    return 'رسوم التوصيل يجب أن تكون 0 أو أكثر';
  }
  if (
    input.minimumOrderAmount === undefined ||
    !Number.isFinite(input.minimumOrderAmount) ||
    input.minimumOrderAmount < 0
  ) {
    return 'الحد الأدنى للطلب يجب أن يكون 0 أو أكثر';
  }
  if (
    input.notificationEmail !== undefined &&
    input.notificationEmail.trim() !== '' &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.notificationEmail.trim())
  ) {
    return 'بريد استلام إشعارات الطلبات غير صالح';
  }
  return null;
}
