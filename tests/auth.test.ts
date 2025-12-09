// tests/auth.test.ts
import request from 'supertest';
import app from '../src/app';

describe('Auth API', () => {
  const baseUser = {
    email: `jest-user-${Date.now()}@example.com`,
    password: 'P@ssw0rd!',
    name: 'JestUser',
  };

  let latestRefreshToken: string;

  it('registers a user', async () => {
    const res = await request(app).post('/auth/signup').send(baseUser);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('CREATED');
    expect(res.body.data.email).toBe(baseUser.email);
  });

  it('rejects duplicate registration', async () => {
    const res = await request(app).post('/auth/signup').send(baseUser);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_RESOURCE');
  });

  it('logs in and returns tokens', async () => {
    const res = await request(app).post('/auth/login').send({
      email: baseUser.email,
      password: baseUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    latestRefreshToken = res.body.data.refreshToken;
  });

  it('fails login with wrong password', async () => {
    const res = await request(app).post('/auth/login').send({
      email: baseUser.email,
      password: 'wrong-password',
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('reissues tokens using refresh token', async () => {
    const res = await request(app).post('/auth/refresh').send({
      refreshToken: latestRefreshToken,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    latestRefreshToken = res.body.data.refreshToken;
  });

  it('invalidates refresh token on logout', async () => {
    const logoutRes = await request(app).post('/auth/logout').send({
      refreshToken: latestRefreshToken,
    });

    expect(logoutRes.status).toBe(200);

    const retry = await request(app).post('/auth/refresh').send({
      refreshToken: latestRefreshToken,
    });

    expect(retry.status).toBe(401);
    expect(['UNAUTHORIZED', 'TOKEN_EXPIRED']).toContain(retry.body.code);
  });
});
