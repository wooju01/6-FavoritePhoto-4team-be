import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('시드 데이터 삽입을 시작합니다...\n');

  // 1. CardGrade 데이터 삽입
  console.log('CardGrade 데이터 삽입 중...');
  const cardGradeData = JSON.parse(
    readFileSync(join(__dirname, 'mockData/cardGrade.json'), 'utf-8')
  );
  for (const grade of cardGradeData) {
    await prisma.cardGrade.upsert({
      where: { id: grade.id },
      update: {},
      create: {
        id: grade.id,
        name: grade.name,
      },
    });
  }
  console.log(`✓ CardGrade ${cardGradeData.length}개 삽입 완료`);

  // 2. CardGenre 데이터 삽입
  console.log('CardGenre 데이터 삽입 중...');
  const cardGenreData = JSON.parse(
    readFileSync(join(__dirname, 'mockData/cradGenre.json'), 'utf-8')
  );
  for (const genre of cardGenreData) {
    await prisma.cardGenre.upsert({
      where: { id: genre.id },
      update: {},
      create: {
        id: genre.id,
        name: genre.name,
      },
    });
  }
  console.log(`✓ CardGenre ${cardGenreData.length}개 삽입 완료`);

  // 3. User 데이터 삽입
  console.log('User 데이터 삽입 중...');
  const userData = JSON.parse(
    readFileSync(join(__dirname, 'mockData/user.json'), 'utf-8')
  );
  for (const user of userData) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        email: user.email,
        googleId: user.googleId || null,
        password: user.password || null,
        nickname: user.nickname,
        profileImage: user.profileImage || null,
        createdAt: new Date(user.createdAt),
      },
    });
  }
  console.log(`✓ User ${userData.length}개 삽입 완료`);

  // 4. UserPoint 데이터 삽입
  console.log('UserPoint 데이터 삽입 중...');
  const userPointData = JSON.parse(
    readFileSync(join(__dirname, 'mockData/userPoint.json'), 'utf-8')
  );
  for (const point of userPointData) {
    await prisma.userPoint.upsert({
      where: { id: point.id },
      update: {},
      create: {
        id: point.id,
        userId: point.userId,
        points: point.points,
        lastClaimed: point.lastClaimed ? new Date(point.lastClaimed) : null,
        todayClaimCount: 0,
      },
    });
  }
  console.log(`✓ UserPoint ${userPointData.length}개 삽입 완료`);

  // 5. PhotoCard 데이터 삽입
  console.log('PhotoCard 데이터 삽입 중...');
  const photoCardData = JSON.parse(
    readFileSync(join(__dirname, 'mockData/photoCards.json'), 'utf-8')
  );
  for (const card of photoCardData) {
    await prisma.photoCard.upsert({
      where: { id: card.id },
      update: {},
      create: {
        id: card.id,
        name: card.name,
        imageUrl: card.imageUrl,
        gradeId: card.gradeId,
        genreId: card.genreId,
        description: card.description || null,
        totalQuantity: card.totalQuantity,
        initialPrice: card.initialPrice,
        creatorId: card.creatorId,
        createdAt: new Date(card.createdAt),
      },
    });
  }
  console.log(`✓ PhotoCard ${photoCardData.length}개 삽입 완료`);

  // 6. Notification 데이터 삽입 (파일이 비어있지 않은 경우)
  try {
    const notificationData = JSON.parse(
      readFileSync(join(__dirname, 'mockData/notification.json'), 'utf-8')
    );
    if (Array.isArray(notificationData) && notificationData.length > 0) {
      console.log('Notification 데이터 삽입 중...');
      for (const notification of notificationData) {
        await prisma.notification.create({
          data: {
            userId: notification.userId,
            message: notification.message,
            read: notification.read || false,
            createdAt: notification.createdAt ? new Date(notification.createdAt) : new Date(),
          },
        });
      }
      console.log(`✓ Notification ${notificationData.length}개 삽입 완료`);
    } else {
      console.log('Notification 데이터가 비어있습니다.');
    }
  } catch (error) {
    console.log('Notification 데이터가 없거나 비어있습니다.');
  }

  // 7. Sale 데이터 삽입 (파일이 비어있지 않은 경우)
  try {
    const saleData = JSON.parse(
      readFileSync(join(__dirname, 'mockData/sale.json'), 'utf-8')
    );
    if (Array.isArray(saleData) && saleData.length > 0) {
      console.log('Sale 데이터 삽입 중...');
      for (const sale of saleData) {
        await prisma.sale.create({
          data: {
            photoCardId: sale.photoCardId,
            sellerId: sale.sellerId,
            price: sale.price,
            saleQuantity: sale.saleQuantity || 1,
            cardGradeId: sale.cardGradeId || null,
            cardGenreId: sale.cardGenreId || null,
            status: sale.status || 'AVAILABLE',
            desiredDescription: sale.desiredDescription || null,
            createdAt: sale.createdAt ? new Date(sale.createdAt) : new Date(),
          },
        });
      }
      console.log(`✓ Sale ${saleData.length}개 삽입 완료`);
    } else {
      console.log('Sale 데이터가 비어있습니다.');
    }
  } catch (error) {
    console.log('Sale 데이터가 없거나 비어있습니다.');
  }

  // 8. TradeRequest 데이터 삽입 (파일이 비어있지 않은 경우)
  try {
    const tradeRequestData = JSON.parse(
      readFileSync(join(__dirname, 'mockData/tradeRequest.json'), 'utf-8')
    );
    if (Array.isArray(tradeRequestData) && tradeRequestData.length > 0) {
      console.log('TradeRequest 데이터 삽입 중...');
      for (const tradeRequest of tradeRequestData) {
        await prisma.tradeRequest.create({
          data: {
            photoCardId: tradeRequest.photoCardId,
            offeredPhotoCardId: tradeRequest.offeredPhotoCardId,
            ownerId: tradeRequest.ownerId,
            applicantId: tradeRequest.applicantId,
            description: tradeRequest.description || null,
            tradeStatus: tradeRequest.tradeStatus || 'PENDING',
            createdAt: tradeRequest.createdAt ? new Date(tradeRequest.createdAt) : new Date(),
          },
        });
      }
      console.log(`✓ TradeRequest ${tradeRequestData.length}개 삽입 완료`);
    } else {
      console.log('TradeRequest 데이터가 비어있습니다.');
    }
  } catch (error) {
    console.log('TradeRequest 데이터가 없거나 비어있습니다.');
  }

  console.log('\n✅ 모든 시드 데이터 삽입이 완료되었습니다!');
}

main()
  .catch((e) => {
    console.error('\n❌ 시드 데이터 삽입 중 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
