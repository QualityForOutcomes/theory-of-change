import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../src/routes/ProtectedRoutes.jsx';

describe('ProtectedRoute', () => {
  const originalLocation = window.location;
  let replaceSpy;

  beforeEach(() => {
    localStorage.clear();
    replaceSpy = vi.spyOn(window.history, 'replaceState');
    // Safe stub for window.location.assign
    delete window.location;
    window.location = { assign: vi.fn() };
  });

  afterEach(() => {
    replaceSpy.mockRestore();
    window.location = originalLocation;
    localStorage.clear();
  });

  test('sets token from query and cleans URL', () => {
    render(
      <MemoryRouter initialEntries={["/admin?token=abc123"]}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute><div>Secure</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );

    expect(localStorage.getItem('qfo_token')).toBe('abc123');
    expect(replaceSpy).toHaveBeenCalled();
    expect(screen.getByText('Secure')).toBeInTheDocument();
  });

  test('redirects to my-app logout when missing token', () => {
    localStorage.removeItem('qfo_token');
    import.meta.env.VITE_MYAPP_LOGIN_URL = 'http://localhost:3000/login';

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute><div>Secure</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );

    expect(window.location.assign).toHaveBeenCalledWith('http://localhost:3000/logout');
  });

  test('does not redirect when token present', () => {
    localStorage.setItem('qfo_token', 'persist');

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute><div>Secure</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );

    expect(window.location.assign).not.toHaveBeenCalled();
    expect(screen.getByText('Secure')).toBeInTheDocument();
  });

  // Environment is statically loaded from .env via Vite; skip missing-env branch.
});