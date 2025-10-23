// services/dto/Subscription.ts
import { Plan } from './Plan';

export interface Subscription {
    subscription_ID: string;
    email: string;
    plan_ID: string;
    status: 'active' | 'cancelled' | 'expired' | 'pending';
    start_date: string;
    renewal_date: string | null;
    updated_at: string;
    expires_at: string | null;
    auto_renew: boolean;
}

export interface SubscriptionWithPlan extends Subscription {
    plan: Plan;
}

export interface CreateSubscriptionDto {
    subscription_ID: string;
    email: string;
    plan_ID: string;
    status: 'active' | 'cancelled' | 'expired' | 'pending';
    start_date?: string;
    renewal_date?: string | null;
    expires_at?: string | null;
    auto_renew?: boolean;
}

export interface UpdateSubscriptionDto {
    status?: 'active' | 'cancelled' | 'expired' | 'pending';
    plan_ID?: string;
    renewal_date?: string | null;
    expires_at?: string | null;
    auto_renew?: boolean;
    updated_at?: string;
    subscription_ID: string;
}