/**
 * Validation Utilities
 * 
 * Provides reusable validation functions for common data types and formats.
 * Used by request validators to check field formats, lengths, and patterns.
 * 
 * Key Features:
 * - Email format validation
 * - Password strength requirements
 * - Username format validation
 * - Password hashing with bcrypt
 * - Project data validation (Theory of Change structure)
 * - URL validation
 * 
 * Password Requirements:
 * - Minimum 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * 
 * Username Requirements:
 * - 3-30 characters
 * - Only letters, numbers, and underscores
 * - No spaces or special characters
 */

import ProjectData from '../entities/project/ProjectData';
import * as bcrypt from 'bcrypt';

// ============================================================================
// Constants
// ============================================================================

/**
 * Bcrypt salt rounds for password hashing
 * Higher = more secure but slower (12 is good balance)
 */
const SALT_ROUNDS = 12;

/**
 * Project title maximum length
 */
const MAX_PROJECT_TITLE_LENGTH = 200;

/**
 * Valid project statuses
 */
const VALID_PROJECT_STATUSES = ['draft', 'published', 'active', 'completed', 'cancelled'] as const;

// ============================================================================
// Validation Utils Class
// ============================================================================

export default class ValidationUtils {

    // ========================================================================
    // Project Validation Methods
    // ========================================================================

    /**
     * Validates project data for CREATE operation
     * 
     * Only projectTitle is required for creation.
     * All Theory of Change (ToC) fields are optional initially.
     * This allows users to create projects and fill details gradually.
     * 
     * Required:
     * - projectTitle: Project name (string)
     * 
     * Optional (validated only if provided):
     * - bigPictureGoal, projectAim: Strings
     * - objectives, activities, outcomes, externalFactors, evidenceLinks: Arrays
     * - beneficiaries: Object with description and estimatedReach
     * - status: One of valid statuses
     * 
     * @param data - Project creation data
     * @returns Array of error messages (empty if valid)
     */
    static validateProjectForCreate(data: any): string[] {
        const errors: string[] = [];

        // Required: Project title
        if (!data.projectTitle || typeof data.projectTitle !== 'string') {
            errors.push('projectTitle is required and must be a string');
        }

        // Optional: Big Picture Goal
        if (data.bigPictureGoal !== undefined && data.bigPictureGoal !== null) {
            if (typeof data.bigPictureGoal !== 'string') {
                errors.push('bigPictureGoal must be a string');
            }
        }

        // Optional: Project Aim
        if (data.projectAim !== undefined && data.projectAim !== null) {
            if (typeof data.projectAim !== 'string') {
                errors.push('projectAim must be a string');
            }
        }

        // Optional: Objectives array
        if (data.objectives !== undefined && data.objectives !== null) {
            if (!Array.isArray(data.objectives)) {
                errors.push('objectives must be an array');
            }
        }

        // Optional: Beneficiaries object with nested validation
        if (data.beneficiaries !== undefined && data.beneficiaries !== null) {
            if (typeof data.beneficiaries !== 'object') {
                errors.push('beneficiaries must be an object');
            } else {
                // Validate nested properties if provided
                if (data.beneficiaries.description !== undefined &&
                    typeof data.beneficiaries.description !== 'string') {
                    errors.push('beneficiaries.description must be a string');
                }
                if (data.beneficiaries.estimatedReach !== undefined &&
                    typeof data.beneficiaries.estimatedReach !== 'number') {
                    errors.push('beneficiaries.estimatedReach must be a number');
                }
            }
        }

        // Optional: Activities array
        if (data.activities !== undefined && data.activities !== null) {
            if (!Array.isArray(data.activities)) {
                errors.push('activities must be an array');
            }
        }

        // Optional: Outcomes array
        if (data.outcomes !== undefined && data.outcomes !== null) {
            if (!Array.isArray(data.outcomes)) {
                errors.push('outcomes must be an array');
            }
        }

        // Optional: External Factors array
        if (data.externalFactors !== undefined && data.externalFactors !== null) {
            if (!Array.isArray(data.externalFactors)) {
                errors.push('externalFactors must be an array');
            }
        }

        // Optional: Evidence Links array
        if (data.evidenceLinks !== undefined && data.evidenceLinks !== null) {
            if (!Array.isArray(data.evidenceLinks)) {
                errors.push('evidenceLinks must be an array');
            }
        }

        // Optional: Status enum validation
        if (data.status !== undefined && data.status !== null) {
            if (!VALID_PROJECT_STATUSES.includes(data.status)) {
                errors.push(`status must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`);
            }
        }

        return errors;
    }

