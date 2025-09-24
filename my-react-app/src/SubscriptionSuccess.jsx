import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './stylesheet/SubscriptionSuccess.css';

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    const sessionIdParam = searchParams.get('session_id');
    if (sessionIdParam) {
      setSessionId(sessionIdParam);
    }
  }, [searchParams]);

  const handleContinue = () => {
    navigate('/dashboard');
  };

  return (
    <div className="success-container">
      <div className="success-card">
        <div className="success-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#27ae60"/>
            <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <h1>Subscription Successful!</h1>
        <p>Thank you for subscribing! Your payment has been processed successfully.</p>
        
        {sessionId && (
          <div className="session-info">
            <p><strong>Session ID:</strong> {sessionId}</p>
          </div>
        )}
        
        <div className="success-details">
          <h3>What's Next?</h3>
          <ul>
            <li>You now have access to all premium features</li>
            <li>Your subscription will auto-renew monthly</li>
            <li>You can manage your subscription in your account settings</li>
            <li>Check your email for a receipt and welcome information</li>
          </ul>
        </div>
        
        <div className="success-actions">
          <button className="continue-button" onClick={handleContinue}>
            Continue to Dashboard
          </button>
          <button 
            className="plans-button" 
            onClick={() => navigate('/subscription/plans')}
          >
            View Plans
          </button>
        </div>
      </div>
    </div>
  );
}