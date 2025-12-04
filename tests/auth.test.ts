// tests/auth.test.ts
import request from 'supertest';
import app from '../src/app';

describe('Auth API', () => {
  const baseUser = {
    email: `jest-user-${Date.now()}@example.com`,
    password: 'P@ssw0rd!',
    name: 'JestUser',
  };

  it('회원가입 성공', async () => {
    const res = await request(app).post('/auth/signup').send(baseUser);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('CREATED');
    expect(res.body.data.email).toBe(baseUser.email);
  });

  it('회원가입 - 중복 이메일이면 409', async () => {
    const res = await request(app).post('/auth/signup').send(baseUser);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_RESOURCE');
  });

  it('로그인 성공 시 accessToken, refreshToken을 반환', async () => {
    const res = await request(app).post('/auth/login').send({
      email: baseUser.email,
      password: baseUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('로그인 실패 - 비밀번호 틀리면 401', async () => {
    const res = await request(app).post('/auth/login').send({
      email: baseUser.email,
      password: 'wrong-password',
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
