/**
 * ITEM_SET 데이터 시드 스크립트
 * Google Sheets에서 가져온 세트 데이터를 데이터베이스에 삽입
 */

const { initDatabase, getDb, closeDatabase } = require('../db/database');

const itemSets = [
  {
    set_id: 'LC16_17_1',
    set_name: '2025 LC 16–17 캠프 안내 방송',
    common_passage: 'Welcome to Green Hill Youth Camp! This weekend, students will participate in...',
    profile: '16=중상;17=상',
    extra: 'LC 세트: 목적·세부정보·함의 추론 가능하도록 구성'
  },
  {
    set_id: 'S41_42_1',
    set_name: '도시 적응 글 세트',
    common_passage: 'Moving to a new city can be both exciting and overwhelming...',
    profile: '41=중;42=중상',
    extra: 'RC 세트: 적응→문제→해결 구조. 제목/함의/세부 파악 가능하게 작성.'
  },
  {
    set_id: 'S43_45_1',
    set_name: '디지털 격차 해결 글 세트',
    common_passage: 'As technology continues to shape our daily lives, the digital divide between...',
    profile: '43=중상;44=상;45=상',
    extra: 'RC 세트: 사회문제-사례-분석-해결 구조. 요지·흐름·요약 문제 출제 가능하도록 구성.'
  },
  {
    set_id: 'S41_42_2',
    set_name: '청소년41_42',
    common_passage: '청소년 자원봉사 경험 글',
    profile: '41=중하;42=중상',
    extra: ''
  }
];

async function seedItemSets() {
  try {
    await initDatabase();
    const db = getDb();

    console.log('ITEM_SET 데이터 삽입 시작...');

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO item_sets (set_id, set_name, common_passage, profile)
      VALUES (?, ?, ?, ?)
    `);

    let insertedCount = 0;
    for (const set of itemSets) {
      insertStmt.run(
        set.set_id,
        set.set_name,
        set.common_passage,
        set.profile
      );
      insertedCount++;
    }

    console.log(`✅ ${insertedCount}개의 ITEM_SET 데이터 삽입 완료`);

    // 삽입된 데이터 확인
    const sets = db.prepare('SELECT * FROM item_sets').all();
    console.log('\n📊 삽입된 세트 목록:');
    sets.forEach(s => {
      console.log(`  - ${s.set_id}: ${s.set_name} (${s.profile})`);
    });

    closeDatabase();
    console.log('\n데이터베이스 연결 종료');

  } catch (error) {
    console.error('시드 오류:', error);
    process.exit(1);
  }
}

seedItemSets();
