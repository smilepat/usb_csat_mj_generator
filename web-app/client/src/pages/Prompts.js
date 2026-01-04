import React, { useState, useEffect } from 'react';
import { promptsApi } from '../api';
import { formatKST } from '../utils/dateUtils';

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

  // 버전 관리 상태
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState(null);

  // 상태 관리
  const [changingStatus, setChangingStatus] = useState(false);

  // 빠른 검증 로딩 상태
  const [quickValidating, setQuickValidating] = useState(false);

  // 자동 개선 스캔 관련 상태
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [showScanResults, setShowScanResults] = useState(false);

  // 성능 분석 관련 상태
  const [showPerformance, setShowPerformance] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  // 프롬프트 정렬 순서 결정 함수
  // 정렬 우선순위: MASTER_PROMPT → PASSAGE_MASTER → LC01~LC17 → RC18~RC45 → 순수숫자 → P1~P45 → 기타
  const getPromptSortOrder = (key) => {
    // 그룹 0: MASTER_PROMPT (마스터)
    if (key === 'MASTER_PROMPT') return { group: 0, order: 0 };

    // 그룹 1: PASSAGE_MASTER (지문 마스터)
    if (key === 'PASSAGE_MASTER') return { group: 1, order: 0 };

    // 그룹 2: LC01~LC17 (듣기 문항) - LC16_17, LC16-17 포함
    const lcMatch = key.match(/^LC(\d+)/i);
    if (lcMatch) {
      const num = parseInt(lcMatch[1]);
      return { group: 2, order: num, subOrder: 0 };
    }

    // 그룹 3: RC18~RC45 (독해 문항) - RC41_42, RC43_45 등 포함
    const rcMatch = key.match(/^RC(\d+)/i);
    if (rcMatch) {
      const num = parseInt(rcMatch[1]);
      return { group: 3, order: num, subOrder: 0 };
    }

    // 그룹 4: 순수 숫자 (1, 2, 3, ... ) - 기존 형식
    if (/^\d+$/.test(key)) {
      const num = parseInt(key);
      return { group: 4, order: num, subOrder: 0 };
    }

    // 그룹 5: P + 숫자 (지문용 프롬프트) - P1~P45, P41_45 등 포함
    const pMatch = key.match(/^P(\d+)/i);
    if (pMatch) {
      const num = parseInt(pMatch[1]);
      return { group: 5, order: num, subOrder: 0 };
    }

    // 그룹 6: 기타 (알파벳 순)
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
    setShowVersions(false);
    setVersions(null);
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

    setQuickValidating(true);
    setMessage(null);

    try {
      const res = await promptsApi.quickValidate(formData.prompt_key, formData.prompt_text);
      setEvaluationResult({
        quickValidation: res.data,
        overall_score: null
      });

      // 결과에 따른 메시지 표시
      if (res.data.passed) {
        const warningCount = res.data.warnings?.length || 0;
        if (warningCount > 0) {
          setMessage({ type: 'warning', text: `✅ 기본 규칙 통과 (경고 ${warningCount}개)` });
        } else {
          setMessage({ type: 'success', text: '✅ 빠른 검증 통과! 모든 기본 규칙을 충족합니다.' });
        }
      } else {
        setMessage({ type: 'error', text: `❌ 규칙 검증 실패: ${res.data.issues?.length || 0}개 문제 발견` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '검증 실패: ' + error.message });
    } finally {
      setQuickValidating(false);
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

  // 버전 히스토리 로드
  const handleLoadVersions = async () => {
    if (!selectedPrompt) return;

    try {
      setLoadingVersions(true);
      const res = await promptsApi.getVersions(selectedPrompt.prompt_key);
      setVersions(res.data);
      setShowVersions(true);
    } catch (error) {
      setMessage({ type: 'error', text: '버전 히스토리 로드 실패: ' + error.message });
    } finally {
      setLoadingVersions(false);
    }
  };

  // 버전 복원
  const handleRestoreVersion = async (version) => {
    if (!selectedPrompt) return;
    if (!window.confirm(`버전 ${version}으로 복원하시겠습니까?\n현재 버전은 자동으로 백업됩니다.`)) return;

    try {
      setRestoringVersion(version);
      const res = await promptsApi.restoreVersion(selectedPrompt.prompt_key, version);
      setMessage({ type: 'success', text: res.message });

      // 프롬프트 목록 새로고침
      loadPrompts();

      // 버전 히스토리 새로고침
      handleLoadVersions();

      // 폼 데이터 업데이트
      const updatedPrompt = await promptsApi.get(selectedPrompt.prompt_key);
      setFormData(prev => ({
        ...prev,
        prompt_text: updatedPrompt.data.prompt_text
      }));
    } catch (error) {
      setMessage({ type: 'error', text: '버전 복원 실패: ' + error.message });
    } finally {
      setRestoringVersion(null);
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

  // 프롬프트 상태 변경
  const handleChangeStatus = async (newStatus) => {
    if (!selectedPrompt) return;

    const statusLabels = {
      'draft': '초안',
      'testing': '테스트 중',
      'approved': '승인됨',
      'archived': '보관됨'
    };

    if (!window.confirm(`프롬프트 상태를 "${statusLabels[newStatus]}"로 변경하시겠습니까?`)) return;

    try {
      setChangingStatus(true);
      const response = await fetch(`/api/prompts/${selectedPrompt.prompt_key}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const res = await response.json();

      if (res.success) {
        setMessage({ type: 'success', text: `상태가 "${statusLabels[newStatus]}"로 변경되었습니다.` });
        loadPrompts();
        // 선택된 프롬프트 상태도 업데이트
        setSelectedPrompt(prev => ({ ...prev, status: newStatus }));
      } else {
        setMessage({ type: 'error', text: res.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '상태 변경 실패: ' + error.message });
    } finally {
      setChangingStatus(false);
    }
  };

  // 자동 개선 스캔 실행
  const handleAutoImproveScan = async () => {
    try {
      setScanning(true);
      setMessage(null);
      const response = await fetch('/api/prompts/auto-improve/scan');
      const res = await response.json();

      if (res.success) {
        setScanResults(res.data);
        setShowScanResults(true);
        const needsImprovement = res.data.needsImprovement || [];
        if (needsImprovement.length > 0) {
          setMessage({
            type: 'warning',
            text: `🔍 스캔 완료: ${res.data.scanned}개 중 ${needsImprovement.length}개 프롬프트 개선 필요`
          });
        } else {
          setMessage({
            type: 'success',
            text: `✅ 스캔 완료: ${res.data.scanned}개 프롬프트 모두 양호`
          });
        }
      } else {
        setMessage({ type: 'error', text: res.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '스캔 실패: ' + error.message });
    } finally {
      setScanning(false);
    }
  };

  // 프롬프트 성능 분석 로드
  const handleLoadPerformance = async () => {
    if (!selectedPrompt) return;

    try {
      setLoadingPerformance(true);
      const response = await fetch(`/api/prompts/${selectedPrompt.prompt_key}/metrics`);
      const res = await response.json();

      if (res.success) {
        setPerformanceData(res.data);
        setShowPerformance(true);
      } else {
        setMessage({ type: 'error', text: '성능 데이터 로드 실패' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '성능 분석 실패: ' + error.message });
    } finally {
      setLoadingPerformance(false);
    }
  };

  // 상태 배지 스타일
  const getStatusBadgeStyle = (status) => {
    const styles = {
      'draft': { bg: '#e3f2fd', color: '#1565c0', label: '초안' },
      'testing': { bg: '#fff3e0', color: '#e65100', label: '테스트 중' },
      'approved': { bg: '#e8f5e9', color: '#2e7d32', label: '승인됨' },
      'archived': { bg: '#f5f5f5', color: '#757575', label: '보관됨' }
    };
    return styles[status] || styles['draft'];
  };

  const getPromptTypeLabel = (key) => {
    // 그룹 0: MASTER_PROMPT
    if (key === 'MASTER_PROMPT') return '🎯 마스터';

    // 그룹 1: PASSAGE_MASTER
    if (key === 'PASSAGE_MASTER') return '📄 지문 마스터';

    // 그룹 2: LC01~LC17 (듣기) - LC16_17 등 세트 포함
    const lcMatch = key.match(/^LC(\d+)/i);
    if (lcMatch) {
      // LC16_17, LC16-17 등 세트형 패턴 감지
      if (/^LC16[_-]?17$/i.test(key)) return '🎧 LC16-17 세트';
      return '🎧 듣기';
    }

    // 그룹 3: RC18~RC45 (독해) - RC41_42, RC43_45 등 세트 포함
    const rcMatch = key.match(/^RC(\d+)/i);
    if (rcMatch) {
      // RC41_42, RC41-42 등 세트형 패턴 감지
      if (/^RC41[_-]?42$/i.test(key)) return '📖 RC41-42 세트';
      if (/^RC43[_-]?45$/i.test(key)) return '📖 RC43-45 세트';
      return '📖 독해';
    }

    // 그룹 4: 순수 숫자 (기존 형식)
    if (/^\d+$/.test(key)) {
      const num = parseInt(key);
      if (num >= 1 && num <= 17) return '🎧 듣기';
      if (num >= 18 && num <= 45) return '📖 독해';
      return `📋 기타`;
    }

    // 그룹 5: P + 숫자 (지문용 프롬프트) - P41_45 등 세트 포함
    const pMatch = key.match(/^P(\d+)/i);
    if (pMatch) {
      // P16_17, P41_45 등 세트형 패턴 감지
      if (/^P16[_-]?17$/i.test(key)) return '📝 P16-17 세트';
      if (/^P41[_-]?42$/i.test(key)) return '📝 P41-42 세트';
      if (/^P41[_-]?45$/i.test(key)) return '📝 P41-45 세트';
      if (/^P43[_-]?45$/i.test(key)) return '📝 P43-45 세트';
      return '📝 지문용';
    }

    // 그룹 6: 기타
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
          <button
            className="btn btn-warning"
            onClick={handleAutoImproveScan}
            disabled={scanning}
            style={{ background: '#ff9800', color: 'white', border: 'none' }}
          >
            {scanning ? '🔄 스캔 중...' : '🔍 자동 개선 스캔'}
          </button>
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

      {/* 자동 개선 스캔 결과 패널 */}
      {showScanResults && scanResults && (
        <div className="card mb-4" style={{ border: '2px solid #ff9800' }}>
          <div className="card-header" style={{ background: '#fff3e0' }}>
            <h3 style={{ fontSize: '1rem', color: '#e65100' }}>
              🔍 자동 개선 스캔 결과
            </h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowScanResults(false)}
            >
              ✕ 닫기
            </button>
          </div>

          <div style={{ padding: '16px' }}>
            {/* 요약 통계 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                textAlign: 'center',
                padding: '12px',
                background: '#e3f2fd',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1565c0' }}>
                  {scanResults.scanned || 0}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#1976d2' }}>스캔된 프롬프트</div>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '12px',
                background: scanResults.needsImprovement?.length > 0 ? '#fff3e0' : '#e8f5e9',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: scanResults.needsImprovement?.length > 0 ? '#e65100' : '#2e7d32'
                }}>
                  {scanResults.needsImprovement?.length || 0}
                </div>
                <div style={{ fontSize: '0.85rem', color: scanResults.needsImprovement?.length > 0 ? '#ef6c00' : '#388e3c' }}>
                  개선 필요
                </div>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '12px',
                background: '#e8f5e9',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2e7d32' }}>
                  {(scanResults.scanned || 0) - (scanResults.needsImprovement?.length || 0)}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#388e3c' }}>양호</div>
              </div>
            </div>

            {/* 개선 필요 프롬프트 목록 */}
            {scanResults.needsImprovement?.length > 0 ? (
              <div>
                <h4 style={{ marginBottom: '12px', color: '#e65100' }}>⚠️ 개선이 필요한 프롬프트</h4>
                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {scanResults.needsImprovement.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        background: '#fff8e1',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        border: '1px solid #ffe082',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        const prompt = prompts.find(p => p.prompt_key === item.prompt_key);
                        if (prompt) {
                          handleSelect(prompt);
                          setShowScanResults(false);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ color: '#f57c00' }}>{item.prompt_key}</strong>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          background: item.approve_rate < 50 ? '#ffebee' : '#fff3e0',
                          color: item.approve_rate < 50 ? '#c62828' : '#e65100'
                        }}>
                          승인율 {Math.round(item.approve_rate || 0)}%
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#795548' }}>
                        {item.reasons?.map((reason, i) => (
                          <div key={i}>• {reason}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: '#2e7d32',
                background: '#e8f5e9',
                borderRadius: '8px'
              }}>
                ✅ 모든 프롬프트가 양호한 상태입니다!
              </div>
            )}
          </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {/* 상태 배지 */}
                    {(() => {
                      const statusStyle = getStatusBadgeStyle(prompt.status);
                      return (
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          fontWeight: 500
                        }}>
                          {statusStyle.label}
                        </span>
                      );
                    })()}
                    {prompt.is_default === 1 && (
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        fontWeight: 600
                      }}>
                        ⭐ 기본값
                      </span>
                    )}
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
                    <>
                      <button
                        className={`btn btn-sm ${showVersions ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={handleLoadVersions}
                        disabled={loadingVersions}
                      >
                        {loadingVersions ? '🔄 로딩...' : '📜 버전 히스토리'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                        🗑️ 삭제
                      </button>
                    </>
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

              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: selectedPrompt ? 'pointer' : 'default' }}>
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={async (e) => {
                          const newActive = e.target.checked;
                          setFormData(prev => ({ ...prev, active: newActive }));

                          // 기존 프롬프트인 경우 즉시 저장
                          if (selectedPrompt) {
                            try {
                              await promptsApi.update(selectedPrompt.prompt_key, {
                                active: newActive
                              });
                              setMessage({
                                type: 'success',
                                text: newActive ? '✅ 프롬프트가 활성화되었습니다.' : '⏸️ 프롬프트가 비활성화되었습니다.'
                              });
                              loadPrompts();
                            } catch (error) {
                              setFormData(prev => ({ ...prev, active: !newActive }));
                              setMessage({ type: 'error', text: '활성화 상태 변경 실패: ' + error.message });
                            }
                          }
                        }}
                        disabled={!selectedPrompt && !editMode}
                      />
                      활성화
                    </label>

                    {/* 기본값 설정 버튼 */}
                    {selectedPrompt && (
                      <button
                        className={`btn btn-sm ${selectedPrompt.is_default === 1 ? 'btn-primary' : 'btn-secondary'}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          ...(selectedPrompt.is_default === 1 ? {
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none'
                          } : {})
                        }}
                        onClick={async () => {
                          try {
                            if (selectedPrompt.is_default === 1) {
                              await promptsApi.unsetDefault(selectedPrompt.prompt_key);
                              setMessage({ type: 'success', text: '⭐ 기본값 설정이 해제되었습니다.' });
                            } else {
                              await promptsApi.setDefault(selectedPrompt.prompt_key);
                              setMessage({ type: 'success', text: '⭐ 기본값으로 설정되었습니다. 문항 생성 시 자동 선택됩니다.' });
                            }
                            loadPrompts();
                            // 선택된 프롬프트 상태 업데이트
                            setSelectedPrompt(prev => ({
                              ...prev,
                              is_default: prev.is_default === 1 ? 0 : 1
                            }));
                          } catch (error) {
                            setMessage({ type: 'error', text: '기본값 설정 실패: ' + error.message });
                          }
                        }}
                      >
                        {selectedPrompt.is_default === 1 ? '⭐ 기본값' : '☆ 기본값 설정'}
                      </button>
                    )}
                  </div>
                  {selectedPrompt && (
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#666',
                      marginTop: '4px',
                      display: 'block'
                    }}>
                      {selectedPrompt.is_default === 1
                        ? '이 프롬프트가 문항 생성 시 기본 선택됩니다'
                        : '기본값으로 설정하면 문항 생성 시 자동 선택됩니다'}
                    </span>
                  )}
                </div>

                {/* 상태 관리 */}
                {selectedPrompt && (
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">프롬프트 상태</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[
                        { value: 'draft', label: '초안', icon: '📝' },
                        { value: 'testing', label: '테스트', icon: '🧪' },
                        { value: 'approved', label: '승인', icon: '✅' },
                        { value: 'archived', label: '보관', icon: '📦' }
                      ].map(({ value, label, icon }) => {
                        const isActive = (selectedPrompt.status || 'draft') === value;
                        const style = getStatusBadgeStyle(value);
                        return (
                          <button
                            key={value}
                            className={`btn btn-sm ${isActive ? '' : 'btn-secondary'}`}
                            style={isActive ? {
                              background: style.color,
                              color: 'white',
                              border: 'none'
                            } : {}}
                            onClick={() => handleChangeStatus(value)}
                            disabled={changingStatus || isActive}
                          >
                            {icon} {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* AI 검증 및 피드백 버튼 */}
              <div className="flex gap-2" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleQuickValidate}
                  disabled={quickValidating || !formData.prompt_text}
                >
                  {quickValidating ? '🔄 검증 중...' : '⚡ 빠른 검증'}
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

              {/* 버전 히스토리 패널 */}
              {showVersions && versions && (
                <div style={{ marginTop: '16px', padding: '16px', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <div className="flex-between" style={{ marginBottom: '12px' }}>
                    <h4 style={{ margin: 0 }}>📜 버전 히스토리 ({versions.total_versions}개)</h4>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowVersions(false)}
                    >
                      ✕ 닫기
                    </button>
                  </div>

                  {/* 현재 버전 */}
                  <div style={{
                    padding: '12px',
                    background: '#e8f5e9',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    border: '1px solid #a5d6a7'
                  }}>
                    <div className="flex-between">
                      <div>
                        <strong style={{ color: '#2e7d32' }}>현재 버전</strong>
                        <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {formatKST(versions.current.created_at)}
                        </span>
                      </div>
                      <span className="badge" style={{ background: '#2e7d32', color: 'white' }}>CURRENT</span>
                    </div>
                  </div>

                  {/* 이전 버전 목록 */}
                  {versions.history.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      이전 버전이 없습니다.<br />
                      <span style={{ fontSize: '0.85rem' }}>프롬프트를 수정하면 자동으로 버전이 저장됩니다.</span>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {versions.history.map((ver) => (
                        <div
                          key={ver.id}
                          style={{
                            padding: '12px',
                            background: 'white',
                            borderRadius: '6px',
                            marginBottom: '8px',
                            border: '1px solid #ddd'
                          }}
                        >
                          <div className="flex-between" style={{ marginBottom: '8px' }}>
                            <div>
                              <strong>버전 {ver.version}</strong>
                              <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {formatKST(ver.created_at)}
                              </span>
                            </div>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleRestoreVersion(ver.version)}
                              disabled={restoringVersion === ver.version}
                            >
                              {restoringVersion === ver.version ? '🔄 복원 중...' : '↩️ 복원'}
                            </button>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            {ver.change_reason}
                          </div>
                          <details style={{ fontSize: '0.85rem' }}>
                            <summary style={{ cursor: 'pointer', color: 'var(--primary-color)' }}>
                              프롬프트 내용 보기
                            </summary>
                            <pre style={{
                              background: '#f8f9fa',
                              padding: '12px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              maxHeight: '150px',
                              overflow: 'auto',
                              whiteSpace: 'pre-wrap',
                              marginTop: '8px'
                            }}>
                              {ver.prompt_text}
                            </pre>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 피드백 개선 결과 */}
              {improvementResult && (
                <div style={{ marginTop: '16px', padding: '16px', background: '#e8f5e9', borderRadius: '8px', border: '1px solid #a5d6a7' }}>
                  <div className="flex-between" style={{ marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, color: '#2e7d32' }}>✨ 피드백 반영 개선 결과</h4>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleApplyFeedbackImproved}
                      disabled={!improvementResult?.improved_prompt}
                    >
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
            <h3 style={{ fontSize: '1rem' }}>
              {evaluationResult.overall_score ? '🤖 AI 검증 결과' : '⚡ 빠른 검증 결과'}
            </h3>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <h4 style={{ margin: 0 }}>⚡ 규칙 기반 검증</h4>
                {evaluationResult.quickValidation.promptType && (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    background: '#e3f2fd',
                    color: '#1565c0'
                  }}>
                    프롬프트 유형: {evaluationResult.quickValidation.promptType}
                  </span>
                )}
              </div>
              {evaluationResult.quickValidation.passed ? (
                <div className="alert alert-success">
                  ✅ 기본 규칙 검증 통과
                  {evaluationResult.quickValidation.warnings?.length === 0 && (
                    <span style={{ marginLeft: '8px', opacity: 0.8 }}>- 모든 규칙 충족!</span>
                  )}
                </div>
              ) : (
                <div className="alert alert-error">
                  ❌ 규칙 검증 실패
                  <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                    {evaluationResult.quickValidation.issues?.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluationResult.quickValidation.warnings?.length > 0 && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: '#fff8e1',
                  borderRadius: '8px',
                  border: '1px solid #ffe082'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#f57c00' }}>
                    ⚠️ 경고 ({evaluationResult.quickValidation.warnings.length}개)
                  </div>
                  {evaluationResult.quickValidation.warnings.map((warn, idx) => (
                    <div key={idx} style={{ color: '#795548', marginBottom: '4px' }}>• {warn}</div>
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
