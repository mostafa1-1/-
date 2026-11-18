import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { db, pool } from './index.ts';
import {
  adminAllowlist,
  categories,
  mediaUploads,
  orderNotifications,
  orders,
  products,
  storeSettings,
  users,
  type OrderItemDb,
} from './schema.ts';
import { CATEGORIES, INITIAL_PRODUCTS, STORE_SETTINGS } from '../data/catalog.ts';
import type {
  Category,
  CheckoutFormInput,
  NotificationChannel,
  NotificationDeliveryStatus,
  Order,
  OrderNotificationRecord,
  OrderStatus,
  PaymentMethod,
  Product,
  StoreSettings,
} from '../types/store.ts';
import { buildWhatsappUrl, type ProductInputPayload } from '../utils/adminLogic.ts';
import {
  generateOrderNumber,
  getEffectivePrice,
  isValidPaymentMethod,
  validateCheckoutForm,
} from '../utils/storeLogic.ts';

let seedPromise: Promise<void> | null = null;
let seeded = false;

async function ensureOrdersSchemaAligned(): Promise<void> {
  try {
    const colCheck = await pool.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'orders'
         AND column_name IN ('idempotency_key', 'payment_method', 'payment_reference')`
    );
    const present = new Set(colCheck.rows.map((r) => r.column_name));
    const missingIdempotency = !present.has('idempotency_key');
    const missingPaymentMethod = !present.has('payment_method');
    const missingPaymentRef = !present.has('payment_reference');

    if (!missingIdempotency && !missingPaymentMethod && !missingPaymentRef) {
      return;
    }

    const statements: string[] = [];
    if (missingIdempotency) {
      statements.push(
        `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotency_key" text;`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_unique" ON "orders" ("idempotency_key");`
      );
    }
    if (missingPaymentMethod) {
      statements.push(
        `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_method" text NOT NULL DEFAULT 'cod';`
      );
    }
    if (missingPaymentRef) {
      statements.push(
        `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_reference" text NOT NULL DEFAULT '';`
      );
    }

    const ddlPool =
      process.env.SQL_ADMIN_USER && process.env.SQL_ADMIN_PASSWORD
        ? new Pool({
            host: process.env.SQL_HOST,
            user: process.env.SQL_ADMIN_USER,
            password: process.env.SQL_ADMIN_PASSWORD,
            database: process.env.SQL_DB_NAME,
            max: 2,
            connectionTimeoutMillis: 10000,
          })
        : null;

    try {
      const targetPool = ddlPool || pool;
      for (const sql of statements) {
        await targetPool.query(sql);
      }
      console.log('Synchronized missing orders columns:', {
        missingIdempotency,
        missingPaymentMethod,
        missingPaymentRef,
      });
    } finally {
      if (ddlPool) {
        await ddlPool.end();
      }
    }
  } catch (err) {
    console.warn(
      'Unable to auto-align orders columns at startup (run drizzle-kit push if needed):',
      err instanceof Error ? err.message : err
    );
  }
}

