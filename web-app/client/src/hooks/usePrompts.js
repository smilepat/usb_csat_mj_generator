import { useState, useEffect, useCallback } from 'react';
import { promptsApi } from '../api';

/**
 * 프롬프트 CRUD 관련 훅
 */
export function usePrompts() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 정렬 순서 결정
  const getPromptSortOrder = useCallback((key) => {
    if (key === 'MASTER_PROMPT') return { group: 0, order: 0 };
    if (key === 'PASSAGE_MASTER') return { group: 1, order: 0 };

    const lcMatch = key.match(/^LC(\d+)/i);
    if (lcMatch) {
      return { group: 2, order: parseInt(lcMatch[1]), subOrder: 0 };
    }

    const rcMatch = key.match(/^RC(\d+)/i);
    if (rcMatch) {
      return { group: 3, order: parseInt(rcMatch[1]), subOrder: 0 };
    }

    const numMatch = key.match(/^(\d+)$/);
    if (numMatch) {
      return { group: 4, order: parseInt(numMatch[1]), subOrder: 0 };
    }

    const pMatch = key.match(/^P(\d+)/i);
    if (pMatch) {
      return { group: 5, order: parseInt(pMatch[1]), subOrder: 0 };
    }

    return { group: 6, order: 0, subOrder: key };
  }, []);

  const sortPrompts = useCallback((promptList) => {
    return [...promptList].sort((a, b) => {
      const orderA = getPromptSortOrder(a.prompt_key);
      const orderB = getPromptSortOrder(b.prompt_key);

      if (orderA.group !== orderB.group) return orderA.group - orderB.group;
      if (orderA.order !== orderB.order) return orderA.order - orderB.order;
      if (orderA.subOrder !== undefined && orderB.subOrder !== undefined) {
        return String(orderA.subOrder).localeCompare(String(orderB.subOrder));
      }
      return 0;
    });
  }, [getPromptSortOrder]);

  const loadPrompts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await promptsApi.getAll();
      if (response.success) {
        const sorted = sortPrompts(response.data || []);
        setPrompts(sorted);
      } else {
        setError(response.error?.message || '프롬프트 로드 실패');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sortPrompts]);

  const updatePrompt = useCallback(async (key, data) => {
    try {
      const response = await promptsApi.update(key, data);
      if (response.success) {
        await loadPrompts();
        return { success: true };
      }
      return { success: false, error: response.error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [loadPrompts]);

  const deletePrompt = useCallback(async (key) => {
    try {
      const response = await promptsApi.delete(key);
      if (response.success) {
        await loadPrompts();
        return { success: true };
      }
      return { success: false, error: response.error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [loadPrompts]);

  const createPrompt = useCallback(async (data) => {
    try {
      const response = await promptsApi.create(data);
      if (response.success) {
        await loadPrompts();
        return { success: true };
      }
      return { success: false, error: response.error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [loadPrompts]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  return {
    prompts,
    loading,
    error,
    loadPrompts,
    updatePrompt,
    deletePrompt,
    createPrompt
  };
}

/**
 * 프롬프트 평가 관련 훅
 */
export function usePromptEvaluation() {
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState(null);

  const evaluate = useCallback(async (promptKey, promptText) => {
    try {
      setEvaluating(true);
      setResult(null);
      const response = await promptsApi.evaluate(promptKey, promptText);
      if (response.success) {
        setResult(response.data);
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setEvaluating(false);
    }
  }, []);

  const quickValidate = useCallback(async (promptKey, promptText) => {
    try {
      setEvaluating(true);
      const response = await promptsApi.quickValidate(promptKey, promptText);
      if (response.success) {
        setResult(response.data);
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setEvaluating(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return {
    evaluating,
    result,
    evaluate,
    quickValidate,
    clearResult
  };
}

/**
 * 프롬프트 버전 관리 훅
 */
export function usePromptVersions() {
  const [versions, setVersions] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadVersions = useCallback(async (promptKey) => {
    try {
      setLoading(true);
      const response = await promptsApi.getVersions(promptKey);
      if (response.success) {
        setVersions(response.data);
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreVersion = useCallback(async (promptKey, version) => {
    try {
      const response = await promptsApi.restoreVersion(promptKey, version);
      if (response.success) {
        return { success: true };
      }
      return { success: false, error: response.error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const clearVersions = useCallback(() => {
    setVersions(null);
  }, []);

  return {
    versions,
    loading,
    loadVersions,
    restoreVersion,
    clearVersions
  };
}

/**
 * 프롬프트 개선 관련 훅
 */
export function usePromptImprovement() {
  const [improving, setImproving] = useState(false);
  const [result, setResult] = useState(null);

  const improve = useCallback(async (promptKey, currentText, feedback) => {
    try {
      setImproving(true);
      setResult(null);
      const response = await promptsApi.improve(promptKey, currentText, feedback);
      if (response.success) {
        setResult(response.data);
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setImproving(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return {
    improving,
    result,
    improve,
    clearResult
  };
}

export default usePrompts;
