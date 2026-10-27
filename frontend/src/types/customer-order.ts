export type CustomerOrderStatus = 'active' | 'completed' | 'cancelled' | 'on_hold';

export interface CustomerOrderItem {
    id: string;
    orderId: string;
    partNumber: string;
    customerPartNo?: string;
    partDescription?: string;
    quantity: number;
    deliveredQty: number;
    pendingQty: number;
    unitPrice?: number;
    deliveryDate?: string;
    remarks?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerOrder {
    id: string;
    organizationId: string;
    customerId: string;
    orderNumber: string;
    customerPoRef?: string;
    orderDate: string;
    deliveryDate?: string;
    remarks?: string;
    status: CustomerOrderStatus;
    createdAt: string;
    updatedAt: string;
    customer?: { id: string; companyName: string };
    items?: CustomerOrderItem[];
}

export interface CreateCustomerOrderItemDto {
    partNumber: string;
    customerPartNo?: string;
    partDescription?: string;
    quantity: number;
    pendingQty: number;
    unitPrice?: number;
    deliveryDate?: string;
    remarks?: string;
}

export interface CreateCustomerOrderDto {
    customerId: string;
    orderNumber?: string;
    customerPoRef?: string;
    orderDate: string;
    deliveryDate?: string;
    remarks?: string;
    items: CreateCustomerOrderItemDto[];
}

export interface UpdateCustomerOrderDto extends Partial<Omit<CreateCustomerOrderDto, 'items'>> {
    status?: CustomerOrderStatus;
}
