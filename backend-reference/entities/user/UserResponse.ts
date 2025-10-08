export default interface UserResponse {
    userId: number;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    organisation?: string;
    avatarUrl?: string;
    displayName: string;
    createdAt?: Date;
    userRole: string;
}