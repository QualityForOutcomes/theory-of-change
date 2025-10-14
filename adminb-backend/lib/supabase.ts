import 'dotenv/config'
import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js'

// ============================================================================
// Configuration
// ============================================================================

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const IS_PROD = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
const VERBOSE = ['1', 'true', 'yes'].includes(String(process.env.VERBOSE || '').toLowerCase())

// ============================================================================
// Logging
// ============================================================================

const log = (...args: any[]) => {
    if (VERBOSE) console.log('[database]', ...args)
}

const logError = (...args: any[]) => {
    console.error('[database:error]', ...args)
}

const logWarning = (...args: any[]) => {
    if (IS_PROD || VERBOSE) console.warn('[database:warning]', ...args)
}

// ============================================================================
// Validation
// ============================================================================

if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required')
}

if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required')
}

if (!supabaseAnonKey && VERBOSE) {
    logWarning('SUPABASE_ANON_KEY not set - only service role client will be available')
}

log('Supabase configuration loaded:', {
    url: supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    hasAnonKey: !!supabaseAnonKey,
    environment: IS_PROD ? 'production' : 'development'
})

// ============================================================================
// Supabase Clients
// ============================================================================

// Admin client with service role key (bypass RLS)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    },
    db: {
        schema: 'public'
    },
    global: {
        headers: {
            'X-Client-Info': 'admin-backend'
        }
    }
})

// Public client with anon key (respects RLS) - optional
export const supabasePublic: SupabaseClient | null = supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    })
    : null

// ============================================================================
// Database Tables
// ============================================================================

export const TABLES = {
    ADMIN_USERS: 'admin_users',
    USERS: 'users',
    SUBSCRIPTIONS: 'subscriptions',
    ANALYTICS_CACHE: 'analytics_cache',
    PROJECTS: 'projects',
    PAYMENTS: 'payments',
    AUDIT_LOGS: 'audit_logs',
    API_KEYS: 'api_keys'
} as const

export type TableName = typeof TABLES[keyof typeof TABLES]

// ============================================================================
// Response Types
// ============================================================================

export interface DatabaseResponse<T = any> {
    success: boolean
    message: string
    statusCode: number
    data?: T
    error?: string
    details?: any
}

export interface PaginatedResponse<T = any> extends DatabaseResponse<T> {
    pagination?: {
        page: number
        pageSize: number
        total: number
        totalPages: number
        hasMore: boolean
    }
}

export interface QueryOptions {
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    filters?: Record<string, any>
}

// ============================================================================
// Error Handling
// ============================================================================

export function handleSupabaseError(error: any, context?: string): DatabaseResponse {
    const contextPrefix = context ? `[${context}] ` : ''

    // PostgreSQL error
    if (error && typeof error === 'object' && 'code' in error) {
        const pgError = error as PostgrestError

        logError(`${contextPrefix}PostgreSQL error:`, {
            code: pgError.code,
            message: pgError.message,
            details: pgError.details,
            hint: pgError.hint
        })

        // Map common PostgreSQL error codes to appropriate HTTP status codes
        const statusCode = mapPostgresErrorToStatus(pgError.code)

        return {
            success: false,
            message: pgError.message || 'Database operation failed',
            statusCode,
            error: pgError.code,
            details: IS_PROD ? undefined : {
                details: pgError.details,
                hint: pgError.hint
            }
        }
    }

    // Generic error
    logError(`${contextPrefix}Database error:`, error)

    return {
        success: false,
        message: error?.message || 'Database operation failed',
        statusCode: 500,
        error: 'INTERNAL_ERROR'
    }
}

function mapPostgresErrorToStatus(code: string): number {
    // https://www.postgresql.org/docs/current/errcodes-appendix.html
    const errorMap: Record<string, number> = {
        '23505': 409, // unique_violation
        '23503': 409, // foreign_key_violation
        '23502': 400, // not_null_violation
        '23514': 400, // check_violation
        '42P01': 500, // undefined_table
        '42703': 400, // undefined_column
        '42501': 403, // insufficient_privilege
        '28P01': 401, // invalid_authorization
        'PGRST116': 404, // row not found
        'PGRST204': 404  // no content
    }

    return errorMap[code] || 500
}

// ============================================================================
// Success Response Helpers
// ============================================================================

export function createSuccessResponse<T = any>(
    data: T,
    message = 'Operation successful'
): DatabaseResponse<T> {
    return {
        success: true,
        message,
        statusCode: 200,
        data
    }
}

