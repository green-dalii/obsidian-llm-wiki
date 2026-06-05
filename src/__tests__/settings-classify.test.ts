import { describe, it, expect } from 'vitest';
import { classifyFetchError } from '../ui/settings-helpers';

describe('classifyFetchError', () => {
  describe('Empty', () => {
    it('classifies "empty model list" as Empty', () => {
      expect(classifyFetchError('empty model list')).toBe('Empty');
    });
  });

  describe('Auth', () => {
    it('matches HTTP 401 / 403 prefix', () => {
      expect(classifyFetchError('HTTP 401')).toBe('Auth');
      expect(classifyFetchError('HTTP 403')).toBe('Auth');
    });

    it('matches bare 401/403 without HTTP prefix (Electron/fetch format)', () => {
      expect(classifyFetchError('Request failed with status code 401')).toBe('Auth');
      expect(classifyFetchError('403 Forbidden')).toBe('Auth');
      expect(classifyFetchError('status 401')).toBe('Auth');
    });

    it('matches authentication keywords', () => {
      expect(classifyFetchError('Unauthorized')).toBe('Auth');
      expect(classifyFetchError('Forbidden')).toBe('Auth');
      expect(classifyFetchError('invalid_key')).toBe('Auth');
      expect(classifyFetchError('invalid api key')).toBe('Auth');
      expect(classifyFetchError('Authentication failed')).toBe('Auth');
      expect(classifyFetchError('auth fail')).toBe('Auth');
      expect(classifyFetchError('Invalid token')).toBe('Auth');
    });
  });

  describe('Endpoint', () => {
    it('matches 404/405/410/421 with HTTP prefix', () => {
      expect(classifyFetchError('HTTP 404')).toBe('Endpoint');
      expect(classifyFetchError('HTTP 405')).toBe('Endpoint');
      expect(classifyFetchError('HTTP 410')).toBe('Endpoint');
      expect(classifyFetchError('HTTP 421')).toBe('Endpoint');
    });

    it('matches bare 404 without HTTP prefix', () => {
      expect(classifyFetchError('Request failed with status code 404')).toBe('Endpoint');
      expect(classifyFetchError('404 not found')).toBe('Endpoint');
    });

    it('matches "not found" / "method not allowed" keywords', () => {
      expect(classifyFetchError('Not Found')).toBe('Endpoint');
      expect(classifyFetchError('method not allowed')).toBe('Endpoint');
    });
  });

  describe('Server', () => {
    it('matches 5xx with HTTP prefix', () => {
      expect(classifyFetchError('HTTP 500')).toBe('Server');
      expect(classifyFetchError('HTTP 502')).toBe('Server');
      expect(classifyFetchError('HTTP 503')).toBe('Server');
      expect(classifyFetchError('HTTP 599')).toBe('Server');
    });

    it('matches bare 5xx and server error keywords', () => {
      expect(classifyFetchError('Request failed with status code 500')).toBe('Server');
      expect(classifyFetchError('Internal server error')).toBe('Server');
      expect(classifyFetchError('bad gateway')).toBe('Server');
      expect(classifyFetchError('service unavailable')).toBe('Server');
      expect(classifyFetchError('rate limit exceeded')).toBe('Server');
    });
  });

  describe('Network (default)', () => {
    it('falls back to Network for unknown errors', () => {
      expect(classifyFetchError('Failed to fetch')).toBe('Network');
      expect(classifyFetchError('NetworkError when attempting to fetch resource')).toBe('Network');
      expect(classifyFetchError('Some random error')).toBe('Network');
    });

    it('falls back to Network for connection errors', () => {
      expect(classifyFetchError('ECONNREFUSED')).toBe('Network');
      expect(classifyFetchError('ENOTFOUND')).toBe('Network');
      expect(classifyFetchError('ETIMEDOUT')).toBe('Network');
    });
  });
});
