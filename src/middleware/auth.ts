import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { adminAllowlist, users } from '../db/schema.ts';
import { dispatchStoreEventNotificationsAsync } from '../services/notifications.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: {
    id: number;
    uid: string;
    email: string;
    role: string;
  };
}

const BOOTSTRAP_ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || 'mostafaelfoly1000@gmail.com'
).toLowerCase();

export function isPrivilegedRole(role?: string | null): boolean {
  const normalized = (role || '').trim().toLowerCase();
  return normalized === 'owner' || normalized === 'admin';
}

export async function isEmailAuthorizedAdmin(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === BOOTSTRAP_ADMIN_EMAIL) return true;

  try {
    const allowed = await db
      .select()
      .from(adminAllowlist)
      .where(eq(adminAllowlist.email, normalized))
      .limit(1);
    return allowed.length > 0;
  } catch (error) {
    console.error('Failed to check admin allowlist:', error);
    return false;
  }
}

export async function upsertAuthUser(uid: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  const adminAuthorized = await isEmailAuthorizedAdmin(normalizedEmail);
  const existingIsOwner = existingUser?.role?.trim().toLowerCase() === 'owner';
  const role = existingIsOwner ? 'owner' : adminAuthorized ? 'admin' : 'customer';

  const result = await db
    .insert(users)
    .values({
      uid,
      email: normalizedEmail,
      role,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email: normalizedEmail,
        role,
      },
    })
    .returning();

  const savedUser = result[0];
  const wasPrivilegedBefore = isPrivilegedRole(existingUser?.role);
  const isPrivilegedNow = isPrivilegedRole(savedUser?.role);

  if (isPrivilegedNow && !wasPrivilegedBefore) {
    dispatchStoreEventNotificationsAsync({
      eventType: 'owner_admin_registered',
      title: existingUser
        ? 'ترقية حساب إلى صلاحية مالك / مسؤول'
        : 'تسجيل حساب مالك / مسؤول جديد',
      actorEmail: normalizedEmail,
      details: [
        { label: 'البريد الإلكتروني', value: normalizedEmail },
        { label: 'الصلاحية الممنوحة', value: savedUser.role },
        {
          label: 'نوع الإجراء',
          value: existingUser
            ? 'ترقية حساب مسجل سابقاً'
            : 'تسجيل دخول أول لحساب مصرح له',
        },
      ],
    });
  }

  return savedUser;
}

export async function verifyAdminBearerToken(token: string) {
  const decodedToken = await adminAuth.verifyIdToken(token);
  if (!decodedToken.email || decodedToken.email_verified === false) {
    throw Object.assign(new Error('Forbidden: Verified email required'), {
      statusCode: 403,
    });
  }

  const dbUser = await upsertAuthUser(decodedToken.uid, decodedToken.email);
  if (!isPrivilegedRole(dbUser.role)) {
    throw Object.assign(new Error('Forbidden: Admin access required'), {
      statusCode: 403,
    });
  }

  return { decodedToken, dbUser };
}

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const { decodedToken, dbUser } = await verifyAdminBearerToken(token);
    req.user = decodedToken;
    req.dbUser = dbUser;
    next();
  } catch (error: unknown) {
    const status =
      error && typeof error === 'object' && 'statusCode' in error
        ? Number((error as { statusCode: number }).statusCode)
        : 401;
    const message =
      error instanceof Error ? error.message : 'Unauthorized: Invalid or expired token';
    if (status >= 500 || status === 401) {
      console.error('Error verifying admin Firebase token:', error);
    }
    return res.status(status).json({ error: message });
  }
};
