import 'dotenv/config'
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service role key for admin operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database table names
export const TABLES = {
  ADMIN_USERS: 'admin_users',
  USERS: 'users',
  SUBSCRIPTIONS: 'subscriptions',
  ANALYTICS_CACHE: 'analytics_cache',
  PROJECTS: 'projects',
  PAYMENTS: 'payments'
} as const;

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any) {
  console.error('Supabase error:', error);
  return {
    success: false,
    message: error.message || 'Database operation failed',
    statusCode: 500
  };
}

// Helper function for successful responses
export function createSuccessResponse(data: any, message = 'Operation successful') {
  return {
    success: true,
    message,
    statusCode: 200,
    data
  };
}