// src/db/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// MySQL/MariaDB용 어댑터 생성
const adapter = new PrismaMariaDb(process.env.DATABASE_URL);

// 어댑터를 넣어서 PrismaClient 생성 (Prisma 7 필수)
export const prisma = new PrismaClient({ adapter });
