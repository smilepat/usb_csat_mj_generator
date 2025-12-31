import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3001';

function Quality() {
  const [summary, setSummary] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [filter, setFilter] = useState({ recommendation: '', grade: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 요약 데이터 로드
      const summaryRes = await fetch(`${API_BASE}/api/metrics/summary`);
      const summaryData = await summaryRes.json();
      if (summaryData.success) {
        setSummary(summaryData.data);
      }

      // 메트릭스 목록 로드
      const params = new URLSearchParams();
      if (filter.recommendation) params.append('recommendation', filter.recommendation);
      if (filter.grade) params.append('grade', filter.grade);
      params.append('limit', '20');

      const metricsRes = await fetch(`${API_BASE}/api/metrics?${params}`);
      const metricsData = await metricsRes.json();
      if (metricsData.success) {
        setMetrics(metricsData.data || []);
      }

      setError(null);
    } catch (err) {
      setError('데이터 로드 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getGradeBadge = (grade) => {
    const colors = {
      'A': { bg: '#d4edda', color: '#155724' },
      'B': { bg: '#cce5ff', color: '#004085' },
      'C': { bg: '#fff3cd', color: '#856404' },
      'D': { bg: '#ffe5d0', color: '#8a4500' },
      'F': { bg: '#f8d7da', color: '#721c24' }
    };
    const style = colors[grade] || { bg: '#e9ecef', color: '#495057' };
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        backgroundColor: style.bg,
        color: style.color,
        fontWeight: 'bold',
        fontSize: '0.9rem'
      }}>
        {grade}
      </span>
    );
  };

  const getRecommendationBadge = (rec) => {
    const styles = {
      'APPROVE': { bg: '#28a745', color: 'white', text: '승인' },
      'REVIEW': { bg: '#ffc107', color: '#212529', text: '검토' },
      'REJECT': { bg: '#dc3545', color: 'white', text: '반려' }
    };
    const style = styles[rec] || { bg: '#6c757d', color: 'white', text: rec };
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '4px',
        backgroundColor: style.bg,
        color: style.color,
        fontWeight: 'bold',
        fontSize: '0.85rem'
      }}>
        {style.text}
      </span>
    );
  };

  if (loading && !summary) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>품질 데이터 로딩 중...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>📈 품질 대시보드</h1>

      {error && <div className="alert alert-error">{error}</div>}

      {/* 분류별 현황 */}
      {summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {['APPROVE', 'REVIEW', 'REJECT'].map(rec => {
              const count = summary.byRecommendation?.find(r => r.recommendation === rec)?.count || 0;
              const colors = {
                'APPROVE': 'var(--success-color)',
                'REVIEW': '#ffc107',
                'REJECT': 'var(--error-color)'
              };
              const labels = { 'APPROVE': '승인', 'REVIEW': '검토', 'REJECT': '반려' };
              return (
                <div key={rec} className="card" style={{ textAlign: 'center', cursor: 'pointer' }}
                     onClick={() => setFilter({ ...filter, recommendation: filter.recommendation === rec ? '' : rec })}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: colors[rec] }}>
                    {count}
                  </div>
                  <div className="text-muted">{labels[rec]}</div>
                </div>
              );
            })}
          </div>

          {/* 등급별 분포 */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h2>등급 분포</h2>
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {['A', 'B', 'C', 'D', 'F'].map(grade => {
                const count = summary.byGrade?.find(g => g.grade === grade)?.count || 0;
                return (
                  <div key={grade} style={{ textAlign: 'center', cursor: 'pointer' }}
                       onClick={() => setFilter({ ...filter, grade: filter.grade === grade ? '' : grade })}>
                    {getGradeBadge(grade)}
                    <div style={{ marginTop: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}>{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 평균 점수 */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h2>평균 점수</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <div>
                <div className="text-muted">Layer 1 (구조)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {summary.avgScores?.avg_layer1 || '-'}점
                </div>
              </div>
              <div>
                <div className="text-muted">Layer 2 (내용)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {summary.avgScores?.avg_layer2 || '-'}점
                </div>
              </div>
              <div>
                <div className="text-muted">Layer 3 (수능 적합성)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {summary.avgScores?.avg_layer3 || '-'}점
                </div>
              </div>
              <div>
                <div className="text-muted">종합 점수</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  {summary.avgScores?.avg_final || '-'}점
                </div>
              </div>
            </div>
          </div>

          {/* 문항 유형별 평균 */}
          {summary.byItemType && summary.byItemType.length > 0 && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <h2>문항 유형별 평균</h2>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>유형</th>
                      <th>문항 수</th>
                      <th>평균 점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byItemType.map(type => (
                      <tr key={type.item_type}>
                        <td>{type.item_type}</td>
                        <td>{type.count}</td>
                        <td style={{ fontWeight: 'bold' }}>{type.avg_score}점</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* 필터 */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span className="text-muted">필터:</span>
          <select
            value={filter.recommendation}
            onChange={(e) => setFilter({ ...filter, recommendation: e.target.value })}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">모든 분류</option>
            <option value="APPROVE">승인</option>
            <option value="REVIEW">검토</option>
            <option value="REJECT">반려</option>
          </select>
          <select
            value={filter.grade}
            onChange={(e) => setFilter({ ...filter, grade: e.target.value })}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">모든 등급</option>
            <option value="A">A등급</option>
            <option value="B">B등급</option>
            <option value="C">C등급</option>
            <option value="D">D등급</option>
            <option value="F">F등급</option>
          </select>
          {(filter.recommendation || filter.grade) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setFilter({ recommendation: '', grade: '' })}
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* 메트릭스 목록 */}
      <div className="card">
        <div className="card-header">
          <h2>문항별 메트릭스</h2>
        </div>
        {metrics.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '20px' }}>
            {loading ? '로딩 중...' : '메트릭스 데이터가 없습니다.'}
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>요청 ID</th>
                  <th>문항</th>
                  <th>L1</th>
                  <th>L2</th>
                  <th>L3</th>
                  <th>종합</th>
                  <th>등급</th>
                  <th>분류</th>
                  <th>생성일</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {m.request_id?.slice(0, 8)}...
                    </td>
                    <td>RC{m.item_no || m.req_item_no}</td>
                    <td style={{ color: m.layer1_pass ? 'var(--success-color)' : 'var(--error-color)' }}>
                      {m.layer1_score}
                    </td>
                    <td>{m.layer2_score}</td>
                    <td>{m.layer3_score}</td>
                    <td style={{ fontWeight: 'bold' }}>{m.final_score}</td>
                    <td>{getGradeBadge(m.grade)}</td>
                    <td>{getRecommendationBadge(m.recommendation)}</td>
                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {new Date(m.created_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Quality;
