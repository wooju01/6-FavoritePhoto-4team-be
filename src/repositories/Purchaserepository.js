import prisma from '../config/prisma.js'

// 구매 관련 - 판매 + 판매에 연결된 UserCard 조회
export async function findPurchaseSaleWithUserCards(saleId, tx = prisma) {
  return tx.sale.findUnique({
    where: { id: saleId },
    include: {
      saleUserCards: {
        include: {
          userCard: true,
        },
      },
    },
  })
}

// UserCard 소유자 변경 (구매자 변경)
// 판매자 소유 + AVAILABLE 상태인 카드만 이전되므로, 반환된 count로 동시 구매 여부를 판단
export async function updatePurchasedUserCardsOwner(userCardIds, sellerId, newOwnerId, tx = prisma) {
  return tx.userCard.updateMany({
    where: {
      id: { in: userCardIds },
      ownerId: sellerId,
      status: 'AVAILABLE',
    },
    data: {
      ownerId: newOwnerId,
      status: 'ACTIVE',
    },
  });
}

// 판매 수량 차감 (판매 중이고 재고가 충분할 때만 차감, 반환된 count가 0이면 실패)
export async function decrementPurchaseSaleQuantity(saleId, quantity, tx = prisma) {
  return tx.sale.updateMany({
    where: {
      id: saleId,
      status: 'AVAILABLE',
      saleQuantity: { gte: quantity },
    },
    data: {
      saleQuantity: { decrement: quantity },
    },
  })
}

// 재고가 0이 된 판매를 품절 처리
export async function markPurchaseSaleSoldOutIfEmpty(saleId, tx = prisma) {
  return tx.sale.updateMany({
    where: { id: saleId, saleQuantity: 0 },
    data: { status: 'SOLDOUT' },
  })
}
