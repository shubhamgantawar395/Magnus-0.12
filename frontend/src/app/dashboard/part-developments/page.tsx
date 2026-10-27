'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { partDevelopmentService } from '@/services/part-development-service';
import { PartDevelopment, DevStage } from '@/types/part-development';
import { Activity, Clock, FileText, CheckCircle2, XCircle, Search, Filter, Plus, Loader2, PlayCircle, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

const STAGE_CONFIG: Record<DevStage, { label: string; color: string; icon: any }> = {
    drawing_shared: { label: 'DRAWING SHARED', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: FileText },
    sample_submitted: { label: 'SAMPLE SUBMITTED', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: PlayCircle },
    first_article_inspection: { label: 'FAI IN PROGRESS', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: Activity },
    approved: { label: 'APPROVED', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
    rejected: { label: 'REJECTED', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: XCircle },
};

export default function PartDevelopmentsPage() {
    const [developments, setDevelopments] = useState<PartDevelopment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchDevelopments = async () => {
        try {
            const data = await partDevelopmentService.getAll();
            setDevelopments(data);
        } catch (error) {
            toast.error('Failed to sync development pipeline');
            // Fallback to demo data
            setDevelopments([
                { 
                    id: '1', 
                    partId: 'p1', 
                    vendorId: 'v1', 
                    stage: 'first_article_inspection', 
                    part: { partNumber: 'AN-CH-102', partName: 'Main Housing' },
                    vendor: { companyName: 'Precision CNC', vendorCode: 'VEN001' },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    organizationId: ''
                },
                { 
                    id: '2', 
                    partId: 'p2', 
                    vendorId: 'v2', 
                    stage: 'approved', 
                    part: { partNumber: 'AN-BR-405', partName: 'Brake Lever' },
                    vendor: { companyName: 'Dynamic Forgings', vendorCode: 'VEN042' },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    organizationId: ''
                },
                { 
                    id: '3', 
                    partId: 'p3', 
                    vendorId: 'v1', 
                    stage: 'drawing_shared', 
                    part: { partNumber: 'AN-SP-099', partName: 'Spacer Plate' },
                    vendor: { companyName: 'Precision CNC', vendorCode: 'VEN001' },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    organizationId: ''
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevelopments();
    }, []);

    const filtered = developments.filter(d => 
        d.part?.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.vendor?.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
        );
    }

    const counts = {
        total: developments.length,
        pending: developments.filter(d => ['drawing_shared', 'sample_submitted', 'first_article_inspection'].includes(d.stage)).length,
        approved: developments.filter(d => d.stage === 'approved').length,
        rejected: developments.filter(d => d.stage === 'rejected').length,
    };

    return (
        <div className="p-6 space-y-8 bg-slate-950 min-h-screen text-slate-200">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Activity className="w-8 h-8 text-indigo-500" />
                        Part Development Tracker
                    </h1>
                    <p className="text-slate-400 mt-1">Magnus v2.0 · New Part Introduction (NPI) Pipeline</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/20">
                    <Plus className="w-4 h-4" />
                    New Project
                </button>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">Total Projects</CardTitle>
                        <Activity className="w-4 h-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{counts.total}</div>
                        <p className="text-xs text-slate-500 mt-1">Lifecycle in progress</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl border-l-4 border-l-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">In Pipeline</CardTitle>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{counts.pending}</div>
                        <p className="text-xs text-slate-500 mt-1">Awaiting approval</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl border-l-4 border-l-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">Total Approved</CardTitle>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{counts.approved}</div>
                        <p className="text-xs text-slate-500 mt-1">Production ready</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">Rejections</CardTitle>
                        <XCircle className="w-4 h-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-500">{counts.rejected}</div>
                        <p className="text-xs text-slate-500 mt-1">Quality concerns raised</p>
                    </CardContent>
                </Card>
            </div>

            {/* List Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Search by Part # or Vendor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                    <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700">
                        <Filter className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800">
                                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Part Details</th>
                                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Development Vendor</th>
                                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Status & Stage</th>
                                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Lead Time</th>
                                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filtered.map((dev) => {
                                const stage = STAGE_CONFIG[dev.stage];
                                const StageIcon = stage.icon;
                                return (
                                    <tr key={dev.id} className="group hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                {dev.part?.partNumber || 'Unknown Part'}
                                            </div>
                                            <div className="text-xs text-slate-500 uppercase">{dev.part?.partName || 'N/A'}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-slate-200">{dev.vendor?.companyName}</div>
                                            <div className="text-[10px] text-slate-600 font-mono uppercase">{dev.vendor?.vendorCode}</div>
                                        </td>
                                        <td className="p-4">
                                            <Badge className={`px-2 py-1 rounded-md flex items-center gap-1.5 w-fit font-medium text-[10px] border ${stage.color}`}>
                                                <StageIcon className="w-3 h-3" />
                                                {stage.label}
                                            </Badge>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <Clock className="w-3.5 h-3.5" />
                                                {Math.floor(Math.random() * 10) + 2} days
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white transition-colors">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
