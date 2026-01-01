import React, { useState, useEffect } from 'react';
import { promptsApi } from '../api';

function Prompts() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    prompt_key: '',
    title: '',
    prompt_text: '',
    active: true
  });

  // AI 검증 관련 상태
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  // 사용자 피드백 관련 상태
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [improving, setImproving] = useState(false);
  const [improvementResult, setImprovementResult] = useState(null);

  // 메트릭스 관련 상태
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  // 프롬프트 정렬 순서 결정 함수
  const getPromptSortOrder = (key) => {
    // 1순위: MASTER_PROMPT
    if (key === 'MASTER_PROMPT') return { group: 0, order: 0 };
    // 2순위: PASSAGE_MASTER
    if (key === 'PASSAGE_MASTER') return { group: 1, order: 0 };

    // 3순위: LC01-LC17 (듣기 문항)
    const lcMatch = key.match(/^LC(\d+)$/i);
    if (lcMatch) {
      const num = parseInt(lcMatch[1]);
      // LC16-17은 세트로 취급
      if (num === 16 || num === 17) return { group: 2, order: 16, subOrder: num };
      return { group: 2, order: num, subOrder: 0 };
    }

    // 4순위: RC18-RC45 (독해 문항)
    const rcMatch = key.match(/^RC(\d+)$/i);
    if (rcMatch) {
      const num = parseInt(rcMatch[1]);
      // RC41-42, RC43-45는 세트로 취급
      if (num >= 41 && num <= 42) return { group: 3, order: 41, subOrder: num };
      if (num >= 43 && num <= 45) return { group: 3, order: 43, subOrder: num };
      return { group: 3, order: num, subOrder: 0 };
    }

    // 5순위: 순수 숫자 (1, 2, 3, ... 45) - 기존 형식
    if (/^\d+$/.test(key)) {
      const num = parseInt(key);
      // 듣기(1-17) vs 독해(18-45) 구분
      if (num >= 1 && num <= 17) {
        if (num === 16 || num === 17) return { group: 2, order: 16, subOrder: num };
        return { group: 2, order: num, subOrder: 0 };
      }
      if (num >= 18 && num <= 45) {
        if (num >= 41 && num <= 42) return { group: 3, order: 41, subOrder: num };
        if (num >= 43 && num <= 45) return { group: 3, order: 43, subOrder: num };
        return { group: 3, order: num, subOrder: 0 };
      }
      return { group: 4, order: num, subOrder: 0 };
    }

    // 6순위: P + 숫자 (지문용 프롬프트) - P1-P45
    const pMatch = key.match(/^P(\d+)$/i);
    if (pMatch) {
      const num = parseInt(pMatch[1]);
      // P16-17은 세트로 취급
      if (num === 16 || num === 17) return { group: 5, order: 16, subOrder: num };
      // P41-42는 세트로 취급
      if (num >= 41 && num <= 42) return { group: 5, order: 41, subOrder: num };
      // P43-45는 세트로 취급
      if (num >= 43 && num <= 45) return { group: 5, order: 43, subOrder: num };
      return { group: 5, order: num, subOrder: 0 };
    }

    // 7순위: 기타 (알파벳 순)
    return { group: 6, order: 0, subOrder: 0, alpha: key };
  };

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const res = await promptsApi.getAll();
      // 정렬: MASTER_PROMPT → PASSAGE_MASTER → LC01-LC17 → RC18-RC45 → P숫자 → 기타
      const sorted = (res.data || []).sort((a, b) => {
        const orderA = getPromptSortOrder(a.prompt_key);
        const orderB = getPromptSortOrder(b.prompt_key);

        // 그룹 비교
        if (orderA.group !== orderB.group) {
          return orderA.group - orderB.group;
        }
        // 같은 그룹 내에서 숫자 순서 비교
        if (orderA.order !== orderB.order) {
          return orderA.order - orderB.order;
        }
        // 세트 내 순서 비교 (subOrder)
        if (orderA.subOrder !== orderB.subOrder) {
          return orderA.subOrder - orderB.subOrder;
        }
        // 기타 그룹은 알파벳 순
        if (orderA.alpha && orderB.alpha) {
          return orderA.alpha.localeCompare(orderB.alpha);
        }
        return 0;
      });
      setPrompts(sorted);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (prompt) => {
    setSelectedPrompt(prompt);
    setFormData({
      prompt_key: prompt.prompt_key,
      title: prompt.title || '',
      prompt_text: prompt.prompt_text || '',
      active: prompt.active === 1
    });
    setEditMode(false);
    setEvaluationResult(null);
    setShowFeedback(false);
    setFeedback('');
    setImprovementResult(null);
  };

  const handleSave = async () => {
    try {
      if (selectedPrompt) {
        await promptsApi.update(selectedPrompt.prompt_key, {
          title: formData.title,
          prompt_text: formData.prompt_text,
          active: formData.active
        });
        setMessage({ type: 'success', text: '프롬프트가 저장되었습니다.' });
      } else {
        await promptsApi.create(formData);
        setMessage({ type: 'success', text: '프롬프트가 생성되었습니다.' });
      }
      loadPrompts();
      setEditMode(false);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleDelete = async () => {
    if (!selectedPrompt) return;
    if (!window.confirm('이 프롬프트를 삭제하시겠습니까?')) return;

    try {
      await promptsApi.delete(selectedPrompt.prompt_key);
      setMessage({ type: 'success', text: '프롬프트가 삭제되었습니다.' });
      setSelectedPrompt(null);
      loadPrompts();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleNew = () => {
    setSelectedPrompt(null);
    setFormData({
      prompt_key: '',
      title: '',
      prompt_text: '',
      active: true
    });
    setEditMode(true);
    setEvaluationResult(null);
    setShowFeedback(false);
    setFeedback('');
    setImprovementResult(null);
  };

  // AI 검증 실행
  const handleEvaluate = async () => {
    if (!formData.prompt_key || !formData.prompt_text) {
      setMessage({ type: 'error', text: '프롬프트 키와 내용이 필요합니다.' });
      return;
    }

    try {
      setEvaluating(true);
      setMessage(null);
      const res = await promptsApi.evaluate(formData.prompt_key, formData.prompt_text);
      setEvaluationResult(res.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'AI 검증 실패: ' + error.message });
    } finally {
      setEvaluating(false);
    }
  };

  // 빠른 검증 실행
  const handleQuickValidate = async () => {
    if (!formData.prompt_key || !formData.prompt_text) {
      setMessage({ type: 'error', text: '프롬프트 키와 내용이 필요합니다.' });
      return;
    }

    try {
      const res = await promptsApi.quickValidate(formData.prompt_key, formData.prompt_text);
      setEvaluationResult({
        quickValidation: res.data,
        overall_score: null
      });
    } catch (error) {
      setMessage({ type: 'error', text: '검증 실패: ' + error.message });
    }
  };

  // 개선된 프롬프트 적용
  const handleApplyImproved = () => {
    if (evaluationResult?.improved_prompt) {
      setFormData(prev => ({ ...prev, prompt_text: evaluationResult.improved_prompt }));
      setEditMode(true);
      setMessage({ type: 'success', text: '개선된 프롬프트가 적용되었습니다. 저장하려면 💾 저장 버튼을 클릭하세요.' });
    }
  };

  // 사용자 피드백 토글
  const handleToggleFeedback = () => {
    setShowFeedback(!showFeedback);
    if (showFeedback) {
      setFeedback('');
      setImprovementResult(null);
    }
  };

  // 피드백 기반 AI 개선 실행
  const handleImproveWithFeedback = async () => {
    if (!formData.prompt_key || !formData.prompt_text) {
      setMessage({ type: 'error', text: '프롬프트 키와 내용이 필요합니다.' });
      return;
    }

    if (!feedback.trim()) {
      setMessage({ type: 'error', text: '피드백을 입력해주세요.' });
      return;
    }

    try {
      setImproving(true);
      setMessage(null);
      const res = await promptsApi.improveWithFeedback(formData.prompt_key, formData.prompt_text, feedback);
      setImprovementResult(res.data);
      setMessage({ type: 'success', text: '피드백 기반 개선이 완료되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: '피드백 개선 실패: ' + error.message });
    } finally {
      setImproving(false);
    }
  };

  // 피드백 개선 결과 적용
  const handleApplyFeedbackImproved = () => {
    if (improvementResult?.improved_prompt) {
      setFormData(prev => ({ ...prev, prompt_text: improvementResult.improved_prompt }));
      setEditMode(true);
      setMessage({ type: 'success', text: '개선된 프롬프트가 적용되었습니다. 저장하려면 💾 저장 버튼을 클릭하세요.' });
    }
  };

  // 전체 메트릭스 재계산
  const handleRecalculateAll = async () => {
    if (!window.confirm('모든 프롬프트의 메트릭스를 재계산하시겠습니까?\n(규칙 기반 검증만 수행됩니다)')) return;

    try {
      setRecalculating(true);
      setMessage(null);
      const res = await promptsApi.recalculateAllMetrics();
      setMessage({
        type: 'success',
        text: `메트릭스 재계산 완료: 성공 ${res.data.success}개, 실패 ${res.data.failed}개`
      });
      loadPrompts();
    } catch (error) {
      setMessage({ type: 'error', text: '메트릭스 재계산 실패: ' + error.message });
    } finally {
      setRecalculating(false);
    }
  };

  const getPromptTypeLabel = (key) => {
    if (key === 'MASTER_PROMPT') return '🎯 마스터';
    if (key === 'PASSAGE_MASTER') return '📄 지문 마스터';

    // LC01-LC17 형식
    const lcMatch = key.match(/^LC(\d+)$/i);
    if (lcMatch) {
      const num = parseInt(lcMatch[1]);
      if (num === 16 || num === 17) return `🎧 LC16-17 세트`;
      return `🎧 듣기`;
    }

    // RC18-RC45 형식
    const rcMatch = key.match(/^RC(\d+)$/i);
    if (rcMatch) {
      const num = parseInt(rcMatch[1]);
      if (num >= 41 && num <= 42) return `📖 RC41-42 세트`;
      if (num >= 43 && num <= 45) return `📖 RC43-45 세트`;
      return `📖 독해`;
    }

    // 순수 숫자 (기존 형식)
    if (/^\d+$/.test(key)) {
      const num = parseInt(key);
      if (num >= 1 && num <= 17) {
        if (num === 16 || num === 17) return `🎧 LC16-17 세트`;
        return `🎧 듣기`;
      }
      if (num >= 18 && num <= 45) {
        if (num >= 41 && num <= 42) return `📖 RC41-42 세트`;
        if (num >= 43 && num <= 45) return `📖 RC43-45 세트`;
        return `📖 독해`;
      }
      return `📋 ${key}`;
    }

    // P + 숫자 (지문용 프롬프트)
    const pMatch = key.match(/^P(\d+)$/i);
    if (pMatch) {
      const num = parseInt(pMatch[1]);
      if (num === 16 || num === 17) return `📝 P16-17 세트`;
      if (num >= 41 && num <= 42) return `📝 P41-42 세트`;
      if (num >= 43 && num <= 45) return `📝 P43-45 세트`;
      return `📝 지문용`;
    }

    if (key.startsWith('P')) return '📝 지문용';
    return '기타';
  };

  // 점수에 따른 색상 반환
  const getScoreColor = (score) => {
    if (score >= 8) return 'var(--success-color)';
    if (score >= 6) return '#fbbc04';
    if (score >= 4) return '#ff9800';
    return 'var(--error-color)';
  };

  // 등급 배지 스타일
  const getGradeBadgeStyle = (grade) => {
    const colors = {
      'A': { bg: '#e8f5e9', color: '#2e7d32' },
      'B': { bg: '#e3f2fd', color: '#1565c0' },
      'C': { bg: '#fff8e1', color: '#f57c00' },
      'D': { bg: '#fff3e0', color: '#e65100' },
      'F': { bg: '#ffebee', color: '#c62828' }
    };
    return colors[grade] || { bg: '#f5f5f5', color: '#666' };
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <h1>💬 프롬프트 관리</h1>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={handleRecalculateAll} disabled={recalculating}>
            {recalculating ? '🔄 계산 중...' : '📊 전체 메트릭스 재계산'}
          </button>
          <button className="btn btn-primary" onClick={handleNew}>
            ➕ 새 프롬프트
          </button>
        </div>
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

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
        {/* 프롬프트 목록 */}
        <div className="card" style={{ height: 'fit-content', maxHeight: '80vh', overflow: 'auto' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '1rem' }}>프롬프트 목록</h3>
          </div>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <div style={{ padding: '0' }}>
              {prompts.map(prompt => (
                <div
                  key={prompt.prompt_key}
                  onClick={() => handleSelect(prompt)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-color)',
                    background: selectedPrompt?.prompt_key === prompt.prompt_key ? '#e8f0fe' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500 }}>{prompt.prompt_key}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* 등급 배지 */}
                      {prompt.grade && (
                        <span style={{
                          ...getGradeBadgeStyle(prompt.grade),
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold'
                        }}>
                          {prompt.grade}
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {getPromptTypeLabel(prompt.prompt_key)}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {prompt.title || '(제목 없음)'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    {prompt.active !== 1 && (
                      <span className="badge badge-fail">비활성</span>
                    )}
                    {prompt.needs_improvement === 1 && (
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        background: '#fff3cd',
                        color: '#856404'
                      }}>
                        개선필요
                      </span>
                    )}
                    {/* 성능 지표 */}
                    {prompt.items_generated > 0 && (
                      <span style={{
                        fontSize: '0.7rem',
                        color: prompt.approve_rate >= 70 ? 'var(--success-color)' :
                               prompt.approve_rate >= 50 ? '#f57c00' : 'var(--error-color)'
                      }}>
                        승인율 {Math.round(prompt.approve_rate)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 프롬프트 편집기 */}
        <div className="card">
          {!selectedPrompt && !editMode ? (
            <div className="text-center text-muted" style={{ padding: '60px' }}>
              좌측에서 프롬프트를 선택하거나<br />
              새 프롬프트를 생성하세요.
            </div>
          ) : (
            <>
              <div className="card-header">
                <h3 style={{ fontSize: '1rem' }}>
                  {selectedPrompt ? `프롬프트 편집: ${selectedPrompt.prompt_key}` : '새 프롬프트'}
                </h3>
                <div className="flex gap-2">
                  {!editMode && selectedPrompt && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>
                      ✏️ 편집
                    </button>
                  )}
                  {editMode && (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={handleSave}>
                        💾 저장
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(false)}>
                        취소
                      </button>
                    </>
                  )}
                  {selectedPrompt && (
                    <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                      🗑️ 삭제
                    </button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">프롬프트 키</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.prompt_key}
                  onChange={e => setFormData(prev => ({ ...prev, prompt_key: e.target.value }))}
                  disabled={!!selectedPrompt}
                  placeholder="예: 29, MASTER_PROMPT, P29"
                />
              </div>

              <div className="form-group">
                <label className="form-label">제목</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  disabled={!editMode}
                  placeholder="프롬프트 설명"
                />
              </div>

              <div className="form-group">
                <label className="form-label">프롬프트 내용</label>
                <textarea
                  className="form-control"
                  value={formData.prompt_text}
                  onChange={e => setFormData(prev => ({ ...prev, prompt_text: e.target.value }))}
                  disabled={!editMode}
                  rows="15"
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                  placeholder="프롬프트 내용을 입력하세요"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    disabled={!editMode}
                  />
                  활성화
                </label>
              </div>

              {/* AI 검증 및 피드백 버튼 */}
              <div className="flex gap-2" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleQuickValidate}
                  disabled={!formData.prompt_text}
                >
                  ⚡ 빠른 검증
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleEvaluate}
                  disabled={evaluating || !formData.prompt_text}
                >
                  {evaluating ? '🔄 AI 분석 중...' : '🤖 AI 검증'}
                </button>
                <button
                  className={`btn ${showFeedback ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={handleToggleFeedback}
                  disabled={!formData.prompt_text}
                >
                  💬 사용자 피드백
                </button>
              </div>

              {/* 사용자 피드백 입력 영역 */}
              {showFeedback && (
                <div style={{ marginTop: '16px', padding: '16px', background: '#f0f7ff', borderRadius: '8px', border: '1px solid #b3d4fc' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#1565c0' }}>💬 사용자 피드백 입력</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    프롬프트에 대한 개선 요청을 입력하세요. AI가 피드백을 반영하여 프롬프트를 개선합니다.
                  </p>
                  <textarea
                    className="form-control"
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    rows="4"
                    placeholder="예: 더 구체적인 예시를 추가해줘, 어법 문항의 경우 밑줄 형식을 명확히 해줘, 난이도 조절 지침을 강화해줘..."
                    style={{ marginBottom: '12px' }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleImproveWithFeedback}
                    disabled={improving || !feedback.trim()}
                  >
                    {improving ? '🔄 AI 개선 중...' : '🚀 피드백 AI 적용'}
                  </button>
                </div>
              )}

              {/* 피드백 개선 결과 */}
              {improvementResult && (
                <div style={{ marginTop: '16px', padding: '16px', background: '#e8f5e9', borderRadius: '8px', border: '1px solid #a5d6a7' }}>
                  <div className="flex-between" style={{ marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, color: '#2e7d32' }}>✨ 피드백 반영 개선 결과</h4>
                    <button className="btn btn-primary btn-sm" onClick={handleApplyFeedbackImproved}>
                      📝 적용하기
                    </button>
                  </div>

                  {/* 변경 사항 */}
                  {improvementResult.changes_made?.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <h5 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#1b5e20' }}>📋 변경 사항</h5>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem' }}>
                        {improvementResult.changes_made.map((change, idx) => (
                          <li key={idx}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 참고 사항 */}
                  {improvementResult.notes && (
                    <div style={{ marginBottom: '12px', padding: '8px', background: '#fff8e1', borderRadius: '4px', fontSize: '0.85rem' }}>
                      <strong>📝 참고:</strong> {improvementResult.notes}
                    </div>
                  )}

                  {/* 개선된 프롬프트 미리보기 */}
                  <div>
                    <h5 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#1b5e20' }}>🔍 개선된 프롬프트</h5>
                    <pre style={{
                      background: 'white',
                      padding: '12px',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      maxHeight: '200px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                      border: '1px solid #c8e6c9'
                    }}>
                      {improvementResult.improved_prompt}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* AI 검증 결과 */}
      {evaluationResult && (
        <div className="card mt-4">
          <div className="card-header">
            <h3 style={{ fontSize: '1rem' }}>🤖 AI 검증 결과</h3>
            {evaluationResult.overall_score && (
              <div style={{
                ...getGradeBadgeStyle(evaluationResult.grade),
                padding: '4px 12px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                {evaluationResult.grade} ({evaluationResult.overall_score}/10)
              </div>
            )}
          </div>

          {/* 빠른 검증 결과 */}
          {evaluationResult.quickValidation && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ marginBottom: '8px' }}>⚡ 규칙 기반 검증</h4>
              {evaluationResult.quickValidation.passed ? (
                <div className="alert alert-success">✅ 기본 규칙 검증 통과</div>
              ) : (
                <div className="alert alert-error">
                  ⚠️ 규칙 검증 실패
                  <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                    {evaluationResult.quickValidation.issues?.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluationResult.quickValidation.warnings?.length > 0 && (
                <div style={{ marginTop: '8px', color: '#b08800' }}>
                  {evaluationResult.quickValidation.warnings.map((warn, idx) => (
                    <div key={idx}>⚠️ {warn}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LLM 평가 결과 */}
          {evaluationResult.overall_score && (
            <>
              {/* 등급 및 설명 */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                  <strong>{evaluationResult.grade_label}</strong>
                </div>
              </div>

              {/* 세부 점수 */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '12px' }}>📊 세부 평가</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                  {[
                    { key: 'clarity', label: '명확성' },
                    { key: 'completeness', label: '완전성' },
                    { key: 'consistency', label: '일관성' },
                    { key: 'specificity', label: '구체성' },
                    { key: 'csat_appropriateness', label: '수능 적합성' }
                  ].map(({ key, label }) => (
                    <div key={key} style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                      <div className="text-muted" style={{ fontSize: '0.85rem' }}>{label}</div>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: getScoreColor(evaluationResult.criteria_scores?.[key] || 0)
                      }}>
                        {evaluationResult.criteria_scores?.[key] || '-'}/10
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 강점 */}
              {evaluationResult.strengths?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ color: 'var(--success-color)', marginBottom: '8px' }}>✅ 강점</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {evaluationResult.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 약점 */}
              {evaluationResult.weaknesses?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ color: 'var(--error-color)', marginBottom: '8px' }}>⚠️ 개선 필요</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {evaluationResult.weaknesses.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 제안 */}
              {evaluationResult.suggestions?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ color: 'var(--primary-color)', marginBottom: '8px' }}>💡 개선 제안</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {evaluationResult.suggestions.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 개선된 프롬프트 */}
              {evaluationResult.improved_prompt && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#e8f5e9', borderRadius: '8px' }}>
                  <div className="flex-between" style={{ marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, color: '#2e7d32' }}>✨ AI 제안 개선 프롬프트</h4>
                    <button className="btn btn-primary btn-sm" onClick={handleApplyImproved}>
                      📝 적용하기
                    </button>
                  </div>
                  <pre style={{
                    background: 'white',
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    maxHeight: '200px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    margin: 0
                  }}>
                    {evaluationResult.improved_prompt}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 도움말 */}
      <div className="card mt-4">
        <h3 className="mb-2">💡 프롬프트 키 규칙</h3>
        <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>MASTER_PROMPT</strong>: 모든 문항 생성에 사용되는 마스터 시스템 프롬프트</li>
          <li><strong>PASSAGE_MASTER</strong>: 지문 자동 생성 시 사용되는 마스터 프롬프트</li>
          <li><strong>숫자 (예: 29)</strong>: 해당 문항 번호의 문항 생성 지침</li>
          <li><strong>P + 숫자 (예: P29)</strong>: 해당 문항 번호의 지문 생성 지침</li>
          <li><strong>P41_45</strong>: 41-45번 세트 공통 지문 생성 지침</li>
        </ul>
        <h4 className="mt-3 mb-2">🤖 AI 검증 및 피드백 기능</h4>
        <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>⚡ 빠른 검증</strong>: LLM 호출 없이 규칙 기반으로 기본 사항 점검</li>
          <li><strong>🤖 AI 검증</strong>: LLM을 활용하여 프롬프트 품질을 종합 평가</li>
          <li><strong>💬 사용자 피드백</strong>: 원하는 개선 사항을 직접 입력하여 AI가 반영</li>
          <li>평가 기준: 명확성, 완전성, 일관성, 구체성, 수능 적합성</li>
          <li>점수가 7점 미만인 경우 개선된 프롬프트를 제안합니다</li>
        </ul>
      </div>
    </div>
  );
}

export default Prompts;
