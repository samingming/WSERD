// src/utils/security.ts
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = (process.env.JWT_SECRET ?? 'dev-secret') as string;
type SignOptionsLike = Extract<
  NonNullable<Parameters<typeof jwt.sign>[2]>,
  { expiresIn?: unknown }
>;
type ExpiresIn = SignOptionsLike extends { expiresIn?: infer E } ? E : never;

const ACCESS_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as ExpiresIn;
const REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as ExpiresIn;

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(userId: number, role: string) {
  const payload = {
    sub: userId,
    role,
    type: 'access' as const,
  };

  // 타입 명시 X → jsonwebtoken이 알아서 추론
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function signRefreshToken(userId: number, role: string) {
  const payload = {
    sub: userId,
    role,
    type: 'refresh' as const,
    jti: crypto.randomUUID(),
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getJwtExpirationDate(token: string): Date | null {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded || typeof decoded === 'string' || !decoded.exp) {
    return null;
  }
  return new Date(decoded.exp * 1000);
}
