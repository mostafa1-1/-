import express from 'express';
import http from 'node:http';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import {
  addAdminAllowlistEmail,
  createCategoryRecord,
  createCustomerOrder,
  createProductRecord,
  deleteCategoryRecord,
  deleteProductRecord,
  getAdminStoreSettings,
  getPublicStoreData,
  getUploadedMedia,
  listAdminAllowlist,
  listAllOrders,
  listOrderNotifications,
  markAllNotificationsRead,
  removeAdminAllowlistEmail,
  saveUploadedMedia,
  updateCategoryRecord,
  updateOrderStatusRecord,
  updateProductRecord,
  updateStoreSettingsRecord,
} from './src/db/repository.ts';
import {
  requireAdmin,
  verifyAdminBearerToken,
  type AuthRequest,
} from './src/middleware/auth.ts';
import {
  computeDashboardMetrics,
  validateCategoryPayload,
  validateProductPayload,
  validateSettingsPayload,
} from './src/utils/adminLogic.ts';
import { getNotificationChannelCapabilities } from './src/utils/notificationLogic.ts';
import {
  dispatchNewOrderNotifications,
  registerNotificationBroadcaster,
} from './src/services/notifications.ts';
import type { Order, OrderStatus } from './src/types/store.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

const VALID_ORDER_STATUSES = new Set<OrderStatus>([
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
]);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '8mb' }));

  // ---------- PUBLIC APIs ----------

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/store', async (_req, res) => {
    try {
      const data = await getPublicStoreData();
      res.set('Cache-Control', 'no-store');
      res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load store';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/media/:id', async (req, res) => {
    try {
      const media = await getUploadedMedia(req.params.id);
      if (!media) {
        return res.status(404).send('Not found');
      }
      const buffer = Buffer.from(media.dataBase64, 'base64');
      res.setHeader('Content-Type', media.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(buffer);
    } catch {
      res.status(500).send('Failed to load image');
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      const order = await createCustomerOrder(req.body);
      res.status(201).json(order);
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode: number }).statusCode)
          : 500;
      const message = error instanceof Error ? error.message : 'Order failed';
      res.status(status).json({ error: message });
    }
  });

  // ---------- PROTECTED ADMIN APIs ----------

  app.get('/api/admin/me', requireAdmin, (req: AuthRequest, res) => {
    res.json({
      uid: req.dbUser?.uid,
      email: req.dbUser?.email,
      role: req.dbUser?.role,
    });
  });

  app.get('/api/admin/dashboard', requireAdmin, async (_req, res) => {
    try {
      const [store, adminSettings, orders, notifications] = await Promise.all([
        getPublicStoreData(),
        getAdminStoreSettings(),
        listAllOrders(),
        listOrderNotifications(60),
      ]);
      const stats = computeDashboardMetrics(
        store.products,
        store.categories,
        orders
      );
      const notificationCapabilities = getNotificationChannelCapabilities(
        process.env,
        adminSettings
      );
      res.json({
        stats,
        orders,
        products: store.products,
        categories: store.categories,
        settings: adminSettings,
        notifications,
        notificationCapabilities,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Dashboard load failed';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/admin/notifications', requireAdmin, async (_req, res) => {
    try {
      const [notifications, adminSettings] = await Promise.all([
        listOrderNotifications(60),
        getAdminStoreSettings(),
      ]);
      res.json({
        notifications,
        capabilities: getNotificationChannelCapabilities(process.env, adminSettings),
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load notifications';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/admin/notifications/read-all', requireAdmin, async (_req, res) => {
    try {
      await markAllNotificationsRead();
      res.json({ ok: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to mark read';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/admin/notifications/test', requireAdmin, async (_req, res) => {
    try {
      const adminSettings = await getAdminStoreSettings();
      const testOrder: Order = {
        orderNumber: `TEST-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString(),
        status: 'pending',
        customer: {
          fullName: 'عميل تجريبي (اختبار التنبيهات)',
          phone: adminSettings.phone,
          neighborhood: 'اختبار النظام',
          address: 'رسالة اختبار فورية لقنوات التنبيه',
          instructions: 'هذا تنبيه تجريبي من لوحة الإدارة ولا يُضاف كطلب بيع فعلي',
          paymentMethod: 'cod',
        },
        items: [
          {
            productId: 'test-item',
            nameAr: 'منتج اختبار التنبيهات',
            nameEn: 'Notification Test Item',
            unitPrice: 150,
            quantity: 1,
            lineTotal: 150,
            image: '',
          },
        ],
        subtotal: 150,
        deliveryFee: 0,
        totalSavings: 0,
        totalAmount: 150,
      };
      const results = await dispatchNewOrderNotifications(testOrder, adminSettings);
      res.json({ ok: true, results });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Test notification failed';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/admin/upload', requireAdmin, async (req, res) => {
    try {
      const { filename, mimeType, dataBase64 } = req.body || {};
      if (!filename || !mimeType || !dataBase64) {
        return res.status(400).json({ error: 'بيانات الصورة غير مكتملة' });
      }
      if (!ALLOWED_IMAGE_MIME.has(mimeType)) {
        return res.status(400).json({
          error: 'صيغة الصورة غير مدعومة. المسموح: PNG, JPG, WEBP, GIF, SVG',
        });
      }
      const cleanBase64 = String(dataBase64).replace(/^data:[^;]+;base64,/, '');
      const byteLength = Buffer.byteLength(cleanBase64, 'base64');
      if (byteLength > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'الحد الأقصى لحجم الصورة 5 ميجابايت' });
      }
      const saved = await saveUploadedMedia({
        filename: String(filename),
        mimeType: String(mimeType),
        dataBase64: cleanBase64,
      });
      res.status(201).json(saved);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/admin/products', requireAdmin, async (_req, res) => {
    try {
      const store = await getPublicStoreData();
      res.json(store.products);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      const validationErr = validateProductPayload(req.body);
      if (validationErr) {
        return res.status(400).json({ error: validationErr });
      }
      const created = await createProductRecord(req.body);
      res.status(201).json(created);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Create product failed';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      if (req.body.nameAr !== undefined || req.body.price !== undefined) {
        const validationErr = validateProductPayload({
          nameAr: req.body.nameAr ?? 'valid',
          categoryId: req.body.categoryId ?? 'fruits-veg',
          price: req.body.price ?? 1,
          discountPrice:
            req.body.discountPrice !== undefined ? req.body.discountPrice : null,
          stock: req.body.stock ?? 0,
          image: req.body.image ?? '',
        });
        if (validationErr) {
          return res.status(400).json({ error: validationErr });
        }
      }
      const updated = await updateProductRecord(req.params.id, req.body);
      res.json(updated);
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode: number }).statusCode)
          : 500;
      const message = error instanceof Error ? error.message : 'Update product failed';
      res.status(status).json({ error: message });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      await deleteProductRecord(req.params.id);
      res.json({ deleted: true });
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode: number }).statusCode)
          : 500;
      const message = error instanceof Error ? error.message : 'Delete product failed';
      res.status(status).json({ error: message });
    }
  });

  app.get('/api/admin/categories', requireAdmin, async (_req, res) => {
    try {
      const store = await getPublicStoreData();
      res.json(store.categories);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/admin/categories', requireAdmin, async (req, res) => {
    try {
      const err = validateCategoryPayload(req.body);
      if (err) return res.status(400).json({ error: err });
      const created = await createCategoryRecord(req.body);
      res.status(201).json(created);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Create category failed';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    try {
      if (req.body.nameAr !== undefined) {
        const err = validateCategoryPayload({ nameAr: req.body.nameAr });
        if (err) return res.status(400).json({ error: err });
      }
      const updated = await updateCategoryRecord(req.params.id, req.body);
      res.json(updated);
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode: number }).statusCode)
          : 500;
      const message = error instanceof Error ? error.message : 'Update category failed';
      res.status(status).json({ error: message });
    }
  });

  app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    try {
      await deleteCategoryRecord(req.params.id);
      res.json({ deleted: true });
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode: number }).statusCode)
          : 500;
      const message = error instanceof Error ? error.message : 'Delete category failed';
      res.status(status).json({ error: message });
    }
  });

  app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
    try {
      const all = await listAllOrders();
      res.json(all);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Load orders failed';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/admin/orders/:orderNumber/status', requireAdmin, async (req, res) => {
    try {
      const statusVal = req.body?.status as OrderStatus;
      if (!VALID_ORDER_STATUSES.has(statusVal)) {
        return res.status(400).json({ error: 'حالة الطلب غير صالحة' });
      }
      const updated = await updateOrderStatusRecord(req.params.orderNumber, statusVal);
      res.json(updated);
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode: number }).statusCode)
          : 500;
      const message = error instanceof Error ? error.message : 'Update order failed';
      res.status(status).json({ error: message });
    }
  });

  app.get('/api/admin/settings', requireAdmin, async (_req, res) => {
    try {
      const [adminSettings, allowlist] = await Promise.all([
        getAdminStoreSettings(),
        listAdminAllowlist(),
      ]);
      res.json({
        settings: adminSettings,
        allowlist,
        notificationCapabilities: getNotificationChannelCapabilities(
          process.env,
          adminSettings
        ),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Load settings failed';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const err = validateSettingsPayload(req.body);
      if (err) return res.status(400).json({ error: err });
      const updated = await updateStoreSettingsRecord(req.body);
      res.json(updated);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Update settings failed';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/admin/allowlist', requireAdmin, async (req, res) => {
    try {
      const list = await addAdminAllowlistEmail(String(req.body?.email || ''));
      res.json({ allowlist: list });
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode: number }).statusCode)
          : 500;
      const message = error instanceof Error ? error.message : 'Failed';
      res.status(status).json({ error: message });
    }
  });

  app.delete('/api/admin/allowlist/:email', requireAdmin, async (req, res) => {
    try {
      const list = await removeAdminAllowlistEmail(req.params.email);
      res.json({ allowlist: list });
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'statusCode' in error
          ? Number((error as { statusCode: number }).statusCode)
          : 500;
      const message = error instanceof Error ? error.message : 'Failed';
      res.status(status).json({ error: message });
    }
  });

  // ---------- VITE DEV MIDDLEWARE / PROD STATIC ----------

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const isCloudProxy = Boolean(
      process.env.K_SERVICE ||
        process.env.CLOUD_RUN_EXECUTION ||
        (process.env.APP_URL && process.env.APP_URL.startsWith('https://'))
    );
    const hmrDisabled = process.env.DISABLE_HMR === 'true' || isCloudProxy;
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { clientPort: 443 },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ---------- HTTP + REAL-TIME ADMIN WEBSOCKET SERVER ----------

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const adminClients = new Set<WebSocket>();

  registerNotificationBroadcaster((event) => {
    const message = JSON.stringify(event);
    for (const client of adminClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });

  wss.on('connection', (ws) => {
    adminClients.add(ws);
    ws.send(JSON.stringify({ type: 'connected', ts: new Date().toISOString() }));
    ws.on('close', () => {
      adminClients.delete(ws);
    });
    ws.on('error', () => {
      adminClients.delete(ws);
    });
  });

  server.on('upgrade', async (request, socket, head) => {
    try {
      const reqUrl = new URL(
        request.url || '/',
        `http://${request.headers.host || 'localhost'}`
      );
      if (reqUrl.pathname !== '/ws/admin') {
        return;
      }

      const token = reqUrl.searchParams.get('token') || '';
      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      await verifyAdminBearerToken(token);
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Al Andalus Supermarket server listening on port ${PORT}`);
  });
}

startServer();
