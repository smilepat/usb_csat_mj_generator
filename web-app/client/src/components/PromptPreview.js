import React, { useState } from 'react';

/**
 * PromptPreview 컴포넌트
 * - 프롬프트 미리보기 및 1차 검증 결과 표시
 * - 편집 기능 지원
 */
function PromptPreview({ data, onEdit, onConfirm, onCancel, onApplySuggestions }) {
  const [activeTab, setActiveTab] = useState('system');
  const [editMode, setEditMode] = useState(false);
  const [editedSystem, setEditedSystem] = useState('');
  const [editedUser, setEditedUser] = useState('');
  const [applyingFix, setApplyingFix] = useState(false);
  const [buttonScale, setButtonScale] = useState(1);

  if (!data) return null;

  const { valid, errors, warnings, suggestions, preview, stats, itemNo } = data;

  const handleStartEdit = () => {
    setEditedSystem(preview?.system || '');
    setEditedUser(preview?.user || '');
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit({
        system: editedSystem,
        user: editedUser
      });
    }
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  const handleApplySuggestions = async () => {
    if (!onApplySuggestions || !warnings || warnings.length === 0) {
      return;
    }

    if (!window.confirm('AI가 경고와 제안을 분석하여 프롬프트를 자동으로 개선합니다.\n\n계속하시겠습니까?')) {
      return;
    }

    // 버튼 클릭 애니메이션
    setButtonScale(0.9);
    setTimeout(() => setButtonScale(1), 150);

    setApplyingFix(true);
    try {
      await onApplySuggestions(itemNo, warnings, suggestions);
    } catch (error) {
      alert('자동 개선 실패: ' + error.message);
    } finally {
      setApplyingFix(false);
    }
  };

  return (
    <div className="prompt-preview">
      {/* 검증 결과 헤더 */}
      <div className={`alert ${valid ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '16px' }}>
        <strong>{valid ? '✅ 검증 통과' : '❌ 검증 실패'}</strong>
        {stats && (
          <span style={{ marginLeft: '16px', fontSize: '0.9rem', opacity: 0.8 }}>
            총 {stats.totalLength?.toLocaleString()}자 / 약 {stats.estimatedTokens?.toLocaleString()} 토큰
          </span>
        )}
      </div>

      {/* 오류 목록 */}
      {errors && errors.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--error-color)', marginBottom: '16px' }}>
          <h4 style={{ color: 'var(--error-color)', marginBottom: '8px' }}>⚠️ 오류</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {errors.map((err, idx) => (
              <li key={idx} style={{ color: 'var(--error-color)' }}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 경고 목록 */}
      {warnings && warnings.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #fbbc04', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ color: '#fbbc04', margin: 0 }}>⚡ 경고</h4>
            {onApplySuggestions && (
              <button
                className="btn btn-sm btn-warning"
                onClick={handleApplySuggestions}
                disabled={applyingFix}
                style={{
                  fontSize: '0.85rem',
                  transition: 'all 0.2s ease',
                  transform: applyingFix ? 'scale(0.95)' : 'scale(1)',
                  cursor: applyingFix ? 'wait' : 'pointer'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => !applyingFix && (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={(e) => !applyingFix && (e.currentTarget.style.transform = 'scale(1)')}
              >
                {applyingFix ? '🔄 적용 중...' : '🤖 AI 자동 수정'}
              </button>
            )}
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {warnings.map((warn, idx) => (
              <li key={idx} style={{ color: '#b08800' }}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 제안 목록 */}
      {suggestions && suggestions.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--primary-color)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ color: 'var(--primary-color)', margin: 0 }}>💡 제안</h4>
            {onApplySuggestions && warnings && warnings.length > 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                👆 위의 "AI 자동 수정" 버튼으로 제안을 적용할 수 있습니다
              </span>
            )}
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {suggestions.map((sug, idx) => (
              <li key={idx}>{sug}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 프롬프트 미리보기 */}
      {preview && (
        <div className="card">
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>📝 프롬프트 미리보기</h3>
            {!editMode && (
              <button className="btn btn-secondary btn-sm" onClick={handleStartEdit}>
                ✏️ 편집
              </button>
            )}
          </div>

          {/* 탭 버튼 */}
          <div className="flex gap-2" style={{ marginBottom: '12px' }}>
            <button
              className={`btn btn-sm ${activeTab === 'system' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('system')}
            >
              System ({stats?.systemLength?.toLocaleString() || 0}자)
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'user' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('user')}
            >
              User ({stats?.userLength?.toLocaleString() || 0}자)
            </button>
          </div>

          {/* 프롬프트 내용 */}
          {editMode ? (
            <div>
              {activeTab === 'system' && (
                <textarea
                  value={editedSystem}
                  onChange={(e) => setEditedSystem(e.target.value)}
                  className="form-control"
                  rows="20"
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
              )}
              {activeTab === 'user' && (
                <textarea
                  value={editedUser}
                  onChange={(e) => setEditedUser(e.target.value)}
                  className="form-control"
                  rows="20"
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
              )}
              <div className="flex gap-2" style={{ marginTop: '12px' }}>
                <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}>
                  💾 수정 적용
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleCancelEdit}>
                  취소
                </button>
              </div>
            </div>
          ) : (
            <pre style={{
              background: 'var(--bg-secondary)',
              padding: '16px',
              borderRadius: '8px',
              overflow: 'auto',
              maxHeight: '400px',
              fontSize: '0.85rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {activeTab === 'system' ? preview.system : preview.user}
            </pre>
          )}
        </div>
      )}

      {/* 통계 정보 */}
      {stats && (
        <div className="card" style={{ marginTop: '16px' }}>
          <h4 style={{ marginBottom: '12px' }}>📊 통계</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <div>
              <div className="text-muted">System 길이</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.systemLength?.toLocaleString() || 0}자</div>
            </div>
            <div>
              <div className="text-muted">User 길이</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.userLength?.toLocaleString() || 0}자</div>
            </div>
            <div>
              <div className="text-muted">총 길이</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.totalLength?.toLocaleString() || 0}자</div>
            </div>
            <div>
              <div className="text-muted">예상 토큰</div>
              <div style={{
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: stats.estimatedTokens > 8000 ? 'var(--error-color)' : 'inherit'
              }}>
                ~{stats.estimatedTokens?.toLocaleString() || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button className="btn btn-secondary" onClick={onCancel}>
            ← 돌아가기
          </button>
        )}
        {onConfirm && (
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!valid) {
                if (window.confirm('검증에서 경고/오류가 있습니다. 그래도 생성하시겠습니까?\n\n문항 생성이 실패할 수 있습니다.')) {
                  onConfirm();
                }
              } else {
                onConfirm();
              }
            }}
          >
            🚀 이 프롬프트로 생성
          </button>
        )}
      </div>
    </div>
  );
}

export default PromptPreview;
