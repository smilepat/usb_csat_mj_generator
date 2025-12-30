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

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const res = await promptsApi.getAll();
      // 마스터 프롬프트를 상단에 표시하도록 정렬
      const sorted = (res.data || []).sort((a, b) => {
        // 1순위: MASTER_PROMPT
        if (a.prompt_key === 'MASTER_PROMPT') return -1;
        if (b.prompt_key === 'MASTER_PROMPT') return 1;
        // 2순위: PASSAGE_MASTER
        if (a.prompt_key === 'PASSAGE_MASTER') return -1;
        if (b.prompt_key === 'PASSAGE_MASTER') return 1;
        // 3순위: 기존 알파벳 순서
        return a.prompt_key.localeCompare(b.prompt_key);
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
  };

  const getPromptTypeLabel = (key) => {
    if (key === 'MASTER_PROMPT') return '🎯 마스터';
    if (key === 'PASSAGE_MASTER') return '📄 지문 마스터';
    if (key.startsWith('P')) return '📝 지문용';
    if (/^\d+$/.test(key)) return `📋 RC${key}`;
    return '기타';
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <h1>💬 프롬프트 관리</h1>
        <button className="btn btn-primary" onClick={handleNew}>
          ➕ 새 프롬프트
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {getPromptTypeLabel(prompt.prompt_key)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {prompt.title || '(제목 없음)'}
                  </div>
                  {prompt.active !== 1 && (
                    <span className="badge badge-fail" style={{ marginTop: '4px' }}>비활성</span>
                  )}
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
                  rows="20"
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
            </>
          )}
        </div>
      </div>

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
      </div>
    </div>
  );
}

export default Prompts;
