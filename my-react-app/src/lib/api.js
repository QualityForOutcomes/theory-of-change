const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  
  // Stringify the body if it's an object
  const body = options.body && typeof options.body === 'object' 
    ? JSON.stringify(options.body) 
    : options.body;
  
  const res = await fetch(`${BASE}${path}`, { ...options, headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

// Stripe API functions
export const stripeApi = {
  async getPlans() {
    return api('/stripe/plans');
  },

  async createCheckoutSession(priceId, userId) {
    return api('/stripe/create-checkout-session', {
      method: 'POST',
      body: { priceId, userId }
    });
  },

  async getSubscriptionStatus(customerId) {
    return api(`/stripe/subscription-status/${customerId}`);
  }
};
