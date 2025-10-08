// Role-based routing utilities

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole; // Role is now required and comes from backend
}

// Environment variables for different deployment URLs
export const getAdminAppUrl = (): string => {
  const envUrl = (process.env.REACT_APP_ADMIN_URL || '').trim();
  const base = envUrl || (process.env.NODE_ENV === 'production'
    ? 'https://toc-admin-frontend.vercel.app'
    : 'http://localhost:5174');
  // Admin app no longer has a login page; go to root/admin
  return base;
};

export const getUserDashboardUrl = (): string => {
  return process.env.REACT_APP_USER_DASHBOARD_URL || '/dashboard';
};

/**
 * Determines the user role - now simply returns the role from backend
 * The backend is responsible for determining admin vs user roles based on pre-registered admin users
 */
export const determineUserRole = (user: any): UserRole => {
  // Prefer explicit role, fall back to userRole
  const role = user?.role ?? user?.userRole ?? 'user';
  return role as UserRole;
};

// Handle role-based redirect after login
export const handleRoleBasedRedirect = (user: any, navigate?: (path: string) => void): void => {
  const role = determineUserRole(user);
  
  if (role === 'admin') {
    // Redirect to admin application
    const adminUrl = getAdminAppUrl();
    console.log('Admin redirect URL:', adminUrl);
    console.log('Environment REACT_APP_ADMIN_URL:', process.env.REACT_APP_ADMIN_URL);
    
    // Build token handoff URL for admin app to bootstrap session
    const token = localStorage.getItem('token') || '';
    const userStr = encodeURIComponent(JSON.stringify(user));
    try {
      const url = new URL(adminUrl);
      url.searchParams.set('token', token);
      url.searchParams.set('user', userStr);
      window.location.href = url.toString();
    } catch {
      // Fallback if adminUrl is not a full URL
      const sep = adminUrl.includes('?') ? '&' : '?';
      window.location.href = `${adminUrl}${sep}token=${encodeURIComponent(token)}&user=${userStr}`;
    }
  } else {
    // Redirect to user dashboard (within same app)
    const dashboardUrl = getUserDashboardUrl();
    
    // Use React Router navigation if available, otherwise fallback to window.location
    if (navigate) {
      navigate(dashboardUrl);
    } else {
      window.location.href = dashboardUrl;
    }
  }
};

// Check if current user is admin
export const isAdmin = (user: any): boolean => {
  return determineUserRole(user) === 'admin';
};

// Get redirect URL based on role (for use in navigation)
export const getRedirectUrlForRole = (user: any): string => {
  const role = determineUserRole(user);
  return role === 'admin' ? getAdminAppUrl() : getUserDashboardUrl();
};