import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../style/Support.css";

interface SupportPanelProps {
  onClose: () => void;
  supportEmail?: string;
  defaultSubject?: string;
}

const SupportPanel: React.FC<SupportPanelProps> = ({
  onClose,
  supportEmail = "info@qualityoutcomes.au",
  defaultSubject = "Support Request",
}) => {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'premium'>('free');
  const navigate = useNavigate();

  // Access control: Only paid users (pro/premium) can access support
  useEffect(() => {
    const plan = localStorage.getItem('userPlan') || 'free';
    setUserPlan(plan as 'free' | 'pro' | 'premium');
    
    // Redirect free users to subscription page
    if (plan === 'free') {
      console.log(' Free user tried to access support panel - closing');
      onClose();
      navigate('/subscription');
    }
  }, [onClose, navigate]);

  // Prevent rendering for free users
  if (userPlan === 'free') {
    return null;
  }

  // Opens default email client with pre-filled message
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message) return;

    // Create mailto link with subject and body
    const mailtoLink = `mailto:${supportEmail}?subject=${encodeURIComponent(
      defaultSubject
    )}&body=${encodeURIComponent(message)}`;

    // Open user's default email client
    window.location.href = mailtoLink;

    // Show success message and auto-close after 2 seconds
    setSubmitted(true);
    setTimeout(() => onClose(), 2000);
  };

  return (
    <>
    {/* Overlay to close panel when clicking outside */}
      <div className="support-overlay" onClick={onClose}></div>
      <div className="support-panel">
        <div className="support-header">
          <h2>Contact Support</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Show success message after submission */}
        {submitted ? (
          <div className="success-message">
            <p>✓ Your message is ready! Please send it from your email.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="support-form">
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                placeholder="Describe your issue in detail..."
                rows={6}
              />
            </div>

            <button type="submit" className="submit-btn">
              Send Message
            </button>
          </form>
        )}
      </div>
    </>
  );
};

export default SupportPanel;