/**
 * Request Validators
 * 
 * Validates request data for API endpoints before processing.
 * Returns array of error messages (empty if valid).
 * 
 * Purpose:
 * - Prevent invalid data from reaching business logic
 * - Provide clear error messages to clients
 * - Centralize validation rules
 * - Type checking and format validation
 * 
 * Usage with HandlerFactory:
 * ```typescript
 * createHandler(handler, {
 *   validator: Validators.userRegistration
 * });
 * ```
 */

import ValidationUtils from './ValidationUtils';

// ============================================================================
// Validator Class
// ============================================================================

/**
 * Static validation methods for different request types
 * All validators return string[] of error messages
 */
export class Validators {

    // ========================================================================
    // Project Validators
    // ========================================================================

    /**
     * Validates project creation request
     * 
     * Required fields:
     * - projectTitle: Project name
     * 
     * Note: userId comes from JWT token (req.user), not request body
     * 
     * @param data - Request body data
     * @returns Array of error messages (empty if valid)
     */
    static createProject(data: any): string[] {
        const errors: string[] = [];

        // Project title is required
        if (!data.projectTitle) {
            errors.push('projectTitle is required');
        }

        // userId validation commented out - comes from JWT now
        // if (!data.userId) errors.push('userId is required');

        return errors;
    }

    /**
     * Validates project update request
     * 
     * Required fields:
     * - projectId: Project identifier (string)
     * - projectTitle: Updated project name (string)
     * 
     * @param data - Request body data
     * @returns Array of error messages (empty if valid)
     */
    static updateProject(data: any): string[] {
        const errors: string[] = [];

        // Validate project ID
        if (!data.projectId || typeof data.projectId !== 'string') {
            errors.push('projectId is required and must be a string');
        }

        // Validate project title
        if (!data.projectTitle || typeof data.projectTitle !== 'string') {
            errors.push('projectTitle is required and must be a string');
        }

        return errors;
    }

    /**
     * Validates project deletion request
     * 
     * Required fields:
     * - projectId: Project identifier (string)
     * 
     * @param data - Request body data
     * @returns Array of error messages (empty if valid)
     */
    static deleteProject(data: any): string[] {
        const errors: string[] = [];

        // Validate project ID
        if (!data.projectId || typeof data.projectId !== 'string') {
            errors.push('projectId is required and must be a string');
        }

        return errors;
    }

    // ========================================================================
    // User Authentication Validators
    // ========================================================================

    /**
     * Validates user registration request
     * 
     * Required fields:
     * - email: Valid email address
     * - password: Strong password (validated by ValidationUtils)
     * 
     * Password requirements enforced:
     * - Minimum length (typically 8 characters)
     * - Complexity rules (letters, numbers, special chars)
     * 
     * @param data - Request body data
     * @returns Array of error messages (empty if valid)
     */
    static userRegistration(data: any): string[] {
        const errors: string[] = [];

        // Validate email format
        if (!data.email || !ValidationUtils.isValidEmail(data.email)) {
            errors.push('Valid email is required');
        }

        // Validate password presence and strength
        if (!data.password) {
            errors.push('Password is required');
        } else {
            const passwordValidation = ValidationUtils.validatePassword(data.password);
            if (!passwordValidation.isValid) {
                errors.push(passwordValidation.message);
            }
        }

        return errors;
    }

    /**
     * Validates user login request
     * 
     * Required fields:
     * - email: Valid email address
     * - password: Password (no strength check on login)
     * 
     * @param data - Request body data
     * @returns Array of error messages (empty if valid)
     */
    static userLogin(data: any): string[] {
        const errors: string[] = [];

        // Validate email format
        if (!data.email || !ValidationUtils.isValidEmail(data.email)) {
            errors.push('Valid email is required');
        }

        // Check password is provided (don't validate strength on login)
        if (!data.password) {
            errors.push('Password is required');
        }

        return errors;
    }

    // ========================================================================
    // User Account Management Validators
    // ========================================================================

    /**
     * Validates user profile update request
     * 
     * Optional fields (validate only if provided):
     * - username: Must be 3-30 chars, alphanumeric + underscores
     * 
     * Note: email comes from JWT token (req.user), not request body
     * 
     * @param data - Request body data
     * @returns Array of error messages (empty if valid)
     */
    static userUpdate(data: any): string[] {
        const errors: string[] = [];

        // Email validation removed - comes from JWT now
        // if (!data.email || !ValidationUtils.isValidEmail(data.email)) {
        //   errors.push('Valid email is required');
        // }

        // Validate username if provided (optional field)
        if (data.username !== undefined && data.username && !ValidationUtils.isValidUsername(data.username)) {
            errors.push('Username must be 3-30 characters and contain only letters, numbers, and underscores');
        }

        return errors;
    }

