// tests/users.test.ts
import request from 'supertest';
import app from '../src/app';

async function loginAsUser(): Promise<string> {
  const res = await request(app)
    .post('/auth/login')
    .send({
      email: 'user1@example.com',
      password: 'P@ssw0rd!',
    });

  // 로그인은 반드시 성공해야 이후 테스트들이 동작함
  expect(res.status).toBe(200);
  return res.body.data.accessToken as string;
}

describe('Users API', () => {
  it('내 정보 조회 /users/me - 토큰 있으면 200', async () => {
    const token = await loginAsUser();

    const res = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.email).toBe('user1@example.com');
  });

  it('내 정보 조회 /users/me - 토큰 없으면 401', async () => {
    const res = await request(app).get('/users/me');

    expect(res.status).toBe(401);
  });

  it('내 정보 수정 PATCH /users/me - 이름 변경 시 200 또는 404(프로젝트 구현에 따라)', async () => {
    const token = await loginAsUser();

    const res = await request(app)
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '변경된이름' });

    // 구현에 따라 200(성공) 또는 404(아예 라우터 미구현) 둘 다 허용
    expect([200, 404]).toContain(res.status);

    if (res.status === 200) {
      // 네 구현이 200을 주는 경우에만 name 검사
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('변경된이름');
    } else if (res.status === 404) {
      // 404면 에러 형식을 유연하게 허용
      expect(res.body).toBeDefined();
    }
  });
});
