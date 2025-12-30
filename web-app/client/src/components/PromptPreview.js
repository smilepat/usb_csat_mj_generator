import React, { useState } from 'react';

/**
 * PromptPreview 컴포넌트
 * - 프롬프트 미리보기 및 1차 검증 결과 표시
 * - 편집 기능 지원
 */
function PromptPreview({ data, onEdit, onConfirm, onCancel }) {
  const [activeTab, setActiveTab] = useState('system');
  const [editMode, setEditMode] = useState(false);
  const [editedSystem, setEditedSystem] = useState('');
  const [editedUser, setEditedUser] = useState('');

  if (!data) return null;

  const { valid, errors, warnings, suggestions, preview, stats } = data;

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
          <h4 style={{ color: '#fbbc04', marginBottom: '8px' }}>⚡ 경고</h4>
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
          <h4 style={{ color: 'var(--primary-color)', marginBottom: '8px' }}>💡 제안</h4>
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
        {onConfirm && valid && (
          <button className="btn btn-primary" onClick={onConfirm}>
            🚀 이 프롬프트로 생성
          </button>
        )}
        {!valid && (
          <button className="btn btn-primary" disabled title="오류를 해결해야 생성할 수 있습니다">
            🚀 생성 (오류 해결 필요)
          </button>
        )}
      </div>
    </div>
  );
}

export default PromptPreview;
