'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UserRole } from '@/types/user';

function CreateUserForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const organizationIdParam = searchParams.get('organizationId');

    const [loading, setLoading] = useState(false);
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: '' as UserRole,
        organizationId: organizationIdParam || '',
    });

    useEffect(() => {
        fetchOrganizations();
        if (organizationIdParam) {
            setFormData({ ...formData, organizationId: organizationIdParam });
        }
    }, [organizationIdParam]);

    const fetchOrganizations = async () => {
        try {
            const res = await apiClient.get('/organizations');
            setOrganizations(res.data);
        } catch (error) {
            console.error('Failed to fetch organizations:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.role) {
            toast.error('Please select a role');
            return;
        }

        if (!formData.organizationId) {
            toast.error('Please select an organization');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                ...formData,
                organizationId: formData.organizationId || undefined, // Send undefined if empty
                isActive: true,
                isEmailVerified: true
            };
            console.log('Sending payload:', payload);

            const res = await apiClient.post('/users', payload);

            if (res.status === 201) {
                toast.success('User created successfully');
                router.push('/dashboard/platform');
            }
        } catch (error: any) {
            console.error('Failed to create user:', error);
            console.error('Error details:', error.response?.data);
            const errorMessage = Array.isArray(error.response?.data?.message)
                ? error.response.data.message.join(', ')
                : (error.response?.data?.message || 'Failed to create user');
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="p-8 border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                    <UserPlus className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create New User</h1>
                    <p className="text-slate-500 dark:text-slate-400">Add a user to an organization with a specific role</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label htmlFor="firstName" className="text-sm font-medium text-slate-700 dark:text-slate-300">First Name</label>
                        <Input
                            id="firstName"
                            required
                            value={formData.firstName}
                            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="lastName" className="text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</label>
                        <Input
                            id="lastName"
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                    <Input
                        id="email"
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                    <Input
                        id="password"
                        required
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Organization</label>
                    <Select
                        onValueChange={(value) => {
                            console.log('Organization selected:', value);
                            setFormData(prev => ({ ...prev, organizationId: value }));
                        }}
                        value={formData.organizationId}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Organization" />
                        </SelectTrigger>
                        <SelectContent>
                            {organizations.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                    {org.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                    <Select
                        onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as UserRole }))}
                        value={formData.role}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={UserRole.EXECUTIVE}>Executive (Dashboard Only)</SelectItem>
                            <SelectItem value={UserRole.PRODUCTION_MANAGER}>Production Manager</SelectItem>
                            <SelectItem value={UserRole.PPC_MANAGER}>PPC Manager</SelectItem>
                            <SelectItem value={UserRole.QUALITY_HEAD}>Quality Head</SelectItem>
                            <SelectItem value={UserRole.STORE_HEAD}>Store Head</SelectItem>
                            <SelectItem value={UserRole.GM}>General Manager</SelectItem>
                            <SelectItem value={UserRole.DIRECTOR}>Director</SelectItem>
                            <SelectItem value={UserRole.PLATFORM_ADMIN}>Platform Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="pt-4">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {loading ? 'Creating User...' : 'Create User'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

export default function CreateUserPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-2xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-6 pl-0 hover:bg-transparent hover:text-indigo-600"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>

                <Suspense fallback={<div>Loading...</div>}>
                    <CreateUserForm />
                </Suspense>
            </div>
        </div>
    );
}