    /**
     * Validates project data for UPDATE operation
     * 
     * Requires userId, projectId, and projectTitle.
     * All other fields optional (same validation as create).
     * 
     * @param data - Project update data
     * @returns Array of error messages (empty if valid)
     */
    static validateProjectForUpdate(data: any): string[] {
        const errors: string[] = [];

        // Required: User ID
        if (!data.userId || typeof data.userId !== 'string') {
            errors.push('userId is required and must be a string');
        }

        // Required: Project ID
        if (!data.projectId || typeof data.projectId !== 'string') {
            errors.push('projectId is required and must be a string');
        }

        // Required: Project Title
        if (!data.projectTitle || typeof data.projectTitle !== 'string') {
            errors.push('projectTitle is required and must be a string');
        }

        // Reuse create validation for optional fields
        // This ensures consistent validation rules
        const optionalFieldErrors = this.validateProjectForCreate(data);

        // Filter out the projectTitle required error since we already checked it
        const filteredErrors = optionalFieldErrors.filter(
            err => err !== 'projectTitle is required and must be a string'
        );

        errors.push(...filteredErrors);

        return errors;
    }

    /**
     * Validates complete project data (legacy method)
     * 
     * Stricter validation requiring all Theory of Change fields.
     * Used for complete project validation or before publishing.
     * 
     * Note: This method accesses data through tocData property,
     * which is the nested structure in ProjectData entity.
     * 
     * @param data - Complete ProjectData entity
     * @returns Array of error messages (empty if valid)
     */
    static validateProject(data: ProjectData): string[] {
        const errors: string[] = [];

        // All fields required for complete project

        if (!data.tocData?.projectTitle || typeof data.tocData.projectTitle !== 'string') {
            errors.push('projectTitle is required and must be a string');
        }

        if (!data.tocData?.bigPictureGoal || typeof data.tocData.bigPictureGoal !== 'string') {
            errors.push('bigPictureGoal is required and must be a string');
        }

        if (!data.tocData?.projectAim || typeof data.tocData.projectAim !== 'string') {
            errors.push('projectAim is required and must be a string');
        }

        if (!Array.isArray(data.tocData?.objectives)) {
            errors.push('objectives must be an array');
        }

        // Beneficiaries validation with required fields
        if (!data.tocData?.beneficiaries || typeof data.tocData.beneficiaries !== 'object') {
            errors.push('beneficiaries must be an object');
        } else {
            if (!data.tocData.beneficiaries.description ||
                typeof data.tocData.beneficiaries.description !== 'string') {
                errors.push('beneficiaries.description is required and must be a string');
            }
            if (typeof data.tocData.beneficiaries.estimatedReach !== 'number') {
                errors.push('beneficiaries.estimatedReach must be a number');
            }
        }

        if (!Array.isArray(data.tocData?.activities)) {
            errors.push('activities must be an array');
        }

        if (!Array.isArray(data.tocData?.outcomes)) {
            errors.push('outcomes must be an array');
        }

        if (!Array.isArray(data.tocData?.externalFactors)) {
            errors.push('externalFactors must be an array');
        }

        if (!Array.isArray(data.tocData?.evidenceLinks)) {
            errors.push('evidenceLinks must be an array');
        }

        if (!VALID_PROJECT_STATUSES.includes(data.status as any)) {
            errors.push(`status must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`);
        }

        return errors;
    }

    /**
     * Validates common field formats
     * 
     * Additional format validations beyond type checking:
     * - Email format in userId (if it looks like email)
     * - Project title length limit
     * - URL format in evidence links
     * 
     * @param data - Data to validate
     * @returns Array of error messages (empty if valid)
     */
    static validateFieldFormats(data: any): string[] {
        const errors: string[] = [];

        // Validate userId as email if it contains @
        if (data.userId && data.userId.includes('@')) {
            if (!this.isValidEmail(data.userId)) {
                errors.push('userId must be a valid email format');
            }
        }

        // Validate project title length
        if (data.projectTitle && data.projectTitle.length > MAX_PROJECT_TITLE_LENGTH) {
            errors.push(`projectTitle must not exceed ${MAX_PROJECT_TITLE_LENGTH} characters`);
        }

        // Validate URLs in evidence links
        if (data.evidenceLinks && Array.isArray(data.evidenceLinks)) {
            data.evidenceLinks.forEach((link: any, index: number) => {
                if (typeof link === 'string') {
                    try {
                        new URL(link);
                    } catch {
                        errors.push(`evidenceLinks[${index}] must be a valid URL`);
                    }
                }
            });
        }

        return errors;
    }

    // ========================================================================
    // Email Validation Methods
    // ========================================================================

    /**
     * Checks if email format is valid (simple check)
     * 
     * Uses basic regex pattern: something@something.something
     * Good for most cases but not RFC 5322 compliant.
     * 
     * @param email - Email address to validate
     * @returns true if valid format, false otherwise
     */
    static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validates email with detailed error message
     * 
     * Returns validation result with specific error message.
     * Useful when you need to show user what's wrong.
     * 
     * @param email - Email address to validate
     * @returns Object with isValid flag and message
     */
    static validateEmail(email: string): { isValid: boolean; message: string } {
        if (!email) {
            return { isValid: false, message: 'Email is required' };
        }

        if (!this.isValidEmail(email)) {
            return { isValid: false, message: 'Invalid email format' };
        }

        return { isValid: true, message: 'Email is valid' };
    }

