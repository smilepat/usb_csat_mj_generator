import React, { useState, useEffect } from 'react';
import { logsApi } from '../api';
import { formatKST } from '../utils/dateUtils';

function Logs() {
  const [activeTab, setActiveTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab, filter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 통계 로드
      const statsRes = await logsApi.getStats();
      setStats(statsRes.data);

      if (activeTab === 'logs') {
        const params = filter ? { level: filter } : {};
        const res = await logsApi.getLogs(params);
        setLogs(res.data || []);
      } else {
        const res = await logsApi.getErrors();
        setErrors(res.data || []);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    const days = prompt('몇 일 이전의 로그를 삭제하시겠습니까?', '30');
    if (!days) return;

    try {
      const res = await logsApi.clear(parseInt(days));
      setMessage({ type: 'success', text: res.message });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const getLevelBadge = (level) => {
    const levelMap = {
      INFO: { class: 'badge-running', text: 'INFO' },
      WARN: { class: 'badge-pending', text: 'WARN' },
      ERROR: { class: 'badge-fail', text: 'ERROR' }
    };
    const info = levelMap[level] || { class: 'badge-pending', text: level };
    return <span className={`badge ${info.class}`}>{info.text}</span>;
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <h1>📜 로그</h1>
        <button className="btn btn-danger" onClick={handleClearLogs}>
          🗑️ 오래된 로그 삭제
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button
            onClick={() => setMessage(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 통계 */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.logs?.total || 0}</div>
            <div className="text-muted">전체 로그</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
              {stats.logs?.last24h || 0}
            </div>
            <div className="text-muted">최근 24시간</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--error-color)' }}>
              {stats.errors?.total || 0}
            </div>
            <div className="text-muted">전체 에러</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning-color)' }}>
              {stats.logs?.byLevel?.WARN || 0}
            </div>
            <div className="text-muted">경고</div>
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 일반 로그
        </button>
        <button
          className={`tab ${activeTab === 'errors' ? 'active' : ''}`}
          onClick={() => setActiveTab('errors')}
        >
          ⚠️ 에러 로그
        </button>
      </div>

      {/* 필터 (일반 로그만) */}
      {activeTab === 'logs' && (
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="flex gap-2">
            <button
              className={`btn ${filter === '' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setFilter('')}
            >
              전체
            </button>
            <button
              className={`btn ${filter === 'INFO' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setFilter('INFO')}
            >
              INFO
            </button>
            <button
              className={`btn ${filter === 'WARN' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setFilter('WARN')}
            >
              WARN
            </button>
            <button
              className={`btn ${filter === 'ERROR' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setFilter('ERROR')}
            >
              ERROR
            </button>
          </div>
        </div>
      )}

      {/* 로그 목록 */}
      <div className="card">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <span>로딩 중...</span>
          </div>
        ) : activeTab === 'logs' ? (
          logs.length === 0 ? (
            <p className="text-muted text-center" style={{ padding: '40px' }}>
              로그가 없습니다.
            </p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>시간</th>
                    <th>레벨</th>
                    <th>태그</th>
                    <th>요청 ID</th>
                    <th>메시지</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td className="text-muted" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatKST(log.timestamp)}
                      </td>
                      <td>{getLevelBadge(log.level)}</td>
                      <td style={{ fontSize: '0.85rem' }}>{log.tag || '-'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {log.request_id ? log.request_id.slice(0, 8) + '...' : '-'}
                      </td>
                      <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          errors.length === 0 ? (
            <p className="text-muted text-center" style={{ padding: '40px' }}>
              에러 로그가 없습니다.
            </p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>시간</th>
                    <th>요청 ID</th>
                    <th>함수</th>
                    <th>메시지</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map(error => (
                    <tr key={error.id}>
                      <td className="text-muted" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {formatKST(error.timestamp)}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {error.request_id ? error.request_id.slice(0, 8) + '...' : '-'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{error.func_name || '-'}</td>
                      <td>
                        <div style={{ color: 'var(--error-color)' }}>{error.message}</div>
                        {error.stack && (
                          <details style={{ marginTop: '4px' }}>
                            <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              스택 트레이스
                            </summary>
                            <pre style={{
                              fontSize: '0.75rem',
                              background: '#f5f5f5',
                              padding: '8px',
                              borderRadius: '4px',
                              overflow: 'auto',
                              maxHeight: '150px'
                            }}>
                              {error.stack}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default Logs;
