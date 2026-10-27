export enum UserRole {
    PLATFORM_ADMIN = 'platform_admin',
    EXECUTIVE = 'executive',
    DIRECTOR = 'director',
    GM = 'gm',
    PLANT_HEAD = 'plant_head',
    PRODUCTION_MANAGER = 'production_manager',
    PPC_MANAGER = 'ppc_manager',
    QUALITY_HEAD = 'quality_head',
    QUALITY_SUPERVISOR = 'quality_supervisor',
    ACCOUNTS_MANAGER = 'accounts_manager',
    STORE_KEEPER = 'store_keeper',
    SECURITY = 'security',
    CUSTOMER = 'customer',
    VENDOR = 'vendor',
    VENDOR_OWNER = 'vendor_owner',
    VENDOR_PPC = 'vendor_ppc',
    VENDOR_SUPERVISOR = 'vendor_supervisor',
    VENDOR_USER = 'vendor_user',
}

export enum Department {
    EXECUTIVE = 'executive',
    PRODUCTION = 'production',
    QUALITY = 'quality',
    STORE = 'store',
    PPC = 'ppc',
    PLANNING = 'planning',
    ACCOUNTS = 'accounts',
    SECURITY = 'security',
    VENDOR = 'vendor',
}

export interface User {
    id: string;
    email: string;
    role: UserRole;
    roleLevel: number;
    firstName?: string;
    lastName?: string;
    phone?: string;
    isActive: boolean;
    isEmailVerified: boolean;
    lastLogin?: string;
    organizationId?: string;
    department?: Department;
    vendorId?: string;
    reportsToId?: string;
    designation?: string;
    createdAt: string;
    updatedAt: string;
    subordinates?: User[];
}

export interface CreateUserDto {
    email: string;
    password?: string;
    role: UserRole;
    roleLevel?: number;
    firstName?: string;
    lastName?: string;
    phone?: string;
    organizationId?: string;
    department?: Department;
    reportsToId?: string;
    designation?: string;
    vendorId?: string;
}

export interface UpdateUserDto extends Partial<CreateUserDto> {
    isActive?: boolean;
    isEmailVerified?: boolean;
}
