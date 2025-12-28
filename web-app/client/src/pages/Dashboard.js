import React, { useState, useEffect } from 'react';
import { itemsApi, logsApi, healthCheck } from '../api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [logStats, setLogStats] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [serverStatus, setServerStatus] = useState('checking');
  const [loading, setLoading] = useState(true);

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
    </div>
  );
}

export default Dashboard;