export async function ensureInitialSeed(): Promise<void> {
  if (seeded) return;
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      await ensureOrdersSchemaAligned();

      const existingSettings = await db
        .select({ id: storeSettings.id })
        .from(storeSettings)
        .limit(1);

      if (existingSettings.length === 0) {
        await db
          .insert(storeSettings)
          .values({
            id: 1,
            nameAr: STORE_SETTINGS.nameAr,
            nameEn: STORE_SETTINGS.nameEn,
            websiteTitle: STORE_SETTINGS.websiteTitle,
            logoUrl: STORE_SETTINGS.logoUrl,
            phone: STORE_SETTINGS.phone,
            whatsappNumber: STORE_SETTINGS.whatsappNumber,
            addressAr: STORE_SETTINGS.addressAr,
            addressEn: STORE_SETTINGS.addressEn,
            workingHoursAr: STORE_SETTINGS.workingHoursAr,
            workingHoursEn: STORE_SETTINGS.workingHoursEn,
            deliveryFee: STORE_SETTINGS.deliveryFee,
            freeDeliveryThreshold: STORE_SETTINGS.freeDeliveryThreshold,
            minimumOrderAmount: STORE_SETTINGS.minimumOrderAmount,
            orderingEnabled: STORE_SETTINGS.orderingEnabled,
            notificationEmail:
              process.env.OWNER_NOTIFICATION_EMAIL ||
              process.env.ADMIN_EMAIL ||
              'mostafaelfoly1000@gmail.com',
            emailNotificationsEnabled: true,
          })
          .onConflictDoNothing();
      }

      const existingCategories = await db
        .select({ id: categories.id })
        .from(categories)
        .limit(1);

      if (existingCategories.length === 0) {
        await db
          .insert(categories)
          .values(
            CATEGORIES.map((c, idx) => ({
              id: c.id,
              slug: c.slug,
              nameAr: c.nameAr,
              nameEn: c.nameEn,
              descriptionAr: c.descriptionAr,
              descriptionEn: c.descriptionEn,
              image: c.image,
              accentTone: c.accentTone,
              sortOrder: idx,
            }))
          )
          .onConflictDoNothing();
      }

      const existingProducts = await db
        .select({ id: products.id })
        .from(products)
        .limit(1);

      if (existingProducts.length === 0) {
        await db
          .insert(products)
          .values(
            INITIAL_PRODUCTS.map((p) => ({
              id: p.id,
              sku: p.sku,
              categoryId: p.categoryId,
              nameAr: p.nameAr,
              nameEn: p.nameEn,
              descriptionAr: p.descriptionAr,
              descriptionEn: p.descriptionEn,
              unitAr: p.unitAr,
              unitEn: p.unitEn,
              price: p.price,
              discountPrice: p.discountPrice,
              image: p.image,
              stock: p.stock,
              isAvailable: p.isAvailable,
              isFeatured: p.isFeatured,
              isBestSeller: p.isBestSeller,
              isNewArrival: p.isNewArrival,
            }))
          )
          .onConflictDoNothing();
      }

      const bootstrapEmail = (
        process.env.ADMIN_EMAIL || 'mostafaelfoly1000@gmail.com'
      ).toLowerCase();
      await db
        .insert(adminAllowlist)
        .values({ email: bootstrapEmail })
        .onConflictDoNothing();

      seeded = true;
    } catch (error) {
      seedPromise = null;
      console.error('Database initial seed failed:', error);
      throw new Error('Failed to initialize store database.', { cause: error });
    }
  })();

  return seedPromise;
}

function mapSettingsRow(
  row: typeof storeSettings.$inferSelect,
  includePrivate = false
): StoreSettings {
  const base: StoreSettings = {
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    websiteTitle: row.websiteTitle,
    logoUrl: row.logoUrl,
    phone: row.phone,
    whatsappNumber: row.whatsappNumber,
    whatsappUrl: buildWhatsappUrl(row.whatsappNumber || row.phone),
    deliveryFee: row.deliveryFee,
    freeDeliveryThreshold: row.freeDeliveryThreshold,
    minimumOrderAmount: row.minimumOrderAmount,
    orderingEnabled: row.orderingEnabled,
    workingHoursAr: row.workingHoursAr,
    workingHoursEn: row.workingHoursEn,
    addressAr: row.addressAr,
    addressEn: row.addressEn,
  };
  if (includePrivate) {
    base.notificationEmail = row.notificationEmail;
    base.emailNotificationsEnabled = row.emailNotificationsEnabled;
  }
  return base;
}

function mapCategoryRow(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    slug: row.slug,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    descriptionAr: row.descriptionAr,
    descriptionEn: row.descriptionEn,
    image: row.image,
    accentTone: row.accentTone,
    sortOrder: row.sortOrder,
  };
}

function mapProductRow(row: typeof products.$inferSelect): Product {
  return {
    id: row.id,
    sku: row.sku,
    categoryId: row.categoryId,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    descriptionAr: row.descriptionAr,
    descriptionEn: row.descriptionEn,
    unitAr: row.unitAr,
    unitEn: row.unitEn,
    price: row.price,
    discountPrice: row.discountPrice ?? null,
    image: row.image,
    stock: row.stock,
    isAvailable: row.isAvailable,
    isFeatured: row.isFeatured,
    isBestSeller: row.isBestSeller,
    isNewArrival: row.isNewArrival,
  };
}

