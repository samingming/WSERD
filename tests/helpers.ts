// tests/helpers.ts
import request from 'supertest';
import app from '../src/app';

export async function loginAsUser() {
  const res = await request(app).post('/auth/login').send({
    email: 'user1@example.com',
    password: 'P@ssw0rd!',
  });

  if (res.status !== 200) {
    throw new Error('로그인 실패(user1@example.com). 현재 상태코드: ' + res.status);
  }

  return res.body.data.accessToken as string;
}

export async function loginAsAdmin() {
  const res = await request(app).post('/auth/login').send({
    email: 'admin@example.com',
    password: 'P@ssw0rd!',
  });

  if (res.status !== 200) {
    throw new Error('로그인 실패(admin@example.com). 현재 상태코드: ' + res.status);
  }

  return res.body.data.accessToken as string;
}
