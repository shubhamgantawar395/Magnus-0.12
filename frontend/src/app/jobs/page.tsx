'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import {
    CheckSquare,
    Search,
    Filter,
    Clock,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function JobsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }
        fetchJobs();
    }, [user, search, router]);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/jobs/processes', {
                params: {
                    limit: 50,
                    search: search || undefined
                }
            });
            setJobs(response.data.data);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <CheckSquare className="w-8 h-8 text-purple-600" />
                            Job Processes
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Track the status of manufacturing processes
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search by process name, part..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" />
                        Filter Status
                    </Button>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                        ))
                    ) : jobs.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            No job processes found.
                        </div>
                    ) : (
                        jobs.map((job: any) => (
                            <div key={job.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                            Seq: {job.processSequence}
                                        </Badge>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${job.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                job.status === 'in_progress' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-slate-100 text-slate-600'
                                            }`}>
                                            {job.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <Badge variant="secondary">{job.challanItem?.challan?.vendor?.companyName}</Badge>
                                </div>

                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                                    {job.processName}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    {job.challanItem?.partNumber} • {job.challanItem?.partDescription}
                                </p>

                                {/* Progress Bar */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Progress</span>
                                        <span className="font-medium">{Math.round((job.completedQuantity / job.targetQuantity) * 100)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${job.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                                                }`}
                                            style={{ width: `${(job.completedQuantity / job.targetQuantity) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
                                        <p className="text-slate-500">Target</p>
                                        <p className="font-semibold text-slate-900 dark:text-white">{job.targetQuantity}</p>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/10 p-2 rounded">
                                        <p className="text-green-600">Ok</p>
                                        <p className="font-semibold text-green-700">{job.completedQuantity}</p>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/10 p-2 rounded">
                                        <p className="text-red-600">Rej</p>
                                        <p className="font-semibold text-red-700">{job.rejectedQuantity}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