function mapOrderRow(row: typeof orders.$inferSelect): Order {
  return {
    orderNumber: row.orderNumber,
    createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
    status: row.status as OrderStatus,
    customer: {
      fullName: row.customerName,
      phone: row.customerPhone,
      neighborhood: row.neighborhood,
      address: row.address,
      instructions: row.instructions,
      paymentMethod: isValidPaymentMethod(row.paymentMethod)
        ? (row.paymentMethod as PaymentMethod)
        : 'cod',
      paymentReference: row.paymentReference || '',
    },
    items: row.items,
    subtotal: row.subtotal,
    deliveryFee: row.deliveryFee,
    totalSavings: row.totalSavings,
    totalAmount: row.totalAmount,
  };
}

export async function getPublicStoreData(): Promise<{
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
}> {
  await ensureInitialSeed();
  try {
    const [settingsRows, categoryRows, productRows] = await Promise.all([
      db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1),
      db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.nameEn)),
      db.select().from(products).orderBy(desc(products.createdAt)),
    ]);

    return {
      settings: settingsRows[0] ? mapSettingsRow(settingsRows[0]) : STORE_SETTINGS,
      categories: categoryRows.map(mapCategoryRow),
      products: productRows.map(mapProductRow),
    };
  } catch (error) {
    console.error('Database query failed in getPublicStoreData:', error);
    throw new Error('Failed to load store catalog.', { cause: error });
  }
}

export async function getAdminStoreSettings(): Promise<StoreSettings> {
  await ensureInitialSeed();
  const rows = await db
    .select()
    .from(storeSettings)
    .where(eq(storeSettings.id, 1))
    .limit(1);
  return rows[0] ? mapSettingsRow(rows[0], true) : STORE_SETTINGS;
}

