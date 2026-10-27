export type ReceiptStatus =
    | 'pending_inspection'
    | 'inspected'
    | 'accepted'
    | 'partially_accepted'
    | 'rejected';

export interface MaterialReceiptItem {
    id: string;
    receiptId: string;
    challanItemId: string;
    expectedQty: number;
    receivedQty: number;
    shortQty: number;
    excessQty: number;
    rejectedAtGate: number;
    remarks?: string;
    createdAt: string;
    updatedAt: string;
    challanItem?: { partNumber: string; partDescription?: string };
}

export interface MaterialReceipt {
    id: string;
    organizationId: string;
    receiptNumber: string;
    receiptDate: string;
    vendorId: string;
    dispatchPlanId?: string;
    vehicleNumber?: string;
    driverName?: string;
    receivedById: string;
    status: ReceiptStatus;
    remarks?: string;
    createdAt: string;
    updatedAt: string;
    vendor?: { companyName: string; vendorCode: string };
    receivedBy?: { firstName?: string; lastName?: string };
    items?: MaterialReceiptItem[];
}

export interface CreateMaterialReceiptItemDto {
    challanItemId: string;
    expectedQty: number;
    receivedQty: number;
    shortQty?: number;
    excessQty?: number;
    rejectedAtGate?: number;
    remarks?: string;
}

export interface CreateMaterialReceiptDto {
    receiptDate: string;
    vendorId: string;
    dispatchPlanId?: string;
    vehicleNumber?: string;
    driverName?: string;
    remarks?: string;
    items: CreateMaterialReceiptItemDto[];
}

export interface UpdateMaterialReceiptDto extends Partial<Omit<CreateMaterialReceiptDto, 'items'>> {
    status?: ReceiptStatus;
}
