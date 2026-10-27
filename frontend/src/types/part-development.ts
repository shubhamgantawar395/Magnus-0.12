export type DevStage =
    | 'drawing_shared'
    | 'sample_submitted'
    | 'first_article_inspection'
    | 'approved'
    | 'rejected';

export interface PartDevelopment {
    id: string;
    organizationId: string;
    partId: string;
    vendorId: string;
    stage: DevStage;
    drawingVersion?: string;
    drawingUrl?: string;
    targetDate?: string;
    approvedAt?: string;
    approvedById?: string;
    rejectionReason?: string;
    remarks?: string;
    createdAt: string;
    updatedAt: string;
    part?: { partNumber: string; partName?: string };
    vendor?: { companyName: string; vendorCode: string };
    approvedBy?: { firstName?: string; lastName?: string };
}

export interface CreatePartDevelopmentDto {
    partId: string;
    vendorId: string;
    stage?: DevStage;
    drawingVersion?: string;
    drawingUrl?: string;
    targetDate?: string;
    remarks?: string;
}

export interface UpdatePartDevelopmentDto extends Partial<CreatePartDevelopmentDto> {
    stage?: DevStage;
    approvedAt?: string;
    rejectionReason?: string;
}