    /**
     * Validates user account deletion request
     * 
     * Required fields:
     * - confirmDelete: Must be true (safety check)
     * 
     * Note: email comes from JWT token (req.user), not request body
     * This prevents accidental deletions by requiring explicit confirmation
     * 
     * @param data - Request body data
     * @returns Array of error messages (empty if valid)
     */
    static userDelete(data: any): string[] {
        const errors: string[] = [];

        // Email validation removed - comes from JWT now
        // if (!data.email || !ValidationUtils.isValidEmail(data.email)) {
        //   errors.push('Valid email is required');
        // }

        // Require explicit deletion confirmation
        if (!data.confirmDelete) {
            errors.push('Account deletion must be confirmed by setting confirmDelete to true');
        }

        return errors;
    }

    // ========================================================================
    // Password Reset Validator
    // ========================================================================

    /**
     * Validates password reset request
     * 
     * Supports two actions:
     * 
     * 1. "request-reset" - Request reset email
     *    Required: email
     * 
     * 2. "verify-token" - Complete password reset
     *    Required: email, token, newPassword
     * 
     * The two-step process:
     * - Step 1: User requests reset (gets email with token)
     * - Step 2: User provides token and new password
     * 
     * @param data - Request body data
     * @returns Array of error messages (empty if valid)
     */
    static passwordReset = (data: any): string[] => {
        const errors: string[] = [];

        // Validate request body exists
        if (!data) {
            errors.push('Request body is required');
            return errors;
        }

        // Extract fields from request body
        const { email, action, token, newPassword } = data;

        // Email is required for both actions
        if (!email) {
            errors.push('Email is required');
        } else if (!ValidationUtils.isValidEmail(email)) {
            errors.push('Valid email is required');
        }

        // Action determines which flow (request vs verify)
        if (!action) {
            errors.push('Action is required');
        } else if (!['request-reset', 'verify-token'].includes(action)) {
            errors.push('Invalid action. Must be "request-reset" or "verify-token"');
        }

        // Additional validation for verify-token action
        if (action === 'verify-token') {
            // Token is required to verify identity
            if (!token) {
                errors.push('Token is required for verify-token action');
            }

            // New password is required and must be strong
            if (!newPassword) {
                errors.push('New password is required for verify-token action');
            } else {
                const passwordValidation = ValidationUtils.validatePassword(newPassword);
                if (!passwordValidation.isValid) {
                    errors.push(passwordValidation.message);
                }
            }
        }

        return errors;
    };
}

// ============================================================================
// Usage Examples
// ============================================================================

/*
 * EXAMPLE 1: Using with HandlerFactory
 * 
 * export default createHandler(
 *   async (req, res) => {
 *     const user = await createUser(req.body);
 *     ResponseUtils.send(res, ResponseUtils.created(user));
 *   },
 *   {
 *     allowedMethods: ['POST'],
 *     validator: Validators.userRegistration
 *   }
 * );
 * 
 * EXAMPLE 2: Manual validation in handler
 * 
 * export default async function handler(req, res) {
 *   const errors = Validators.userLogin(req.body);
 *   if (errors.length > 0) {
 *     return res.status(400).json({
 *       success: false,
 *       message: 'Validation failed',
 *       errors
 *     });
 *   }
 *   // Continue with login logic
 * }
 * 
 * EXAMPLE 3: Testing validators
 * 
 * describe('Validators.userRegistration', () => {
 *   it('should reject invalid email', () => {
 *     const errors = Validators.userRegistration({
 *       email: 'invalid-email',
 *       password: 'StrongPass123!'
 *     });
 *     expect(errors).toContain('Valid email is required');
 *   });
 * 
 *   it('should reject weak password', () => {
 *     const errors = Validators.userRegistration({
 *       email: 'user@example.com',
 *       password: '123'
 *     });
 *     expect(errors.length).toBeGreaterThan(0);
 *   });
 * });
 * 
 * EXAMPLE 4: Password reset flow
 * 
 * // Step 1: Request reset
 * const requestErrors = Validators.passwordReset({
 *   email: 'user@example.com',
 *   action: 'request-reset'
 * });
 * 
 * // Step 2: Verify token and reset
 * const verifyErrors = Validators.passwordReset({
 *   email: 'user@example.com',
 *   action: 'verify-token',
 *   token: 'abc123xyz',
 *   newPassword: 'NewStrongPass123!'
 * });
 * 
 * BEST PRACTICES:
 * 
 * 1. Always validate on server-side (never trust client)
 * 2. Return clear, actionable error messages
 * 3. Validate early (before database operations)
 * 4. Use type checking (typeof) for critical fields
 * 5. Keep validators pure (no side effects)
 * 6. Test validators thoroughly
 * 7. Don't log sensitive data (passwords, tokens)
 * 
 * SECURITY NOTES:
 * 
 * - Never validate passwords on login (avoid timing attacks)
 * - Don't reveal if email exists (security vs UX tradeoff)
 * - Validate JWT-sourced data when critical
 * - Sanitize inputs to prevent injection attacks
 * - Rate limit validation endpoints
 */