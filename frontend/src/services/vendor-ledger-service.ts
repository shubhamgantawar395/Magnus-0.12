import { apiClient } from '@/lib/api-client';
import { VendorMaterialLedger, VendorMaterialBalance } from '@/types/vendor-ledger';

export const vendorLedgerService = {
    getByVendor: async (vendorId: string, partNumber?: string) => {
        const response = await apiClient.get<VendorMaterialLedger[]>('/vendor-ledger', {
            params: { vendorId, partNumber },
        });
        return response.data;
    },

    getBalance: async (vendorId: string, partNumber?: string) => {
        const response = await apiClient.get<VendorMaterialBalance[]>('/vendor-ledger/balance', {
            params: { vendorId, partNumber },
        });
        return response.data;
    },

    addAdjustment: async (data: {
        vendorId: string;
        partNumber: string;
        quantity: number;
        remarks: string;
    }) => {
        const response = await apiClient.post<VendorMaterialLedger>('/vendor-ledger/adjustment', data);
        return response.data;
    },
};
