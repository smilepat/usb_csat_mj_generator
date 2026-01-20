/**
 * server/tests/unit/middleware.test.js
 * 미들웨어 단위 테스트
 */

const { ApiError, asyncHandler } = require('../../middleware/errorHandler');
const { validate, schemas, sanitizeInput } = require('../../middleware/validate');
const { getApiInfo, SUPPORTED_VERSIONS } = require('../../middleware/apiVersion');

describe('Middleware', () => {
  describe('ApiError', () => {
    it('should create bad request error', () => {
      const error = ApiError.badRequest('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid input');
      expect(error.isOperational).toBe(true);
    });

    it('should create not found error', () => {
      const error = ApiError.notFound('Resource not found');

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create internal error', () => {
      const error = ApiError.internal();

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });

    it('should include details when provided', () => {
      const details = { field: 'email', issue: 'invalid format' };
      const error = ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('asyncHandler', () => {
    it('should pass result to next on success', async () => {
      const mockReq = {};
      const mockRes = { json: jest.fn() };
      const mockNext = jest.fn();

      const handler = asyncHandler(async (req, res) => {
        res.json({ success: true });
      });

      await handler(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error on failure', async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();
      const testError = new Error('Test error');

      const handler = asyncHandler(async () => {
        throw testError;
      });

      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(testError);
    });
  });

  describe('sanitizeInput', () => {
    it('should escape HTML characters', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(input);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should escape special characters', () => {
      const input = '& < > " \'';
      const sanitized = sanitizeInput(input);

      expect(sanitized).toBe('&amp; &lt; &gt; &quot; &#x27;');
    });

    it('should return non-string values unchanged', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
    });
  });

  describe('validate middleware', () => {
    it('should pass validation for valid data', () => {
      const schema = {
        name: { required: true, type: 'string' }
      };

      const mockReq = { body: { name: 'Test' } };
      const mockRes = {};
      const mockNext = jest.fn();

      validate(schema, 'body')(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0]).toBeUndefined();
    });

    it('should fail validation for missing required field', () => {
      const schema = {
        name: { required: true, message: 'Name is required' }
      };

      const mockReq = { body: {} };
      const mockRes = {};
      const mockNext = jest.fn();

      validate(schema, 'body')(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(400);
    });
  });

  describe('API Version', () => {
    it('should return correct API info', () => {
      const info = getApiInfo();

      expect(info.currentVersion).toBe('v1');
      expect(info.supportedVersions).toContain('v1');
      expect(Array.isArray(info.deprecatedVersions)).toBe(true);
    });

    it('should have v1 in supported versions', () => {
      expect(SUPPORTED_VERSIONS).toContain('v1');
    });
  });
});
