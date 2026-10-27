export interface Organization {
    id: string;
    name: string;
    code: string;
    gstin?: string;
    pan?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    subscriptionTier: 'trial' | 'basic' | 'professional' | 'enterprise';
    subscriptionStatus: 'active' | 'suspended' | 'cancelled';
    subscriptionStartDate?: string;
    subscriptionEndDate?: string;
    maxUsers: number;
    logoUrl?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    _count?: {
        users: number;
        vendors: number;
        purchaseOrders: number;
        challans: number;
    };
}

export interface CreateOrganizationDto {
    name: string;
    code: string;
    gstin?: string;
    pan?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    subscriptionTier?: string;
    maxUsers?: number;
}

export interface UpdateOrganizationDto extends Partial<CreateOrganizationDto> {
    isActive?: boolean;
}
