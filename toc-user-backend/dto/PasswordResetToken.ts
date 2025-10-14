
export interface PasswordResetToken {
    id: number;
    user_id: number;
    email: string;
    token: string;
    expires_at: Date;
    created_at: Date;
}