export async function createCustomerOrder(payload: {
  customer: CheckoutFormInput;
  items: { productId: string; quantity: number }[];
  lang?: 'ar' | 'en';
  idempotencyKey?: string;
}): Promise<{ order: Order; isNew: boolean; settings: StoreSettings }> {
  await ensureInitialSeed();
  const lang = payload?.lang === 'en' ? 'en' : 'ar';

  if (!payload || !payload.customer || typeof payload.customer !== 'object') {
    throw Object.assign(
      new Error(lang === 'ar' ? 'بيانات العميل مطلوبة' : 'Customer details are required'),
      { statusCode: 400 }
    );
  }

  const cleanIdempotencyKey =
    typeof payload.idempotencyKey === 'string' && payload.idempotencyKey.trim()
      ? payload.idempotencyKey.trim().slice(0, 128)
      : null;

  const validationErrors = validateCheckoutForm(payload.customer, lang);
  if (Object.keys(validationErrors).length > 0) {
    const firstMsg = Object.values(validationErrors)[0] || 'Invalid checkout fields';
    throw Object.assign(new Error(firstMsg), { statusCode: 400 });
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw Object.assign(
      new Error(lang === 'ar' ? 'سلة التسوق فارغة' : 'Shopping cart is empty'),
      { statusCode: 400 }
    );
  }

  try {
    if (cleanIdempotencyKey) {
      const existingOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.idempotencyKey, cleanIdempotencyKey))
        .limit(1);
      if (existingOrder[0]) {
        return {
          order: mapOrderRow(existingOrder[0]),
          isNew: false,
          settings: STORE_SETTINGS,
        };
      }
    }

    let settingsForNotification: StoreSettings = STORE_SETTINGS;

    const createdOrder = await db.transaction(async (tx) => {
      if (cleanIdempotencyKey) {
        const dup = await tx
          .select()
          .from(orders)
          .where(eq(orders.idempotencyKey, cleanIdempotencyKey))
          .limit(1);
        if (dup[0]) {
          return { order: mapOrderRow(dup[0]), isNew: false };
        }
      }

      const [settingsRow] = await tx
        .select()
        .from(storeSettings)
        .where(eq(storeSettings.id, 1))
        .limit(1);

      const settings = settingsRow ? mapSettingsRow(settingsRow, true) : STORE_SETTINGS;
      settingsForNotification = settings;
      if (!settings.orderingEnabled) {
        throw Object.assign(
          new Error(
            lang === 'ar'
              ? 'الطلبات الإلكترونية متوقفة مؤقتاً من الإدارة'
              : 'Online ordering is temporarily paused by the store'
          ),
          { statusCode: 400 }
        );
      }

      const productIds = payload.items.map((i) => i.productId);
      const dbProducts = await tx
        .select()
        .from(products)
        .where(inArray(products.id, productIds));

      const productMap = new Map(dbProducts.map((p) => [p.id, p]));
      const orderItems: OrderItemDb[] = [];
      let subtotal = 0;
      let originalSubtotal = 0;

      for (const reqItem of payload.items) {
        const qty = Math.floor(Number(reqItem.quantity));
        if (!Number.isFinite(qty) || qty <= 0) {
          throw Object.assign(new Error('Invalid item quantity'), { statusCode: 400 });
        }

        const dbProd = productMap.get(reqItem.productId);
        if (!dbProd || !dbProd.isAvailable || dbProd.stock <= 0) {
          throw Object.assign(
            new Error(
              lang === 'ar'
                ? `المنتج "${dbProd?.nameAr || reqItem.productId}" غير متوفر حالياً`
                : `Product "${dbProd?.nameEn || reqItem.productId}" is currently unavailable`
            ),
            { statusCode: 400 }
          );
        }

        if (qty > dbProd.stock) {
          throw Object.assign(
            new Error(
              lang === 'ar'
                ? `الكمية المطلوبة من "${dbProd.nameAr}" غير متوفرة (المتاح: ${dbProd.stock})`
                : `Requested quantity for "${dbProd.nameEn}" exceeds stock (${dbProd.stock})`
            ),
            { statusCode: 400 }
          );
        }

        const mappedProd = mapProductRow(dbProd);
        const unitPrice = getEffectivePrice(mappedProd);
        const lineTotal = Math.round(unitPrice * qty * 100) / 100;
        subtotal += lineTotal;
        originalSubtotal += dbProd.price * qty;

        orderItems.push({
          productId: dbProd.id,
          nameAr: dbProd.nameAr,
          nameEn: dbProd.nameEn,
          unitPrice,
          quantity: qty,
          lineTotal,
          image: dbProd.image,
        });

        const nextStock = dbProd.stock - qty;
        await tx
          .update(products)
          .set({
            stock: nextStock,
            isAvailable: nextStock > 0 ? dbProd.isAvailable : false,
            updatedAt: new Date(),
          })
          .where(eq(products.id, dbProd.id));
      }

      subtotal = Math.round(subtotal * 100) / 100;
      originalSubtotal = Math.round(originalSubtotal * 100) / 100;
      const totalSavings = Math.max(
        0,
        Math.round((originalSubtotal - subtotal) * 100) / 100
      );

      if (subtotal < settings.minimumOrderAmount) {
        throw Object.assign(
          new Error(
            lang === 'ar'
              ? `الحد الأدنى للطلب هو ${settings.minimumOrderAmount} ج.م`
              : `Minimum order amount is ${settings.minimumOrderAmount} EGP`
          ),
          { statusCode: 400 }
        );
      }

      const deliveryFee =
        subtotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryFee;
      const totalAmount = Math.round((subtotal + deliveryFee) * 100) / 100;
      const orderNumber = generateOrderNumber();

      const normalizedPaymentMethod: PaymentMethod = isValidPaymentMethod(
        payload.customer.paymentMethod
      )
        ? payload.customer.paymentMethod
        : 'cod';
      const normalizedPaymentRef = (payload.customer.paymentReference || '')
        .trim()
        .slice(0, 80);

      const [inserted] = await tx
        .insert(orders)
        .values({
          orderNumber,
          idempotencyKey: cleanIdempotencyKey,
          status: 'pending',
          customerName: payload.customer.fullName.trim(),
          customerPhone: payload.customer.phone.trim(),
          neighborhood: payload.customer.neighborhood.trim(),
          address: payload.customer.address.trim(),
          instructions: (payload.customer.instructions || '').trim(),
          paymentMethod: normalizedPaymentMethod,
          paymentReference: normalizedPaymentRef,
          subtotal,
          deliveryFee,
          totalSavings,
          totalAmount,
          items: orderItems,
        })
        .returning();

      return { order: mapOrderRow(inserted), isNew: true };
    });

    return {
      order: createdOrder.order,
      isNew: createdOrder.isNew,
      settings: settingsForNotification,
    };
  } catch (error: unknown) {
    const pgCode =
      error && typeof error === 'object'
        ? (error as { code?: string; cause?: { code?: string } }).code ||
          (error as { cause?: { code?: string } }).cause?.code
        : undefined;

    if (pgCode === '23505' && cleanIdempotencyKey) {
      const existing = await db
        .select()
        .from(orders)
        .where(eq(orders.idempotencyKey, cleanIdempotencyKey))
        .limit(1);
      if (existing[0]) {
        return {
          order: mapOrderRow(existing[0]),
          isNew: false,
          settings: STORE_SETTINGS,
        };
      }
    }

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    console.error('Failed to create order:', error);
    throw new Error('Failed to submit your order. Please try again.', {
      cause: error,
    });
  }
}

