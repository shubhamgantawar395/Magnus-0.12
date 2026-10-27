export type LedgerEntryType =
    | 'material_issued'
    | 'material_returned'
    | 'rejected_returned'
    | 'adjustment';

export interface VendorMaterialLedger {
    id: string;
    organizationId: string;
    vendorId: string;
    partNumber: string;
    entryType: LedgerEntryType;
    challanId?: string;
    receiptId?: string;
    quantity: number;
    balanceAfter: number;
    remarks?: string;
    createdAt: string;
    vendor?: { companyName: string; vendorCode: string };
    challan?: { challanNumber: string };
    receipt?: { receiptNumber: string };
}

export interface VendorMaterialBalance {
    vendorId: string;
    partNumber: string;
    currentBalance: number;
    lastEntryAt: string;
}
