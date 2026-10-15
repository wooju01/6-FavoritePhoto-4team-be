import prisma from '../config/prisma.js';

const ONE_HOUR = 1000 * 60 * 60;
const MAX_DAILY_CLAIMS = 3;

function httpError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// 하루 최대 3번, 1시간에 1번 랜덤 상자 뽑기 (포인트 획득)
// 제한 검사와 적립을 조건부 updateMany 한 번으로 처리해, 동시 요청 시 하나만 성공한다
export async function claimRandomBox(userId, io = null) {
  const now = new Date();
  const todayStart = new Date(now.toISOString().slice(0, 10)); // UTC 기준 오늘 00:00
  const oneHourAgo = new Date(now.getTime() - ONE_HOUR);

  // 랜덤 포인트 (예: 10~100)
  const randomPoints = Math.floor(Math.random() * 91) + 10;

  const userPoint = await prisma.userPoint.findFirst({ where: { userId } });

  let updated;
  if (!userPoint) {
    // 포인트 정보가 없으면 첫 뽑기로 생성
    updated = await prisma.userPoint.create({
      data: { userId, points: randomPoints, lastClaimed: now, todayClaimCount: 1 }
    });
  } else {
    // 1) 오늘 첫 뽑기 (뽑은 적 없거나 마지막 뽑기가 어제 이전) - 횟수 초기화
    const firstToday = await prisma.userPoint.updateMany({
      where: {
        id: userPoint.id,
        OR: [{ lastClaimed: null }, { lastClaimed: { lt: todayStart } }]
      },
      data: {
        points: { increment: randomPoints },
        lastClaimed: now,
        todayClaimCount: 1
      }
    });

    // 2) 오늘 이미 뽑은 경우 - 1시간 경과 + 3회 미만일 때만 적립
    let claimed = firstToday.count > 0;
    if (!claimed) {
      const again = await prisma.userPoint.updateMany({
        where: {
          id: userPoint.id,
          lastClaimed: { gte: todayStart, lte: oneHourAgo },
          todayClaimCount: { lt: MAX_DAILY_CLAIMS }
        },
        data: {
          points: { increment: randomPoints },
          lastClaimed: now,
          todayClaimCount: { increment: 1 }
        }
      });
      claimed = again.count > 0;
    }

    updated = await prisma.userPoint.findUnique({ where: { id: userPoint.id } });

    // 실패 시 최신 상태로 사유 판단
    if (!claimed) {
      if (updated.todayClaimCount >= MAX_DAILY_CLAIMS) {
        throw httpError(429, '하루 최대 3번만 뽑을 수 있습니다.');
      }
      throw httpError(429, '1시간에 1번만 뽑을 수 있습니다.');
    }
  }

  // 실시간 포인트 변동 알림
  if (io) {
    io.to(userId).emit('pointUpdate', {
      points: randomPoints,
      totalPoints: updated.points,
      lastClaimed: updated.lastClaimed,
      todayClaimCount: updated.todayClaimCount
    });
  }

  return {
    points: randomPoints,
    totalPoints: updated.points,
    lastClaimed: updated.lastClaimed,
    todayClaimCount: updated.todayClaimCount
  };
}

// 내 포인트 조회
export async function getMyPoint(userId) {
  const userPoint = await prisma.userPoint.findFirst({ where: { userId } });
  if (!userPoint) {
    return { points: 0, lastClaimed: null, todayClaimCount: 0 };
  }
  return {
    points: userPoint.points,
    lastClaimed: userPoint.lastClaimed,
    todayClaimCount: userPoint.todayClaimCount
  };
}
