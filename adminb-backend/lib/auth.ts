import 'dotenv/config'
import { sign as jwtSign, verify as jwtVerify, type SignOptions, type Secret } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { VercelRequest } from '@vercel/node';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const USER_SERVICE_BASE_URL = process.env.USER_SERVICE_BASE_URL || '';
const USER_SERVICE_VERIFY_PATH = process.env.USER_SERVICE_VERIFY_PATH || '/auth/me';
const DISABLE_AUTH = ['1', 'true', 'yes'].includes(String(process.env.DISABLE_AUTH || '').toLowerCase());
const IS_PROD = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const IS_DEFAULT_SECRET = !process.env.JWT_SECRET; // true if using insecure fallback
// Only allow auth bypass in non-production environments
const AUTH_BYPASS = DISABLE_AUTH && !IS_PROD;
const FALLBACK_VERIFY_PATHS = [
  '/api/auth/Verify', // PascalCase example from README
  '/api/auth/verify', // common lowercase route
  '/auth/me'          // generic profile endpoint
];

export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'viewer';
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Generate JWT token
export function generateToken(user: AdminUser): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwtSign(payload, JWT_SECRET as Secret, options);
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwtVerify(token, JWT_SECRET as Secret) as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Compare password
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Extract token from request headers
export function extractTokenFromRequest(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

// Middleware to verify admin authentication
export function verifyAdminAuth(req: VercelRequest): { success: boolean; user?: JWTPayload; error?: string } {
  const token = extractTokenFromRequest(req);
  if (!token) {
    if (AUTH_BYPASS) {
      return {
        success: true,
        user: { userId: 'dev-admin', email: 'dev@example.com', role: 'super_admin' }
      };
    }
    return { success: false, error: 'No authentication token provided' };
  }

  // Option B: external verification via user service
  if (USER_SERVICE_BASE_URL) {
    return { success: false, error: 'verifyAdminAuth_external_should_be_async' };
  }

  // Fallback to local JWT verification (dev only)
  const user = verifyToken(token);
  if (!user) {
    if (AUTH_BYPASS) {
      return {
        success: true,
        user: { userId: 'dev-admin', email: 'dev@example.com', role: 'super_admin' }
      };
    }
    return { success: false, error: 'Invalid or expired token' };
  }
  return { success: true, user };
}

// Async external verification variant
export async function verifyAdminAuthExternal(req: VercelRequest): Promise<{ success: boolean; user?: any; error?: string }>{
  const token = extractTokenFromRequest(req);
  if (!token) {
    if (AUTH_BYPASS) {
      return { success: true, user: { id: 'dev-admin', email: 'dev@example.com', role: 'super_admin' } };
    }
    return { success: false, error: 'No authentication token provided' };
  }

  if (AUTH_BYPASS) {
    return { success: true, user: { id: 'dev-admin', email: 'dev@example.com', role: 'super_admin' } };
  }

  if (!USER_SERVICE_BASE_URL) {
    // In production, fail closed if external verification not configured
    if (IS_PROD) {
      return { success: false, error: 'USER_SERVICE_BASE_URL not configured' };
    }
    // In non-production, try local JWT verification as a fallback
    const local = verifyAdminAuth(req);
    return local.success ? { success: true, user: local.user } : { success: false, error: local.error };
  }

  const candidates = [USER_SERVICE_VERIFY_PATH, ...FALLBACK_VERIFY_PATHS]
    .filter((p, idx, arr) => arr.indexOf(p) === idx); // unique

  for (const path of candidates) {
    const url = `${USER_SERVICE_BASE_URL}${path}`;
    try {
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      const user = response.data?.data?.user || response.data?.user || response.data;
      if (!user) {
        // Try next path if shape is unexpected
        continue;
      }
      return { success: true, user };
    } catch (err: any) {
      // If unauthorized, try next path; otherwise return error immediately
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err.message || 'Token verification failed';
      if (status === 404 || status === 401) {
        continue;
      }
      return { success: false, error: `${message} (${url})` };
    }
  }

  return { success: false, error: 'Token verification failed for all candidate paths' };
}

// Auto verification: use external service if configured, otherwise local JWT verification.
export async function verifyAdminAuto(req: VercelRequest): Promise<{ success: boolean; user?: any; error?: string }>{
  if (USER_SERVICE_BASE_URL) {
    return await verifyAdminAuthExternal(req);
  }
  // Local verification mode
  if (IS_PROD && IS_DEFAULT_SECRET) {
    return { success: false, error: 'JWT_SECRET must be configured in production for local verification' };
  }
  const local = verifyAdminAuth(req);
  return local.success ? { success: true, user: local.user } : { success: false, error: local.error };
}

// Check if user has required role
export function hasRequiredRole(userRole: string, requiredRole: 'super_admin' | 'admin' | 'viewer'): boolean {
  const roleHierarchy = {
    'super_admin': 3,
    'admin': 2,
    'viewer': 1
  };
  
  return roleHierarchy[userRole as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole];
}