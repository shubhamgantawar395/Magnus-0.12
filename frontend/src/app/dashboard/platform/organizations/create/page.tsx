'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function CreateOrganizationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        code: '',
        gstin: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { slug, ...submitData } = formData;
            console.log('Submitting Org Form:', submitData);
            const res = await apiClient.post('/organizations', submitData);
            if (res.status === 201) {
                console.log('Org Created Success');
                toast.success('Organization created successfully');
                router.push('/dashboard/platform');
            }
        } catch (error: any) {
            console.error('Failed to create organization:', error);
            console.error('Error Details:', error.response?.data);
            toast.error(error.response?.data?.message || 'Failed to create organization');
        } finally {
            setLoading(false);
        }
    };

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

                <Card className="p-8 border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                            <Building2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Organization</h1>
                            <p className="text-slate-500 dark:text-slate-400">Onboard a new OEM tenant to the platform</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Organization Name
                                </label>
                                <Input
                                    id="name"
                                    required
                                    value={formData.name}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                                        setFormData({ ...formData, name, slug });
                                    }}
                                    placeholder="e.g. Seinumero Nirman Pvt Ltd"
                                    className="bg-white dark:bg-slate-950"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="slug" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Organization Slug
                                </label>
                                <Input
                                    id="slug"
                                    required
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    placeholder="e.g. seinumero-nirman"
                                    className="bg-slate-50 dark:bg-slate-900 font-mono text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="code" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Organization Code
                                </label>
                                <Input
                                    id="code"
                                    required
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="e.g. SEIN001"
                                    className="bg-white dark:bg-slate-950"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="gstin" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    GSTIN
                                </label>
                                <Input
                                    id="gstin"
                                    value={formData.gstin}
                                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                                    placeholder="e.g. 29AAAAA0000A1Z5"
                                    className="bg-white dark:bg-slate-950"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="contactPerson" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Contact Person
                                </label>
                                <Input
                                    id="contactPerson"
                                    value={formData.contactPerson}
                                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                    placeholder="e.g. Rajesh Kumar"
                                    className="bg-white dark:bg-slate-950"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="contactEmail" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Email
                                </label>
                                <Input
                                    id="contactEmail"
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                    placeholder="e.g. contact@company.com"
                                    className="bg-white dark:bg-slate-950"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="contactPhone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Phone
                                </label>
                                <Input
                                    id="contactPhone"
                                    value={formData.contactPhone}
                                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                    placeholder="e.g. 9876543210"
                                    className="bg-white dark:bg-slate-950"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="city" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    City
                                </label>
                                <Input
                                    id="city"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="e.g. Bangalore"
                                    className="bg-white dark:bg-slate-950"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="state" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    State
                                </label>
                                <Input
                                    id="state"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    placeholder="e.g. Karnataka"
                                    className="bg-white dark:bg-slate-950"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="pincode" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Pincode
                                </label>
                                <Input
                                    id="pincode"
                                    value={formData.pincode}
                                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                    placeholder="e.g. 560001"
                                    className="bg-white dark:bg-slate-950"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="address" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Address
                            </label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="e.g. 123, Industrial Area"
                                className="bg-white dark:bg-slate-950 w-full"
                            />
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {loading ? 'Creating Organization...' : 'Create Organization'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div >
    );
}
