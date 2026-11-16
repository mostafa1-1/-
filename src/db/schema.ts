import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export interface OrderItemDb {
  productId: string;
  nameAr: string;
  nameEn: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  image: string;
}

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  role: text('role').notNull().default('customer'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const adminAllowlist = pgTable('admin_allowlist', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const storeSettings = pgTable('store_settings', {
  id: integer('id').primaryKey(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  websiteTitle: text('website_title').notNull(),
  logoUrl: text('logo_url').notNull().default(''),
  phone: text('phone').notNull(),
  whatsappNumber: text('whatsapp_number').notNull(),
  addressAr: text('address_ar').notNull(),
  addressEn: text('address_en').notNull(),
  workingHoursAr: text('working_hours_ar').notNull(),
  workingHoursEn: text('working_hours_en').notNull(),
  deliveryFee: doublePrecision('delivery_fee').notNull().default(25),
  freeDeliveryThreshold: doublePrecision('free_delivery_threshold').notNull().default(500),
  minimumOrderAmount: doublePrecision('minimum_order_amount').notNull().default(100),
  orderingEnabled: boolean('ordering_enabled').notNull().default(true),
  notificationEmail: text('notification_email')
    .notNull()
    .default('mostafaelfoly1000@gmail.com'),
  emailNotificationsEnabled: boolean('email_notifications_enabled')
    .notNull()
    .default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  descriptionAr: text('description_ar').notNull().default(''),
  descriptionEn: text('description_en').notNull().default(''),
  image: text('image').notNull(),
  accentTone: text('accent_tone').notNull().default('bg-[#EEF5EE]'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'restrict' }),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  descriptionAr: text('description_ar').notNull().default(''),
  descriptionEn: text('description_en').notNull().default(''),
  unitAr: text('unit_ar').notNull().default('1 قطعة'),
  unitEn: text('unit_en').notNull().default('1 unit'),
  price: doublePrecision('price').notNull(),
  discountPrice: doublePrecision('discount_price'),
  image: text('image').notNull(),
  stock: integer('stock').notNull().default(0),
  isAvailable: boolean('is_available').notNull().default(true),
  isFeatured: boolean('is_featured').notNull().default(false),
  isBestSeller: boolean('is_best_seller').notNull().default(false),
  isNewArrival: boolean('is_new_arrival').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  idempotencyKey: text('idempotency_key').unique(),
  status: text('status').notNull().default('pending'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  neighborhood: text('neighborhood').notNull(),
  address: text('address').notNull(),
  instructions: text('instructions').notNull().default(''),
  paymentMethod: text('payment_method').notNull().default('cod'),
  subtotal: doublePrecision('subtotal').notNull(),
  deliveryFee: doublePrecision('delivery_fee').notNull(),
  totalSavings: doublePrecision('total_savings').notNull().default(0),
  totalAmount: doublePrecision('total_amount').notNull(),
  items: jsonb('items').$type<OrderItemDb[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const orderNotifications = pgTable('order_notifications', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull(),
  channel: text('channel').notNull(),
  recipient: text('recipient').notNull().default(''),
  status: text('status').notNull(),
  detail: text('detail').notNull().default(''),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mediaUploads = pgTable('media_uploads', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  dataBase64: text('data_base64').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
