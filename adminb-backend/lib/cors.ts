import { VercelRequest, VercelResponse } from '@vercel/node';

// CORS configuration
const CORS_OPTIONS = {
  origin: [
    'http://localhost:5173', // Vite dev server
    'http://localhost:5174', // Vite dev server (alternate port)
    'http://localhost:3000', // React dev server
    'https://qfo-admin.vercel.app', // Production admin frontend
    'https://qfo-admin-*.vercel.app', // Preview deployments
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply CORS headers to response
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', CORS_OPTIONS.methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', CORS_OPTIONS.allowedHeaders.join(', '));
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', CORS_OPTIONS.maxAge.toString());
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // Indicates preflight was handled
  }
  
  return false; // Continue with normal request processing
}

// Check if origin is allowed
function isOriginAllowed(origin: string): boolean {
  return CORS_OPTIONS.origin.some(allowedOrigin => {
    if (allowedOrigin.includes('*')) {
      // Handle wildcard patterns
      const pattern = allowedOrigin.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return allowedOrigin === origin;
  });
}

// Wrapper function for API handlers with CORS
export function withCors(handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Apply CORS headers
    const preflightHandled = applyCors(req, res);
    
    // If preflight was handled, don't continue
    if (preflightHandled) {
      return;
    }
    
    try {
      await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };
}