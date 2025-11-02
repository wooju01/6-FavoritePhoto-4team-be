import prisma from '../config/prisma.js';

// 하루 최대 3번, 1시간에 1번 랜덤 상자 뽑기 (포인트 획득)
export async function claimRandomBox(userId, io = null) {
  const userPoint = await prisma.userPoint.findFirst({ where: { userId } });
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

  let resetTodayClaimCount = false;
  if (userPoint && userPoint.lastClaimed) {
    const lastClaimedDate = userPoint.lastClaimed.toISOString().slice(0, 10);
    // 날짜가 바뀌면 todayClaimCount 초기화
    if (lastClaimedDate !== today) {
      resetTodayClaimCount = true;
    } else {
      // 1시간 제한 체크
      const diff = (now - userPoint.lastClaimed) / (1000 * 60 * 60);
      if (diff < 1) {
        throw new Error('1시간에 1번만 뽑을 수 있습니다.');
      }
      // 하루 3번 제한 체크
      if (userPoint.todayClaimCount >= 3) {
        throw new Error('하루 최대 3번만 뽑을 수 있습니다.');
      }
    }
  }
  // 랜덤 포인트 (예: 10~100)
  const randomPoints = Math.floor(Math.random() * 91) + 10;

  // lastClaimed, todayClaimCount 갱신
  const userPointData = await prisma.userPoint.findFirst({ where: { userId } });
  const nowDate = new Date();
  let resetTodayClaimCountFlag = false;
  if (userPointData && userPointData.lastClaimed) {
    const lastClaimedDate = userPointData.lastClaimed.toISOString().slice(0, 10);
    if (lastClaimedDate !== nowDate.toISOString().slice(0, 10)) {
      resetTodayClaimCountFlag = true;
    }
  }
  // 포인트 적립
  const updateResult = await updatePoint(userId, randomPoints, io);
  // lastClaimed, todayClaimCount만 별도 갱신
  let updatedPoint = updateResult.userPoint;
  if (!updatedPoint) {
    // updatePoint에서 userPoint를 반환하지 않으면 다시 조회
    updatedPoint = await prisma.userPoint.findFirst({ where: { userId } });
  }
  if (!updatedPoint) {
    throw new Error('UserPoint를 찾을 수 없습니다.');
  }
  const updated = await prisma.userPoint.update({
    where: { id: updatedPoint.id },
    data: {
      lastClaimed: nowDate,
      todayClaimCount: resetTodayClaimCountFlag ? 1 : (updatedPoint.todayClaimCount || 0) + 1
    }
  });
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

// 포인트 증감 (amount: +면 증가, -면 차감)
export async function updatePoint(userId, amount, io = null) {
  if (typeof amount !== 'number' || isNaN(amount) || amount === 0) {
    throw new Error('amount는 0이 아닌 숫자여야 합니다.');
  }
  let userPoint = await prisma.userPoint.findFirst({ where: { userId } });
  if (!userPoint) {
    if (amount < 0) throw new Error('포인트가 부족합니다.');
    userPoint = await prisma.userPoint.create({
      data: {
        userId,
        points: amount,
        lastClaimed: null,
        todayClaimCount: 0
      }
    });
  } else {
    if (userPoint.points + amount < 0) throw new Error('포인트가 부족합니다.');
    userPoint = await prisma.userPoint.update({
      where: { id: userPoint.id },
      data: { points: { increment: amount } }
    });
  }
  // 실시간 포인트 변동 알림
  if (io) {
    console.log(`[pointUpdate emit] userId: ${userId}, amount: ${amount}, totalPoints: ${userPoint.points}`);
    io.to(userId).emit('pointUpdate', {
      points: amount,
      totalPoints: userPoint.points,
      lastClaimed: userPoint.lastClaimed,
      todayClaimCount: userPoint.todayClaimCount
    });
  }
  return { points: amount, totalPoints: userPoint.points, userPoint };
}