// ---------- ADMIN REPOSITORY OPERATIONS ----------

export async function createProductRecord(input: ProductInputPayload): Promise<Product> {
  await ensureInitialSeed();
  try {
    const id = `prod-${crypto.randomUUID().slice(0, 8)}`;
    const sku = input.sku?.trim() || `AND-${Math.floor(100 + Math.random() * 900)}`;
    const stock = Math.max(0, Math.floor(input.stock));
    const isAvailable = stock > 0 ? (input.isAvailable ?? true) : false;

    const [inserted] = await db
      .insert(products)
      .values({
        id,
        sku,
        categoryId: input.categoryId,
        nameAr: input.nameAr.trim(),
        nameEn: (input.nameEn || input.nameAr).trim(),
        descriptionAr: (input.descriptionAr || '').trim(),
        descriptionEn: (input.descriptionEn || input.descriptionAr || '').trim(),
        unitAr: (input.unitAr || '1 قطعة').trim(),
        unitEn: (input.unitEn || input.unitAr || '1 unit').trim(),
        price: Number(input.price),
        discountPrice: input.discountPrice !== null ? Number(input.discountPrice) : null,
        image:
          input.image?.trim() ||
          '/src/assets/images/prod_pantry_grains_1794823233769.jpg',
        stock,
        isAvailable,
        isFeatured: Boolean(input.isFeatured),
        isBestSeller: Boolean(input.isBestSeller),
        isNewArrival: input.isNewArrival ?? true,
      })
      .returning();

    return mapProductRow(inserted);
  } catch (error) {
    console.error('Failed to create product:', error);
    throw new Error('Failed to create product.', { cause: error });
  }
}

