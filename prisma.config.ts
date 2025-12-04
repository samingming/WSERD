// prisma.config.ts
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Prisma CLI가 실행할 시드 명령어 (프로젝트 루트 기준 경로)
    seed: 'ts-node ./prisma/seed.ts',
  },
  datasource: {
    // DATABASE_URL은 .env에 있음
    url: process.env.DATABASE_URL!,
  },
});
