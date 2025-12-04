// tests/orders.test.ts
import request from 'supertest';
import app from '../src/app';
import { loginAsUser, loginAsAdmin } from './helpers';

describe('Orders API', () => {
  let userToken: string;
  let adminToken: string;
  let bookIdForOrder: number;
  let orderId: number;

  beforeAll(async () => {
    userToken = await loginAsUser();
    adminToken = await loginAsAdmin();

    // 주문할 책 하나 가져오기 (첫 페이지 첫 번째 책)
    const res = await request(app).get(
      '/books?page=0&size=1&sort=createdAt,DESC',
    );

    bookIdForOrder = res.body.data.content[0].id;
  });

  it('주문 생성 POST /orders', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        bookId: bookIdForOrder,
        quantity: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');

    orderId = res.body.data.id;
  });

  it('주문 목록 조회 GET /orders (내 주문)', async () => {
    const res = await request(app)
      .get('/orders?page=0&size=10&sort=createdAt,DESC')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.content)).toBe(true);
  });

  it('주문 상세 조회 GET /orders/{id}', async () => {
    const res = await request(app)
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(orderId);
  });

  it('다른 사람 토큰으로 주문 상세 조회하면 403 또는 404 (보안 확인)', async () => {
    const res = await request(app)
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([403, 404]).toContain(res.status);
  });

  it('ADMIN 전체 주문 조회 GET /orders/admin/all', async () => {
    const res = await request(app)
      .get('/orders/admin/all?page=0&size=10&sort=createdAt,DESC')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    // 구현마다 content 구조가 다를 수 있으니 data 존재만 확인
    expect(res.body).toHaveProperty('data');
  });

  it('주문 취소 PATCH /orders/{id}/cancel', async () => {
    const res = await request(app)
      .patch(`/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
  });
});
