'use client';

import { useEffect, useState } from 'react';
import { useStockUpdates } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/store/auth-store';

export default function StockUpdatesProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuthStore();
    const vendorId = user?.role && ['vendor_owner', 'vendor_ppc', 'vendor_supervisor'].includes(user.role) ? user?.vendorId : undefined;

    // Initialize WebSocket connection
    useStockUpdates(vendorId);

    return <>{children}</>;
}
