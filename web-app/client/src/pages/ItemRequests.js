import React, { useState, useEffect } from 'react';
import { itemsApi } from '../api';

function ItemRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params = filter ? { status: filter } : {};
      const res = await itemsApi.getRequests(params);
      setRequests(res.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (requestId) => {
    try {
      setGenerating(prev => ({ ...prev, [requestId]: true }));
      const res = await itemsApi.generate(requestId);
      setMessage({ type: 'success', text: `문항 생성 완료: ${res.data.validationResult}` });
      loadRequests();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setGenerating(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleGenerateAll = async () => {
    try {
      setMessage({ type: 'info', text: '전체 PENDING 문항 생성 중...' });
      const res = await itemsApi.generatePending();
      setMessage({ type: 'success', text: res.message });
      loadRequests();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleDelete = async (requestId) => {
    if (!window.confirm('이 요청을 삭제하시겠습니까?')) return;

    try {
      await itemsApi.deleteRequest(requestId);
      setMessage({ type: 'success', text: '요청이 삭제되었습니다.' });
      loadRequests();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleViewDetail = async (requestId) => {
    try {
      const res = await itemsApi.getRequest(requestId);
      setSelectedItem(res.data);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { class: 'badge-pending', text: '대기 중' },
      RUNNING: { class: 'badge-running', text: '실행 중' },
      OK: { class: 'badge-ok', text: '성공' },
      FAIL: { class: 'badge-fail', text: '실패' }
    };
    const info = statusMap[status] || { class: 'badge-pending', text: status };
    return <span className={`badge ${info.class}`}>{info.text}</span>;
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <h1>📋 문항 요청 목록</h1>
        <div className="flex gap-2">
          <button className="btn btn-success" onClick={handleGenerateAll}>
            🚀 전체 PENDING 처리
          </button>
          <a href="/items/create" className="btn btn-primary">➕ 새 요청</a>
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

      {/* 필터 */}
      <div className="card">
        <div className="flex gap-2">
          <button
            className={`btn ${filter === '' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilter('')}
          >
            전체
          </button>
          <button
            className={`btn ${filter === 'PENDING' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilter('PENDING')}
          >
            대기 중
          </button>
          <button
            className={`btn ${filter === 'OK' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilter('OK')}
          >
            성공
          </button>
          <button
            className={`btn ${filter === 'FAIL' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilter('FAIL')}
          >
            실패
          </button>
        </div>
      </div>

      {/* 요청 목록 */}
      <div className="card">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <span>로딩 중...</span>
          </div>
        ) : requests.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '40px' }}>
            요청이 없습니다.
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>요청 ID</th>
                  <th>문항 번호</th>
                  <th>상태</th>
                  <th>난이도</th>
                  <th>세트 ID</th>
                  <th>생성일</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.request_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {req.request_id?.slice(0, 8)}...
                    </td>
                    <td>RC{req.item_no}</td>
                    <td>{getStatusBadge(req.status)}</td>
                    <td>{req.level || '-'}</td>
                    <td>{req.set_id || '-'}</td>
                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {new Date(req.created_at).toLocaleString('ko-KR')}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleViewDetail(req.request_id)}
                        >
                          상세
                        </button>
                        {req.status === 'PENDING' && !req.set_id && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleGenerate(req.request_id)}
                            disabled={generating[req.request_id]}
                          >
                            {generating[req.request_id] ? '생성 중...' : '생성'}
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(req.request_id)}
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

      {/* 상세 모달 */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h3>문항 상세 정보</h3>
              <button className="modal-close" onClick={() => setSelectedItem(null)}>×</button>
            </div>
            <div className="modal-body">
              <h4 className="mb-2">요청 정보</h4>
              <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
                <p><strong>요청 ID:</strong> {selectedItem.request?.request_id}</p>
                <p><strong>문항 번호:</strong> RC{selectedItem.request?.item_no}</p>
                <p><strong>상태:</strong> {selectedItem.request?.status}</p>
                <p><strong>난이도:</strong> {selectedItem.request?.level || '-'}</p>
              </div>

              {selectedItem.request?.passage && (
                <>
                  <h4 className="mb-2">지문</h4>
                  <div className="item-preview" style={{ marginBottom: '16px' }}>
                    <div className="passage">{selectedItem.request.passage}</div>
                  </div>
                </>
              )}

              {selectedItem.output && (
                <>
                  <h4 className="mb-2">생성된 문항</h4>
                  <div className="item-preview">
                    <div className="question">{selectedItem.output.question}</div>
                    <ol className="options">
                      {[1, 2, 3, 4, 5].map(i => (
                        <li
                          key={i}
                          className={selectedItem.output.answer === String(i) ? 'correct' : ''}
                        >
                          {i}. {selectedItem.output[`option_${i}`]}
                          {selectedItem.output.answer === String(i) && ' ✓'}
                        </li>
                      ))}
                    </ol>
                    {selectedItem.output.explanation && (
                      <div className="explanation">
                        <strong>해설:</strong> {selectedItem.output.explanation}
                      </div>
                    )}
                  </div>
                </>
              )}

              {selectedItem.results?.length > 0 && (
                <>
                  <h4 className="mb-2 mt-4">검증 로그</h4>
                  <div className="json-viewer">
                    {selectedItem.results.map((r, i) => (
                      <div key={i}>
                        <strong>결과 {i + 1}:</strong> {r.validation_result}
                        <br />
                        <span>{r.validation_log}</span>
                        <hr style={{ borderColor: '#444', margin: '8px 0' }} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedItem(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ItemRequests;
