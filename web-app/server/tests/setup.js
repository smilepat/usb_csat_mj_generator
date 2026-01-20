/**
 * server/tests/setup.js
 * 테스트 환경 설정
 */

// 테스트 환경 설정
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'ERROR';

// 테스트용 헬퍼 함수
const testHelpers = {
  /**
   * 테스트용 프롬프트 데이터
   */
  createMockPrompt: (overrides = {}) => ({
    prompt_key: 'TEST_PROMPT',
    title: '테스트 프롬프트',
    prompt_text: '테스트 프롬프트 내용입니다.',
    active: 1,
    ...overrides
  }),

  /**
   * 테스트용 문항 요청 데이터
   */
  createMockItemRequest: (overrides = {}) => ({
    request_id: 'test-uuid-1234',
    status: 'PENDING',
    item_no: 18,
    passage: 'Test passage content.',
    level: '중',
    extra: '',
    ...overrides
  }),

  /**
   * 테스트용 문항 결과 데이터
   */
  createMockItemOutput: (overrides = {}) => ({
    request_id: 'test-uuid-1234',
    passage: 'Test passage content.',
    question: 'What is the main idea?',
    option_1: 'Option A',
    option_2: 'Option B',
    option_3: 'Option C',
    option_4: 'Option D',
    option_5: 'Option E',
    answer: 1,
    explanation: 'The answer is A because...',
    ...overrides
  }),

  /**
   * 응답 검증 헬퍼
   */
  expectSuccessResponse: (response) => {
    expect(response.success).toBe(true);
    expect(response.error).toBeUndefined();
  },

  expectErrorResponse: (response, expectedCode) => {
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    if (expectedCode) {
      expect(response.error.code).toBe(expectedCode);
    }
  }
};

module.exports = testHelpers;
