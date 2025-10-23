export interface PasswordResetTokenData {
    userId: string;
    email: string;
    token: string;
    expiresAt: Date;
}