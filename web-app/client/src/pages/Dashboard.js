import React, { useState, useEffect } from 'react';
import { itemsApi, logsApi, healthCheck } from '../api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [logStats, setLogStats] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [serverStatus, setServerStatus] = useState('checking');
  const [loading, setLoading] = useState(true);
  const [showProcessGuide, setShowProcessGuide] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 서버 상태 체크
      await healthCheck();
      setServerStatus('online');

      // 문항 요청 통계
      const requestsRes = await itemsApi.getRequests({ limit: 5 });
      setRecentItems(requestsRes.data || []);

      // 상태별 카운트 계산
      const allRequests = await itemsApi.getRequests({ limit: 1000 });
      const statusCounts = {
        total: allRequests.pagination?.total || 0,
        pending: 0,
        running: 0,
        ok: 0,
        fail: 0
      };

      (allRequests.data || []).forEach(req => {
        const status = (req.status || '').toLowerCase();
        if (statusCounts[status] !== undefined) {
          statusCounts[status]++;
        }
      });

      setStats(statusCounts);

      // 로그 통계
      const logStatsRes = await logsApi.getStats();
      setLogStats(logStatsRes.data);

    } catch (error) {
      console.error('데이터 로드 오류:', error);
      setServerStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { class: 'badge-pending', text: '대기 중' },
      RUNNING: { class: 'badge-running', text: '실행 중' },
      OK: { class: 'badge-ok', text: '성공' },
      FAIL: { class: 'badge-fail', text: '실패' }
    };
    const info = statusMap[status] || { class: 'badge-pending', text: status };
    return <span className={`badge ${info.class}`}>{info.text}</span>;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>데이터 로딩 중...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>📊 대시보드</h1>

      {/* 서버 상태 */}
      <div className={`alert ${serverStatus === 'online' ? 'alert-success' : 'alert-error'}`}>
        서버 상태: {serverStatus === 'online' ? '🟢 온라인' : '🔴 오프라인'}
      </div>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
            {stats?.total || 0}
          </div>
          <div className="text-muted">전체 요청</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbbc04' }}>
            {stats?.pending || 0}
          </div>
          <div className="text-muted">대기 중</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
            {stats?.ok || 0}
          </div>
          <div className="text-muted">성공</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--error-color)' }}>
            {stats?.fail || 0}
          </div>
          <div className="text-muted">실패</div>
        </div>
      </div>

      {/* 로그 통계 */}
      {logStats && (
        <div className="card">
          <div className="card-header">
            <h2>📜 로그 통계</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div>
              <div className="text-muted">전체 로그</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{logStats.logs?.total || 0}</div>
            </div>
            <div>
              <div className="text-muted">최근 24시간</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{logStats.logs?.last24h || 0}</div>
            </div>
            <div>
              <div className="text-muted">에러</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--error-color)' }}>
                {logStats.errors?.total || 0}
              </div>
            </div>
            <div>
              <div className="text-muted">최근 24시간 에러</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--error-color)' }}>
                {logStats.errors?.last24h || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 최근 요청 */}
      <div className="card">
        <div className="card-header">
          <h2>📋 최근 요청</h2>
          <a href="/items" className="btn btn-secondary btn-sm">전체 보기</a>
        </div>
        {recentItems.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '20px' }}>
            아직 요청이 없습니다.
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>요청 ID</th>
                  <th>문항 번호</th>
                  <th>상태</th>
                  <th>생성일</th>
                </tr>
              </thead>
              <tbody>
                {recentItems.map(item => (
                  <tr key={item.request_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {item.request_id?.slice(0, 8)}...
                    </td>
                    <td>RC{item.item_no}</td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {new Date(item.created_at).toLocaleString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 빠른 작업 */}
      <div className="card">
        <div className="card-header">
          <h2>⚡ 빠른 작업</h2>
        </div>
        <div className="flex gap-4">
          <a href="/items/create" className="btn btn-primary">
            ➕ 새 문항 생성
          </a>
          <a href="/sets" className="btn btn-secondary">
            📚 세트 관리
          </a>
          <a href="/prompts" className="btn btn-secondary">
            💬 프롬프트 편집
          </a>
        </div>
      </div>

      {/* 작동 프로세스 버튼 */}
      <div className="card">
        <div className="card-header">
          <h2>📖 시스템 안내</h2>
        </div>
        <div className="flex gap-4">
          <button
            className="btn btn-primary"
            onClick={() => setShowProcessGuide(true)}
          >
            🔄 작동 프로세스 보기
          </button>
        </div>
      </div>

      {/* 작동 프로세스 모달 */}
      {showProcessGuide && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowProcessGuide(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '900px',
              maxHeight: '85vh',
              overflow: 'auto',
              margin: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>🔄 시스템 작동 프로세스</h2>
              <button
                onClick={() => setShowProcessGuide(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                ✕
              </button>
            </div>

            {/* 프로세스 흐름도 */}
            <div style={{ marginBottom: '24px' }}>
              <h3>📊 문항 생성 파이프라인 (6단계)</h3>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}>
                <div style={{ padding: '8px 12px', backgroundColor: '#e3f2fd', borderRadius: '6px' }}>1️⃣ 요청 등록</div>
                <span>→</span>
                <div style={{ padding: '8px 12px', backgroundColor: '#e8f5e9', borderRadius: '6px' }}>2️⃣ 지문 생성</div>
                <span>→</span>
                <div style={{ padding: '8px 12px', backgroundColor: '#fff3e0', borderRadius: '6px' }}>3️⃣ 프롬프트 구성</div>
                <span>→</span>
                <div style={{ padding: '8px 12px', backgroundColor: '#fce4ec', borderRadius: '6px' }}>4️⃣ LLM 호출</div>
                <span>→</span>
                <div style={{ padding: '8px 12px', backgroundColor: '#f3e5f5', borderRadius: '6px' }}>5️⃣ 3겹 검증</div>
                <span>→</span>
                <div style={{ padding: '8px 12px', backgroundColor: '#e0f7fa', borderRadius: '6px' }}>6️⃣ 결과 저장</div>
              </div>
            </div>

            {/* 메뉴별 역할 */}
            <div style={{ marginBottom: '24px' }}>
              <h3>📋 메뉴별 역할 및 프로세스 연결</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f3f4' }}>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>메뉴</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>역할</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>프로세스 단계</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>📊 대시보드</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>전체 현황 모니터링</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>모든 단계 결과 집계</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>➕ 새 문항 생성</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>문항 생성 요청</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>1️⃣ 요청 등록 (시작점)</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>📋 문항 요청</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>요청 목록 및 실행</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>1️⃣~6️⃣ 전체 실행/조회</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>📚 세트 문항</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>장문 세트 관리</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>2️⃣ 공통 지문 + 다중 문항</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>💬 프롬프트 관리</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>LLM 지시문 편집</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>3️⃣ 프롬프트 구성에 사용</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>📈 차트 데이터</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>RC25 도표 데이터</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>3️⃣ 도표 문항 입력 데이터</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>⚙️ 설정</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>API키, 모델 설정</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>4️⃣ LLM 호출 파라미터</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>🎯 품질 대시보드</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>검증 결과 분석</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>5️⃣ 3겹 검증 결과 집계</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>📜 로그</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>시스템 로그</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>전체 실행 기록</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3겹 검증 시스템 */}
            <div style={{ marginBottom: '24px' }}>
              <h3>🛡️ 3겹 검증 시스템</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
                  <strong>Layer 1: 구조 검증</strong>
                  <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#555' }}>
                    JSON 형식, 필수 필드, 선택지 개수, 정답 범위 확인
                  </p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '1px solid #ffe0b2' }}>
                  <strong>Layer 2: 내용 검증</strong>
                  <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#555' }}>
                    선택지 중복, 정답 포함 여부, 해설 존재 확인
                  </p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#fce4ec', borderRadius: '8px', border: '1px solid #f8bbd9' }}>
                  <strong>Layer 3: 수능 적합성</strong>
                  <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#555' }}>
                    지문 길이, 문장 복잡도, 형식 요건 충족
                  </p>
                </div>
              </div>
            </div>

            {/* 사용 시나리오 */}
            <div>
              <h3>🎯 일반적인 사용 시나리오</h3>
              <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                <li><strong>설정 확인</strong>: ⚙️ 설정에서 API 키와 모델 확인</li>
                <li><strong>프롬프트 확인</strong>: 💬 프롬프트 관리에서 문항별 프롬프트 확인</li>
                <li><strong>문항 생성</strong>: ➕ 새 문항 생성에서 문항 번호, 난이도 선택 후 생성</li>
                <li><strong>결과 확인</strong>: 📋 문항 요청에서 생성 결과 및 상세 내용 확인</li>
                <li><strong>품질 분석</strong>: 🎯 품질 대시보드에서 검증 점수 및 등급 확인</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