export async function updateProductRecord(
  id: string,
  input: Partial<ProductInputPayload>
): Promise<Product> {
  await ensureInitialSeed();
  try {
    const existing = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    if (!existing[0]) {
      throw Object.assign(new Error('Product not found'), { statusCode: 404 });
    }

    const current = existing[0];
    const nextStock =
      input.stock !== undefined ? Math.max(0, Math.floor(input.stock)) : current.stock;
    const nextAvailable =
      nextStock <= 0
        ? false
        : input.isAvailable !== undefined
        ? input.isAvailable
        : current.isAvailable;

    const [updated] = await db
      .update(products)
      .set({
        sku: input.sku !== undefined ? input.sku.trim() : current.sku,
        categoryId:
          input.categoryId !== undefined ? input.categoryId : current.categoryId,
        nameAr: input.nameAr !== undefined ? input.nameAr.trim() : current.nameAr,
        nameEn: input.nameEn !== undefined ? input.nameEn.trim() : current.nameEn,
        descriptionAr:
          input.descriptionAr !== undefined
            ? input.descriptionAr.trim()
            : current.descriptionAr,
        descriptionEn:
          input.descriptionEn !== undefined
            ? input.descriptionEn.trim()
            : current.descriptionEn,
        unitAr: input.unitAr !== undefined ? input.unitAr.trim() : current.unitAr,
        unitEn: input.unitEn !== undefined ? input.unitEn.trim() : current.unitEn,
        price: input.price !== undefined ? Number(input.price) : current.price,
        discountPrice:
          input.discountPrice !== undefined
            ? input.discountPrice !== null
              ? Number(input.discountPrice)
              : null
            : current.discountPrice,
        image: input.image !== undefined ? input.image.trim() : current.image,
        stock: nextStock,
        isAvailable: nextAvailable,
        isFeatured:
          input.isFeatured !== undefined ? input.isFeatured : current.isFeatured,
        isBestSeller:
          input.isBestSeller !== undefined ? input.isBestSeller : current.isBestSeller,
        isNewArrival:
          input.isNewArrival !== undefined ? input.isNewArrival : current.isNewArrival,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    return mapProductRow(updated);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error;
    console.error('Failed to update product:', error);
    throw new Error('Failed to update product.', { cause: error });
  }
}

export async function deleteProductRecord(id: string): Promise<void> {
  await ensureInitialSeed();
  try {
    const deleted = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });
    if (deleted.length === 0) {
      throw Object.assign(new Error('Product not found'), { statusCode: 404 });
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error;
    console.error('Failed to delete product:', error);
    throw new Error('Failed to delete product.', { cause: error });
  }
}

export async function createCategoryRecord(input: {
  nameAr: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  image?: string;
}): Promise<Category> {
  await ensureInitialSeed();
  try {
    const slugBase = (input.nameEn || input.nameAr)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const id = `cat-${crypto.randomUUID().slice(0, 6)}`;
    const slug = slugBase ? `${slugBase}-${id.slice(-4)}` : id;

    const existingCats = await db.select({ id: categories.id }).from(categories);
    const [inserted] = await db
      .insert(categories)
      .values({
        id,
        slug,
        nameAr: input.nameAr.trim(),
        nameEn: (input.nameEn || input.nameAr).trim(),
        descriptionAr: (input.descriptionAr || '').trim(),
        descriptionEn: (input.descriptionEn || input.descriptionAr || '').trim(),
        image:
          input.image?.trim() ||
          '/src/assets/images/prod_fruits_vegetables_1794823232575.jpg',
        accentTone: 'bg-[#EEF5EE]',
        sortOrder: existingCats.length,
      })
      .returning();

    return mapCategoryRow(inserted);
  } catch (error) {
    console.error('Failed to create category:', error);
    throw new Error('Failed to create category.', { cause: error });
  }
}

export async function updateCategoryRecord(
  id: string,
  input: {
    nameAr?: string;
    nameEn?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    image?: string;
  }
): Promise<Category> {
  await ensureInitialSeed();
  try {
    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    if (!existing[0]) {
      throw Object.assign(new Error('Category not found'), { statusCode: 404 });
    }
    const cur = existing[0];
    const [updated] = await db
      .update(categories)
      .set({
        nameAr: input.nameAr !== undefined ? input.nameAr.trim() : cur.nameAr,
        nameEn: input.nameEn !== undefined ? input.nameEn.trim() : cur.nameEn,
        descriptionAr:
          input.descriptionAr !== undefined
            ? input.descriptionAr.trim()
            : cur.descriptionAr,
        descriptionEn:
          input.descriptionEn !== undefined
            ? input.descriptionEn.trim()
            : cur.descriptionEn,
        image: input.image !== undefined ? input.image.trim() : cur.image,
      })
      .where(eq(categories.id, id))
      .returning();

    return mapCategoryRow(updated);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error;
    console.error('Failed to update category:', error);
    throw new Error('Failed to update category.', { cause: error });
  }
}

export async function deleteCategoryRecord(id: string): Promise<void> {
  await ensureInitialSeed();
  try {
    const linkedProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.categoryId, id))
      .limit(1);

    if (linkedProducts.length > 0) {
      throw Object.assign(
        new Error(
          'لا يمكن حذف قسم يحتوي على منتجات حالية. يرجى نقل أو حذف المنتجات أولاً.'
        ),
        { statusCode: 409 }
      );
    }

    const deleted = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning({ id: categories.id });
    if (deleted.length === 0) {
      throw Object.assign(new Error('Category not found'), { statusCode: 404 });
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error;
    console.error('Failed to delete category:', error);
    throw new Error('Failed to delete category.', { cause: error });
  }
}

