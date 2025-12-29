/**
 * CHART_DB 데이터 시드 스크립트
 * Google Sheets에서 가져온 차트 데이터를 데이터베이스에 삽입
 */

const { initDatabase, getDb, closeDatabase } = require('../db/database');

const charts = [
  {
    chart_id: 'CH001',
    chart_name: 'Sample chart data',
    raw_data_json: '{"years":[2020,2021,2022], "sales":[100,120,150]}'
  }
];

async function seedCharts() {
  try {
    await initDatabase();
    const db = getDb();

    console.log('CHART_DB 데이터 삽입 시작...');

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO charts (chart_id, chart_name, raw_data_json)
      VALUES (?, ?, ?)
    `);

    let insertedCount = 0;
    for (const chart of charts) {
      insertStmt.run(
        chart.chart_id,
        chart.chart_name,
        chart.raw_data_json
      );
      insertedCount++;
    }

    console.log(`✅ ${insertedCount}개의 CHART 데이터 삽입 완료`);

    // 삽입된 데이터 확인
    const chartList = db.prepare('SELECT * FROM charts').all();
    console.log('\n📊 삽입된 차트 목록:');
    chartList.forEach(c => {
      console.log(`  - ${c.chart_id}: ${c.chart_name}`);
      console.log(`    데이터: ${c.raw_data_json}`);
    });

    closeDatabase();
    console.log('\n데이터베이스 연결 종료');

  } catch (error) {
    console.error('시드 오류:', error);
    process.exit(1);
  }
}

seedCharts();
