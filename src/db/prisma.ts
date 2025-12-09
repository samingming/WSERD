// src/db/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

function normalizeDatabaseUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);

    // On Windows, MariaDB's driver attempts to use named pipes for localhost
    // which results in pool timeouts when only TCP is enabled. Force TCP.
    if (process.platform === 'win32' && parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
    }

    return parsed.toString();
  } catch (err) {
    return rawUrl;
  }
}

const normalizedUrl = normalizeDatabaseUrl(databaseUrl);
const adapterUrl = normalizedUrl.startsWith('mariadb://')
  ? normalizedUrl
  : normalizedUrl.replace(/^mysql:\/\//i, 'mariadb://');

// Prisma는 process.env.DATABASE_URL을 참조하므로 정규화한 URL로 다시 설정한다.
process.env.DATABASE_URL = normalizedUrl;

export const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(adapterUrl),
});
