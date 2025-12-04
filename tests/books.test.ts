// tests/books.test.ts
import request from 'supertest';
import app from '../src/app';
import { loginAsAdmin } from './helpers';

describe('Books API', () => {
  let createdBookId: number;

  it('ADMIN이 도서 생성 POST /books', async () => {
    const adminToken = await loginAsAdmin();

    const res = await request(app)
      .post('/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: '테스트 도서 - Jest',
        description: 'Jest 테스트용 도서입니다.',
        isbn13: '9781234567897',
        price: 15000,
        stock: 10,
        languageCode: 'ko',
        pageCount: 200,
        coverUrl: 'https://example.com/jest-book.jpg',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');

    createdBookId = res.body.data.id;
  });

  it('도서 목록 조회 GET /books?keyword=&page=&size=&sort=', async () => {
    const res = await request(app).get(
      '/books?keyword=테스트&page=0&size=10&sort=createdAt,DESC',
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('content');
    expect(Array.isArray(res.body.data.content)).toBe(true);
    expect(res.body.data).toHaveProperty('page');
    expect(res.body.data).toHaveProperty('totalElements');
  });

  it('도서 상세 조회 GET /books/{id}', async () => {
    const res = await request(app).get(`/books/${createdBookId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdBookId);
  });

  it('없는 도서 상세 조회시 404', async () => {
    const res = await request(app).get('/books/999999');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('ADMIN이 도서 수정 PATCH /books/{id}', async () => {
    const adminToken = await loginAsAdmin();

    const res = await request(app)
      .patch(`/books/${createdBookId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        price: 20000,
      });

    expect(res.status).toBe(200);
    expect(Number(res.body.data.price)).toBe(20000);
  });

  it('ADMIN이 도서 삭제 DELETE /books/{id}', async () => {
    const adminToken = await loginAsAdmin();

    const res = await request(app)
      .delete(`/books/${createdBookId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});
