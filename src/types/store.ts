export type Language = 'ar' | 'en';

export type RouteView =
  | 'home'
  | 'shop'
  | 'categories'
  | 'offers'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'confirmation'
  | 'about'
  | 'contact'
  | 'admin'
  | 'not-found';

export interface Category {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  image: string;
  accentTone: string;
  sortOrder?: number;
}

export interface Product {
  id: string;
  sku: string;
  categoryId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  unitAr: string;
  unitEn: string;
  price: number;
  discountPrice: number | null;
  image: string;
  stock: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface StoreSettings {
  nameAr: string;
  nameEn: string;
  websiteTitle: string;
  logoUrl: string;
  phone: string;
  whatsappNumber: string;
  whatsappUrl: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  minimumOrderAmount: number;
  orderingEnabled: boolean;
  workingHoursAr: string;
  workingHoursEn: string;
  addressAr: string;
  addressEn: string;
  notificationEmail?: string;
  emailNotificationsEnabled?: boolean;
}

export interface CheckoutFormInput {
  fullName: string;
  phone: string;
  neighborhood: string;
  address: string;
  instructions: string;
  paymentMethod: 'cod';
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  nameAr: string;
  nameEn: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  image: string;
}

export interface Order {
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  customer: CheckoutFormInput;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalSavings: number;
  totalAmount: number;
}

export type ProductSortOption =
  | 'featured'
  | 'bestsellers'
  | 'price-asc'
  | 'price-desc'
  | 'newest';

export interface ProductFilterOptions {
  query?: string;
  categoryId?: string | null;
  onlyDiscounted?: boolean;
  onlyAvailable?: boolean;
  sortBy?: ProductSortOption;
}

export interface AdminDashboardStats {
  totalProducts: number;
  totalCategories: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  lowStockProducts: Product[];
  outOfStockCount: number;
  bestSellingProducts: {
    productId: string;
    nameAr: string;
    nameEn: string;
    totalQuantity: number;
    totalSales: number;
  }[];
  recentOrders: Order[];
}

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp_cloud';
export type NotificationDeliveryStatus = 'sent' | 'failed' | 'unconfigured';

export interface OrderNotificationRecord {
  id: number;
  orderNumber: string;
  channel: NotificationChannel;
  recipient: string;
  status: NotificationDeliveryStatus;
  detail: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationChannelCapabilities {
  inAppRealtime: boolean;
  emailProvider: 'resend' | 'smtp' | 'none';
  emailConfigured: boolean;
  whatsappCloudConfigured: boolean;
  ownerNotificationEmail: string;
  whatsappPublicNumber: string;
}

