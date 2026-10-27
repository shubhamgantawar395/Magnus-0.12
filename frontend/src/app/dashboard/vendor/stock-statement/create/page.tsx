'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';

export default function CreateStockStatement() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        periodFrom: '',
        periodTo: '',
        remarks: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Fetch vendorId from user profile or API
            // Ideally, the backend should infer vendorId from the logged-in user if they are a vendor_user
            // But if we need to send it, we should get it from the store

            const vendorId = user?.vendorId;

            if (!vendorId) {
                // specific check for vendor users
                if (user?.role === 'vendor_user') {
                    toast.error('Error: Could not identify your vendor profile. Please contact support.');
                    return;
                }
                // For admin/internal users creating on behalf of vendor, we might need a dropdown
                // For now, let's assume this page is for vendors only
                toast.error('Vendor profile not found. Are you logged in as a vendor?');
                return;
            }

            const res = await apiClient.post('/stock-statements', {
                vendorId: user.vendorId,
                periodFrom: new Date(formData.periodFrom).toISOString(),
                periodTo: new Date(formData.periodTo).toISOString(),
                remarks: formData.remarks
            });

            if (res.status === 200 || res.status === 201) {
                router.push(`/dashboard/vendor/stock-statement/${res.data.id}`);
            }
        } catch (error: any) {
            console.error('Failed to create statement:', error);
            toast.error(error.response?.data?.message || 'Failed to create statement');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-6 md:p-8">
            <div className="max-w-2xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-slate-400 hover:text-white mb-6 pl-0"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Statements
                </Button>

                <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-8">
                    <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-indigo-400" />
                        New Stock Statement
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Period From</label>
                                <Input
                                    type="date"
                                    required
                                    value={formData.periodFrom}
                                    onChange={(e) => setFormData({ ...formData, periodFrom: e.target.value })}
                                    className="bg-slate-950/50 border-slate-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Period To</label>
                                <Input
                                    type="date"
                                    required
                                    value={formData.periodTo}
                                    onChange={(e) => setFormData({ ...formData, periodTo: e.target.value })}
                                    className="bg-slate-950/50 border-slate-700 text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Remarks (Optional)</label>
                            <textarea
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-md p-3 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none h-32"
                                placeholder="Any additional notes..."
                            />
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-6 text-lg font-medium hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-900/20"
                            >
                                {loading ? 'Generating Statement...' : 'Generate Statement'}
                            </Button>
                            <p className="text-xs text-slate-500 text-center mt-3">
                                System will automatically calculate stock based on challans in the selected period.
                            </p>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
