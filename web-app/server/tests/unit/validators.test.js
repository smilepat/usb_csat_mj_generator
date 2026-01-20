/**
 * server/tests/unit/validators.test.js
 * 검증 로직 단위 테스트
 */

const { validateCommon } = require('../../services/validators/common');
const {
  ITEM_NUMBER_RANGES,
  ANSWER_RANGE,
  OPTIONS_COUNT,
  VALIDATION_STATUS
} = require('../../services/validators/constants');

describe('Validators', () => {
  describe('validateCommon', () => {
    it('should pass for valid item object', () => {
      const validItem = {
        question: 'What is the main idea of the passage?',
        options: ['Option A', 'Option B', 'Option C', 'Option D', 'Option E'],
        answer: 1,
        passage: 'This is a test passage.',
        explanation: 'The answer is A because...'
      };

      const result = validateCommon(validItem);

      expect(result.pass).toBe(true);
      expect(result.log).toBe('OK');
    });

    it('should fail when question is missing', () => {
      const invalidItem = {
        options: ['A', 'B', 'C', 'D', 'E'],
        answer: 1
      };

      const result = validateCommon(invalidItem);

      expect(result.pass).toBe(false);
      expect(result.log).toContain('question이 비어 있음');
    });

    it('should fail when options array is missing', () => {
      const invalidItem = {
        question: 'Test question?',
        answer: 1
      };

      const result = validateCommon(invalidItem);

      expect(result.pass).toBe(false);
      expect(result.log).toContain('options 배열이 없음');
    });

    it('should fail when options count is not 5', () => {
      const invalidItem = {
        question: 'Test question?',
        options: ['A', 'B', 'C'],
        answer: 1
      };

      const result = validateCommon(invalidItem);

      expect(result.pass).toBe(false);
      expect(result.log).toContain('options 배열 길이가 5가 아님');
    });

    it('should fail when answer is missing', () => {
      const invalidItem = {
        question: 'Test question?',
        options: ['A', 'B', 'C', 'D', 'E']
      };

      const result = validateCommon(invalidItem);

      expect(result.pass).toBe(false);
      expect(result.log).toContain('answer가 없음');
    });

    it('should fail when answer is out of range', () => {
      const invalidItem = {
        question: 'Test question?',
        options: ['A', 'B', 'C', 'D', 'E'],
        answer: 6
      };

      const result = validateCommon(invalidItem);

      expect(result.pass).toBe(false);
      expect(result.log).toContain('answer가 1~5 범위를 벗어남');
    });

    it('should include prompt suggestion when validation fails', () => {
      const invalidItem = {
        options: ['A', 'B', 'C', 'D', 'E'],
        answer: 1
      };

      const result = validateCommon(invalidItem);

      expect(result.promptSuggestion).not.toBeNull();
      expect(result.promptSuggestion).toContain('프롬프트 수정 필요');
    });
  });

  describe('Constants', () => {
    it('should have correct item number ranges', () => {
      expect(ITEM_NUMBER_RANGES.LISTENING.min).toBe(1);
      expect(ITEM_NUMBER_RANGES.LISTENING.max).toBe(17);
      expect(ITEM_NUMBER_RANGES.READING.min).toBe(18);
      expect(ITEM_NUMBER_RANGES.READING.max).toBe(45);
    });

    it('should have correct answer range', () => {
      expect(ANSWER_RANGE.MIN).toBe(1);
      expect(ANSWER_RANGE.MAX).toBe(5);
    });

    it('should have correct options count', () => {
      expect(OPTIONS_COUNT).toBe(5);
    });

    it('should have all validation statuses', () => {
      expect(VALIDATION_STATUS.PASS).toBe('PASS');
      expect(VALIDATION_STATUS.FAIL).toBe('FAIL');
      expect(VALIDATION_STATUS.WARNING).toBe('WARNING');
    });
  });
});
