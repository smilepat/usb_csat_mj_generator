import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { itemsApi, promptsApi } from '../api';
import PromptPreview from '../components/PromptPreview';
import { validateForm, countWords, isLCItem, isRCItem, isSetItem } from '../utils/validation';

function ItemCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    item_no: '29',
    passage: '',
    level: '중',
    extra: '',
    chart_id: '',
    topic: '',
    passage_source: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [validationResult, setValidationResult] = useState({ valid: true, errors: [], warnings: [] });

  // 프롬프트 미리보기 관련 상태
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 기본 프롬프트 매핑 상태
  const [defaultPrompts, setDefaultPrompts] = useState({});

  // 기본 프롬프트 로드
  useEffect(() => {
    const loadDefaultPrompts = async () => {
      try {
        const res = await promptsApi.getDefaults();
        if (res.success) {
          setDefaultPrompts(res.data || {});
        }
      } catch (error) {
        console.error('기본 프롬프트 로드 실패:', error);
      }
    };
    loadDefaultPrompts();
  }, []);

  // 문항 유형 목록 (LC1~LC17, RC18~RC45, 세트문항 포함)
  const itemTypes = [
    // 듣기 (LC: Listening Comprehension)
    { no: 1, label: 'LC01 짧은 대화 듣기', group: 'LC' },
    { no: 2, label: 'LC02 짧은 대화 듣기', group: 'LC' },
    { no: 3, label: 'LC03 담화 듣기 (목적)', group: 'LC' },
    { no: 4, label: 'LC04 담화 듣기 (의견)', group: 'LC' },
    { no: 5, label: 'LC05 담화 듣기 (관계)', group: 'LC' },
    { no: 6, label: 'LC06 담화 듣기 (그림)', group: 'LC' },
    { no: 7, label: 'LC07 담화 듣기 (할 일)', group: 'LC' },
    { no: 8, label: 'LC08 담화 듣기 (이유)', group: 'LC' },
    { no: 9, label: 'LC09 담화 듣기 (숫자)', group: 'LC' },
    { no: 10, label: 'LC10 담화 듣기 (언급 안 된 것)', group: 'LC' },
    { no: 11, label: 'LC11 담화 듣기 (내용 일치)', group: 'LC' },
    { no: 12, label: 'LC12 담화 듣기 (도표)', group: 'LC' },
    { no: 13, label: 'LC13 긴 대화 듣기', group: 'LC' },
    { no: 14, label: 'LC14 긴 대화 듣기', group: 'LC' },
    { no: 15, label: 'LC15 상황 듣기', group: 'LC' },
    { no: '16-17', label: 'LC16-17 세트 (긴 담화)', group: 'LC', isSet: true },
    // 독해 (RC: Reading Comprehension)
    { no: 18, label: 'RC18 글의 목적', group: 'RC' },
    { no: 19, label: 'RC19 심경 변화', group: 'RC' },
    { no: 20, label: 'RC20 필자 주장', group: 'RC' },
    { no: 21, label: 'RC21 함축 의미', group: 'RC' },
    { no: 22, label: 'RC22 글의 요지', group: 'RC' },
    { no: 23, label: 'RC23 글의 주제', group: 'RC' },
    { no: 24, label: 'RC24 글의 제목', group: 'RC' },
    { no: 25, label: 'RC25 도표 이해', group: 'RC' },
    { no: 26, label: 'RC26 내용 일치 (인물)', group: 'RC' },
    { no: 27, label: 'RC27 내용 일치 (안내문)', group: 'RC' },
    { no: 28, label: 'RC28 어휘', group: 'RC' },
    { no: 29, label: 'RC29 어법', group: 'RC' },
    { no: 30, label: 'RC30 지칭 추론', group: 'RC' },
    { no: 31, label: 'RC31 빈칸 (어구)', group: 'RC' },
    { no: 32, label: 'RC32 빈칸 (어구)', group: 'RC' },
    { no: 33, label: 'RC33 빈칸 (문장)', group: 'RC' },
    { no: 34, label: 'RC34 빈칸 (문장)', group: 'RC' },
    { no: 35, label: 'RC35 무관한 문장', group: 'RC' },
    { no: 36, label: 'RC36 글의 순서', group: 'RC' },
    { no: 37, label: 'RC37 글의 순서', group: 'RC' },
    { no: 38, label: 'RC38 문장 삽입', group: 'RC' },
    { no: 39, label: 'RC39 문장 삽입', group: 'RC' },
    { no: 40, label: 'RC40 요약문 완성', group: 'RC' },
    { no: '41-42', label: 'RC41-42 세트 (장문)', group: 'RC', isSet: true },
    { no: '43-45', label: 'RC43-45 세트 (장문)', group: 'RC', isSet: true },
  ];

  const levels = ['하', '중하', '중', '중상', '상'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    setFormData(newFormData);

    // 실시간 유효성 검사
    const result = validateForm(newFormData);
    setValidationResult(result);

    // 입력 변경 시 미리보기 닫기
    if (showPreview) {
      setShowPreview(false);
      setPreviewData(null);
    }
  };

  // 프롬프트 미리보기 요청
  const handlePreview = async () => {
    try {
      setPreviewLoading(true);
      setMessage(null);

      const res = await itemsApi.previewPrompt(formData);
      setPreviewData(res.data);
      setShowPreview(true);
    } catch (error) {
      setMessage({ type: 'error', text: '프롬프트 미리보기 오류: ' + error.message });
    } finally {
      setPreviewLoading(false);
    }
  };

  // 프롬프트 미리보기에서 확인 후 생성
  const handleConfirmGenerate = async () => {
    try {
      setLoading(true);
      const res = await itemsApi.createRequest(formData);
      setMessage({ type: 'success', text: '요청이 생성되었습니다. 문항 생성을 시작합니다...' });

      // 바로 생성 시작
      try {
        const genRes = await itemsApi.generate(res.data.requestId);
        setMessage({
          type: genRes.data.validationResult === 'PASS' ? 'success' : 'warning',
          text: `문항 생성 완료: ${genRes.data.validationResult}`
        });

        setTimeout(() => {
          navigate('/items');
        }, 2000);
      } catch (genError) {
        setMessage({ type: 'error', text: '문항 생성 중 오류: ' + genError.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 클라이언트 측 유효성 검사
    const validation = validateForm(formData);
    setValidationResult(validation);

    if (!validation.valid) {
      setMessage({ type: 'error', text: '입력 오류: ' + validation.errors.join(', ') });
      return;
    }

    // 경고가 있으면 확인
    if (validation.warnings.length > 0) {
      const proceed = window.confirm(
        '다음 경고가 있습니다:\n\n' +
        validation.warnings.join('\n') +
        '\n\n계속 진행하시겠습니까?'
      );
      if (!proceed) return;
    }

    try {
      setLoading(true);
      const res = await itemsApi.createRequest(formData);
      setMessage({ type: 'success', text: '요청이 생성되었습니다. 문항 생성을 시작합니다...' });

      // 바로 생성 시작
      try {
        const genRes = await itemsApi.generate(res.data.requestId);
        setMessage({
          type: genRes.data.validationResult === 'PASS' ? 'success' : 'warning',
          text: `문항 생성 완료: ${genRes.data.validationResult}`
        });

        setTimeout(() => {
          navigate('/items');
        }, 2000);
      } catch (genError) {
        setMessage({ type: 'error', text: '문항 생성 중 오류: ' + genError.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOnly = async () => {
    try {
      setLoading(true);
      await itemsApi.createRequest(formData);
      setMessage({ type: 'success', text: '요청이 저장되었습니다.' });

      setTimeout(() => {
        navigate('/items');
      }, 1000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // 미리보기 취소
  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewData(null);
  };

  // 프롬프트 편집 처리 (미래 기능을 위한 placeholder)
  const handleEditPrompt = (editedData) => {
    console.log('프롬프트 편집됨:', editedData);
    // TODO: 편집된 프롬프트로 재검증 또는 직접 생성
  };

  // 프롬프트 미리보기 화면
  if (showPreview && previewData) {
    return (
      <div>
        <h1 style={{ marginBottom: '24px' }}>🔍 프롬프트 미리보기 및 검증</h1>

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '12px' }}>📋 입력 정보</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <div>
              <div className="text-muted">문항 유형</div>
              <div style={{ fontWeight: 'bold' }}>
                {itemTypes.find(t => String(t.no) === String(formData.item_no))?.label || formData.item_no}
              </div>
            </div>
            <div>
              <div className="text-muted">난이도</div>
              <div style={{ fontWeight: 'bold' }}>{formData.level}</div>
            </div>
            <div>
              <div className="text-muted">지문</div>
              <div style={{ fontWeight: 'bold' }}>{formData.passage ? '입력됨' : 'AI 자동 생성'}</div>
            </div>
            {formData.topic && (
              <div>
                <div className="text-muted">주제</div>
                <div style={{ fontWeight: 'bold' }}>{formData.topic}</div>
              </div>
            )}
          </div>
        </div>

        <PromptPreview
          data={previewData}
          onEdit={handleEditPrompt}
          onConfirm={handleConfirmGenerate}
          onCancel={handleCancelPreview}
        />

        {loading && (
          <div className="loading" style={{ marginTop: '20px' }}>
            <div className="spinner"></div>
            <span>문항 생성 중...</span>
          </div>
        )}
      </div>
    );
  }

  // 기본 입력 폼 화면
  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>➕ 새 문항 생성</h1>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">문항 유형</label>
              <select
                name="item_no"
                value={formData.item_no}
                onChange={handleChange}
                className="form-control"
                required
              >
                <optgroup label="듣기 (LC: Listening)">
                  {itemTypes.filter(t => t.group === 'LC').map(type => {
                    const itemNo = typeof type.no === 'string' ? parseInt(type.no) : type.no;
                    const hasDefault = defaultPrompts[itemNo];
                    return (
                      <option key={type.no} value={type.no} style={type.isSet ? { fontWeight: 'bold' } : {}}>
                        {type.isSet ? '📦 ' : ''}{hasDefault ? '⭐ ' : ''}{type.label}
                      </option>
                    );
                  })}
                </optgroup>
                <optgroup label="독해 (RC: Reading)">
                  {itemTypes.filter(t => t.group === 'RC').map(type => {
                    const itemNo = typeof type.no === 'string' ? parseInt(type.no) : type.no;
                    const hasDefault = defaultPrompts[itemNo];
                    return (
                      <option key={type.no} value={type.no} style={type.isSet ? { fontWeight: 'bold' } : {}}>
                        {type.isSet ? '📦 ' : ''}{hasDefault ? '⭐ ' : ''}{type.label}
                      </option>
                    );
                  })}
                </optgroup>
              </select>
              {/* 기본 프롬프트 표시 */}
              {(() => {
                const itemNo = typeof formData.item_no === 'string' ? parseInt(formData.item_no) : formData.item_no;
                const defaultPromptKey = defaultPrompts[itemNo];
                if (defaultPromptKey) {
                  return (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                      borderRadius: '6px',
                      border: '1px solid rgba(102, 126, 234, 0.3)',
                      fontSize: '0.85rem'
                    }}>
                      <span style={{ color: '#667eea', fontWeight: 600 }}>⭐ 기본 프롬프트:</span>
                      <span style={{ marginLeft: '8px', color: '#333' }}>{defaultPromptKey}</span>
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '0.75rem',
                        color: '#666'
                      }}>
                        (프롬프트 관리에서 설정됨)
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="form-group">
              <label className="form-label">난이도</label>
              <select
                name="level"
                value={formData.level}
                onChange={handleChange}
                className="form-control"
              >
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              지문 (선택)
              <span className="text-muted" style={{ fontWeight: 'normal', marginLeft: '8px' }}>
                비워두면 LLM이 자동 생성합니다
              </span>
            </label>
            <textarea
              name="passage"
              value={formData.passage}
              onChange={handleChange}
              className="form-control"
              rows="8"
              placeholder="수능 스타일의 영어 지문을 입력하세요. 비워두면 AI가 자동으로 생성합니다."
            />
            {formData.passage && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#666' }}>
                {countWords(formData.passage)}단어 / {formData.passage.length}자
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              주제/상황 (선택)
              <span className="text-muted" style={{ fontWeight: 'normal', marginLeft: '8px' }}>
                지문 생성 시 참고할 주제
              </span>
            </label>
            <input
              type="text"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              className="form-control"
              placeholder="예: 환경 문제, 기술 발전, 심리학 등"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              추가 메모 (선택)
            </label>
            <textarea
              name="extra"
              value={formData.extra}
              onChange={handleChange}
              className="form-control"
              rows="3"
              placeholder="문항 생성 시 고려할 추가 사항을 입력하세요"
            />
          </div>

          {formData.item_no === 25 && (
            <div className="form-group">
              <label className="form-label">차트 ID (RC25 전용)</label>
              <input
                type="text"
                name="chart_id"
                value={formData.chart_id}
                onChange={handleChange}
                className="form-control"
                placeholder="사용할 차트의 ID를 입력하세요"
              />
            </div>
          )}

          {/* 유효성 검사 결과 표시 */}
          {(validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
            <div style={{ marginBottom: '16px' }}>
              {validationResult.errors.length > 0 && (
                <div style={{
                  padding: '12px',
                  background: '#fee2e2',
                  borderRadius: '6px',
                  border: '1px solid #fca5a5',
                  marginBottom: '8px'
                }}>
                  <strong style={{ color: '#dc2626' }}>오류:</strong>
                  <ul style={{ margin: '8px 0 0 20px', padding: 0, color: '#dc2626' }}>
                    {validationResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
              {validationResult.warnings.length > 0 && (
                <div style={{
                  padding: '12px',
                  background: '#fef3c7',
                  borderRadius: '6px',
                  border: '1px solid #fcd34d'
                }}>
                  <strong style={{ color: '#d97706' }}>경고:</strong>
                  <ul style={{ margin: '8px 0 0 20px', padding: 0, color: '#92400e' }}>
                    {validationResult.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePreview}
              disabled={loading || previewLoading || !validationResult.valid}
            >
              {previewLoading ? '검증 중...' : '🔍 프롬프트 미리보기'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !validationResult.valid}>
              {loading ? '처리 중...' : '🚀 바로 생성'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSaveOnly}
              disabled={loading}
            >
              💾 저장만 하기
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/items')}
            >
              취소
            </button>
          </div>
        </form>
      </div>

      {/* 도움말 */}
      <div className="card">
        <h3 className="mb-2">💡 도움말</h3>
        <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>🔍 프롬프트 미리보기</strong>: LLM에 전송될 프롬프트를 미리 확인하고 1차 검증을 수행합니다.</li>
          <li><strong>RC29 (어법)</strong>: 지문에 5개의 밑줄 부분이 생성되며, 1개가 틀린 표현입니다.</li>
          <li><strong>RC31-33 (빈칸)</strong>: 지문의 핵심 내용이 빈칸으로 처리됩니다.</li>
          <li><strong>RC25 (도표)</strong>: 차트 데이터가 필요합니다. 먼저 차트를 등록해주세요.</li>
          <li>지문을 비워두면 AI가 해당 유형에 맞는 지문을 자동으로 생성합니다.</li>
          <li>생성된 문항은 자동으로 검증되며, 검증 실패 시 재시도합니다.</li>
        </ul>
      </div>
    </div>
  );
}

export default ItemCreate;
