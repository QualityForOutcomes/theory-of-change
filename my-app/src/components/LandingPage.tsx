import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { handleRoleBasedRedirect } from '../utils/roleRouting';
import AuthCard from './AuthCard';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    // If user is already authenticated, redirect them based on their role
    if (isAuthenticated && user) {
      handleRoleBasedRedirect(user, navigate);
    }
  }, [isAuthenticated, user, navigate]);

  // Show login/registration form for unauthenticated users
  return <AuthCard />;
}