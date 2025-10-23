import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from '../../src/layouts/AdminLayout.jsx';

describe('AdminLayout', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Stub window.location.assign
    delete window.location;
    window.location = { assign: vi.fn() };
    import.meta.env.VITE_MYAPP_LOGIN_URL = 'http://localhost:3000/login';
    localStorage.setItem('qfo_token', 'abc');
  });

  afterEach(() => {
    window.location = originalLocation;
    localStorage.clear();
  });

  test('logout clears token and redirects to logout', async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />} />
        </Routes>
      </MemoryRouter>
    );

    const button = screen.getByText('Logout');
    button.click();

    expect(localStorage.getItem('qfo_token')).toBeNull();
    expect(window.location.assign).toHaveBeenCalledWith('http://localhost:3000/logout');
  });
});