// services/entities/subscription/PlanData.ts
import { ApiResponse } from "../ApiResponse";
export interface PlanData {
    planId: string;
    name: string;
    priceCents: number;
    priceDisplay: string;
    billingInterval: 'monthly' | 'quarterly' | 'yearly';
}

export interface PlanRequest {
    name: string;
    priceCents: number;
    billingInterval: 'monthly' | 'quarterly' | 'yearly';
}

export interface PlanResponse extends ApiResponse<PlanData> { }

export interface PlanListResponse extends ApiResponse<PlanData[]> { }
