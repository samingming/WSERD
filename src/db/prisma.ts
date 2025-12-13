// src/db/prisma.ts
import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

// Use Prisma "client" engine with the MariaDB adapter (works for MySQL too).
const adapter = new PrismaMariaDb(databaseUrl);

export const prisma = new PrismaClient({ adapter });
