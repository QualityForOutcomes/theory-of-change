export interface PasswordResetRequest {
    email: string;
    action: 'request-reset' | 'verify-token';
    token?: string;
    newPassword?: string;
}