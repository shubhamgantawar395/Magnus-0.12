export enum StockStatementStatus {
    draft = 'draft',
    submitted = 'submitted',
    verified = 'verified',
    approved = 'approved'
}

export interface StockStatementItem {
    id: string;
    stockStatementId: string;
    partId?: string;
    part?: {
        id: string;
        partNumber: string;
        description?: string;
    };
    partNumber?: string; // Fallback if no part relation
    partDescription?: string;
    openingBalance: number;
    inwardQuantity: number;
    outwardQuantity: number;
    closingBalance: number;
    physicalStock?: number;
    variance?: number;
    remarks?: number;
    createdAt: string;
    updatedAt: string;
}

export interface StockStatement {
    id: string;
    statementNumber: string;
    statementDate: string;
    organizationId: string;
    vendorId: string;
    vendor?: {
        id: string;
        companyName: string;
        vendorCode: string;
    };
    periodFrom: string;
    periodTo: string;
    status: StockStatementStatus;
    managedById?: string;
    managedBy?: {
        firstName: string;
        lastName: string;
    };
    verifiedById?: string;
    verifiedBy?: {
        firstName: string;
        lastName: string;
    };
    verifiedAt?: string;
    remarks?: string;
    items?: StockStatementItem[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateStockStatementDto {
    vendorId: string;
    periodFrom: string;
    periodTo: string;
    remarks?: string;
}

export interface UpdateStockStatementDto {
    status?: string;
    remarks?: string;
}
