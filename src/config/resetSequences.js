import prisma from './prisma.js';

// 시퀀스를 현재 테이블의 최대 id로 맞춰 중복키 방지
export async function resetSequences() {
  // Postgres에서 시퀀스 이름을 안전하게 찾기 위해 pg_get_serial_sequence 사용
  const tables = [
    'UserPoint',
    'PhotoCard',
    'CardGrade',
    'CardGenre',
    'Sale',
  ];

  for (const table of tables) {
    // 일부 테이블은 비어있을 수 있으므로 COALESCE로 처리
    const sql = `
      SELECT setval(
        pg_get_serial_sequence('"${table}"', 'id'),
        GREATEST(COALESCE((SELECT MAX(id) FROM "${table}"), 0), 0)
      );
    `;
    // eslint-disable-next-line no-await-in-loop
    await prisma.$executeRawUnsafe(sql);
  }
}


