import React, { useState, useEffect } from 'react';
import { itemsApi, logsApi, healthCheck, promptsApi } from '../api';
import { formatKST } from '../utils/dateUtils';
import { getStatusDisplay, getItemType } from '../constants';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [logStats, setLogStats] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [serverStatus, setServerStatus] = useState('checking');
  const [loading, setLoading] = useState(true);
  const [showProcessGuide, setShowProcessGuide] = useState(false);
  const [showPromptGuide, setShowPromptGuide] = useState(false);
  const [showOntology, setShowOntology] = useState(false);
  const [promptAlerts, setPromptAlerts] = useState(null);
  const [showAlertDetail, setShowAlertDetail] = useState(null);

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

      // 프롬프트 개선 알림
      try {
        const alertsRes = await promptsApi.getFeedbackSummary();
        setPromptAlerts(alertsRes.data);
      } catch (alertError) {
        console.warn('프롬프트 알림 로드 실패:', alertError);
      }

    } catch (error) {
      console.error('데이터 로드 오류:', error);
      setServerStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const info = getStatusDisplay(status);
    return (
      <span
        className={`badge ${info.class}`}
        title={info.description}
      >
        {info.label}
      </span>
    );
  };

  const getIssueLabel = (pattern) => {
    const labels = {
      'low_approve_rate': '낮은 승인율',
      'layer1_failures': '구조 오류',
      'layer2_failures': '내용 품질',
      'layer3_failures': 'CSAT 기준 미달',
      'consecutive_fails': '연속 실패',
      'distractor_issues': '오답지 문제',
      'length_issues': '길이 문제',
      'declining_performance': '성능 하락'
    };
    return labels[pattern] || pattern;
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
        <div className="card" style={{ textAlign: 'center' }} title="요청이 등록되어 생성 대기 중인 문항">
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbbc04' }}>
            {stats?.pending || 0}
          </div>
          <div className="text-muted">입력 완료 (대기)</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }} title="문항 생성 및 검증 완료">
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
            {stats?.ok || 0}
          </div>
          <div className="text-muted">생성 완료</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }} title="생성 또는 검증 실패">
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

      {/* 프롬프트 개선 알림 */}
      {promptAlerts && promptAlerts.totalPromptsWithIssues > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #ff9800' }}>
          <div className="card-header">
            <h2>🔔 프롬프트 개선 알림</h2>
            <span style={{
              backgroundColor: promptAlerts.criticalPrompts > 0 ? '#f44336' : '#ff9800',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.85rem'
            }}>
              {promptAlerts.totalPromptsWithIssues}개 프롬프트 주의 필요
            </span>
          </div>

          {/* 요약 통계 */}
          <div style={{
            display: 'flex',
            gap: '24px',
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#fff8e1',
            borderRadius: '8px'
          }}>
            {promptAlerts.criticalPrompts > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>❌</span>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#d32f2f' }}>{promptAlerts.criticalPrompts}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>즉시 개선 필요</div>
                </div>
              </div>
            )}
            {promptAlerts.warningPrompts > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#f57c00' }}>{promptAlerts.warningPrompts}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>주의 필요</div>
                </div>
              </div>
            )}
          </div>

          {/* 주의가 필요한 프롬프트 목록 */}
          {promptAlerts.promptsNeedingAttention && promptAlerts.promptsNeedingAttention.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '12px', color: '#666' }}>개선이 필요한 프롬프트:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {promptAlerts.promptsNeedingAttention.slice(0, 5).map((prompt, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      backgroundColor: prompt.criticalCount > 0 ? '#ffebee' : '#fff3e0',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setShowAlertDetail(prompt)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontWeight: 'bold',
                        color: prompt.criticalCount > 0 ? '#d32f2f' : '#f57c00'
                      }}>
                        RC{prompt.itemNo}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>
                        승인율: {prompt.stats?.approveRate?.toFixed(1) || 0}%
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>
                        ({prompt.stats?.totalCount || 0}건 생성)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {prompt.criticalCount > 0 && (
                        <span style={{
                          backgroundColor: '#d32f2f',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem'
                        }}>
                          {prompt.criticalCount} CRITICAL
                        </span>
                      )}
                      {prompt.warningCount > 0 && (
                        <span style={{
                          backgroundColor: '#ff9800',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem'
                        }}>
                          {prompt.warningCount} WARNING
                        </span>
                      )}
                      <span style={{ color: '#1976d2', fontSize: '0.85rem' }}>자세히 보기 →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 자주 발생하는 문제 */}
          {promptAlerts.topIssues && promptAlerts.topIssues.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ marginBottom: '8px', color: '#666' }}>자주 발생하는 문제:</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {promptAlerts.topIssues.map((issue, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#e3f2fd',
                      borderRadius: '16px',
                      fontSize: '0.85rem'
                    }}
                  >
                    {getIssueLabel(issue.pattern)} ({issue.count})
                  </span>
                ))}
              </div>
            </div>
          )}
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
                    <td>{getItemType(item.item_no)}{item.item_no}</td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {formatKST(item.created_at)}
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
          <button
            className="btn btn-secondary"
            onClick={() => setShowPromptGuide(true)}
          >
            💬 프롬프트 개선 프로세스
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowOntology(true)}
          >
            🔗 시스템 온톨로지
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

      {/* 프롬프트 개선 프로세스 모달 */}
      {showPromptGuide && (
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
          onClick={() => setShowPromptGuide(false)}
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
              <h2 style={{ margin: 0 }}>💬 프롬프트 개선 프로세스</h2>
              <button
                onClick={() => setShowPromptGuide(false)}
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

            {/* 1단계 */}
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#1565c0' }}>1단계: 프롬프트 관리 페이지 접속</h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>좌측 메뉴에서 <strong>💬 프롬프트 관리</strong> 클릭</li>
                <li>프롬프트 목록에서 개선할 프롬프트 선택</li>
              </ul>
            </div>

            {/* 2단계 */}
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#2e7d32' }}>2단계: 현재 프롬프트 검증</h3>
              <p style={{ margin: '0 0 12px 0' }}>프롬프트 선택 후 세 가지 검증 옵션 사용:</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', backgroundColor: 'white', borderRadius: '4px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f3f4' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>버튼</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>기능</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>API 비용</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>⚡ 빠른 검증</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>규칙 기반 기본 검사 (길이, 필수 요소)</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#2e7d32' }}>없음</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>🤖 AI 검증</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>LLM이 5가지 기준으로 종합 평가</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#f57c00' }}>발생</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>💬 사용자 피드백</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>직접 개선 요청 입력</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#f57c00' }}>발생</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3단계 */}
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#e65100' }}>3단계: 검증 결과 확인</h3>
              <p style={{ margin: '0 0 8px 0' }}>AI 검증 시 다음 항목 확인:</p>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>등급</strong> (A~F) 및 <strong>점수</strong> (10점 만점)</li>
                <li><strong>세부 평가</strong>: 명확성, 완전성, 일관성, 구체성, 수능 적합성</li>
                <li><strong>강점/약점</strong> 분석</li>
                <li><strong>개선 제안</strong> 및 <strong>개선된 프롬프트</strong></li>
              </ul>
            </div>

            {/* 4단계 */}
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#fce4ec', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#c2185b' }}>4단계: 개선된 프롬프트 적용</h3>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li>AI가 제안한 개선 프롬프트 확인</li>
                <li><strong>📝 적용하기</strong> 버튼 클릭</li>
                <li>필요시 추가 수정</li>
                <li><strong>💾 저장</strong> 버튼으로 저장</li>
              </ol>
            </div>

            {/* 5단계 */}
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f3e5f5', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#7b1fa2' }}>5단계: 문항 생성으로 테스트</h3>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>➕ 새 문항 생성</strong>에서 해당 문항 번호로 생성</li>
                <li><strong>📋 문항 요청</strong>에서 결과 확인</li>
                <li><strong>🎯 품질 대시보드</strong>에서 검증 점수 확인</li>
              </ol>
            </div>

            {/* 반복 개선 사이클 */}
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#e0f7fa', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#00838f' }}>🔄 반복 개선 사이클</h3>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center',
                fontSize: '0.9rem'
              }}>
                <div style={{ padding: '6px 12px', backgroundColor: 'white', borderRadius: '6px' }}>프롬프트 수정</div>
                <span>→</span>
                <div style={{ padding: '6px 12px', backgroundColor: 'white', borderRadius: '6px' }}>문항 생성</div>
                <span>→</span>
                <div style={{ padding: '6px 12px', backgroundColor: 'white', borderRadius: '6px' }}>품질 확인</div>
                <span>→</span>
                <div style={{ padding: '6px 12px', backgroundColor: 'white', borderRadius: '6px' }}>피드백 반영</div>
                <span>→</span>
                <div style={{ padding: '6px 12px', backgroundColor: 'white', borderRadius: '6px' }}>재수정</div>
              </div>
            </div>

            {/* 3겹 검증 기준 */}
            <div style={{ marginBottom: '20px' }}>
              <h3>🛡️ 3겹 검증 시스템 기준</h3>

              {/* Layer 1 */}
              <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
                <strong>Layer 1: 구조 검증 (40% 가중치)</strong>
                <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#555' }}>
                  필수 통과 조건 - 실패 시 최대 40점 제한<br/>
                  • question: 비어있지 않아야 함<br/>
                  • options: 배열 길이 5개, 빈 문자열 2개 미만<br/>
                  • answer: 1~5 범위 내 값
                </p>
              </div>

              {/* Layer 2 */}
              <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '1px solid #ffe0b2' }}>
                <strong>Layer 2: 내용 검증 (25% 가중치)</strong>
                <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#555' }}>
                  • 정답 범위 (30점): answer가 1~5 범위 내<br/>
                  • 선택지 중복 (40점): 5개 선택지 모두 고유<br/>
                  • 해설 존재 (30점): 10자 이상 해설
                </p>
              </div>

              {/* Layer 3 */}
              <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#fce4ec', borderRadius: '8px', border: '1px solid #f8bbd9' }}>
                <strong>Layer 3: 수능 적합성 (35% 가중치)</strong>
                <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#555' }}>
                  • 지문 길이 (40점): 문항별 적정 단어 수<br/>
                  • 문장 복잡도 (30점): 평균 12-28단어/문장<br/>
                  • 선택지 형식 (30점): 5개 선택지 완비
                </p>
              </div>
            </div>

            {/* 등급 기준 */}
            <div>
              <h3>📊 종합 점수 및 등급</h3>
              <p style={{ fontSize: '0.9rem', marginBottom: '12px' }}>
                <strong>최종 점수</strong> = Layer1×0.40 + Layer3×0.35 + Layer2×0.25
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f3f4' }}>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>등급</th>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>점수</th>
                    <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>분류</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: '#e8f5e9' }}>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>A</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>90+</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#2e7d32' }}>APPROVE</td>
                  </tr>
                  <tr style={{ backgroundColor: '#e3f2fd' }}>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>B</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>80-89</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#1565c0' }}>APPROVE/REVIEW</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fff8e1' }}>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>C</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>70-79</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#f57c00' }}>REVIEW</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fff3e0' }}>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>D</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>60-69</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#e65100' }}>REVIEW/REJECT</td>
                  </tr>
                  <tr style={{ backgroundColor: '#ffebee' }}>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>F</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>60 미만</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#c62828' }}>REJECT</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 시스템 온톨로지 모달 */}
      {showOntology && (
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
          onClick={() => setShowOntology(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '1100px',
              maxHeight: '90vh',
              overflow: 'auto',
              margin: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>🔗 CSAT Item Generator 시스템 온톨로지</h2>
              <button
                onClick={() => setShowOntology(false)}
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

            {/* 핵심 개념 다이어그램 */}
            <div style={{ marginBottom: '24px' }}>
              <h3>📊 핵심 개념 구조 (Core Concepts)</h3>
              <div style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                lineHeight: '1.6',
                overflow: 'auto'
              }}>
                <pre style={{ margin: 0 }}>{`┌─────────────────────────────────────────────────────────────────────────────┐
│                         CSAT Item Generator Ontology                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Prompt    │───▶│   Request   │───▶│    Item     │───▶│   Output    │  │
│  │  (템플릿)    │    │  (요청)      │    │  (문항)      │    │  (결과물)    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                  │                  │                  │          │
│         ▼                  ▼                  ▼                  ▼          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  Metrics    │    │  Pipeline   │    │  Validator  │    │   Library   │  │
│  │  (성능지표)   │    │  (파이프라인) │    │  (검증기)    │    │  (보관소)    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘`}</pre>
              </div>
            </div>

            {/* 개념 정의 테이블 */}
            <div style={{ marginBottom: '24px' }}>
              <h3>📖 개념 정의 (Concept Definitions)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e3f2fd' }}>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #1976d2' }}>개념</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #1976d2' }}>정의</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #1976d2' }}>주요 속성</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Prompt</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>문항 생성 지시문 템플릿</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontFamily: 'monospace', fontSize: '0.8rem' }}>key, title, text, active</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Request</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>문항 생성 요청 인스턴스</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontFamily: 'monospace', fontSize: '0.8rem' }}>request_id, item_no, status</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Item</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>생성된 문항 데이터</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontFamily: 'monospace', fontSize: '0.8rem' }}>raw_json, normalized, final</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Output</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>최종 형식화된 출력물</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontFamily: 'monospace', fontSize: '0.8rem' }}>question, options, answer</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Metrics</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>성능 측정 데이터</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontFamily: 'monospace', fontSize: '0.8rem' }}>score, grade, approve_rate</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Validator</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>품질 검증 규칙 세트</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontFamily: 'monospace', fontSize: '0.8rem' }}>common, grammar, gap, format</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Pipeline</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>생성 워크플로우</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontFamily: 'monospace', fontSize: '0.8rem' }}>passage→prompt→LLM→parse</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Library</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>승인된 문항 저장소</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontFamily: 'monospace', fontSize: '0.8rem' }}>재사용 가능 고품질 문항</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 기능 간 연관 관계 */}
            <div style={{ marginBottom: '24px' }}>
              <h3>🔗 기능 간 연관 관계 (Ontological Relations)</h3>
              <div style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                lineHeight: '1.6',
                overflow: 'auto'
              }}>
                <pre style={{ margin: 0 }}>{`┌──────────────┐  composes   ┌──────────────────┐  invokes    ┌──────────────┐
│ MASTER_PROMPT│────────────▶│  PromptBuilder   │────────────▶│   LLMClient  │
│  (공통 규칙)  │             │  (프롬프트 구성)   │             │  (API 호출)   │
└──────────────┘             └──────────────────┘             └──────────────┘
       │                              │                              │
       │ extends                      │ uses                         │ returns
       ▼                              ▼                              ▼
┌──────────────┐  selected    ┌──────────────────┐  parses    ┌──────────────┐
│ Type Prompt  │─────────────▶│  ItemPipeline    │───────────▶│   JsonUtils  │
│ (LC/RC 템플릿)│             │  (생성 파이프라인)  │             │  (JSON 파싱)  │
└──────────────┘             └──────────────────┘             └──────────────┘
                                      │                              │
                                      │ validates                    │ normalizes
                                      ▼                              ▼
                              ┌──────────────────┐  evaluates  ┌──────────────┐
                              │   Validators     │────────────▶│ ItemEvaluator│
                              │  (규칙 기반 검증)  │             │ (LLM 품질평가) │
                              └──────────────────┘             └──────────────┘
                                      │                              │
                                      │ stores                       │ scores
                                      ▼                              ▼
                              ┌──────────────────┐  tracks     ┌──────────────┐
                              │    Database      │────────────▶│   Metrics    │
                              │  (SQLite/SQL.js) │             │  (성능 추적)   │
                              └──────────────────┘             └──────────────┘`}</pre>
              </div>
            </div>

            {/* 관계 유형 설명 */}
            <div style={{ marginBottom: '24px' }}>
              <h3>📋 관계 유형 설명</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e8f5e9' }}>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #4caf50' }}>관계</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #4caf50' }}>소스 → 타겟</th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #4caf50' }}>의미</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#1565c0' }}>composes</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>MASTER → PromptBuilder</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>공통 규칙이 모든 프롬프트에 합성됨</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#1565c0' }}>extends</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>Type Prompt → MASTER</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>문항별 템플릿이 마스터를 확장함</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#1565c0' }}>selected</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>Type Prompt → Pipeline</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>문항 번호에 따라 적절한 템플릿 선택</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#1565c0' }}>invokes</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>PromptBuilder → LLMClient</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>구성된 프롬프트로 LLM API 호출</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#1565c0' }}>validates</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>Pipeline → Validators</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>생성 결과에 규칙 기반 검증 적용</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#1565c0' }}>evaluates</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>Validators → ItemEvaluator</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>규칙 통과 후 LLM 품질 평가</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#1565c0' }}>tracks</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>Database → Metrics</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>프롬프트/문항 성능 추적</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 레이어 아키텍처 */}
            <div style={{ marginBottom: '24px' }}>
              <h3>🏗️ 레이어 아키텍처</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '2px solid #1976d2' }}>
                  <strong style={{ color: '#1565c0' }}>Layer 1: Presentation (프레젠테이션 계층)</strong>
                  <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#333' }}>
                    React Components: Dashboard, ItemCreate, Prompts, ItemRequests, Config<br/>
                    Context: AppContext (전역 상태), ThemeContext (테마)
                  </p>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #4caf50' }}>
                  <strong style={{ color: '#2e7d32' }}>Layer 2: API (API 계층)</strong>
                  <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#333' }}>
                    Routes: /prompts, /items, /config, /sets, /charts, /logs, /metrics<br/>
                    Middleware: auth, errorHandler, validate, apiVersion
                  </p>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '2px solid #ff9800' }}>
                  <strong style={{ color: '#e65100' }}>Layer 3: Business Logic (비즈니스 로직 계층)</strong>
                  <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#333' }}>
                    Core: itemPipeline, promptBuilder, passageGenerator, llmClient, jsonUtils<br/>
                    Validators: common, format, grammar, gap, chart, listening, set<br/>
                    Quality: itemEvaluator, promptEvaluator, metricsService
                  </p>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#fce4ec', borderRadius: '8px', border: '2px solid #e91e63' }}>
                  <strong style={{ color: '#c2185b' }}>Layer 4: Data Access (데이터 접근 계층)</strong>
                  <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#333' }}>
                    Repositories: baseRepository, promptRepository, itemRepository<br/>
                    Database: SQL.js (SQLite in-memory with file persistence)
                  </p>
                </div>
              </div>
            </div>

            {/* 검증 계층 구조 */}
            <div style={{ marginBottom: '24px' }}>
              <h3>🛡️ 검증 계층 구조 (Validation Layers)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '16px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
                  <strong style={{ color: '#2e7d32' }}>Layer 1: Format Validation</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '0.85rem' }}>
                    <li>JSON 구조 유효성</li>
                    <li>필수 필드 존재 여부</li>
                    <li>언어 혼용 규칙</li>
                    <li>지문 길이 범위 검사</li>
                  </ul>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '1px solid #ffe0b2' }}>
                  <strong style={{ color: '#e65100' }}>Layer 2: Common Validation</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '0.85rem' }}>
                    <li>5개 선택지 존재</li>
                    <li>correct_answer 1-5 범위</li>
                    <li>선택지 중복 여부</li>
                    <li>LLM 메타정보 누출 검사</li>
                  </ul>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#fce4ec', borderRadius: '8px', border: '1px solid #f8bbd0' }}>
                  <strong style={{ color: '#c2185b' }}>Layer 3: Type-Specific</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '0.85rem' }}>
                    <li>RC29 (어법): 밑줄 5개</li>
                    <li>RC31-33 (빈칸): 빈칸 위치</li>
                    <li>RC25 (차트): 데이터 일치</li>
                    <li>LC01-17: 대화 턴, 시간</li>
                  </ul>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #bbdefb' }}>
                  <strong style={{ color: '#1565c0' }}>Layer 4: Quality (LLM)</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '0.85rem' }}>
                    <li>정답 적합성 (30점)</li>
                    <li>오답 설계 품질 (25점)</li>
                    <li>변별력 (20점)</li>
                    <li>자연스러움 (10점)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 프롬프트 계층 구조 */}
            <div style={{ marginBottom: '24px' }}>
              <h3>📝 프롬프트 계층 구조</h3>
              <div style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                lineHeight: '1.6',
                overflow: 'auto'
              }}>
                <pre style={{ margin: 0 }}>{`                    ┌─────────────────────────┐
                    │     MASTER_PROMPT       │
                    │   (공통 규칙 - 저작권,    │
                    │    출력 형식, 어휘 수준)  │
                    └───────────┬─────────────┘
                                │ inherits
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │  LC Prompts   │   │  RC Prompts   │   │  Set Prompts  │
    │   (듣기 1-17)  │   │  (독해 18-45) │   │  (연계 문항)   │
    └───────┬───────┘   └───────┬───────┘   └───────────────┘
            │                   │
    ┌───────┴───────┐   ┌───────┴───────────────────┐
    ▼               ▼   ▼                           ▼
┌───────┐       ┌───────┐                       ┌───────┐
│ LC01  │  ...  │ LC17  │   RC18 ... RC40 ...   │ RC45  │
│목적파악│       │세트듣기│                       │장문독해│
└───────┘       └───────┘                       └───────┘`}</pre>
              </div>
            </div>

            {/* 데이터 흐름 */}
            <div style={{ marginBottom: '24px' }}>
              <h3>📊 데이터 생명주기</h3>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                fontSize: '0.85rem'
              }}>
                <div style={{ padding: '10px 14px', backgroundColor: '#e3f2fd', borderRadius: '6px', border: '1px solid #90caf9' }}>
                  <strong>1. Creation</strong><br/>
                  <span style={{ fontSize: '0.75rem' }}>요청 등록</span>
                </div>
                <span style={{ fontSize: '1.2rem' }}>→</span>
                <div style={{ padding: '10px 14px', backgroundColor: '#e8f5e9', borderRadius: '6px', border: '1px solid #a5d6a7' }}>
                  <strong>2. Generation</strong><br/>
                  <span style={{ fontSize: '0.75rem' }}>LLM 생성</span>
                </div>
                <span style={{ fontSize: '1.2rem' }}>→</span>
                <div style={{ padding: '10px 14px', backgroundColor: '#fff3e0', borderRadius: '6px', border: '1px solid #ffcc80' }}>
                  <strong>3. Validation</strong><br/>
                  <span style={{ fontSize: '0.75rem' }}>4계층 검증</span>
                </div>
                <span style={{ fontSize: '1.2rem' }}>→</span>
                <div style={{ padding: '10px 14px', backgroundColor: '#fce4ec', borderRadius: '6px', border: '1px solid #f48fb1' }}>
                  <strong>4. Evaluation</strong><br/>
                  <span style={{ fontSize: '0.75rem' }}>품질 평가</span>
                </div>
                <span style={{ fontSize: '1.2rem' }}>→</span>
                <div style={{ padding: '10px 14px', backgroundColor: '#f3e5f5', borderRadius: '6px', border: '1px solid #ce93d8' }}>
                  <strong>5. Storage</strong><br/>
                  <span style={{ fontSize: '0.75rem' }}>결과 저장</span>
                </div>
                <span style={{ fontSize: '1.2rem' }}>→</span>
                <div style={{ padding: '10px 14px', backgroundColor: '#e0f7fa', borderRadius: '6px', border: '1px solid #80deea' }}>
                  <strong>6. Archive</strong><br/>
                  <span style={{ fontSize: '0.75rem' }}>라이브러리</span>
                </div>
              </div>
            </div>

            {/* 온톨로지 요약 */}
            <div style={{ padding: '16px', backgroundColor: '#e8eaf6', borderRadius: '8px', border: '2px solid #5c6bc0' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#3949ab' }}>🎯 온톨로지 핵심 요약</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.8' }}>
                이 시스템은 <strong>"프롬프트 중심 문항 생성 시스템"</strong>으로, 모든 기능이 프롬프트를 축으로 연결되어 있습니다.
              </p>
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: 'white',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                textAlign: 'center'
              }}>
                <pre style={{ margin: 0 }}>{`                         ┌─────────────────┐
                         │    PROMPT       │
                         │   (중심 엔티티)   │
                         └────────┬────────┘
                                  │
        ┌─────────────┬───────────┼───────────┬─────────────┐
        ▼             ▼           ▼           ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Version │  │ Metrics │  │ Request │  │Validator│  │Evaluator│
   └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
        └─────────────┴───────────┴───────────┴─────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  Feedback Loop  │
                         │   (개선 사이클)   │
                         └─────────────────┘`}</pre>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: '0.85rem', color: '#555' }}>
                <strong>주요 온톨로지 관계:</strong><br/>
                • <strong>계층적 관계 (is-a)</strong>: MASTER_PROMPT → LC/RC Prompt → 개별 문항 프롬프트<br/>
                • <strong>구성 관계 (has-a)</strong>: ItemRequest → Passage, ItemNo, PromptId, Status<br/>
                • <strong>의존 관계 (depends-on)</strong>: ItemPipeline → PromptBuilder, LLMClient, Validators<br/>
                • <strong>순환 관계 (feedback-to)</strong>: Metrics → PromptImprovement → Better Items
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 프롬프트 알림 상세 모달 */}
      {showAlertDetail && (
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
          onClick={() => setShowAlertDetail(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '800px',
              maxHeight: '85vh',
              overflow: 'auto',
              margin: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>
                📊 RC{showAlertDetail.itemNo} 프롬프트 분석
              </h2>
              <button
                onClick={() => setShowAlertDetail(null)}
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

            {/* 통계 요약 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{showAlertDetail.stats?.totalCount || 0}</div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>총 생성</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#e8f5e9', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2e7d32' }}>
                  {showAlertDetail.stats?.approveRate?.toFixed(1) || 0}%
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>승인율</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#ffebee', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#c62828' }}>
                  {showAlertDetail.stats?.rejectCount || 0}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>거부</div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#fff3e0', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e65100' }}>
                  {showAlertDetail.alertCount || 0}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>알림 수</div>
              </div>
            </div>

            {/* 경고 목록 */}
            {showAlertDetail.alerts && showAlertDetail.alerts.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '12px' }}>🚨 발견된 문제</h3>
                {showAlertDetail.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      marginBottom: '12px',
                      backgroundColor: alert.type === 'CRITICAL' ? '#ffebee' : alert.type === 'WARNING' ? '#fff3e0' : '#e3f2fd',
                      borderLeft: `4px solid ${alert.type === 'CRITICAL' ? '#d32f2f' : alert.type === 'WARNING' ? '#ff9800' : '#2196f3'}`,
                      borderRadius: '4px'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{alert.title}</div>
                    <div style={{ marginBottom: '8px', color: '#555' }}>{alert.message}</div>
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      borderRadius: '4px'
                    }}>
                      <strong>💡 개선 방향:</strong> {alert.suggestion}
                    </div>
                    {alert.improvements && alert.improvements.length > 0 && (
                      <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                        {alert.improvements.map((imp, i) => (
                          <li key={i} style={{ fontSize: '0.9rem', color: '#555' }}>{imp}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 개선 제안 */}
            {showAlertDetail.suggestions && (
              <div>
                {showAlertDetail.suggestions.immediateActions?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ color: '#d32f2f', marginBottom: '12px' }}>🔴 즉시 조치 필요</h3>
                    {showAlertDetail.suggestions.immediateActions.map((action, idx) => (
                      <div key={idx} style={{
                        padding: '12px',
                        backgroundColor: '#ffebee',
                        borderRadius: '6px',
                        marginBottom: '8px'
                      }}>
                        <strong>{action.issue}</strong>: {action.action}
                      </div>
                    ))}
                  </div>
                )}

                {showAlertDetail.suggestions.shortTermActions?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ color: '#ff9800', marginBottom: '12px' }}>🟠 단기 개선</h3>
                    {showAlertDetail.suggestions.shortTermActions.map((action, idx) => (
                      <div key={idx} style={{
                        padding: '12px',
                        backgroundColor: '#fff3e0',
                        borderRadius: '6px',
                        marginBottom: '8px'
                      }}>
                        <strong>{action.issue}</strong>: {action.action}
                      </div>
                    ))}
                  </div>
                )}

                {showAlertDetail.suggestions.promptPatches?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ color: '#1976d2', marginBottom: '12px' }}>📝 프롬프트 수정 제안</h3>
                    {showAlertDetail.suggestions.promptPatches.map((patch, idx) => (
                      <div key={idx} style={{
                        padding: '12px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '6px',
                        marginBottom: '8px'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                          [{patch.target}] {patch.currentIssue}
                        </div>
                        <pre style={{
                          backgroundColor: '#fff',
                          padding: '12px',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          whiteSpace: 'pre-wrap',
                          margin: 0
                        }}>
                          {patch.patch}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 프롬프트 관리로 이동 버튼 */}
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <a
                href={`/prompts?highlight=${showAlertDetail.itemNo}`}
                className="btn btn-primary"
                style={{ marginRight: '12px' }}
              >
                💬 프롬프트 편집하러 가기
              </a>
              <button
                className="btn btn-secondary"
                onClick={() => setShowAlertDetail(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
