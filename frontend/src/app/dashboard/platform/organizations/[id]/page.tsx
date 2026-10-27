'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import {
    Users,
    Building2,
    ArrowLeft,
    CreditCard,
    CheckCircle,
    XCircle,
    UserPlus,
    MoreVertical
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default function OrganizationDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const [org, setOrg] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            fetchOrgDetails(params.id as string);
        }
    }, [params.id]);

    const fetchOrgDetails = async (id: string) => {
        try {
            const [orgRes, usersRes] = await Promise.all([
                apiClient.get(`/organizations/${id}`),
                apiClient.get(`/users?organizationId=${id}`)
            ]);
            setOrg(orgRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            console.error('Failed to fetch organization details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">Loading...</div>;
    }

    if (!org) {
        return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">Organization not found</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => router.back()} className="pl-0 gap-2 hover:bg-transparent hover:text-indigo-600">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Organizations
                </Button>

                {/* Org Header */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl font-bold text-indigo-600">
                            {org.name[0]}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{org.name}</h1>
                            <div className="flex items-center gap-2 text-slate-500 mt-1">
                                <Building2 className="w-4 h-4" />
                                <span className="text-sm">{org.address || 'No address provided'}</span>
                                <span>•</span>
                                <span className="font-mono text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">{org.code}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="gap-2">
                            {org.isActive ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                            {org.isActive ? 'Active' : 'Inactive'}
                        </Button>
                    </div>
                </div>

                {/* Overview Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-6">
                            <h3 className="text-sm font-medium text-slate-500 mb-2">Subscription</h3>
                            <p className="text-2xl font-bold">{org.subscriptionTier}</p>
                        </Card>
                    </div>
                </div>

                {/* Users Section */}
                <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Users & Access</h2>
                        <Link href={`/dashboard/platform/users/create?organizationId=${org.id}`}>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                                <UserPlus className="w-4 h-4" />
                                Add User
                            </Button>
                        </Link>
                    </div>

                    <Card className="overflow-hidden bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No users found for this organization</td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                {user.firstName} {user.lastName}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{user.email}</td>
                                            <td className="px-6 py-4 capitalize">{user.role.replace('_', ' ')}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </Card>
                </div>
            </div>
        </div>
    );
}
