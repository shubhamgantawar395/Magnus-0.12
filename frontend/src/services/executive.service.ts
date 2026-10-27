import { apiClient } from '@/lib/api-client';

// ─── Existing Interfaces ───────────────────────────────────────────────────────

export interface ExecutiveStats {
    activeVendors: number;
    pendingDispatches: number;
    completedJobsToday: number;
}

export interface StockStatement {
    rawMaterial: number;
    workInProgress: number;
    finishedGoods: number;
    dispatched: number;
}

export interface VendorPerformance {
    id: string;
    name: string;
    totalProduction: number;
    rejectionRate: number;
    rating: string;
}

export interface DispatchDeadline {
    id: string;
    date: string;
    customer: string;
    vendor: string;
    vehicle: string;
    status: string;
    parts: string;
    totalQty: number;
}

export interface SpendAnalysis {
    month: string;
    amount: number;
}

export interface PerformanceTrend {
    month: string;
    quality: number;
    delivery: number;
    cost: number;
}

export interface VendorComparison {
    id: string;
    name: string;
    metrics: {
        quality: number;
        delivery: number;
        cost: number;
        overall: number;
    };
    totalSpend: number;
}

export interface CostAnalysis {
    name: string;
    value: number;
}

export interface VendorAnalytics {
    profile: {
        id: string;
        name: string;
        code: string;
        email: string;
        phone: string;
        rating: string;
        address?: string;
    };
    stats: {
        totalOrders: number;
        totalValue: number;
        openOrders: number;
        totalDeliveredQty: number;
        rejectionRate: number;
        qualityScore: number;
    };
    qualityTrend: {
        month: string;
        quality: number;
        delivery: number;
        cost: number;
    }[];
}

// ─── New War Room Interfaces ───────────────────────────────────────────────────

export interface CustomerHealth {
    id: string;
    name: string;
    code: string;
    total: number;
    atRisk: number;
    overdue: number;
    onTrack: number;
    readyToDispatch: number;
}

export interface WarRoomKPIs {
    atRisk: number;
    overdue: number;
    onTrack: number;
    readyToDispatch: number;
    wip: number;
    rawMaterial: number;
}

export interface PartOverview {
    kpis: WarRoomKPIs;
    customers: CustomerHealth[];
}

export interface ProcessStep {
    id: string;
    sequence: number | null;
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'rejected';
    target: number | null;
    completed: number;
    rejected: number;
    rework: number;
    startedAt: string | null;
    completedAt: string | null;
}

export interface TrackedPart {
    id: string;
    partNumber: string;
    partDescription: string | null;
    challanNumber: string;
    customer: { id: string; companyName: string };
    vendor: { id: string; companyName: string; vendorCode: string };
    quantityIssued: number;
    quantityDispatched: number;
    stage: 'raw' | 'wip' | 'finished' | 'dispatched';
    scheduleHealth: 'overdue' | 'at_risk' | 'on_track' | 'no_deadline';
    deadline: string | null;
    deadlineSource: 'executive' | 'po' | null;
    deadlineNote: string | null;
    daysRemaining: number | null;
    pipeline: ProcessStep[];
}

export interface PartTrackerResponse {
    data: TrackedPart[];
    summary: {
        total: number;
        byStage: { raw: number; wip: number; finished: number; dispatched: number };
    };
}

// ─── Morning Briefing ─────────────────────────────────────────────────────────

export interface BriefingKPIs {
    pendingApprovals: number;
    approvedPOValue: number;
    approvedPOCount: number;
    draftPOs: number;
    materialAtVendor: number;
    overdueChallans: number;
    activeVendors: number;
    jobsCompletedToday: number;
}

export interface BriefingPO {
    id: string;
    poNumber: string;
    vendor: { companyName: string; vendorCode: string };
    totalAmount: number;
    createdAt: string;
}

export interface BriefingChallan {
    id: string;
    challanNumber: string;
    challanDate: string;
    daysOut: number;
    vendor: { companyName: string };
    _count: { items: number };
}

export interface MorningBriefing {
    generatedAt: string;
    kpis: BriefingKPIs;
    pendingApprovalPOs: BriefingPO[];
    materialInTransit: BriefingChallan[];
    customers: Array<{ id: string; companyName: string; code: string }>;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const executiveService = {
    // Existing
    async getStats(): Promise<ExecutiveStats> {
        const response = await apiClient.get('/executive/stats');
        return response.data;
    },

    async getStockStatement(): Promise<StockStatement> {
        const response = await apiClient.get('/executive/stock-statement');
        return response.data;
    },

    async getVendorPerformance(): Promise<VendorPerformance[]> {
        const response = await apiClient.get('/executive/vendor-performance');
        return response.data;
    },

    async getDispatchDeadlines(): Promise<DispatchDeadline[]> {
        const response = await apiClient.get('/executive/dispatch-deadlines');
        return response.data;
    },

    async createDispatchDeadline(data: any): Promise<DispatchDeadline> {
        const response = await apiClient.post('/executive/dispatch-deadlines', data);
        return response.data;
    },

    async getSpendAnalysis(): Promise<SpendAnalysis[]> {
        const response = await apiClient.get('/executive/spend-analysis');
        return response.data;
    },

    async getPerformanceTrends(): Promise<PerformanceTrend[]> {
        const response = await apiClient.get('/executive/performance-trends');
        return response.data;
    },

    async getVendorDetails(vendorId: string): Promise<VendorAnalytics> {
        const response = await apiClient.get(`/executive/vendor-analytics/${vendorId}`);
        return response.data;
    },

    async getVendorComparison(): Promise<VendorComparison[]> {
        const response = await apiClient.get('/executive/vendor-comparison');
        return response.data;
    },

    async getCostAnalysis(): Promise<CostAnalysis[]> {
        const response = await apiClient.get('/executive/cost-analysis');
        return response.data;
    },

    // ─── New War Room APIs ───────────────────────────────────────────────────

    async getPartOverview(): Promise<PartOverview> {
        const response = await apiClient.get('/executive/part-overview');
        return response.data;
    },

    async getPartTracker(filters?: {
        customerId?: string;
        vendorId?: string;
        partNumber?: string;
        status?: string;
    }): Promise<PartTrackerResponse> {
        const params = new URLSearchParams();
        if (filters?.customerId) params.set('customerId', filters.customerId);
        if (filters?.vendorId) params.set('vendorId', filters.vendorId);
        if (filters?.partNumber) params.set('partNumber', filters.partNumber);
        if (filters?.status) params.set('status', filters.status);
        const response = await apiClient.get(`/executive/part-tracker?${params.toString()}`);
        return response.data;
    },

    async getCustomerParts(customerId: string): Promise<PartTrackerResponse> {
        const response = await apiClient.get(`/executive/parts/customer/${customerId}`);
        return response.data;
    },

    async setPartDeadline(challanItemId: string, data: { deadline: string; note?: string }) {
        const response = await apiClient.put(`/executive/parts/${challanItemId}/deadline`, data);
        return response.data;
    },

    async getMorningBriefing(): Promise<MorningBriefing> {
        const response = await apiClient.get('/executive/morning-briefing');
        return response.data;
    },

    async getWarRoom(): Promise<any> {
        const response = await apiClient.get('/executive/war-room');
        return response.data;
    },
};
