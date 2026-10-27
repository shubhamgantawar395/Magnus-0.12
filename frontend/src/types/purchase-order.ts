export enum POStatus {
    draft = 'draft',
    pending_approval = 'pending_approval',
    approved = 'approved',
    rejected = 'rejected',
    in_progress = 'in_progress',
    completed = 'completed',
    cancelled = 'cancelled'
}

export enum JobWorkType {
    with_material = 'with_material',
    maesof = 'maesof'
}

export interface POItem {
    id: string;
    poId: string;
    partNumber: string;
    partDescription?: string;
    hsnCode?: string;
    drawingNumber?: string;
    quantity: number;
    unitOfMeasure: string;
    operations: string[];
    ratePerPiece: number;
    amount: number;
    materialGrade?: string;
    materialCost?: number;
    deliverySchedule?: string;
    createdAt: string;
    updatedAt: string;
}

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    poDate: string;
    organizationId: string;
    vendorId: string;
    vendor?: {
        id: string;
        companyName: string;
        vendorCode: string;
        email: string;
    };
    quotationId?: string;
    jobWorkType: JobWorkType;
    deliveryDate?: string;
    deliveryAddress?: string;
    paymentTerms?: string;
    advancePayment?: number;
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
    status: POStatus;
    createdById: string;
    createdBy?: {
        firstName: string;
        lastName: string;
    };
    approvedById?: string;
    approvedAt?: string;
    rejectionReason?: string;
    termsAndConditions?: string;
    remarks?: string;
    items?: POItem[];
    createdAt: string;
    updatedAt: string;
}

export interface CreatePOItemDto {
    partNumber: string;
    partDescription?: string;
    hsnCode?: string;
    drawingNumber?: string;
    quantity: number;
    unitOfMeasure?: string;
    operations?: string[];
    ratePerPiece: number;
    materialGrade?: string;
    materialCost?: number;
    deliverySchedule?: string;
}

export interface CreatePurchaseOrderDto {
    poNumber?: string;
    poDate: string;
    vendorId: string;
    quotationId?: string;
    jobWorkType: JobWorkType;
    deliveryDate?: string;
    deliveryAddress?: string;
    paymentTerms?: string;
    advancePayment?: number;
    termsAndConditions?: string;
    remarks?: string;
    items: CreatePOItemDto[];
}
