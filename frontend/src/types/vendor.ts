export interface Vendor {
    id: string;
    organizationId?: string;
    companyName: string;
    vendorCode: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    pan?: string;
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
    isActive: boolean;
    logoUrl?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    approvedById?: string;
    approvedAt?: string;
    customerId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateVendorDto {
    companyName: string;
    vendorCode: string;
    gstin: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    customerId?: string;
}

export interface UpdateVendorDto extends Partial<CreateVendorDto> {
    status?: 'pending' | 'approved' | 'rejected' | 'suspended';
    isActive?: boolean;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
}
