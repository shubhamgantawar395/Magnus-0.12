'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import {
    Users,
    Building2,
    Search,
    MoreVertical,
    Plus,
    CreditCard,
    Settings
} from 'lucide-react';
import Link from 'next/link';

export default function OrganizationsListPage() {
    const router = useRouter();
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        try {
            const res = await apiClient.get('/organizations');
            setOrganizations(res.data);
        } catch (error) {
            console.error('Failed to fetch organizations:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Organizations</h1>
                        <p className="text-slate-500 dark:text-slate-400">Manage tenant OEMs and their settings</p>
                    </div>
                    <Link href="/dashboard/platform/organizations/create">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                            <Plus className="w-4 h-4" />
                            Add Organization
                        </Button>
                    </Link>
                </div>

                {/* Filters & Search - Placeholder */}
                <div className="flex gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search organizations..."
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                {/* Organizations Grid */}
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Loading organizations...</div>
                ) : organizations.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">No organizations found. create one to get started.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {organizations.map((org) => (
                            <Card key={org.id} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                            <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{org.name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">{org.code}</span>
                                        <span>•</span>
                                        <span className={org.isActive ? "text-emerald-600" : "text-amber-600"}>
                                            {org.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                                        <div className="space-y-1">
                                            <p className="text-slate-500">Users</p>
                                            <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {org._count?.users || 0}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-slate-500">Plan</p>
                                            <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                                                <CreditCard className="w-3 h-3" />
                                                {org.subscriptionTier || 'Trial'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                                        <Link href={`/dashboard/platform/organizations/${org.id}`} className="flex-1">
                                            <Button variant="outline" className="w-full gap-2">
                                                <Settings className="w-4 h-4" />
                                                Manage
                                            </Button>
                                        </Link>
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
