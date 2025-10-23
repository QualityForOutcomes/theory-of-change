import api from '../../src/services/api';
import AxiosMockAdapter from 'axios-mock-adapter';

describe('api axios instance', () => {
  const originalLocation = window.location;
  let mock;

  beforeEach(() => {
    mock = new AxiosMockAdapter(api);
    delete window.location;
    window.location = { assign: vi.fn() };
    import.meta.env.VITE_API_URL = 'http://localhost';
    import.meta.env.VITE_MYAPP_LOGIN_URL = 'http://localhost:3000/login';
    localStorage.clear();
  });

  afterEach(() => {
    mock.restore();
    window.location = originalLocation;
    localStorage.clear();
  });

  test('attaches bearer token automatically', async () => {
    localStorage.setItem('qfo_token', 'abc123');
    mock.onGet('/api/dashboard').reply(200, { ok: true });

    await api.get('/api/dashboard');

    const history = mock.history.get[0];
    expect(history.headers.Authorization).toBe('Bearer abc123');
  });

  test('handles 401 by clearing token and redirecting to logout', async () => {
    localStorage.setItem('qfo_token', 'def456');
    mock.onGet('/api/secret').reply(401, {});

    await expect(api.get('/api/secret')).rejects.toBeTruthy();
    expect(localStorage.getItem('qfo_token')).toBeNull();
    expect(window.location.assign).toHaveBeenCalledWith('http://localhost:3000/logout');
  });

  // Skipping missing-env branch test: env is statically loaded by Vite in tests.
});