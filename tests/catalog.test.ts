import request from 'supertest';
import app from '../src/app';
import { loginAsAdmin } from './helpers';

describe('Catalog APIs (categories & authors)', () => {
  let adminToken: string;
  let categoryId: number;
  let authorId: number;

  beforeAll(async () => {
    adminToken = await loginAsAdmin();
  });

  describe('Categories', () => {
    it('ADMIN이 카테고리를 생성할 수 있다', async () => {
      const res = await request(app)
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `테스트-카테고리-${Date.now()}`,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      categoryId = res.body.data.id;
    });

    it('카테고리 목록을 검색/페이지네이션으로 조회한다', async () => {
      const res = await request(app).get(
        '/categories?keyword=테스트&parentId=root&page=0&size=5&sort=name,ASC',
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('content');
      expect(Array.isArray(res.body.data.content)).toBe(true);
    });

    it('카테고리 상세 정보를 반환한다', async () => {
      const res = await request(app).get(`/categories/${categoryId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(categoryId);
    });

    it('ADMIN이 카테고리를 수정할 수 있다', async () => {
      const res = await request(app)
        .patch(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '테스트-카테고리-수정' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toContain('수정');
    });

    it('연결된 데이터가 없으면 카테고리를 삭제할 수 있다', async () => {
      const res = await request(app)
        .delete(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Authors', () => {
    it('ADMIN이 작가를 생성한다', async () => {
      const res = await request(app)
        .post('/authors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `테스트-작가-${Date.now()}`,
          bio: '테스트 소개',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      authorId = res.body.data.id;
    });

    it('작가 목록을 조회한다', async () => {
      const res = await request(app).get('/authors?keyword=테스트&size=5');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('content');
    });

    it('작가 상세를 조회한다', async () => {
      const res = await request(app).get(`/authors/${authorId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(authorId);
    });

    it('ADMIN이 작가 데이터를 수정한다', async () => {
      const res = await request(app)
        .patch(`/authors/${authorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ bio: '소개 업데이트' });

      expect(res.status).toBe(200);
      expect(res.body.data.bio).toContain('업데이트');
    });

    it('연결된 도서가 없으면 작가를 삭제할 수 있다', async () => {
      const res = await request(app)
        .delete(`/authors/${authorId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });
});
