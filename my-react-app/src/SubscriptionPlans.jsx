import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './lib/authContext';
import { stripeApi } from './lib/api';
import { SUBSCRIPTION_PLANS } from './lib/stripe';
import './stylesheet/SubscriptionPlans.css';

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingPlan, setProcessingPlan] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      // Use local plans data for now, can be replaced with API call
      setPlans(Object.values(SUBSCRIPTION_PLANS));
    } catch (err) {
      setError('Failed to load subscription plans');
      console.error('Error loading plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (plan.id === 'free') {
      // Handle free plan selection
      alert('You are already on the free plan!');
      return;
    }

    try {
      setProcessingPlan(plan.id);
      const response = await stripeApi.createCheckoutSession(plan.stripePriceId, user.id);
      
      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      setError(`Failed to start checkout: ${err.message}`);
      console.error('Checkout error:', err);
    } finally {
      setProcessingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="subscription-container">
        <div className="loading">Loading subscription plans...</div>
      </div>
    );
  }

  return (
    <div className="subscription-container">
      <div className="subscription-header">
        <h1>Choose Your Plan</h1>
        <p>Select the perfect plan for your needs</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="plans-grid">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`plan-card ${plan.id === 'pro' ? 'featured' : ''}`}
          >
            {plan.id === 'pro' && <div className="featured-badge">Most Popular</div>}
            
            <div className="plan-header">
              <h3 className="plan-name">{plan.name}</h3>
              <div className="plan-price">
                <span className="currency">$</span>
                <span className="amount">{plan.price}</span>
                <span className="interval">/{plan.interval}</span>
              </div>
            </div>

            <div className="plan-features">
              <ul>
                {plan.features.map((feature, index) => (
                  <li key={index}>
                    <span className="checkmark">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <button
              className={`plan-button ${plan.id === 'free' ? 'free-plan' : ''}`}
              onClick={() => handleSelectPlan(plan)}
              disabled={processingPlan === plan.id}
            >
              {processingPlan === plan.id ? (
                'Processing...'
              ) : plan.id === 'free' ? (
                'Current Plan'
              ) : (
                `Choose ${plan.name}`
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="subscription-footer">
        <p>All plans include 30-day money-back guarantee</p>
        <button 
          className="back-button"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}