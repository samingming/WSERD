// Ensures Prisma connections close after Jest finishes running.
import { prisma } from '../src/db/prisma';

afterAll(async () => {
  await prisma.$disconnect();
});