export async function listAllOrders(): Promise<Order[]> {
  await ensureInitialSeed();
  try {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
    return rows.map(mapOrderRow);
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    throw new Error('Failed to load orders.', { cause: error });
  }
}

export async function updateOrderStatusRecord(
  orderNumber: string,
  nextStatus: OrderStatus
): Promise<Order> {
  await ensureInitialSeed();
  try {
    const existing = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);
    if (!existing[0]) {
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    }

    const [updated] = await db
      .update(orders)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.orderNumber, orderNumber))
      .returning();

    return mapOrderRow(updated);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error;
    console.error('Failed to update order status:', error);
    throw new Error('Failed to update order status.', { cause: error });
  }
}

export async function updateStoreSettingsRecord(
  input: Partial<StoreSettings>
): Promise<StoreSettings> {
  await ensureInitialSeed();
  try {
    const existing = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.id, 1))
      .limit(1);
    const cur = existing[0];

    const phone = input.phone !== undefined ? input.phone.trim() : cur?.phone || '01110688934';
    const whatsappNumber =
      input.whatsappNumber !== undefined
        ? input.whatsappNumber.trim()
        : cur?.whatsappNumber || phone;

    const [updated] = await db
      .update(storeSettings)
      .set({
        nameAr: input.nameAr !== undefined ? input.nameAr.trim() : cur.nameAr,
        nameEn: input.nameEn !== undefined ? input.nameEn.trim() : cur.nameEn,
        websiteTitle:
          input.websiteTitle !== undefined
            ? input.websiteTitle.trim()
            : cur.websiteTitle,
        logoUrl: input.logoUrl !== undefined ? input.logoUrl.trim() : cur.logoUrl,
        phone,
        whatsappNumber,
        addressAr:
          input.addressAr !== undefined ? input.addressAr.trim() : cur.addressAr,
        addressEn:
          input.addressEn !== undefined ? input.addressEn.trim() : cur.addressEn,
        workingHoursAr:
          input.workingHoursAr !== undefined
            ? input.workingHoursAr.trim()
            : cur.workingHoursAr,
        workingHoursEn:
          input.workingHoursEn !== undefined
            ? input.workingHoursEn.trim()
            : cur.workingHoursEn,
        deliveryFee:
          input.deliveryFee !== undefined
            ? Number(input.deliveryFee)
            : cur.deliveryFee,
        freeDeliveryThreshold:
          input.freeDeliveryThreshold !== undefined
            ? Number(input.freeDeliveryThreshold)
            : cur.freeDeliveryThreshold,
        minimumOrderAmount:
          input.minimumOrderAmount !== undefined
            ? Number(input.minimumOrderAmount)
            : cur.minimumOrderAmount,
        orderingEnabled:
          input.orderingEnabled !== undefined
            ? Boolean(input.orderingEnabled)
            : cur.orderingEnabled,
        notificationEmail:
          input.notificationEmail !== undefined
            ? input.notificationEmail.trim().toLowerCase()
            : cur.notificationEmail,
        emailNotificationsEnabled:
          input.emailNotificationsEnabled !== undefined
            ? Boolean(input.emailNotificationsEnabled)
            : cur.emailNotificationsEnabled,
        updatedAt: new Date(),
      })
      .where(eq(storeSettings.id, 1))
      .returning();

    return mapSettingsRow(updated, true);
  } catch (error) {
    console.error('Failed to update settings:', error);
    throw new Error('Failed to update website settings.', { cause: error });
  }
}

