import React, { useState, useEffect } from 'react';
import { chartsApi } from '../api';
import { formatKSTDate } from '../utils/dateUtils';

function Charts() {
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedChart, setSelectedChart] = useState(null);
  const [formData, setFormData] = useState({
    chart_id: '',
    chart_name: '',
    data: ''
  });

  useEffect(() => {
    loadCharts();
  }, []);

  const loadCharts = async () => {
    try {
      setLoading(true);
      const res = await chartsApi.getAll();
      setCharts(res.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      let data = {};
      if (formData.data) {
        try {
          data = JSON.parse(formData.data);
        } catch (e) {
          setMessage({ type: 'error', text: 'JSON 형식이 올바르지 않습니다.' });
          return;
        }
      }

      await chartsApi.create({
        chart_id: formData.chart_id,
        chart_name: formData.chart_name,
        data: data
      });

      setMessage({ type: 'success', text: '차트가 생성되었습니다.' });
      setShowModal(false);
      setFormData({ chart_id: '', chart_name: '', data: '' });
      loadCharts();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleViewDetail = async (chartId) => {
    try {
      const res = await chartsApi.get(chartId);
      setSelectedChart(res.data);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleDelete = async (chartId) => {
    if (!window.confirm('이 차트를 삭제하시겠습니까?')) return;

    try {
      await chartsApi.delete(chartId);
      setMessage({ type: 'success', text: '차트가 삭제되었습니다.' });
      loadCharts();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <h1>📈 차트 데이터 관리</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ 새 차트
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
          <h2>차트 목록</h2>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <span>로딩 중...</span>
          </div>
        ) : charts.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '40px' }}>
            등록된 차트가 없습니다.
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>차트 ID</th>
                  <th>차트 이름</th>
                  <th>생성일</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {charts.map(chart => (
                  <tr key={chart.chart_id}>
                    <td style={{ fontFamily: 'monospace' }}>{chart.chart_id}</td>
                    <td>{chart.chart_name || '-'}</td>
                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {formatKSTDate(chart.created_at)}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleViewDetail(chart.chart_id)}
                        >
                          상세
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(chart.chart_id)}
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
        <h3 className="mb-2">💡 차트 데이터 사용법</h3>
        <p className="text-muted mb-2">
          RC25 도표 문항 생성 시 사용할 차트 데이터를 JSON 형식으로 등록합니다.
        </p>
        <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '0.85rem' }}>
{`{
  "title": "연도별 스마트폰 사용률 변화",
  "years": [2019, 2020, 2021, 2022, 2023],
  "data": {
    "teens": [85, 88, 91, 93, 95],
    "adults": [78, 82, 85, 88, 90],
    "seniors": [35, 42, 50, 58, 65]
  },
  "unit": "%"
}`}
        </pre>
      </div>

      {/* 생성 모달 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>새 차트 등록</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">차트 ID *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.chart_id}
                    onChange={e => setFormData(prev => ({ ...prev, chart_id: e.target.value }))}
                    placeholder="예: CHART_2024_001"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">차트 이름</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.chart_name}
                    onChange={e => setFormData(prev => ({ ...prev, chart_name: e.target.value }))}
                    placeholder="예: 연도별 스마트폰 사용률"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">차트 데이터 (JSON)</label>
                  <textarea
                    className="form-control"
                    value={formData.data}
                    onChange={e => setFormData(prev => ({ ...prev, data: e.target.value }))}
                    rows="10"
                    style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                    placeholder='{"title": "...", "data": {...}}'
                  />
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
      {selectedChart && (
        <div className="modal-overlay" onClick={() => setSelectedChart(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>차트 상세: {selectedChart.chartId}</h3>
              <button className="modal-close" onClick={() => setSelectedChart(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <strong>차트 이름:</strong> {selectedChart.chartName || '-'}
              </div>
              <div>
                <strong>차트 데이터:</strong>
              </div>
              <div className="json-viewer" style={{ marginTop: '8px' }}>
                {JSON.stringify(selectedChart.data, null, 2)}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedChart(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Charts;
