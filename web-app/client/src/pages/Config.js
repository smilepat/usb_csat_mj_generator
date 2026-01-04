import React, { useState, useEffect } from 'react';
import { configApi } from '../api';
import { formatKST } from '../utils/dateUtils';

function Config() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const res = await configApi.getAll();
      setConfigs(res.data || []);

      // 편집용 값 초기화
      const values = {};
      (res.data || []).forEach(config => {
        values[config.key] = config.value;
      });
      setEditValues(values);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setEditValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async (key) => {
    try {
      await configApi.update(key, editValues[key]);
      setMessage({ type: 'success', text: `${key} 설정이 저장되었습니다.` });
      loadConfigs();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleSaveAll = async () => {
    try {
      const configsToUpdate = Object.entries(editValues).map(([key, value]) => ({
        key,
        value
      }));
      await configApi.batchUpdate(configsToUpdate);
      setMessage({ type: 'success', text: '모든 설정이 저장되었습니다.' });
      loadConfigs();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const getConfigDescription = (key) => {
    const descriptions = {
      PROVIDER: 'LLM 제공자 (gemini 또는 openai)',
      GEMINI_MODEL: 'Gemini 모델명 (예: gemini-2.5-pro)',
      OPENAI_MODEL: 'OpenAI 모델명 (예: gpt-4.1-mini)',
      TEMP_BASE: '생성 Temperature (0.0 ~ 1.0)',
      MAX_RETRY: '최대 재시도 횟수',
      LOG_LEVEL: '로그 레벨 (INFO, WARN, ERROR)'
    };
    return descriptions[key] || '';
  };

  const getInputType = (key) => {
    if (key === 'MAX_RETRY') return 'number';
    if (key === 'TEMP_BASE') return 'number';
    return 'text';
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <h1>⚙️ 설정</h1>
        <button className="btn btn-primary" onClick={handleSaveAll}>
          💾 전체 저장
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

      {/* LLM 설정 */}
      <div className="card">
        <div className="card-header">
          <h2>🤖 LLM 설정</h2>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <span>로딩 중...</span>
          </div>
        ) : (
          <div>
            {['PROVIDER', 'GEMINI_MODEL', 'OPENAI_MODEL', 'TEMP_BASE', 'MAX_RETRY'].map(key => {
              const config = configs.find(c => c.key === key);
              return (
                <div key={key} className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ flex: '0 0 150px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>{key}</label>
                  </div>
                  <div style={{ flex: 1 }}>
                    {key === 'PROVIDER' ? (
                      <select
                        className="form-control"
                        value={editValues[key] || ''}
                        onChange={e => handleChange(key, e.target.value)}
                      >
                        <option value="gemini">gemini</option>
                        <option value="openai">openai</option>
                      </select>
                    ) : (
                      <input
                        type={getInputType(key)}
                        className="form-control"
                        value={editValues[key] || ''}
                        onChange={e => handleChange(key, e.target.value)}
                        step={key === 'TEMP_BASE' ? '0.1' : undefined}
                        min={key === 'TEMP_BASE' ? '0' : key === 'MAX_RETRY' ? '1' : undefined}
                        max={key === 'TEMP_BASE' ? '1' : key === 'MAX_RETRY' ? '10' : undefined}
                      />
                    )}
                  </div>
                  <div style={{ flex: '0 0 200px' }}>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {getConfigDescription(key)}
                    </span>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleSave(key)}>
                    저장
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 로그 설정 */}
      <div className="card">
        <div className="card-header">
          <h2>📜 로그 설정</h2>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: '0 0 150px' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>LOG_LEVEL</label>
          </div>
          <div style={{ flex: 1 }}>
            <select
              className="form-control"
              value={editValues['LOG_LEVEL'] || 'INFO'}
              onChange={e => handleChange('LOG_LEVEL', e.target.value)}
            >
              <option value="INFO">INFO (모든 로그)</option>
              <option value="WARN">WARN (경고 이상)</option>
              <option value="ERROR">ERROR (에러만)</option>
            </select>
          </div>
          <div style={{ flex: '0 0 200px' }}>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>
              기록할 로그 레벨
            </span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => handleSave('LOG_LEVEL')}>
            저장
          </button>
        </div>
      </div>

      {/* API 키 안내 */}
      <div className="card">
        <div className="card-header">
          <h2>🔑 API 키 설정</h2>
        </div>
        <div className="alert alert-info">
          <strong>보안 주의:</strong> API 키는 환경 변수(.env 파일)에서 관리됩니다.
        </div>
        <p className="text-muted mb-2">
          서버의 <code>.env</code> 파일에 다음 키를 설정하세요:
        </p>
        <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '0.9rem' }}>
{`GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here`}
        </pre>
        <p className="text-muted mt-2" style={{ fontSize: '0.85rem' }}>
          * API 키 변경 후 서버를 재시작해야 적용됩니다.
        </p>
      </div>

      {/* 모든 설정 목록 */}
      <div className="card">
        <div className="card-header">
          <h2>📋 전체 설정 목록</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>키</th>
                <th>값</th>
                <th>설명</th>
                <th>수정일</th>
              </tr>
            </thead>
            <tbody>
              {configs.map(config => (
                <tr key={config.key}>
                  <td style={{ fontFamily: 'monospace' }}>{config.key}</td>
                  <td>{config.value}</td>
                  <td className="text-muted">{config.description || '-'}</td>
                  <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {formatKST(config.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Config;
