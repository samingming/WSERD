// tests/health.test.ts
import request from 'supertest';
import app from '../src/app';

describe('Health API', () => {
  it('GET /health 은 200 OK 와 상태 정보를 반환해야 한다', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe('OK');
    expect(res.body.statusCode).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.time).toBe('string');
  });
});
