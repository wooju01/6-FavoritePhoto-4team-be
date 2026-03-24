import prisma from '../config/prisma.js';

const PointRepository = {
  //포인트 조회
  getUserPoint: async (userId) => {
    return prisma.userPoint.findFirst({ where: { userId } });
  },
  //포인트 업데이트
  updateUserPoint: async (userId, points, lastClaimed, todayClaimCount) => {
    return prisma.userPoint.update({
      where: { userId },
      data: { points, lastClaimed, todayClaimCount }
    });
  },
  //포인트 생성
  createUserPoint: async (userId, points, lastClaimed, todayClaimCount) => {
    try {
      return await prisma.userPoint.create({
        data: { userId, points, lastClaimed, todayClaimCount }
      });
    } catch (error) {
      // 배포 환경에서 시퀀스가 뒤쳐진 경우(P2002) 1회 보정 후 재시도
      if (error?.code === 'P2002') {
        await prisma.$executeRawUnsafe(`
          SELECT setval(
            pg_get_serial_sequence('"UserPoint"', 'id'),
            GREATEST(COALESCE((SELECT MAX(id) FROM "UserPoint"), 1), 1)
          );
        `);

        return await prisma.userPoint.create({
          data: { userId, points, lastClaimed, todayClaimCount }
        });
      }

      throw error;
    }
  },
  //포인트 삭제
  deleteUserPoint: async (userId) => {
    return prisma.userPoint.deleteMany({ where: { userId } });
  }
};

export default PointRepository;
