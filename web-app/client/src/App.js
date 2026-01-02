import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ItemRequests from './pages/ItemRequests';
import ItemCreate from './pages/ItemCreate';
import ItemSets from './pages/ItemSets';
import Prompts from './pages/Prompts';
import Charts from './pages/Charts';
import Config from './pages/Config';
import Logs from './pages/Logs';
import Quality from './pages/Quality';

function App() {
  const [showUserGuide, setShowUserGuide] = useState(false);

  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1>📝 수능문항생성-검증-개선 시스템</h1>
            <p style={{fontSize: '0.7em', opacity: 0.7, margin: 0}}>(origin: google appscript-mj)</p>
          </div>
          <nav>
            <ul className="sidebar-nav">
              <li>
                <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                  📊 대시보드
                </NavLink>
              </li>
              <li>
                <NavLink to="/items" className={({ isActive }) => isActive ? 'active' : ''}>
                  📋 문항 요청
                </NavLink>
              </li>
              <li>
                <NavLink to="/items/create" className={({ isActive }) => isActive ? 'active' : ''}>
                  ➕ 새 문항 생성
                </NavLink>
              </li>
              <li>
                <NavLink to="/sets" className={({ isActive }) => isActive ? 'active' : ''}>
                  📚 세트 문항
                </NavLink>
              </li>
              <li>
                <NavLink to="/prompts" className={({ isActive }) => isActive ? 'active' : ''}>
                  💬 프롬프트 관리
                </NavLink>
              </li>
              <li>
                <NavLink to="/charts" className={({ isActive }) => isActive ? 'active' : ''}>
                  📈 차트 데이터
                </NavLink>
              </li>
              <li>
                <NavLink to="/config" className={({ isActive }) => isActive ? 'active' : ''}>
                  ⚙️ 설정
                </NavLink>
              </li>
              <li>
                <NavLink to="/logs" className={({ isActive }) => isActive ? 'active' : ''}>
                  📜 로그
                </NavLink>
              </li>
              <li>
                <NavLink to="/quality" className={({ isActive }) => isActive ? 'active' : ''}>
                  🎯 품질 대시보드
                </NavLink>
              </li>
            </ul>
          </nav>

          {/* 사용자 설명서 버튼 */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            marginTop: 'auto'
          }}>
            <button
              onClick={() => setShowUserGuide(true)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              📖 사용자 설명서
            </button>
          </div>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/items" element={<ItemRequests />} />
            <Route path="/items/create" element={<ItemCreate />} />
            <Route path="/sets" element={<ItemSets />} />
            <Route path="/prompts" element={<Prompts />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="/config" element={<Config />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/quality" element={<Quality />} />
          </Routes>
        </main>
      </div>

      {/* 사용자 설명서 모달 */}
      {showUserGuide && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowUserGuide(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '24px 32px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>📖 수능 문항 생성기 사용자 설명서</h2>
              <button
                onClick={() => setShowUserGuide(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  fontSize: '1.2rem',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* 내용 */}
            <div style={{ padding: '32px', overflowY: 'auto', maxHeight: 'calc(90vh - 100px)' }}>

              {/* 시스템 개요 */}
              <section style={{ marginBottom: '32px' }}>
                <h3 style={{ color: '#667eea', borderBottom: '2px solid #667eea', paddingBottom: '8px', marginBottom: '16px' }}>
                  🎯 시스템 개요
                </h3>
                <p style={{ lineHeight: '1.8', color: '#444' }}>
                  이 시스템은 <strong>수능 영어 문항을 자동으로 생성</strong>하고, <strong>3겹 검증 시스템</strong>으로 품질을 관리하며,
                  <strong>프롬프트 최적화</strong>를 통해 지속적으로 품질을 개선하는 통합 플랫폼입니다.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
                  <div style={{ background: '#f0f7ff', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem' }}>📝</div>
                    <div style={{ fontWeight: '600', marginTop: '8px' }}>프롬프트 관리</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>입력, 편집, 버전 관리</div>
                  </div>
                  <div style={{ background: '#f0fff4', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem' }}>🤖</div>
                    <div style={{ fontWeight: '600', marginTop: '8px' }}>문항 생성</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>AI 기반 자동 생성</div>
                  </div>
                  <div style={{ background: '#fff7f0', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem' }}>📊</div>
                    <div style={{ fontWeight: '600', marginTop: '8px' }}>품질 검증</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>3겹 메트릭스 평가</div>
                  </div>
                </div>
              </section>

              {/* 프롬프트 입력 및 편집 */}
              <section style={{ marginBottom: '32px' }}>
                <h3 style={{ color: '#2e7d32', borderBottom: '2px solid #2e7d32', paddingBottom: '8px', marginBottom: '16px' }}>
                  ✏️ 프롬프트 입력 및 편집
                </h3>
                <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 12px 0' }}>프롬프트 키 규칙</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#e8f5e9' }}>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>키 패턴</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>용도</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>예시</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td style={{ padding: '10px', border: '1px solid #ddd' }}>MASTER_PROMPT</td><td style={{ padding: '10px', border: '1px solid #ddd' }}>마스터 시스템 프롬프트</td><td style={{ padding: '10px', border: '1px solid #ddd' }}>전체 문항 생성 지침</td></tr>
                      <tr><td style={{ padding: '10px', border: '1px solid #ddd' }}>LC16, LC17</td><td style={{ padding: '10px', border: '1px solid #ddd' }}>듣기 문항 프롬프트</td><td style={{ padding: '10px', border: '1px solid #ddd' }}>듣기 세트 생성</td></tr>
                      <tr><td style={{ padding: '10px', border: '1px solid #ddd' }}>RC18 ~ RC45</td><td style={{ padding: '10px', border: '1px solid #ddd' }}>독해 문항 프롬프트</td><td style={{ padding: '10px', border: '1px solid #ddd' }}>RC29 어법 문항</td></tr>
                      <tr><td style={{ padding: '10px', border: '1px solid #ddd' }}>P1 ~ P45</td><td style={{ padding: '10px', border: '1px solid #ddd' }}>지문 생성 프롬프트</td><td style={{ padding: '10px', border: '1px solid #ddd' }}>P31 빈칸 지문</td></tr>
                    </tbody>
                  </table>

                  <h4 style={{ margin: '20px 0 12px 0' }}>편집 방법</h4>
                  <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                    <li><strong>💬 프롬프트 관리</strong> 메뉴 클릭</li>
                    <li>좌측 목록에서 편집할 프롬프트 선택</li>
                    <li><strong>✏️ 편집</strong> 버튼 클릭하여 편집 모드 진입</li>
                    <li>프롬프트 내용 수정</li>
                    <li><strong>💾 저장</strong> 버튼 클릭 (즉시 적용됨)</li>
                  </ol>
                </div>
              </section>

              {/* 프롬프트 개선 */}
              <section style={{ marginBottom: '32px' }}>
                <h3 style={{ color: '#1565c0', borderBottom: '2px solid #1565c0', paddingBottom: '8px', marginBottom: '16px' }}>
                  🚀 프롬프트 개선 방법
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: '#e3f2fd', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#1565c0' }}>⚡ 빠른 검증</h4>
                    <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                      <li>규칙 기반 즉시 검사</li>
                      <li>API 비용 없음</li>
                      <li>길이, 필수 요소 확인</li>
                    </ul>
                  </div>
                  <div style={{ background: '#e8f5e9', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#2e7d32' }}>🤖 AI 검증</h4>
                    <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                      <li>5가지 기준 종합 평가</li>
                      <li>강점/약점 분석</li>
                      <li>개선 프롬프트 제안</li>
                    </ul>
                  </div>
                  <div style={{ background: '#fff3e0', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#e65100' }}>💬 사용자 피드백</h4>
                    <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                      <li>직접 개선 요청 입력</li>
                      <li>AI가 피드백 반영</li>
                      <li>맞춤형 개선 결과</li>
                    </ul>
                  </div>
                  <div style={{ background: '#fce4ec', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#c2185b' }}>📜 버전 관리</h4>
                    <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                      <li>자동 버전 백업</li>
                      <li>이전 버전 복원</li>
                      <li>변경 이력 추적</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 문항 생성 */}
              <section style={{ marginBottom: '32px' }}>
                <h3 style={{ color: '#7b1fa2', borderBottom: '2px solid #7b1fa2', paddingBottom: '8px', marginBottom: '16px' }}>
                  ➕ 문항 생성 및 개선
                </h3>
                <div style={{ background: '#f3e5f5', padding: '20px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 12px 0' }}>생성 단계</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <span style={{ background: '#7b1fa2', color: 'white', padding: '8px 16px', borderRadius: '20px' }}>1. 문항 번호 선택</span>
                    <span>→</span>
                    <span style={{ background: '#7b1fa2', color: 'white', padding: '8px 16px', borderRadius: '20px' }}>2. 난이도 설정</span>
                    <span>→</span>
                    <span style={{ background: '#7b1fa2', color: 'white', padding: '8px 16px', borderRadius: '20px' }}>3. 생성 실행</span>
                    <span>→</span>
                    <span style={{ background: '#7b1fa2', color: 'white', padding: '8px 16px', borderRadius: '20px' }}>4. 결과 확인</span>
                  </div>

                  <h4 style={{ margin: '20px 0 12px 0' }}>개선 사이클</h4>
                  <div style={{ background: 'white', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                    <code style={{ fontSize: '0.9rem', color: '#7b1fa2' }}>
                      프롬프트 수정 → 문항 생성 → 품질 확인 → 피드백 반영 → 재수정
                    </code>
                  </div>
                </div>
              </section>

              {/* 메트릭스 사용법 */}
              <section style={{ marginBottom: '32px' }}>
                <h3 style={{ color: '#c62828', borderBottom: '2px solid #c62828', paddingBottom: '8px', marginBottom: '16px' }}>
                  📊 3겹 검증 메트릭스 사용법
                </h3>
                <div style={{ background: '#ffebee', padding: '20px', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#ef9a9a' }}>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>레이어</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>검증 항목</th>
                        <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>가중치</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Layer 1: 구조 검증</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>question, options 5개, answer 1-5</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>40%</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Layer 2: 내용 품질</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>정답 범위, 선택지 중복, 해설 존재</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>25%</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Layer 3: 수능 적합성</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>지문 길이, 문장 복잡도, 선택지 형식</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>35%</td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 style={{ margin: '20px 0 12px 0' }}>등급 기준</h4>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <span style={{ background: '#4caf50', color: 'white', padding: '8px 16px', borderRadius: '4px' }}>A: 90-100 (APPROVE)</span>
                    <span style={{ background: '#8bc34a', color: 'white', padding: '8px 16px', borderRadius: '4px' }}>B: 80-89 (APPROVE)</span>
                    <span style={{ background: '#ffc107', color: '#333', padding: '8px 16px', borderRadius: '4px' }}>C: 70-79 (REVIEW)</span>
                    <span style={{ background: '#ff9800', color: 'white', padding: '8px 16px', borderRadius: '4px' }}>D: 60-69 (REVIEW)</span>
                    <span style={{ background: '#f44336', color: 'white', padding: '8px 16px', borderRadius: '4px' }}>F: 60 미만 (REJECT)</span>
                  </div>

                  <h4 style={{ margin: '20px 0 12px 0' }}>품질 대시보드 활용</h4>
                  <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                    <li><strong>🎯 품질 대시보드</strong> 메뉴에서 전체 통계 확인</li>
                    <li>등급 분포, 레이어별 점수 분석</li>
                    <li>문항별 상세 검증 결과 및 로그 확인</li>
                    <li>점수가 낮은 레이어 파악 → 해당 부분 프롬프트 개선</li>
                  </ul>
                </div>
              </section>

              {/* 향후 개선 방향 */}
              <section style={{ marginBottom: '16px' }}>
                <h3 style={{ color: '#00695c', borderBottom: '2px solid #00695c', paddingBottom: '8px', marginBottom: '16px' }}>
                  🔮 향후 개선 방향
                </h3>
                <div style={{ background: '#e0f2f1', padding: '20px', borderRadius: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', color: '#00695c' }}>🎯 품질 향상</h4>
                      <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                        <li>AI 기반 Layer 2 검증 고도화</li>
                        <li>문항 유형별 세분화된 평가 기준</li>
                        <li>실제 수능 기출 데이터 학습</li>
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', color: '#00695c' }}>🛠️ 기능 확장</h4>
                      <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                        <li>생성된 문항 직접 편집 기능</li>
                        <li>사용자 피드백 수집 시스템</li>
                        <li>문항 내보내기 (HWP, PDF)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', color: '#00695c' }}>📈 분석 강화</h4>
                      <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                        <li>프롬프트 성능 추세 분석</li>
                        <li>문항 유형별 품질 리포트</li>
                        <li>개선 효과 자동 측정</li>
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 12px 0', color: '#00695c' }}>🔗 연동 확대</h4>
                      <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                        <li>다양한 LLM 모델 지원</li>
                        <li>외부 문항 DB 연동</li>
                        <li>협업 기능 추가</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* 푸터 */}
              <div style={{ textAlign: 'center', padding: '16px', borderTop: '1px solid #eee', marginTop: '24px', color: '#666' }}>
                <p style={{ margin: 0 }}>자세한 내용은 <strong>docs/user-guide.md</strong> 파일을 참조하세요.</p>
                <p style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>마지막 업데이트: 2026-01-02</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;
