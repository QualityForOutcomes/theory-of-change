import { ApiResponse } from "../ApiResponse";

// services/entities/subscription/InvoiceData.ts
export interface InvoiceData {
    invoiceId: number;
    subscriptionId: number;
    email: string;
    amount: number;
    amountCents: number;
    currency: string;
    periodStart: string | null;
    periodEnd: string | null;
    issuedAt: string;
    dueAt: string | null;
    status: 'paid' | 'pending' | 'overdue' | 'cancelled';
    pdfUrl: string | null;
    isPublic: boolean;
    planName?: string;
    planPrice?: number;
}

export interface CreateInvoiceRequest {
    subscriptionId: number;
    email: string;
    amountCents: number;
    currency: string;
    periodStart?: string;
    periodEnd?: string;
    dueAt?: string;
    status: 'paid' | 'pending' | 'overdue' | 'cancelled';
    pdfUrl?: string;
    isPublic?: boolean;
}

export interface UpdateInvoiceRequest {
    status?: 'paid' | 'pending' | 'overdue' | 'cancelled';
    pdfUrl?: string;
    isPublic?: boolean;
}

export interface InvoiceResponse extends ApiResponse<InvoiceData> { }

export interface InvoiceListResponse extends ApiResponse<InvoiceData[]> { }