export async function listOrderNotifications(
  limit = 60
): Promise<OrderNotificationRecord[]> {
  await ensureInitialSeed();
  try {
    const rows = await db
      .select()
      .from(orderNotifications)
      .orderBy(desc(orderNotifications.createdAt))
      .limit(limit);
    return rows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      channel: row.channel as NotificationChannel,
      recipient: row.recipient,
      status: row.status as NotificationDeliveryStatus,
      detail: row.detail,
      isRead: row.isRead,
      createdAt: row.createdAt
        ? row.createdAt.toISOString()
        : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to list order notifications:', error);
    throw new Error('Failed to load order notifications.', { cause: error });
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  await ensureInitialSeed();
  try {
    await db
      .update(orderNotifications)
      .set({ isRead: true })
      .where(eq(orderNotifications.isRead, false));
  } catch (error) {
    console.error('Failed to mark notifications read:', error);
    throw new Error('Failed to update notification read status.', { cause: error });
  }
}

export async function saveUploadedMedia(input: {
  filename: string;
  mimeType: string;
  dataBase64: string;
}): Promise<{ id: string; url: string }> {
  try {
    const id = `media-${crypto.randomUUID().slice(0, 12)}`;
    await db.insert(mediaUploads).values({
      id,
      filename: input.filename.slice(0, 120),
      mimeType: input.mimeType,
      dataBase64: input.dataBase64,
    });
    return { id, url: `/api/media/${id}` };
  } catch (error) {
    console.error('Failed to save uploaded media:', error);
    throw new Error('Failed to save uploaded image.', { cause: error });
  }
}

export async function getUploadedMedia(id: string) {
  try {
    const rows = await db
      .select()
      .from(mediaUploads)
      .where(eq(mediaUploads.id, id))
      .limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error('Failed to load media:', error);
    throw new Error('Failed to retrieve image.', { cause: error });
  }
}

export async function listAdminAllowlist(): Promise<string[]> {
  await ensureInitialSeed();
  try {
    const rows = await db.select().from(adminAllowlist).orderBy(asc(adminAllowlist.email));
    return rows.map((r) => r.email);
  } catch (error) {
    console.error('Failed to list admin allowlist:', error);
    throw new Error('Failed to list authorized admins.', { cause: error });
  }
}

export async function addAdminAllowlistEmail(email: string): Promise<string[]> {
  await ensureInitialSeed();
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw Object.assign(new Error('البريد الإلكتروني غير صالح'), { statusCode: 400 });
  }
  try {
    await db
      .insert(adminAllowlist)
      .values({ email: normalized })
      .onConflictDoNothing();
    return listAdminAllowlist();
  } catch (error) {
    console.error('Failed to add admin allowlist email:', error);
    throw new Error('Failed to authorize admin email.', { cause: error });
  }
}

export async function removeAdminAllowlistEmail(email: string): Promise<string[]> {
  await ensureInitialSeed();
  const normalized = email.trim().toLowerCase();
  const bootstrapEmail = (
    process.env.ADMIN_EMAIL || 'mostafaelfoly1000@gmail.com'
  ).toLowerCase();
  if (normalized === bootstrapEmail) {
    throw Object.assign(
      new Error('لا يمكن إزالة حساب مالك المتجر الأساسي'),
      { statusCode: 400 }
    );
  }
  try {
    await db.delete(adminAllowlist).where(eq(adminAllowlist.email, normalized));
    return listAdminAllowlist();
  } catch (error) {
    console.error('Failed to remove admin allowlist email:', error);
    throw new Error('Failed to remove admin email.', { cause: error });
  }
}

export async function getAllOwnerAdminEmails(): Promise<{
  roleEmails: string[];
  allowlistEmails: string[];
}> {
  await ensureInitialSeed();
  try {
    const [roleRows, allowlistRows] = await Promise.all([
      db
        .select({ email: users.email })
        .from(users)
        .where(sql`lower(${users.role}) in ('owner', 'admin')`),
      db.select({ email: adminAllowlist.email }).from(adminAllowlist),
    ]);
    return {
      roleEmails: roleRows.map((r) => r.email),
      allowlistEmails: allowlistRows.map((r) => r.email),
    };
  } catch (error) {
    console.error('Failed to load owner/admin notification recipients:', error);
    return { roleEmails: [], allowlistEmails: [] };
  }
}
