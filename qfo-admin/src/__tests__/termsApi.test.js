import api from '../../src/services/api';
import AxiosMockAdapter from 'axios-mock-adapter';
import { fetchTerms, updateTerms, validateTermsContent } from '../../src/features/admin/api/termsApi';

describe('termsApi', () => {
  let mock;
  const fixedTime = new Date('2024-01-01T12:00:00Z');

  beforeEach(() => {
    mock = new AxiosMockAdapter(api);
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);
  });

  afterEach(() => {
    mock.restore();
    vi.useRealTimers();
  });

  test('fetchTerms returns mapped content and defaults when backend omits fields', async () => {
    const content = 'Valid terms content ' + 'x'.repeat(60);
    mock.onGet('/api/admin/terms').reply(200, { content });

    const res = await fetchTerms();
    expect(res.content).toBe(content);
    expect(res.version).toBe(1);
    expect(new Date(res.updatedAt).toString()).not.toBe('Invalid Date');
  });

  test('updateTerms returns input content and current time when backend returns success only', async () => {
    const input = 'Updated terms content ' + 'y'.repeat(60);
    mock.onPost('/api/admin/terms').reply(200, { success: true });

    const res = await updateTerms(input);
    expect(res.content).toBe(input);
    expect(res.version).toBe(1);
    expect(res.updatedAt).toBe(fixedTime.toISOString());
  });

  test('fetchTerms error throws friendly message', async () => {
    mock.onGet('/api/admin/terms').reply(500, {});
    await expect(fetchTerms()).rejects.toThrow('Failed to fetch terms and conditions');
  });

  test('updateTerms error throws friendly message', async () => {
    mock.onPost('/api/admin/terms').reply(500, {});
    await expect(updateTerms('abc'.repeat(20))).rejects.toThrow('Failed to update terms and conditions');
  });

  test('validateTermsContent enforces minimum length', () => {
    const { isValid, errors } = validateTermsContent('short text');
    expect(isValid).toBe(false);
    expect(errors.some(e => e.includes('at least 50'))).toBe(true);
  });
});