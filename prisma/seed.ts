// prisma/seed.ts
import 'dotenv/config';
import { prisma } from '../src/db/prisma';
import { hashPassword } from '../src/utils/security';
import { faker } from '@faker-js/faker/locale/ko';

async function main() {
  console.log('🌱 Seeding start...');

  // 1. 기존 데이터 삭제 (자식 → 부모 순서)
  await prisma.reviewLike.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();

  // 2. 기본 유저 생성 (ADMIN + USER)
  const adminPassword = await hashPassword('P@ssw0rd!');
  const userPassword = await hashPassword('P@ssw0rd!');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      name: '관리자',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'user1@example.com',
      passwordHash: userPassword,
      name: '사임',
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Users created:', { admin: admin.email, user: user.email });

  // 3. 도서 여러 개 생성 (예: 50권)
  const books = [];
for (let i = 1; i <= 200; i++) {
  books.push({
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    isbn13: faker.string.numeric(13),
    price: faker.number.int({ min: 5000, max: 30000 }),
    stock: faker.number.int({ min: 1, max: 50 }),
    languageCode: 'ko',
    pageCount: faker.number.int({ min: 100, max: 500 }),
    coverUrl: faker.image.urlLoremFlickr({ category: 'books' }),
  });
}

await prisma.book.createMany({ data: books });


  const totalBooks = await prisma.book.count();
  console.log(`✅ Books created: ${totalBooks}`);

  // 4. 몇 개 책에 리뷰 & 좋아요 생성
  const someBooks = await prisma.book.findMany({
    take: 10,
  });

  for (const book of someBooks) {
    // 각 책마다 리뷰 3개씩
    for (let i = 0; i < 3; i++) {
      const author = i % 2 === 0 ? user : admin;

      const review = await prisma.review.create({
        data: {
          bookId: book.id,
          userId: author.id,
          title: faker.lorem.words(3),
          body: faker.lorem.sentences(2),
          rating: (i % 5) + 1,
          // ⚠️ isDeleted 필드는 Prisma 스키마에 없어서 넣지 않음
          // deletedAt가 있다면 기본값 null로 둠
        },
      });

      // 좋아요도 조금 섞어서
      if (i % 2 === 0) {
        await prisma.reviewLike.create({
          data: {
            reviewId: review.id,
            userId: user.id,
          },
        });
      }
    }
  }

  const reviewCount = await prisma.review.count();
  const likeCount = await prisma.reviewLike.count();
  console.log(`✅ Reviews: ${reviewCount}, ReviewLikes: ${likeCount}`);

  // 5. 주문/주문 아이템 샘플 데이터
  const bookList = await prisma.book.findMany({ take: 5 });

  for (let i = 0; i < 5; i++) {
    const randomBook = bookList[i % bookList.length];

    // Prisma.Book.price 타입이 Decimal 이라서 number로 변환
    const unitPrice = Number(randomBook.price);
    const quantity = (i % 3) + 1;
    const itemTotal = unitPrice * quantity;

    const order = await prisma.order.create({
      data: {
        status: i % 2 === 0 ? 'PENDING' : 'PAID',
        userId: user.id,
        itemTotal, // number → Decimal 컬럼으로 들어감
        discountTotal: 0,
        shippingFee: 3000,
        totalAmount: itemTotal + 3000,
        customerName: user.name,
        customerEmail: user.email,
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        bookId: randomBook.id,
        quantity,
        unitPrice, // Decimal 컬럼, number로 넣어도 OK
        titleSnapshot: randomBook.title,
        subtotal: itemTotal,
      },
    });
  }

  const orderCount = await prisma.order.count();
  const orderItemCount = await prisma.orderItem.count();
  console.log(`✅ Orders: ${orderCount}, OrderItems: ${orderItemCount}`);

  console.log('🌱 Seeding finished.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
