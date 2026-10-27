export interface VendorRateCard {
    id: string;
    vendorId: string;
    operationType: string;
    rateType: string;
    baseRate: number;
    minimumCharge?: number;
    validFrom: string;
    validUntil?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateRateCardDto {
    operationType: string;
    rateType: string;
    baseRate: number;
    minimumCharge?: number;
    validFrom?: string;
    validUntil?: string;
}

export interface UpdateRateCardDto extends Partial<CreateRateCardDto> {
    isActive?: boolean;
}
