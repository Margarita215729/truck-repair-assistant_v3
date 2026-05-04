import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ─── Mocks ────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/adminAccess', () => ({
  isAdminRole: (role) => role === 'admin' || role === 'marketing_analyst',
}));

const { useAuth } = await import('@/lib/AuthContext');
const AdminRoute = (await import('@/lib/AdminRoute')).default;

// ─── Tests ────────────────────────────────────────────────────────────

describe('AdminRoute', () => {
  it('shows spinner while auth is loading', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, isLoadingAuth: true, user: null });
    const { container } = render(<AdminRoute><div>child</div></AdminRoute>);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
    expect(screen.queryByText('child')).toBeNull();
  });

  it('redirects to /Login when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, isLoadingAuth: false, user: null });
    render(<AdminRoute><div>child</div></AdminRoute>);
    const nav = screen.getByTestId('navigate');
    expect(nav.getAttribute('data-to')).toBe('/Login');
  });

  it('redirects to /Diagnostics when authenticated but not admin', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoadingAuth: false,
      user: { role: 'user' },
    });
    render(<AdminRoute><div>child</div></AdminRoute>);
    const nav = screen.getByTestId('navigate');
    expect(nav.getAttribute('data-to')).toBe('/Diagnostics');
  });

  it('renders children for admin role', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoadingAuth: false,
      user: { role: 'admin' },
    });
    render(<AdminRoute><div>admin content</div></AdminRoute>);
    expect(screen.getByText('admin content')).toBeTruthy();
  });

  it('renders children for marketing_analyst role', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoadingAuth: false,
      user: { role: 'marketing_analyst' },
    });
    render(<AdminRoute><div>analyst content</div></AdminRoute>);
    expect(screen.getByText('analyst content')).toBeTruthy();
  });
});
