import { apiClient as axiosInstance } from '@/lib/api-client';

export interface QualityCheck {
    id: string;
    checkNumber: string;
    checkDate: string;
    challanId?: string;
    jobProcessId?: string;
    inspectorId: string;
    sampleSize: number;
    acceptedQty: number;
    rejectedQty: number;
    reworkQty: number;
    status: 'pending' | 'in_progress' | 'passed' | 'failed' | 'conditional_pass';
    defects?: any;
    remarks?: string;
    attachments?: string[];
    inspector?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    challan?: any;
    jobProcess?: any;
    createdAt: string;
    updatedAt: string;
}

export interface QualityStatistics {
    totalInspections: number;
    pendingInspections: number;
    passedInspections: number;
    failedInspections: number;
    totalSamplesInspected: number;
    totalAccepted: number;
    totalRejected: number;
    totalRework: number;
    approvalRate: number;
    rejectionRate: number;
}

export interface CreateQualityCheckData {
    checkDate: string;
    challanId?: string;
    jobProcessId?: string;
    sampleSize: number;
    acceptedQty: number;
    rejectedQty: number;
    reworkQty: number;
    defects?: any;
    remarks?: string;
    attachments?: string[];
}

export const qualityService = {
    async getQualityChecks(params?: {
        vendorId?: string;
        status?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<QualityCheck[]> {
        const response = await axiosInstance.get('/quality-checks', { params });
        return response.data;
    },

    async getQualityCheck(id: string): Promise<QualityCheck> {
        const response = await axiosInstance.get(`/quality-checks/${id}`);
        return response.data;
    },

    async createQualityCheck(data: CreateQualityCheckData): Promise<QualityCheck> {
        const response = await axiosInstance.post('/quality-checks', data);
        return response.data;
    },

    async updateQualityCheck(id: string, data: Partial<CreateQualityCheckData>): Promise<QualityCheck> {
        const response = await axiosInstance.patch(`/quality-checks/${id}`, data);
        return response.data;
    },

    async getStatistics(params?: {
        vendorId?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<QualityStatistics> {
        const response = await axiosInstance.get('/quality-checks/statistics', { params });
        return response.data;
    },

    async getVendorMetrics(vendorId: string, params?: {
        fromDate?: string;
        toDate?: string;
    }): Promise<any> {
        const response = await axiosInstance.get(`/quality-checks/vendor/${vendorId}/metrics`, { params });
        return response.data;
    },

    async getTrends(params?: {
        vendorId?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<any[]> {
        const response = await axiosInstance.get('/quality-checks/trends', { params });
        return response.data;
    },

    async getDefects(params?: {
        vendorId?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<any[]> {
        const response = await axiosInstance.get('/quality-checks/defects', { params });
        return response.data;
    },

    async getQualityJobs(): Promise<any[]> {
        const response = await axiosInstance.get('/quality-checks/process/jobs');
        return response.data;
    },

    async uploadPcp(partOperationId: string, pcpUrl: string): Promise<any> {
        const response = await axiosInstance.post(`/quality-checks/part-operations/${partOperationId}/pcp`, { pcpUrl });
        return response.data;
    },

    async submitMeasurements(jobProcessId: string, measurements: any): Promise<any> {
        const response = await axiosInstance.post(`/quality-checks/jobs/${jobProcessId}/measurements`, { measurements });
        return response.data;
    },

    async requestLiveCheck(jobProcessId: string, link: string): Promise<any> {
        const response = await axiosInstance.post(`/quality-checks/jobs/${jobProcessId}/live-check`, { link });
        return response.data;
    },
};
