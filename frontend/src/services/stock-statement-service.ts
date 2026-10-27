import { apiClient } from "@/lib/api-client";
import { CreateStockStatementDto, StockStatement, UpdateStockStatementDto } from "@/types/stock-statement";

export const stockStatementService = {
    getAll: async (filters?: any): Promise<StockStatement[]> => {
        const query = new URLSearchParams(filters).toString();
        const response = await apiClient.get(`/stock-statements?${query}`);
        return response.data;
    },

    getById: async (id: string): Promise<StockStatement> => {
        const response = await apiClient.get(`/stock-statements/${id}`);
        return response.data;
    },

    create: async (data: CreateStockStatementDto): Promise<StockStatement> => {
        const response = await apiClient.post("/stock-statements", data);
        return response.data;
    },

    update: async (id: string, data: UpdateStockStatementDto): Promise<StockStatement> => {
        const response = await apiClient.patch(`/stock-statements/${id}`, data);
        return response.data;
    }
};
