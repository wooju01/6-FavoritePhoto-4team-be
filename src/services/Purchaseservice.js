import * as purchaseRepository from '../repositories/Purchaserepository.js';
import prisma from '../config/prisma.js';

function httpError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function purchaseCards(saleId, buyerId, purchaseQuantity, io = null) {
  // DB 작업은 모두 tx로 처리하고, 소켓 알림은 커밋이 끝난 뒤에 보낸다
  const result = await prisma.$transaction(async (tx) => {
    const sale = await purchaseRepository.findPurchaseSaleWithUserCards(saleId, tx);

    if (!sale) throw httpError(404, '존재하지 않는 판매입니다.');
    if (sale.sellerId === buyerId) throw httpError(400, '본인이 등록한 카드는 구매할 수 없습니다.');
    if (sale.status !== 'AVAILABLE') throw httpError(409, '판매 중이 아닙니다.');

    // 판매 수량 차감 - 조건부 업데이트라 동시 구매 시 하나만 성공
    const saleUpdated = await purchaseRepository.decrementPurchaseSaleQuantity(
      saleId,
      purchaseQuantity,
      tx
    );
    if (saleUpdated.count === 0) throw httpError(409, '판매 수량이 부족합니다.');

    const availableUserCards = sale.saleUserCards
      .map((suc) => suc.userCard)
      .filter((uc) => uc.status === 'AVAILABLE' && uc.ownerId === sale.sellerId);

    if (availableUserCards.length < purchaseQuantity) {
      throw httpError(409, '구매 가능한 카드 수량이 부족합니다.');
    }

    const userCardsToPurchase = availableUserCards.slice(0, purchaseQuantity);
    const userCardIds = userCardsToPurchase.map((uc) => uc.id);

    // 구매 금액 계산
    const totalPrice = sale.price * purchaseQuantity;

    // 구매자 포인트 차감 - 잔액이 충분할 때만 차감
    const paid = await tx.userPoint.updateMany({
      where: { userId: buyerId, points: { gte: totalPrice } },
      data: { points: { decrement: totalPrice } }
    });
    if (paid.count === 0) throw httpError(400, '포인트가 부족합니다.');

    // 판매자 포인트 지급 - 포인트 테이블이 없으면 생성
    const sellerPaid = await tx.userPoint.updateMany({
      where: { userId: sale.sellerId },
      data: { points: { increment: totalPrice } }
    });
    if (sellerPaid.count === 0) {
      await tx.userPoint.create({
        data: {
          userId: sale.sellerId,
          points: totalPrice,
          lastClaimed: null,
          todayClaimCount: 0
        }
      });
    }

    // UserCard 소유권 이전
    const moved = await purchaseRepository.updatePurchasedUserCardsOwner(
      userCardIds,
      sale.sellerId,
      buyerId,
      tx
    );
    if (moved.count !== userCardIds.length) {
      throw httpError(409, '구매 가능한 카드 수량이 부족합니다.');
    }

    // 솔드 아웃 처리
    const soldOut = await purchaseRepository.markPurchaseSaleSoldOutIfEmpty(saleId, tx);

    // 구매 카드 정보로 알림 메시지 생성
    const photoCard = await tx.photoCard.findUnique({
      where: { id: userCardsToPurchase[0].photoCardId }
    });
    // 카드 등급 정보 조회
    let cardGrade = '등급 불러오기 실패';
    if (photoCard?.gradeId) {
      const grade = await tx.cardGrade.findUnique({ where: { id: photoCard.gradeId } });
      cardGrade = grade?.name || cardGrade;
    }
    const cardName = photoCard?.name || '카드 이름 불러오기 실패';

    const messages = [
      { userId: buyerId, message: `[${cardGrade} | ${cardName}] ${purchaseQuantity}장을 성공적으로 구매했습니다.` },
      { userId: sale.sellerId, message: `[${cardGrade} | ${cardName}] ${purchaseQuantity}장이 판매되었습니다.` }
    ];
    // 품절 알림
    if (soldOut.count > 0) {
      messages.push({ userId: sale.sellerId, message: `[${cardGrade} | ${cardName}]이 품절되었습니다.` });
    }
    const notifications = [];
    for (const data of messages) {
      notifications.push(await tx.notification.create({ data }));
    }

    // 실시간 포인트 알림용 최신 포인트
    const [buyerPoint, sellerPoint] = await Promise.all([
      tx.userPoint.findFirst({ where: { userId: buyerId } }),
      tx.userPoint.findFirst({ where: { userId: sale.sellerId } })
    ]);

    return {
      notifications,
      pointUpdates: [
        { userId: buyerId, amount: -totalPrice, userPoint: buyerPoint },
        { userId: sale.sellerId, amount: totalPrice, userPoint: sellerPoint }
      ],
      response: {
        message: '구매 완료',
        saleId,
        purchasedQuantity: purchaseQuantity,
        purchasedUserCardIds: userCardIds
      }
    };
  });

  // 커밋 성공 후 실시간 알림 전송
  if (io) {
    for (const { userId, amount, userPoint } of result.pointUpdates) {
      io.to(userId).emit('pointUpdate', {
        points: amount,
        totalPoints: userPoint.points,
        lastClaimed: userPoint.lastClaimed,
        todayClaimCount: userPoint.todayClaimCount
      });
    }
    for (const notification of result.notifications) {
      io.to(notification.userId).emit('notification', notification);
    }
  }

  return result.response;
}
