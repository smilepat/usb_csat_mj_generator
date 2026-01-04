import React, { useState, useEffect } from 'react';
import { setsApi } from '../api';
import { formatKSTDate } from '../utils/dateUtils';

function ItemSets() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSet, setSelectedSet] = useState(null);
  const [formData, setFormData] = useState({
    set_id: '',
    set_name: '',
    common_passage: '',
    profile: ''
  });
  const [generating, setGenerating] = useState({});

  useEffect(() => {
    loadSets();
  }, []);

  const loadSets = async () => {
    try {
      setLoading(true);
      const res = await setsApi.getAll();
      setSets(res.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await setsApi.create(formData);
      setMessage({ type: 'success', text: '세트가 생성되었습니다.' });
      setShowModal(false);
      setFormData({ set_id: '', set_name: '', common_passage: '', profile: '' });
      loadSets();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleGenerate = async (setId) => {
    try {
      setGenerating(prev => ({ ...prev, [setId]: true }));
      const res = await setsApi.generate(setId);
      setMessage({
        type: res.data.validationResult === 'PASS' ? 'success' : 'warning',
        text: `세트 생성 완료: ${res.data.validationResult} - ${res.data.validationLog}`
      });
      loadSets();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setGenerating(prev => ({ ...prev, [setId]: false }));
    }
  };

  const handleViewDetail = async (setId) => {
    try {
      const res = await setsApi.get(setId);
      setSelectedSet(res.data);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleDelete = async (setId) => {
    if (!window.confirm('이 세트를 삭제하시겠습니까?')) return;

    try {
      await setsApi.delete(setId);
      setMessage({ type: 'success', text: '세트가 삭제되었습니다.' });
      loadSets();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleAddItems = async (setId) => {
    const pattern = prompt(
      '세트 유형을 선택하세요:\n1) 16-17\n2) 41-42\n3) 43-45',
      '1'
    );

    let items = [];
    if (pattern === '1') {
      items = [{ item_no: 16 }, { item_no: 17 }];
    } else if (pattern === '2') {
      items = [{ item_no: 41 }, { item_no: 42 }];
    } else if (pattern === '3') {
      items = [{ item_no: 43 }, { item_no: 44 }, { item_no: 45 }];
    } else {
      return;
    }

    try {
      await setsApi.addRequests(setId, items);
      setMessage({ type: 'success', text: '문항 요청이 추가되었습니다.' });
      loadSets();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <h1>📚 세트 문항 관리</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ 새 세트
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

      <div className="card">
        <div className="card-header">
          <h2>세트 목록</h2>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <span>로딩 중...</span>
          </div>
        ) : sets.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '40px' }}>
            등록된 세트가 없습니다.
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>세트 ID</th>
                  <th>세트 이름</th>
                  <th>문항 수</th>
                  <th>프로파일</th>
                  <th>생성일</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {sets.map(set => (
                  <tr key={set.set_id}>
                    <td style={{ fontFamily: 'monospace' }}>{set.set_id}</td>
                    <td>{set.set_name || '-'}</td>
                    <td>{set.item_count || 0}개</td>
                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {set.profile || '-'}
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {formatKSTDate(set.created_at)}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleViewDetail(set.set_id)}
                        >
                          상세
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAddItems(set.set_id)}
                        >
                          문항 추가
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleGenerate(set.set_id)}
                          disabled={generating[set.set_id]}
                        >
                          {generating[set.set_id] ? '생성 중...' : '생성'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(set.set_id)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 도움말 */}
      <div className="card">
        <h3 className="mb-2">💡 세트 문항이란?</h3>
        <p className="text-muted">
          세트 문항은 하나의 공통 지문을 공유하는 여러 문항으로 구성됩니다.
        </p>
        <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          <li><strong>16-17번</strong>: 듣기 세트 문항</li>
          <li><strong>41-42번</strong>: 장문 독해 세트 (제목/어휘)</li>
          <li><strong>43-45번</strong>: 장문 독해 세트 (순서/삽입/내용일치)</li>
        </ul>
      </div>

      {/* 생성 모달 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>새 세트 생성</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">세트 ID *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.set_id}
                    onChange={e => setFormData(prev => ({ ...prev, set_id: e.target.value }))}
                    placeholder="예: SET_2024_001"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">세트 이름</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.set_name}
                    onChange={e => setFormData(prev => ({ ...prev, set_name: e.target.value }))}
                    placeholder="예: 2024학년도 모의고사 41-42번"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">공통 지문 (선택)</label>
                  <textarea
                    className="form-control"
                    value={formData.common_passage}
                    onChange={e => setFormData(prev => ({ ...prev, common_passage: e.target.value }))}
                    rows="6"
                    placeholder="모든 문항에서 공유할 지문을 입력하세요. 비워두면 자동 생성됩니다."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">난이도 프로파일 (선택)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.profile}
                    onChange={e => setFormData(prev => ({ ...prev, profile: e.target.value }))}
                    placeholder="예: 41:중,42:중상"
                  />
                  <small className="text-muted">
                    형식: 문항번호:난이도,문항번호:난이도 (예: 43:중,44:중상,45:상)
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary">
                  생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {selectedSet && (
        <div className="modal-overlay" onClick={() => setSelectedSet(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3>세트 상세: {selectedSet.set?.set_id}</h3>
              <button className="modal-close" onClick={() => setSelectedSet(null)}>×</button>
            </div>
            <div className="modal-body">
              <h4 className="mb-2">세트 정보</h4>
              <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
                <p><strong>세트 ID:</strong> {selectedSet.set?.set_id}</p>
                <p><strong>세트 이름:</strong> {selectedSet.set?.set_name || '-'}</p>
                <p><strong>프로파일:</strong> {selectedSet.set?.profile || '-'}</p>
              </div>

              {selectedSet.set?.common_passage && (
                <>
                  <h4 className="mb-2">공통 지문</h4>
                  <div className="item-preview" style={{ marginBottom: '16px' }}>
                    <div className="passage">{selectedSet.set.common_passage}</div>
                  </div>
                </>
              )}

              <h4 className="mb-2">문항 요청 ({selectedSet.requests?.length || 0}개)</h4>
              {selectedSet.requests?.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>요청 ID</th>
                      <th>문항 번호</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSet.requests.map(req => (
                      <tr key={req.request_id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {req.request_id?.slice(0, 8)}...
                        </td>
                        <td>RC{req.item_no}</td>
                        <td>
                          <span className={`badge badge-${req.status?.toLowerCase()}`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted">아직 문항 요청이 없습니다.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedSet(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ItemSets;
