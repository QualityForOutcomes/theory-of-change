// services/dto/Plan.ts
import { ApiResponse } from '../entities/ApiResponse';

export interface Plan {
    plan_ID: string;
    name: string;
    price_cents: number;
    billing_interval: 'monthly' | 'quarterly' | 'yearly';
}

export interface CreatePlanDto {
    name: string;
    price_cents: number;
    billing_interval: 'monthly' | 'quarterly' | 'yearly';
}

export interface UpdatePlanDto {
    name?: string;
    price_cents?: number;
    billing_interval?: 'monthly' | 'quarterly' | 'yearly';
}