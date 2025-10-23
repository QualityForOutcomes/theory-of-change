// services/dto/Invoice.ts
export interface Invoice {
    invoice_ID: number;
    subscription_ID: number;
    email: string;
    amount_cents: number;
    currency: string;
    period_start: string | null;
    period_end: string | null;
    issued_at: string;
    due_at: string | null;
    status: 'paid' | 'pending' | 'overdue' | 'cancelled';
    pdf_url: string | null;
    is_public: boolean;
}

export interface InvoiceWithSubscription extends Invoice {
    subscription: {
        subscription_ID: number;
        email: string;
        status: string;
        plan: {
            plan_ID: number;
            name: string;
            price_cents: number;
            billing_interval: string;
        };
    };
}

export interface CreateInvoiceDto {
    subscription_ID: string;
    email: string;
    amount_cents: number;
    currency: string;
    period_start?: string | null;
    period_end?: string | null;
    issued_at?: string;
    due_at?: string | null;
    status: 'paid' | 'pending' | 'overdue' | 'cancelled';
    pdf_url?: string | null;
    is_public?: boolean;
}

export interface UpdateInvoiceDto {
    status?: 'paid' | 'pending' | 'overdue' | 'cancelled';
    pdf_url?: string | null;
    is_public?: boolean;
}