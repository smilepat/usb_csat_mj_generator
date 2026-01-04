/**
 * Library.js - 라이브러리 저장소 페이지
 * 승인된 문항 및 프롬프트 관리
 */

import React, { useState, useEffect, useCallback } from 'react';
import { libraryApi } from '../api';

function Library() {
  // 상태 관리
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);

  // 필터 상태
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    favorite: false,
    search: '',
    sort: 'created_at',
    order: 'DESC'
  });

  // 페이지네이션
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0
  });

  // 선택된 항목
  const [selectedItems, setSelectedItems] = useState([]);

  // 상세 보기 모달
  const [detailItem, setDetailItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // 편집 모달
  const [editItem, setEditItem] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  // 데이터 로드
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: pagination.limit,
        offset: pagination.offset,
        sort: filters.sort,
        order: filters.order
      };

      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.favorite) params.favorite = '1';
      if (filters.search) params.search = filters.search;

      const res = await libraryApi.getAll(params);
      setItems(res.data.items);
      setPagination(prev => ({
        ...prev,
        total: res.data.pagination.total
      }));
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, pagination.offset]);

  const loadStats = async () => {
    try {
      const res = await libraryApi.getStats();
      setStats(res.data);
    } catch (error) {
      console.error('통계 로드 오류:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await libraryApi.getCategories();
      setCategories(res.data);
    } catch (error) {
      console.error('카테고리 로드 오류:', error);
    }
  };

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    loadStats();
    loadCategories();
  }, []);

  // 필터 변경
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  // 페이지 변경
  const handlePageChange = (newOffset) => {
    setPagination(prev => ({ ...prev, offset: newOffset }));
  };

  // 즐겨찾기 토글
  const handleToggleFavorite = async (id, currentFavorite) => {
    try {
      await libraryApi.toggleFavorite(id, !currentFavorite);
      loadItems();
      loadStats();
      setMessage({ type: 'success', text: currentFavorite ? '즐겨찾기에서 제거되었습니다.' : '즐겨찾기에 추가되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // 삭제
  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      await libraryApi.delete(id);
      loadItems();
      loadStats();
      setMessage({ type: 'success', text: '삭제되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // 선택 삭제
  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`선택한 ${selectedItems.length}개 항목을 삭제하시겠습니까?`)) return;

    try {
      for (const id of selectedItems) {
        await libraryApi.delete(id);
      }
      setSelectedItems([]);
      loadItems();
      loadStats();
      setMessage({ type: 'success', text: `${selectedItems.length}개 항목이 삭제되었습니다.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // 내보내기
  const handleExport = async () => {
    try {
      const ids = selectedItems.length > 0 ? selectedItems : undefined;
      const res = await libraryApi.export(ids);

      // JSON 파일 다운로드
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `library_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `${res.data.count}개 항목이 내보내졌습니다.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // 편집 저장
  const handleEditSave = async () => {
    if (!editItem) return;

    try {
      await libraryApi.update(editItem.id, {
        title: editItem.title,
        category: editItem.category,
        tags: editItem.tags,
        notes: editItem.notes
      });
      setShowEdit(false);
      setEditItem(null);
      loadItems();
      setMessage({ type: 'success', text: '수정되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // 등급 배지 스타일
  const getGradeBadgeStyle = (grade) => {
    const styles = {
      'A': { background: '#10b981', color: 'white' },
      'B': { background: '#3b82f6', color: 'white' },
      'C': { background: '#f59e0b', color: 'white' },
      'D': { background: '#ef4444', color: 'white' },
      'F': { background: '#6b7280', color: 'white' }
    };
    return styles[grade] || { background: '#9ca3af', color: 'white' };
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Library</h1>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '16px' }}>
          {message.text}
          <button
            onClick={() => setMessage(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            X
          </button>
        </div>
      )}

      {/* 통계 카드 */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e40af' }}>{stats.total}</div>
            <div style={{ color: '#64748b' }}>전체</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#059669' }}>{stats.item_count}</div>
            <div style={{ color: '#64748b' }}>문항</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed' }}>{stats.prompt_count}</div>
            <div style={{ color: '#64748b' }}>프롬프트</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>{stats.favorite_count}</div>
            <div style={{ color: '#64748b' }}>즐겨찾기</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0891b2' }}>
              {stats.avg_score ? stats.avg_score.toFixed(1) : '-'}
            </div>
            <div style={{ color: '#64748b' }}>평균 점수</div>
          </div>
        </div>
      )}

      {/* 필터 및 액션 */}
      <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* 검색 */}
          <input
            type="text"
            placeholder="검색..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '200px' }}
          />

          {/* 타입 필터 */}
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
          >
            <option value="">전체 타입</option>
            <option value="item">문항</option>
            <option value="prompt">프롬프트</option>
          </select>

          {/* 카테고리 필터 */}
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
          >
            <option value="">전체 카테고리</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* 즐겨찾기 필터 */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filters.favorite}
              onChange={(e) => handleFilterChange('favorite', e.target.checked)}
            />
            즐겨찾기만
          </label>

          {/* 정렬 */}
          <select
            value={`${filters.sort}_${filters.order}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('_');
              setFilters(prev => ({ ...prev, sort, order }));
            }}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
          >
            <option value="created_at_DESC">최신순</option>
            <option value="created_at_ASC">오래된순</option>
            <option value="final_score_DESC">점수 높은순</option>
            <option value="final_score_ASC">점수 낮은순</option>
            <option value="title_ASC">제목순</option>
          </select>

          <div style={{ flex: 1 }} />

          {/* 액션 버튼 */}
          {selectedItems.length > 0 && (
            <button
              className="btn btn-danger"
              onClick={handleBatchDelete}
            >
              선택 삭제 ({selectedItems.length})
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleExport}
          >
            내보내기
          </button>
        </div>
      </div>

      {/* 항목 목록 */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>로딩 중...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            저장된 항목이 없습니다.
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.length === items.length && items.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(items.map(i => i.id));
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                    />
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', width: '40px' }}></th>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>제목</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '80px' }}>타입</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '100px' }}>카테고리</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '80px' }}>점수</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '60px' }}>등급</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '120px' }}>생성일</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', width: '150px' }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: selectedItems.includes(item.id) ? '#eff6ff' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item.id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.id));
                          }
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <button
                        onClick={() => handleToggleFavorite(item.id, item.is_favorite)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1.2rem'
                        }}
                        title={item.is_favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                      >
                        {item.is_favorite ? '★' : '☆'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontWeight: 500 }}>{item.title || '(제목 없음)'}</div>
                      {item.tags && item.tags.length > 0 && (
                        <div style={{ marginTop: '4px' }}>
                          {item.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#e0e7ff',
                                color: '#3730a3',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                marginRight: '4px'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <span style={{
                        background: item.type === 'item' ? '#dcfce7' : '#f3e8ff',
                        color: item.type === 'item' ? '#166534' : '#6b21a8',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}>
                        {item.type === 'item' ? '문항' : '프롬프트'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: '#64748b' }}>
                      {item.category || '-'}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600 }}>
                      {item.final_score ? item.final_score.toFixed(1) : '-'}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      {item.grade ? (
                        <span style={{
                          ...getGradeBadgeStyle(item.grade),
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}>
                          {item.grade}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(item.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          setDetailItem(item);
                          setShowDetail(true);
                        }}
                        style={{ marginRight: '4px' }}
                      >
                        보기
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setEditItem({ ...item });
                          setShowEdit(true);
                        }}
                        style={{ marginRight: '4px' }}
                      >
                        편집
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(item.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                padding: '16px',
                borderTop: '1px solid #e2e8f0'
              }}>
                <button
                  className="btn btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(0)}
                >
                  처음
                </button>
                <button
                  className="btn btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(pagination.offset - pagination.limit)}
                >
                  이전
                </button>
                <span style={{ padding: '0 16px' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="btn btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                >
                  다음
                </button>
                <button
                  className="btn btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange((totalPages - 1) * pagination.limit)}
                >
                  마지막
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 상세 보기 모달 */}
      {showDetail && detailItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div className="flex-between" style={{ marginBottom: '20px' }}>
              <h2>{detailItem.title || '(제목 없음)'}</h2>
              <button
                onClick={() => setShowDetail(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                X
              </button>
            </div>

            {/* 메타 정보 */}
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '20px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '8px'
            }}>
              <span>
                <strong>타입:</strong> {detailItem.type === 'item' ? '문항' : '프롬프트'}
              </span>
              {detailItem.category && (
                <span><strong>카테고리:</strong> {detailItem.category}</span>
              )}
              {detailItem.grade && (
                <span>
                  <strong>등급:</strong>{' '}
                  <span style={{
                    ...getGradeBadgeStyle(detailItem.grade),
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {detailItem.grade}
                  </span>
                </span>
              )}
              {detailItem.final_score && (
                <span><strong>점수:</strong> {detailItem.final_score.toFixed(1)}</span>
              )}
            </div>

            {/* 문항 내용 */}
            {detailItem.type === 'item' && (
              <>
                {detailItem.passage && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ color: '#1e40af', marginBottom: '8px' }}>지문</h4>
                    <div style={{
                      background: '#f1f5f9',
                      padding: '16px',
                      borderRadius: '8px',
                      lineHeight: '1.8',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {detailItem.passage}
                    </div>
                  </div>
                )}

                {detailItem.question && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ color: '#1e40af', marginBottom: '8px' }}>발문</h4>
                    <div style={{ fontWeight: 500 }}>{detailItem.question}</div>
                  </div>
                )}

                {detailItem.options && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ color: '#1e40af', marginBottom: '8px' }}>선택지</h4>
                    {detailItem.options.map((opt, idx) => (
                      <div key={idx} style={{
                        padding: '8px 12px',
                        marginBottom: '4px',
                        background: String(detailItem.answer) === String(idx + 1) ? '#dcfce7' : '#f8fafc',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: String(detailItem.answer) === String(idx + 1) ? '#22c55e' : '#94a3b8',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
                        }}>
                          {idx + 1}
                        </span>
                        {opt}
                        {String(detailItem.answer) === String(idx + 1) && (
                          <span style={{ marginLeft: 'auto', color: '#16a34a', fontWeight: 600 }}>정답</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {detailItem.explanation && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ color: '#1e40af', marginBottom: '8px' }}>해설</h4>
                    <div style={{
                      background: '#fffbeb',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #fcd34d'
                    }}>
                      {detailItem.explanation}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 프롬프트 내용 */}
            {detailItem.type === 'prompt' && detailItem.prompt_text && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ color: '#1e40af', marginBottom: '8px' }}>프롬프트 내용</h4>
                <pre style={{
                  background: '#1e293b',
                  color: '#e2e8f0',
                  padding: '16px',
                  borderRadius: '8px',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.9rem',
                  maxHeight: '400px',
                  overflow: 'auto'
                }}>
                  {detailItem.prompt_text}
                </pre>
              </div>
            )}

            {/* 메모 */}
            {detailItem.notes && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ color: '#1e40af', marginBottom: '8px' }}>메모</h4>
                <div style={{
                  background: '#f8fafc',
                  padding: '12px',
                  borderRadius: '8px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {detailItem.notes}
                </div>
              </div>
            )}

            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setShowDetail(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 편집 모달 */}
      {showEdit && editItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ marginBottom: '20px' }}>항목 편집</h2>

            <div className="form-group">
              <label className="form-label">제목</label>
              <input
                type="text"
                className="form-input"
                value={editItem.title || ''}
                onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">카테고리</label>
              <input
                type="text"
                className="form-input"
                value={editItem.category || ''}
                onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                placeholder="예: 어법, 빈칸, 주제"
              />
            </div>

            <div className="form-group">
              <label className="form-label">태그 (쉼표로 구분)</label>
              <input
                type="text"
                className="form-input"
                value={Array.isArray(editItem.tags) ? editItem.tags.join(', ') : editItem.tags || ''}
                onChange={(e) => setEditItem({ ...editItem, tags: e.target.value })}
                placeholder="예: 고난도, 어법, 분사"
              />
            </div>

            <div className="form-group">
              <label className="form-label">메모</label>
              <textarea
                className="form-input"
                rows={4}
                value={editItem.notes || ''}
                onChange={(e) => setEditItem({ ...editItem, notes: e.target.value })}
                placeholder="메모를 입력하세요..."
              />
            </div>

            <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowEdit(false);
                  setEditItem(null);
                }}
              >
                취소
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEditSave}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Library;
