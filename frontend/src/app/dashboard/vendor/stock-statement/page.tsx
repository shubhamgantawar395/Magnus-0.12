'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import {
    Package,
    Plus,
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    Wifi,
    WifiOff,
    ChevronRight,
} from 'lucide-react';
import { useStockUpdates } from '@/hooks/useWebSocket';
import toast from 'react-hot-toast';

export default function StockStatementPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [statements, setStatements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatedRows, setUpdatedRows] = useState<Set<string>>(new Set());

    // WebSocket connection for real-time updates
    const { lastUpdate } = useStockUpdates(user?.vendorId);

    const fetchStatements = async () => {
        try {
            const res = await apiClient.get('/stock-statements');
            setStatements(res.data || []);
        } catch (error) {
            console.error('Failed to fetch stock statements:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatements();
    }, [lastUpdate]);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'approved': return 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50';
            case 'pending': return 'text-amber-400 bg-amber-950/30 border-amber-900/50';
            case 'draft': return 'text-slate-400 bg-slate-900/50 border-slate-700/50';
            default: return 'text-slate-400 bg-slate-900/50 border-slate-700/50';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 flex items-center justify-center text-white">
                Loading...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Stock Statements</h1>
                        <p className="text-sm text-slate-400 mt-1">Manage and view your monthly stock statements</p>
                    </div>
                    <Button
                        onClick={() => router.push('/dashboard/vendor/stock-statement/create')}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create New Statement
                    </Button>
                </div>

                {statements.length === 0 ? (
                    <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-12 text-center">
                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">No statements found</h3>
                        <p className="text-slate-400 mb-6">Create your first stock statement to get started.</p>
                        <Button
                            onClick={() => router.push('/dashboard/vendor/stock-statement/create')}
                            variant="outline"
                            className="bg-slate-900/50 border-slate-700/50 text-indigo-400 hover:text-white hover:bg-indigo-900/20"
                        >
                            Create Statement
                        </Button>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {statements.map((stmt) => (
                            <Card
                                key={stmt.id}
                                className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-4 hover:border-indigo-500/30 transition-all cursor-pointer group"
                                onClick={() => router.push(`/dashboard/vendor/stock-statement/${stmt.id}`)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-950/30 rounded-lg border border-indigo-900/30">
                                            <FileText className="w-6 h-6 text-indigo-400" />
                                        </div>
                                        <div>
                                            <div className="text-white font-mono font-bold">{stmt.statementNumber}</div>
                                            <div className="text-sm text-slate-400">
                                                {new Date(stmt.periodFrom).toLocaleDateString()} - {new Date(stmt.periodTo).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden md:block">
                                            <div className="text-xs text-slate-500 uppercase font-bold">Created By</div>
                                            <div className="text-sm text-slate-300">
                                                {stmt.managedBy ? `${stmt.managedBy.firstName} ${stmt.managedBy.lastName}` : 'System'}
                                            </div>
                                        </div>

                                        <div className={`px-3 py-1 rounded-full border text-xs font-medium uppercase ${getStatusColor(stmt.status)}`}>
                                            {stmt.status}
                                        </div>

                                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
