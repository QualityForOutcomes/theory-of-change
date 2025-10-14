// services/entities/subscription/SubscriptionData.ts
import { ApiResponse } from "../ApiResponse";
export interface SubscriptionData {
    subscriptionId: string;
    email: string;
    planId: string;
    //planName: string;
    //planPrice: number;
    //billingInterval: string;
    status: 'active' | 'cancelled' | 'expired' | 'pending' | '';
    startDate: string;
    renewalDate: string | null;
    expiresAt: string | null;
    autoRenew: boolean;
    updatedAt: string;
}

export interface CreateSubscriptionRequest {
    subscriptionId: string
    email: string;
    planId: string;
    status?: 'active' | 'cancelled' | 'expired' | 'pending';
    startDate?: string;
    renewalDate?: string;
    expiresAt?: string;
    autoRenew?: boolean;
}

export interface UpdateSubscriptionRequest {
    status?: 'active' | 'cancelled' | 'expired' | 'pending';
    planId?: string;
    renewalDate?: string;
    expiresAt?: string;
    autoRenew?: boolean;
}

export interface SubscriptionResponse extends ApiResponse<SubscriptionData> { }

export interface SubscriptionListResponse extends ApiResponse<SubscriptionData[]> { }

export interface CancelSubscriptionRequest {
    subscriptionId: string;
    reason?: string;
}