export function createPaginatedResponse<T = any>(
    data: T[],
    total: number,
    page: number,
    pageSize: number,
    message = 'Data retrieved successfully'
): PaginatedResponse<T[]> {
    const totalPages = Math.ceil(total / pageSize)

    return {
        success: true,
        message,
        statusCode: 200,
        data,
        pagination: {
            page,
            pageSize,
            total,
            totalPages,
            hasMore: page < totalPages
        }
    }
}

// ============================================================================
// Query Helpers
// ============================================================================

export async function executeQuery<T = any>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    context?: string
): Promise<DatabaseResponse<T>> {
    try {
        const { data, error } = await queryFn()

        if (error) {
            return handleSupabaseError(error, context)
        }

        if (data === null) {
            return {
                success: false,
                message: 'No data found',
                statusCode: 404,
                error: 'NOT_FOUND'
            }
        }

        return createSuccessResponse(data, `${context || 'Query'} completed successfully`)
    } catch (error) {
        return handleSupabaseError(error, context)
    }
}

export async function executePaginatedQuery<T = any>(
    tableName: TableName,
    options: QueryOptions = {}
): Promise<PaginatedResponse<T[]>> {
    const {
        page = 1,
        pageSize = 10,
        sortBy = 'created_at',
        sortOrder = 'desc',
        filters = {}
    } = options

    try {
        // Count total records
        let countQuery = supabase.from(tableName).select('*', { count: 'exact', head: true })

        // Apply filters to count query
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                countQuery = countQuery.eq(key, value)
            }
        })

        const { count, error: countError } = await countQuery

        if (countError) {
            return handleSupabaseError(countError, `count ${tableName}`) as PaginatedResponse
        }

        const total = count || 0

        // Fetch paginated data
        let dataQuery = supabase
            .from(tableName)
            .select('*')
            .order(sortBy, { ascending: sortOrder === 'asc' })
            .range((page - 1) * pageSize, page * pageSize - 1)

        // Apply filters to data query
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                dataQuery = dataQuery.eq(key, value)
            }
        })

        const { data, error: dataError } = await dataQuery

        if (dataError) {
            return handleSupabaseError(dataError, `fetch ${tableName}`) as PaginatedResponse
        }

        return createPaginatedResponse(data || [], total, page, pageSize)
    } catch (error) {
        return handleSupabaseError(error, `paginated query ${tableName}`) as PaginatedResponse
    }
}

// ============================================================================
// Health Check
// ============================================================================

export async function checkDatabaseHealth(): Promise<DatabaseResponse> {
    try {
        const { data, error } = await supabase.from(TABLES.ADMIN_USERS).select('count', { count: 'exact', head: true })

        if (error) {
            return {
                success: false,
                message: 'Database health check failed',
                statusCode: 503,
                error: error.message
            }
        }

        return {
            success: true,
            message: 'Database is healthy',
            statusCode: 200,
            data: {
                status: 'healthy',
                timestamp: new Date().toISOString()
            }
        }
    } catch (error) {
        return handleSupabaseError(error, 'health check')
    }
}

// ============================================================================
// Audit Logging Helper
// ============================================================================

export async function logAuditEvent(
    userId: string,
    action: string,
    resource: string,
    metadata?: Record<string, any>
): Promise<void> {
    try {
        await supabase.from(TABLES.AUDIT_LOGS).insert({
            user_id: userId,
            action,
            resource,
            metadata,
            timestamp: new Date().toISOString(),
            ip_address: metadata?.ip,
            user_agent: metadata?.userAgent
        })
    } catch (error) {
        logError('Failed to log audit event:', error)
        // Don't throw - audit logging failure shouldn't break the main operation
    }
}

// ============================================================================
// Transaction Helper
// ============================================================================

export async function executeTransaction<T = any>(
    operations: Array<() => Promise<any>>,
    context?: string
): Promise<DatabaseResponse<T>> {
    try {
        const results = await Promise.all(operations.map(op => op()))

        // Check if any operation failed
        const failures = results.filter(r => r.error)
        if (failures.length > 0) {
            return handleSupabaseError(failures[0].error, context)
        }

        return createSuccessResponse(
            results.map(r => r.data) as T,
            `${context || 'Transaction'} completed successfully`
        )
    } catch (error) {
        return handleSupabaseError(error, context)
    }
}

// ============================================================================
// Export Configuration (for debugging)
// ============================================================================

export const DATABASE_CONFIG = {
    url: supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    hasAnonKey: !!supabaseAnonKey,
    tables: Object.values(TABLES),
    environment: IS_PROD ? 'production' : 'development'
}