'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { machineService } from '@/services/machine-service';
import { Machine } from '@/types/machine';
import { Server, Activity, AlertCircle, CheckCircle2, Search, Filter, Plus, Loader2, Gauge, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

export default function MachinesPage() {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchMachines = async () => {
        try {
            const data = await machineService.getAll();
            setMachines(data);
        } catch (error) {
            toast.error('Failed to sync machine telemetry');
            // Fallback to demo data if backend is empty/fails
            setMachines([
                { id: '1', machineCode: 'CNC-01', machineName: 'VMC Super-Mini', machineType: 'CNC', department: 'Milling', isActive: true, createdAt: '', updatedAt: '', organizationId: '' },
                { id: '2', machineCode: 'LATHE-05', machineName: 'Heavy Duty Lathe', machineType: 'Manual', department: 'Turning', isActive: true, createdAt: '', updatedAt: '', organizationId: '' },
                { id: '3', machineCode: 'CNC-02', machineName: '5-Axis Machining Center', machineType: 'CNC', department: 'Milling', isActive: false, createdAt: '', updatedAt: '', organizationId: '' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMachines();
    }, []);

    const filteredMachines = machines.filter(m => 
        m.machineName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.machineCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
        );
    }

    const activeCount = machines.filter(m => m.isActive).length;

    return (
        <div className="p-6 space-y-8 bg-slate-950 min-h-screen text-slate-200">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Server className="w-8 h-8 text-indigo-500" />
                        Machine Fleet Management
                    </h1>
                    <p className="text-slate-400 mt-1">Magnus v2.0 · Real-time capacity & status monitoring</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/20">
                        <Plus className="w-4 h-4" />
                        Provision Machine
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">Total Fleet</CardTitle>
                        <Server className="w-4 h-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{machines.length}</div>
                        <p className="text-xs text-slate-500 mt-1">Configured endpoints</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl border-l-4 border-l-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">Active Operations</CardTitle>
                        <Activity className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{activeCount}</div>
                        <p className="text-xs text-slate-500 mt-1">Running at peak capacity</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">Avg. Utilization</CardTitle>
                        <Gauge className="w-4 h-4 text-indigo-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">82%</div>
                        <p className="text-xs text-slate-500 mt-1">Across all departments</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl border-l-4 border-l-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">Scheduled Maint.</CardTitle>
                        <Settings className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-500">2</div>
                        <p className="text-xs text-slate-500 mt-1">Due within 48 hours</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Search by ID or Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {filteredMachines.map((machine) => (
                        <div key={machine.id} className="group bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 transition-all hover:shadow-lg hover:shadow-indigo-500/5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-indigo-500/10 rounded-lg">
                                    <Server className="w-5 h-5 text-indigo-400" />
                                </div>
                                <Badge className={machine.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}>
                                    {machine.isActive ? "ONLINE" : "OFFLINE"}
                                </Badge>
                            </div>
                            
                            <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                                {machine.machineName}
                            </h3>
                            <p className="text-xs text-slate-500 font-mono mb-4">{machine.machineCode}</p>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-900/50">
                                <div>
                                    <span className="text-[10px] uppercase text-slate-600 block mb-1">Department</span>
                                    <span className="text-sm text-slate-300">{machine.department || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase text-slate-600 block mb-1">Type</span>
                                    <span className="text-sm text-slate-300">{machine.machineType}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredMachines.length === 0 && (
                        <div className="col-span-full py-12 text-center">
                            <div className="mx-auto w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-6 h-6 text-slate-700" />
                            </div>
                            <h4 className="text-white font-medium">No machines found</h4>
                            <p className="text-slate-500 text-sm">Adjust your search or add a new machine.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