    // ========================================================================
    // Password Validation and Hashing
    // ========================================================================

    /**
     * Validates password strength
     * 
     * Requirements:
     * - At least 8 characters
     * - Contains lowercase letter
     * - Contains uppercase letter
     * - Contains number
     * 
     * Does not require special characters (user-friendly).
     * 
     * @param password - Password to validate
     * @returns Object with isValid flag and specific message
     */
    static validatePassword(password: string): { isValid: boolean; message: string } {
        if (!password) {
            return { isValid: false, message: 'Password is required' };
        }

        if (password.length < 8) {
            return { isValid: false, message: 'Password must be at least 8 characters long' };
        }

        if (!/(?=.*[a-z])/.test(password)) {
            return { isValid: false, message: 'Password must contain at least one lowercase letter' };
        }

        if (!/(?=.*[A-Z])/.test(password)) {
            return { isValid: false, message: 'Password must contain at least one uppercase letter' };
        }

        if (!/(?=.*\d)/.test(password)) {
            return { isValid: false, message: 'Password must contain at least one number' };
        }

        return { isValid: true, message: 'Password is valid' };
    }

    /**
     * Hashes password using bcrypt
     * 
     * Uses 12 salt rounds for good security/performance balance.
     * This is a one-way hash - cannot be reversed.
     * 
     * Process:
     * 1. Generates random salt
     * 2. Combines password with salt
     * 3. Applies bcrypt algorithm
     * 4. Returns hash string
     * 
     * @param password - Plain text password to hash
     * @returns Promise resolving to hashed password string
     * @throws Error if hashing fails
     */
    static async hashPassword(password: string): Promise<string> {
        try {
            return await bcrypt.hash(password, SALT_ROUNDS);
        } catch (error: unknown) {
            console.error('Error hashing password:', error);
            throw new Error('Failed to hash password');
        }
    }

    // ========================================================================
    // Username Validation
    // ========================================================================

    /**
     * Validates username format
     * 
     * Requirements:
     * - 3-30 characters long
     * - Only letters (a-z, A-Z)
     * - Numbers (0-9)
     * - Underscores (_)
     * - No spaces or special characters
     * 
     * Examples:
     * ✓ john_doe
     * ✓ user123
     * ✓ Jane_Smith_2025
     * ✗ john doe (space)
     * ✗ jo (too short)
     * ✗ user@123 (special char)
     * 
     * @param username - Username to validate
     * @returns true if valid format, false otherwise
     */
    static isValidUsername(username: string): boolean {
        const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
        return usernameRegex.test(username);
    }
}

// ============================================================================
// Usage Examples
// ============================================================================

/*
 * EXAMPLE 1: Email validation
 * 
 * const email = 'user@example.com';
 * if (!ValidationUtils.isValidEmail(email)) {
 *   throw new Error('Invalid email format');
 * }
 * 
 * // Or with detailed message
 * const result = ValidationUtils.validateEmail(email);
 * if (!result.isValid) {
 *   return res.status(400).json({ error: result.message });
 * }
 * 
 * EXAMPLE 2: Password validation and hashing
 * 
 * const password = 'MyPass123';
 * const validation = ValidationUtils.validatePassword(password);
 * if (!validation.isValid) {
 *   return res.status(400).json({ error: validation.message });
 * }
 * 
 * // Hash if valid
 * const hashedPassword = await ValidationUtils.hashPassword(password);
 * await createUser({ email, password: hashedPassword });
 * 
 * EXAMPLE 3: Project creation validation
 * 
 * const projectData = {
 *   projectTitle: 'Community Health Project',
 *   bigPictureGoal: 'Improve health outcomes',
 *   status: 'draft'
 * };
 * 
 * const errors = ValidationUtils.validateProjectForCreate(projectData);
 * if (errors.length > 0) {
 *   return res.status(400).json({ errors });
 * }
 * 
 * EXAMPLE 4: Username validation
 * 
 * const username = 'john_doe_123';
 * if (!ValidationUtils.isValidUsername(username)) {
 *   throw new Error('Username must be 3-30 chars (letters, numbers, underscores)');
 * }
 * 
 * SECURITY NOTES:
 * 
 * - Never log passwords (even validation failures)
 * - Use bcrypt for password hashing (not MD5/SHA1)
 * - 12 salt rounds is good balance (secure but not too slow)
 * - Password validation on registration only (avoid timing attacks on login)
 * - Email validation is basic - consider email verification for security
 * - Username uniqueness should be checked in database, not here
 */