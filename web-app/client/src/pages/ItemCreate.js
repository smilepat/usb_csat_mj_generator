import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { itemsApi, promptsApi, libraryApi, setsApi } from '../api';
import PromptPreview from '../components/PromptPreview';
import { validateForm, countWords, isLCItem, isRCItem, isSetItem } from '../utils/validation';

// 세트 문항 번호를 개별 문항 번호 배열로 변환
const getSetItemNumbers = (itemNo) => {
  const itemNoStr = String(itemNo);
  if (itemNoStr === '16-17') return [16, 17];
  if (itemNoStr === '41-42') return [41, 42];
  if (itemNoStr === '43-45') return [43, 44, 45];
  return null;
};

// 세트 문항인지 확인
const isSetItemNo = (itemNo) => {
  const itemNoStr = String(itemNo);
  return ['16-17', '41-42', '43-45'].includes(itemNoStr);
};

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

  // 생성 결과 표시 관련 상태
  const [showResult, setShowResult] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);

  // 기본 프롬프트 매핑 상태
  const [defaultPrompts, setDefaultPrompts] = useState({});

  // 2단계 워크플로우 관련 상태
  const [useTwoStepMode, setUseTwoStepMode] = useState(false);
  const [showPassageReview, setShowPassageReview] = useState(false);
  const [generatedPassage, setGeneratedPassage] = useState('');
  const [editedPassage, setEditedPassage] = useState('');
  const [isEditingPassage, setIsEditingPassage] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState(null);

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

      // 세트 문항인지 확인
      if (isSetItemNo(formData.item_no)) {
        await handleSetItemGeneration();
        return;
      }

      const res = await itemsApi.createRequest(formData);
      setMessage({ type: 'success', text: '요청이 생성되었습니다. 문항 생성을 시작합니다...' });

      // 바로 생성 시작
      try {
        const genRes = await itemsApi.generate(res.data.requestId);

        // 생성 결과 상세 조회
        const detailRes = await itemsApi.getRequest(res.data.requestId);

        // 생성 결과 저장 및 표시
        setGenerationResult({
          ...genRes.data,
          requestId: res.data.requestId,
          details: detailRes.data
        });
        setShowResult(true);
        setShowPreview(false);

        // 생성 성공 시 자동으로 라이브러리에 저장
        if (genRes.data.validationResult === 'PASS') {
          try {
            await libraryApi.saveItemFromRequest(res.data.requestId, {
              category: `${formData.item_no}번 문항`
            });
            setMessage({
              type: 'success',
              text: '문항이 성공적으로 생성되어 라이브러리에 저장되었습니다!'
            });
          } catch (libError) {
            console.error('라이브러리 저장 오류:', libError);
            setMessage({
              type: 'success',
              text: '문항이 성공적으로 생성되었습니다! (라이브러리 저장은 수동으로 해주세요)'
            });
          }
        } else {
          setMessage({
            type: 'warning',
            text: '문항 생성 완료 (검토 필요 - 승인 후 라이브러리에 저장하세요)'
          });
        }
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

      // 세트 문항인지 확인
      if (isSetItemNo(formData.item_no)) {
        await handleSetItemGeneration();
        return;
      }

      const res = await itemsApi.createRequest(formData);
      setMessage({ type: 'success', text: '요청이 생성되었습니다. 문항 생성을 시작합니다...' });

      // 바로 생성 시작
      try {
        const genRes = await itemsApi.generate(res.data.requestId);

        // 생성 결과 상세 조회
        const detailRes = await itemsApi.getRequest(res.data.requestId);

        // 생성 결과 저장 및 표시
        setGenerationResult({
          ...genRes.data,
          requestId: res.data.requestId,
          details: detailRes.data
        });
        setShowResult(true);
        setShowPreview(false);

        // 생성 성공 시 자동으로 라이브러리에 저장
        if (genRes.data.validationResult === 'PASS') {
          try {
            await libraryApi.saveItemFromRequest(res.data.requestId, {
              category: `${formData.item_no}번 문항`
            });
            setMessage({
              type: 'success',
              text: '문항이 성공적으로 생성되어 라이브러리에 저장되었습니다!'
            });
          } catch (libError) {
            console.error('라이브러리 저장 오류:', libError);
            setMessage({
              type: 'success',
              text: '문항이 성공적으로 생성되었습니다! (라이브러리 저장은 수동으로 해주세요)'
            });
          }
        } else {
          setMessage({
            type: 'warning',
            text: '문항 생성 완료 (검토 필요 - 승인 후 라이브러리에 저장하세요)'
          });
        }
      } catch (genError) {
        setMessage({ type: 'error', text: '문항 생성 중 오류: ' + genError.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // 세트 문항 생성 처리
  const handleSetItemGeneration = async () => {
    const itemNumbers = getSetItemNumbers(formData.item_no);
    if (!itemNumbers) {
      setMessage({ type: 'error', text: '알 수 없는 세트 문항입니다.' });
      setLoading(false);
      return;
    }

    const setId = `SET_${formData.item_no.replace('-', '_')}_${Date.now()}`;
    setMessage({ type: 'info', text: `세트 문항 생성 중... (${itemNumbers.join(', ')}번)` });

    try {
      // 1. 세트 생성
      await setsApi.create({
        set_id: setId,
        set_name: `${formData.item_no}번 세트`,
        common_passage: formData.passage || '',
        profile: itemNumbers.map(no => `${no}:${formData.level}`).join(',')
      });

      // 2. 세트에 개별 문항 요청 추가
      const items = itemNumbers.map(no => ({
        item_no: no,
        level: formData.level,
        extra: formData.extra,
        topic: formData.topic
      }));
      await setsApi.addRequests(setId, items);

      // 3. 세트 생성 실행
      setMessage({ type: 'info', text: `세트 문항 생성 중... (${itemNumbers.length}개 문항 병렬 생성)` });
      const genRes = await setsApi.generate(setId);

      // 4. 세트 상세 조회
      const setDetail = await setsApi.get(setId);

      // 5. 결과 표시
      setGenerationResult({
        isSet: true,
        setId: setId,
        itemCount: genRes.data.itemCount,
        validationResult: genRes.data.validationResult,
        validationLog: genRes.data.validationLog,
        setDetail: setDetail.data
      });
      setShowResult(true);
      setShowPreview(false);

      const successCount = setDetail.data.requests.filter(r => r.status === 'OK').length;
      const failCount = setDetail.data.requests.filter(r => r.status === 'FAIL').length;

      if (failCount === 0) {
        setMessage({
          type: 'success',
          text: `세트 문항 ${itemNumbers.length}개가 모두 성공적으로 생성되었습니다!`
        });
      } else {
        setMessage({
          type: 'warning',
          text: `세트 문항 생성 완료 (성공: ${successCount}개, 실패: ${failCount}개)`
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '세트 문항 생성 오류: ' + error.message });
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

  // 경고/제안 자동 적용
  const handleApplySuggestions = async (itemNo, warnings, suggestions) => {
    try {
      setMessage({ type: 'info', text: 'AI가 프롬프트를 분석하고 개선하는 중...' });

      const res = await itemsApi.applySuggestions(itemNo, warnings, suggestions);

      if (res.success) {
        setMessage({
          type: 'success',
          text: `프롬프트가 자동으로 개선되었습니다! (${res.data.changes_made.length}개 변경사항)\n\n프롬프트 목록 페이지에서 "${res.data.prompt_key}"를 확인하세요.`
        });

        // 개선 결과를 콘솔에 출력 (디버깅용)
        console.log('개선된 프롬프트:', res.data.improved_prompt);
        console.log('변경 사항:', res.data.changes_made);
        console.log('개선 요약:', res.data.improvement_summary);

        // 알림 표시
        if (window.confirm(
          `프롬프트가 개선되었습니다!\n\n` +
          `변경사항:\n${res.data.changes_made.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n` +
          `프롬프트 목록 페이지로 이동하시겠습니까?`
        )) {
          navigate('/prompts');
        } else {
          // 미리보기 새로고침
          handlePreview();
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: '자동 개선 실패: ' + error.message });
    }
  };

  // 라이브러리에 저장
  const handleSaveToLibrary = async () => {
    if (!generationResult?.requestId) return;

    try {
      setLoading(true);
      await libraryApi.saveItemFromRequest(generationResult.requestId, {
        category: `${formData.item_no}번 문항`
      });
      setMessage({ type: 'success', text: '라이브러리에 저장되었습니다!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // 새 문항 생성 (결과 화면에서)
  const handleCreateNew = () => {
    setShowResult(false);
    setGenerationResult(null);
    setMessage(null);
    // 2단계 워크플로우 상태 초기화
    setShowPassageReview(false);
    setGeneratedPassage('');
    setEditedPassage('');
    setIsEditingPassage(false);
    setCurrentRequestId(null);
    setFormData({
      item_no: formData.item_no,
      passage: '',
      level: '중',
      extra: '',
      chart_id: '',
      topic: '',
      passage_source: ''
    });
  };

  // 재생성
  const handleRegenerate = async () => {
    if (!generationResult?.requestId) return;

    try {
      setLoading(true);
      setMessage({ type: 'info', text: '문항을 재생성하고 있습니다...' });

      const genRes = await itemsApi.generate(generationResult.requestId);
      const detailRes = await itemsApi.getRequest(generationResult.requestId);

      setGenerationResult({
        ...genRes.data,
        requestId: generationResult.requestId,
        details: detailRes.data
      });

      setMessage({
        type: genRes.data.validationResult === 'PASS' ? 'success' : 'warning',
        text: genRes.data.validationResult === 'PASS'
          ? '문항이 성공적으로 재생성되었습니다!'
          : '문항 재생성 완료 (검토 필요)'
      });
    } catch (error) {
      setMessage({ type: 'error', text: '재생성 오류: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // 2단계 워크플로우: 지문만 생성
  const handleGeneratePassageOnly = async () => {
    // 클라이언트 측 유효성 검사
    const validation = validateForm(formData);
    setValidationResult(validation);

    if (!validation.valid) {
      setMessage({ type: 'error', text: '입력 오류: ' + validation.errors.join(', ') });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: 'info', text: '지문을 생성하고 있습니다...' });

      // 1. 요청 생성
      const res = await itemsApi.createRequest(formData);
      setCurrentRequestId(res.data.requestId);

      // 2. 지문만 생성
      const passageRes = await itemsApi.generatePassage(res.data.requestId);

      // 3. 생성된 지문 표시
      setGeneratedPassage(passageRes.data.passage);
      setEditedPassage(passageRes.data.passage);
      setShowPassageReview(true);
      setMessage({
        type: 'success',
        text: '지문이 생성되었습니다. 검토 후 문항 생성을 진행하세요.'
      });
    } catch (error) {
      setMessage({ type: 'error', text: '지문 생성 오류: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // 2단계 워크플로우: 지문 수정 저장
  const handleSavePassage = async () => {
    if (!currentRequestId) return;

    try {
      setLoading(true);
      await itemsApi.updatePassage(currentRequestId, editedPassage);
      setGeneratedPassage(editedPassage);
      setIsEditingPassage(false);
      setMessage({ type: 'success', text: '지문이 수정되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: '지문 수정 오류: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // 2단계 워크플로우: 지문 확정 후 문항 생성
  const handleConfirmPassageAndGenerate = async () => {
    if (!currentRequestId) return;

    try {
      setLoading(true);
      setMessage({ type: 'info', text: '문항을 생성하고 있습니다...' });

      // 문항 생성 실행
      const genRes = await itemsApi.generate(currentRequestId);

      // 생성 결과 상세 조회
      const detailRes = await itemsApi.getRequest(currentRequestId);

      // 생성 결과 저장 및 표시
      setGenerationResult({
        ...genRes.data,
        requestId: currentRequestId,
        details: detailRes.data
      });
      setShowPassageReview(false);
      setShowResult(true);

      // 생성 성공 시 자동으로 라이브러리에 저장
      if (genRes.data.validationResult === 'PASS') {
        try {
          await libraryApi.saveItemFromRequest(currentRequestId, {
            category: `${formData.item_no}번 문항`
          });
          setMessage({
            type: 'success',
            text: '문항이 성공적으로 생성되어 라이브러리에 저장되었습니다!'
          });
        } catch (libError) {
          console.error('라이브러리 저장 오류:', libError);
          setMessage({
            type: 'success',
            text: '문항이 성공적으로 생성되었습니다! (라이브러리 저장은 수동으로 해주세요)'
          });
        }
      } else {
        setMessage({
          type: 'warning',
          text: '문항 생성 완료 (검토 필요 - 승인 후 라이브러리에 저장하세요)'
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '문항 생성 오류: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // 2단계 워크플로우: 지문 재생성
  const handleRegeneratePassage = async () => {
    if (!currentRequestId) return;

    try {
      setLoading(true);
      setMessage({ type: 'info', text: '지문을 다시 생성하고 있습니다...' });

      // 기존 지문 초기화
      await itemsApi.updatePassage(currentRequestId, '');

      // 지문 재생성
      const passageRes = await itemsApi.generatePassage(currentRequestId);

      setGeneratedPassage(passageRes.data.passage);
      setEditedPassage(passageRes.data.passage);
      setIsEditingPassage(false);
      setMessage({ type: 'success', text: '지문이 재생성되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: '지문 재생성 오류: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // 2단계 워크플로우: 취소
  const handleCancelPassageReview = () => {
    setShowPassageReview(false);
    setGeneratedPassage('');
    setEditedPassage('');
    setIsEditingPassage(false);
    setCurrentRequestId(null);
    setMessage(null);
  };

  // 등급 배지 색상
  const getGradeBadgeStyle = (grade) => {
    const styles = {
      'A': { background: '#10b981', color: 'white' },
      'B': { background: '#3b82f6', color: 'white' },
      'C': { background: '#f59e0b', color: 'white' },
      'D': { background: '#ef4444', color: 'white' },
      'F': { background: '#6b7280', color: 'white' }
    };
    return styles[grade] || styles['F'];
  };

  // 세트 문항 결과 화면
  if (showResult && generationResult && generationResult.isSet) {
    const { setDetail } = generationResult;
    const requests = setDetail?.requests || [];
    const outputs = setDetail?.outputs || [];
    const successCount = requests.filter(r => r.status === 'OK').length;
    const failCount = requests.filter(r => r.status === 'FAIL').length;

    return (
      <div>
        <h1 style={{ marginBottom: '24px' }}>
          {failCount === 0 ? '✅ 세트 문항 생성 완료!' : '⚠️ 세트 문항 생성 완료 - 일부 검토 필요'}
        </h1>

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* 세트 요약 */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '12px', color: '#1e40af' }}>📦 세트 요약</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{
              background: '#f0fdf4',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#15803d' }}>{successCount}</div>
              <div style={{ color: '#166534' }}>성공</div>
            </div>
            <div style={{
              background: failCount > 0 ? '#fef2f2' : '#f1f5f9',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: failCount > 0 ? '#dc2626' : '#64748b' }}>{failCount}</div>
              <div style={{ color: failCount > 0 ? '#991b1b' : '#475569' }}>실패</div>
            </div>
            <div style={{
              background: '#eff6ff',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1d4ed8' }}>{requests.length}</div>
              <div style={{ color: '#1e40af' }}>총 문항</div>
            </div>
          </div>
        </div>

        {/* 공통 지문 (있는 경우) */}
        {setDetail?.set?.common_passage && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '12px', color: '#1e40af' }}>📖 공통 지문</h3>
            <div style={{
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap'
            }}>
              {setDetail.set.common_passage}
            </div>
          </div>
        )}

        {/* 개별 문항 결과 */}
        {requests.map((req, idx) => {
          const output = outputs.find(o => o.request_id === req.request_id) || {};
          const isSuccess = req.status === 'OK';

          return (
            <div key={req.request_id} className="card" style={{
              marginBottom: '16px',
              border: isSuccess ? '2px solid #22c55e' : '2px solid #ef4444'
            }}>
              <h3 style={{
                marginBottom: '12px',
                color: isSuccess ? '#15803d' : '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {isSuccess ? '✅' : '❌'} {req.item_no}번 문항
                <span style={{
                  fontSize: '0.8rem',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: isSuccess ? '#dcfce7' : '#fee2e2',
                  marginLeft: 'auto'
                }}>
                  {req.status}
                </span>
              </h3>

              {isSuccess && output.question && (
                <>
                  {/* 발문 */}
                  <div style={{ marginBottom: '12px' }}>
                    <strong>발문:</strong> {output.question}
                  </div>

                  {/* 선택지 */}
                  <div style={{ marginBottom: '12px' }}>
                    <strong>선택지:</strong>
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map(i => {
                        const optionText = output[`option_${i}`] || '';
                        const isAnswer = String(output.answer) === String(i);
                        return (
                          <div key={i} style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            background: isAnswer ? '#dcfce7' : '#f1f5f9',
                            border: isAnswer ? '1px solid #22c55e' : '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: isAnswer ? '#22c55e' : '#94a3b8',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}>{i}</span>
                            {optionText}
                            {isAnswer && <span style={{ marginLeft: 'auto', color: '#22c55e', fontWeight: 600 }}>정답</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 해설 */}
                  {output.explanation && (
                    <div style={{
                      background: '#fffbeb',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #fcd34d'
                    }}>
                      <strong>해설:</strong> {output.explanation}
                    </div>
                  )}
                </>
              )}

              {!isSuccess && (
                <div style={{ color: '#dc2626' }}>
                  문항 생성에 실패했습니다. 다시 시도해주세요.
                </div>
              )}
            </div>
          );
        })}

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            className="btn btn-primary"
            onClick={handleCreateNew}
          >
            ➕ 새 문항 생성
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/sets`)}
          >
            📦 세트 목록으로
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/items')}
          >
            📋 요청 목록으로
          </button>
        </div>
      </div>
    );
  }

  // 단일 문항 생성 결과 화면
  if (showResult && generationResult) {
    const { details } = generationResult;
    const output = details?.output || {};
    const metrics = details?.metrics || {};
    const isSuccess = generationResult.validationResult === 'PASS';

    return (
      <div>
        <h1 style={{ marginBottom: '24px' }}>
          {isSuccess ? '✅ 문항 생성 완료!' : '⚠️ 문항 생성 완료 - 검토 필요'}
        </h1>

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* 지문 */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '12px', color: '#1e40af' }}>📖 지문</h3>
          <div style={{
            background: '#f8fafc',
            padding: '16px',
            borderRadius: '8px',
            lineHeight: '1.8',
            fontSize: '1rem',
            whiteSpace: 'pre-wrap'
          }}>
            {/* RC31~33 빈칸 문항은 gapped_passage 우선 표시, LC 문항은 lc_script 표시 */}
            {(() => {
              const itemNo = parseInt(formData.item_no);
              const fj = generationResult.finalJson;
              // RC31~33 빈칸 문항
              if (itemNo >= 31 && itemNo <= 33 && fj?.gapped_passage) {
                return fj.gapped_passage;
              }
              // LC 문항 (1~17번)은 lc_script 필드 사용
              if (itemNo >= 1 && itemNo <= 17) {
                return output.lc_script || fj?.lc_script || output.passage || fj?.passage || '(지문 없음)';
              }
              return output.passage || fj?.passage || '(지문 없음)';
            })()}
          </div>
        </div>

        {/* RC38, RC39 주어진 문장 (given_sentence) */}
        {(() => {
          const itemNo = parseInt(formData.item_no);
          const fj = generationResult.finalJson;
          if ((itemNo === 38 || itemNo === 39) && fj?.given_sentence) {
            return (
              <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ marginBottom: '12px', color: '#1e40af' }}>📌 주어진 문장</h3>
                <div style={{
                  background: '#fef3c7',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid #f59e0b',
                  lineHeight: '1.8',
                  fontSize: '1rem',
                  fontWeight: 500
                }}>
                  {fj.given_sentence}
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* RC40 요약문 (summary with blanks) */}
        {(() => {
          const itemNo = parseInt(formData.item_no);
          const fj = generationResult.finalJson;
          if (itemNo === 40 && fj?.summary) {
            return (
              <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ marginBottom: '12px', color: '#1e40af' }}>📝 요약문 (빈칸 포함)</h3>
                <div style={{
                  background: '#fef3c7',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid #f59e0b',
                  lineHeight: '1.8',
                  fontSize: '1rem'
                }}>
                  {fj.summary}
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* 발문 */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '12px', color: '#1e40af' }}>❓ 발문</h3>
          <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>
            {output.question || generationResult.finalJson?.question || '(발문 없음)'}
          </div>
        </div>

        {/* 선택지 */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '12px', color: '#1e40af' }}>📝 선택지</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map(i => {
              const optionKey = `option_${i}`;
              const optionText = output[optionKey] ||
                (generationResult.finalJson?.options && generationResult.finalJson.options[i-1]) || '';
              const isAnswer = String(output.answer || generationResult.finalJson?.answer) === String(i);

              return (
                <div key={i} style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: isAnswer ? '#dcfce7' : '#f1f5f9',
                  border: isAnswer ? '2px solid #22c55e' : '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isAnswer ? '#22c55e' : '#94a3b8',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    {i}
                  </span>
                  <span style={{ flex: 1 }}>{optionText}</span>
                  {isAnswer && (
                    <span style={{
                      background: '#22c55e',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>
                      정답
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 해설 */}
        {(output.explanation || generationResult.finalJson?.explanation) && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '12px', color: '#1e40af' }}>💡 해설</h3>
            <div style={{
              background: '#fffbeb',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #fcd34d',
              lineHeight: '1.6'
            }}>
              {output.explanation || generationResult.finalJson?.explanation}
            </div>
          </div>
        )}

        {/* 품질 점수 */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '16px', color: '#1e40af' }}>📊 품질 점수</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
            {/* Layer 1 */}
            <div style={{
              background: '#f0fdf4',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #86efac',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#166534', marginBottom: '8px' }}>Layer 1 (구조)</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#15803d' }}>
                {metrics.layer1_score ?? '-'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#166534' }}>
                {metrics.layer1_pass ? '✅ 통과' : '⚠️ 검토필요'}
              </div>
            </div>

            {/* Layer 2 */}
            <div style={{
              background: '#eff6ff',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #93c5fd',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#1e40af', marginBottom: '8px' }}>Layer 2 (내용)</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1d4ed8' }}>
                {metrics.layer2_score ?? '-'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#1e40af' }}>
                {(metrics.layer2_score ?? 0) >= 70 ? '✅ 양호' : '⚠️ 검토필요'}
              </div>
            </div>

            {/* Layer 3 */}
            <div style={{
              background: '#faf5ff',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #d8b4fe',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#6b21a8', marginBottom: '8px' }}>Layer 3 (수능적합성)</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed' }}>
                {metrics.layer3_score ?? '-'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b21a8' }}>
                {(metrics.layer3_score ?? 0) >= 70 ? '✅ 양호' : '⚠️ 검토필요'}
              </div>
            </div>
          </div>

          {/* 최종 점수 */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '1rem', opacity: 0.9, marginBottom: '4px' }}>최종 점수</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                {metrics.final_score?.toFixed(1) ?? '-'}점
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                ...getGradeBadgeStyle(metrics.grade),
                padding: '8px 24px',
                borderRadius: '20px',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                {metrics.grade || '-'}등급
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                {metrics.recommendation === 'APPROVE' ? '✅ 승인 권장' :
                 metrics.recommendation === 'REVIEW' ? '🔍 검토 권장' : '❌ 재생성 권장'}
              </div>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            className="btn btn-primary"
            onClick={handleSaveToLibrary}
            disabled={loading}
          >
            {loading ? '저장 중...' : '📚 라이브러리에 저장'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleCreateNew}
          >
            ➕ 새 문항 생성
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleRegenerate}
            disabled={loading}
          >
            {loading ? '재생성 중...' : '🔄 재생성'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/items')}
          >
            📋 요청 목록으로
          </button>
        </div>
      </div>
    );
  }

  // 2단계 워크플로우: 지문 검토 화면
  if (showPassageReview && generatedPassage) {
    const itemNo = parseInt(formData.item_no);
    const isLC = itemNo >= 1 && itemNo <= 17;

    return (
      <div>
        <h1 style={{ marginBottom: '24px' }}>
          📝 지문 검토 (Step 1/2)
        </h1>

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* 진행 상태 표시 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px',
          padding: '16px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '8px',
          color: 'white'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'white',
            color: '#667eea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>1</div>
          <div style={{ fontWeight: 'bold' }}>지문 생성 완료</div>
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.5)', margin: '0 16px' }}></div>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>2</div>
          <div style={{ opacity: 0.7 }}>문항 생성 대기</div>
        </div>

        {/* 입력 정보 요약 */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '12px' }}>📋 입력 정보</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <div>
              <div className="text-muted">문항 유형</div>
              <div style={{ fontWeight: 'bold' }}>
                {isLC ? 'LC' : 'RC'}{formData.item_no}
              </div>
            </div>
            <div>
              <div className="text-muted">난이도</div>
              <div style={{ fontWeight: 'bold' }}>{formData.level}</div>
            </div>
            {formData.topic && (
              <div>
                <div className="text-muted">주제</div>
                <div style={{ fontWeight: 'bold' }}>{formData.topic}</div>
              </div>
            )}
          </div>
        </div>

        {/* 생성된 지문 */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, color: '#1e40af' }}>
              📖 {isLC ? '듣기 스크립트' : '독해 지문'}
            </h3>
            {!isEditingPassage && (
              <button
                className="btn btn-secondary"
                onClick={() => setIsEditingPassage(true)}
                style={{ fontSize: '0.85rem', padding: '6px 12px' }}
              >
                ✏️ 수정하기
              </button>
            )}
          </div>

          {isEditingPassage ? (
            <div>
              <textarea
                value={editedPassage}
                onChange={(e) => setEditedPassage(e.target.value)}
                className="form-control"
                rows="12"
                style={{ fontFamily: 'inherit', lineHeight: '1.8' }}
              />
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#666' }}>
                {countWords(editedPassage)}단어 / {editedPassage.length}자
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSavePassage}
                  disabled={loading}
                >
                  {loading ? '저장 중...' : '💾 저장'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditedPassage(generatedPassage);
                    setIsEditingPassage(false);
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              background: '#f8fafc',
              padding: '20px',
              borderRadius: '8px',
              lineHeight: '1.8',
              fontSize: '1rem',
              whiteSpace: 'pre-wrap',
              border: '1px solid #e2e8f0'
            }}
              dangerouslySetInnerHTML={{ __html: generatedPassage }}
            />
          )}

          {!isEditingPassage && (
            <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#666' }}>
              {countWords(generatedPassage)}단어 / {generatedPassage.length}자
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        {!isEditingPassage && (
          <div className="flex gap-2">
            <button
              className="btn btn-primary"
              onClick={handleConfirmPassageAndGenerate}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              {loading ? '생성 중...' : '✅ 지문 확정 & 문항 생성 (Step 2)'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleRegeneratePassage}
              disabled={loading}
            >
              🔄 지문 재생성
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleCancelPassageReview}
              disabled={loading}
            >
              ❌ 취소
            </button>
          </div>
        )}

        {loading && (
          <div className="loading" style={{ marginTop: '20px' }}>
            <div className="spinner"></div>
            <span>처리 중...</span>
          </div>
        )}
      </div>
    );
  }

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
          onApplySuggestions={handleApplySuggestions}
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

          {/* 생성 모드 선택 */}
          <div style={{
            marginTop: '16px',
            marginBottom: '16px',
            padding: '16px',
            background: useTwoStepMode
              ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
              : '#f8fafc',
            borderRadius: '8px',
            border: useTwoStepMode ? '2px solid #667eea' : '1px solid #e2e8f0'
          }}>
            <div style={{ marginBottom: '12px', fontWeight: 'bold', color: '#333' }}>
              생성 모드 선택
            </div>
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={useTwoStepMode}
                onChange={(e) => setUseTwoStepMode(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }}
              />
              <div>
                <div style={{ fontWeight: 'bold', color: useTwoStepMode ? '#667eea' : '#333' }}>
                  📝 2단계 모드: 지문 먼저 생성 → 검토/수정 → 문항 생성
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                  AI가 지문을 먼저 생성하고, 사용자가 검토/수정한 후 문항을 생성합니다.
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: useTwoStepMode ? '#667eea' : '#888',
                  marginTop: '6px',
                  padding: '6px 10px',
                  backgroundColor: useTwoStepMode ? 'rgba(102, 126, 234, 0.1)' : '#f0f0f0',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  {formData.passage
                    ? '⚠️ 지문이 입력되어 있어 이 모드를 사용할 수 없습니다'
                    : '✅ 지문 없이 AI 자동 생성 시 이 모드 권장'}
                </div>
              </div>
            </label>
            {!useTwoStepMode && (
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0',
                fontSize: '0.85rem',
                color: '#666'
              }}>
                <strong>1단계 모드 (현재 선택됨)</strong>: 지문과 문항을 한 번에 생성합니다.
                {formData.passage ? ' 입력된 지문을 기반으로 문항만 생성됩니다.' : ' AI가 지문과 문항을 동시에 생성합니다.'}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
            {useTwoStepMode ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGeneratePassageOnly}
                  disabled={loading || !validationResult.valid || !!formData.passage}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none'
                  }}
                  title="AI가 지문만 먼저 생성합니다. 생성된 지문을 검토/수정한 후 문항을 생성할 수 있습니다."
                >
                  {loading ? '지문 생성 중...' : '📝 지문 생성 시작 (Step 1/2)'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePreview}
                  disabled={loading || previewLoading || !validationResult.valid}
                  title="LLM에 전송될 프롬프트를 미리 확인하고 검증합니다"
                >
                  {previewLoading ? '검증 중...' : '🔍 프롬프트 미리보기'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !validationResult.valid}
                  title={formData.passage
                    ? '입력된 지문을 기반으로 문항을 바로 생성합니다'
                    : 'AI가 지문과 문항을 한 번에 생성합니다 (1단계 모드)'}
                >
                  {loading ? '생성 중...' : formData.passage ? '🚀 문항 생성 실행' : '🚀 지문 + 문항 바로 생성'}
                </button>
              </>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSaveOnly}
              disabled={loading}
              title="문항을 생성하지 않고 요청만 저장합니다. 나중에 요청 목록에서 생성할 수 있습니다."
            >
              💾 요청만 저장 (생성 안 함)
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
        <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          <li style={{ marginBottom: '8px' }}>
            <strong>생성 모드 선택:</strong>
            <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
              <li><strong>1단계 모드</strong>: 지문과 문항을 한 번에 생성합니다. 빠른 생성이 필요하거나 지문을 직접 입력한 경우 사용합니다.</li>
              <li><strong>2단계 모드</strong>: 지문을 먼저 생성 → 검토/수정 → 문항 생성. 고품질 문항 제작에 권장됩니다.</li>
            </ul>
          </li>
          <li style={{ marginBottom: '8px' }}><strong>🔍 프롬프트 미리보기</strong>: LLM에 전송될 프롬프트를 미리 확인하고 1차 검증을 수행합니다.</li>
          <li style={{ marginBottom: '8px' }}><strong>RC29 (어법)</strong>: 지문에 5개의 밑줄 부분이 생성되며, 1개가 틀린 표현입니다.</li>
          <li style={{ marginBottom: '8px' }}><strong>RC31-33 (빈칸)</strong>: 지문의 핵심 내용이 빈칸으로 처리됩니다.</li>
          <li style={{ marginBottom: '8px' }}><strong>RC25 (도표)</strong>: 차트 데이터가 필요합니다. 먼저 차트를 등록해주세요.</li>
          <li style={{ marginBottom: '8px' }}>지문을 비워두면 AI가 해당 유형에 맞는 지문을 자동으로 생성합니다.</li>
          <li style={{ marginBottom: '8px' }}>생성된 문항은 자동으로 3겹 검증이 수행되며, 검증 실패 시 자동 재시도합니다.</li>
        </ul>
      </div>
    </div>
  );
}

export default ItemCreate;
