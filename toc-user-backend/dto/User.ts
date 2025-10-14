
export interface User {
    user_id: number;
    email: string;
    username: string;
    password_hash: string;
    created_at: Date;
    user_role: string;
}