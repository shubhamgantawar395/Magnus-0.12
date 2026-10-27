'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Building2, CreditCard, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendorSettingsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        vendorCode: '',
        companyName: '',
        gstin: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        logoUrl: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        address: '',
        city: '',
        state: '',
        pincode: ''
    });

    useEffect(() => {
        if (!user || (!user.role.startsWith('vendor') && user.role !== 'vendor')) {
            router.push('/login');
            return;
        }

        // Assuming fetchOrganizationDetails is another function that might be needed,
        // but it's not provided in the context, so I'll comment it out or remove if not relevant.
        // fetchOrganizationDetails();
        fetchVendorProfile();
    }, [user, router]);

    const fetchVendorProfile = async () => {
        try {
            // Get vendor ID from user object or fetch 'me' endpoint if available
            // Assuming user.vendorId is available or we can fetch via /vendors/me if implemented (not standard yet)
            // But usually we can get by ID. User Store might have it?
            // Let's assume user.vendorId exists as per auth store logic.

            if (!user?.vendorId) {
                console.warn('No vendor ID found for user');
                setLoading(false);
                return;
            }

            const res = await apiClient.get(`/vendors/${user.vendorId}`);
            const v = res.data;
            if (v) {
                setFormData({
                    vendorCode: v.vendorCode || '',
                    companyName: v.companyName || '',
                    gstin: v.gstin || '',
                    contactPerson: v.contactPerson || '',
                    contactEmail: v.contactEmail || '', // Assuming 'email' in API maps to 'contactEmail'
                    contactPhone: v.contactPhone || '', // Assuming 'phone' in API maps to 'contactPhone'
                    logoUrl: v.logoUrl || '',
                    bankName: v.bankName || '',
                    accountNumber: v.accountNumber || '',
                    ifscCode: v.ifscCode || '',
                    address: v.address || '',
                    city: v.city || '',
                    state: v.state || '',
                    pincode: v.pincode || ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch vendor profile:', error);
            toast.error('Failed to load profile details');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!user?.vendorId) return;

        setSaving(true);
        try {
            await apiClient.patch(`/vendors/${user.vendorId}`, {
                contactPerson: formData.contactPerson,
                contactEmail: formData.contactEmail,
                contactPhone: formData.contactPhone,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode,
                // New Fields
                logoUrl: formData.logoUrl,
                bankName: formData.bankName,
                accountNumber: formData.accountNumber,
                ifscCode: formData.ifscCode
            });
            toast.success('Profile updated successfully');
        } catch (error) {
            console.error('Update failed:', error);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 flex items-center justify-center text-white">
                Loading Profile...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Vendor Settings</h1>
                        <p className="text-slate-400 mt-1">Manage your company profile and invoice settings</p>
                    </div>
                    <Button
                        onClick={() => router.push('/dashboard/vendor')}
                        variant="outline"
                        className="bg-slate-900/50 text-slate-300 border-slate-700"
                    >
                        Back to Dashboard
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Company Details (Read Only mostly) */}
                    <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6 space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                            <Building2 className="w-6 h-6 text-indigo-400" />
                            <h2 className="text-xl font-bold text-white">Company Details</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
                                <Input disabled value={formData.companyName} className="bg-slate-950/50 border-slate-800 text-slate-400" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Vendor Code</label>
                                    <Input disabled value={formData.vendorCode} className="bg-slate-950/50 border-slate-800 text-slate-400" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">GSTIN</label>
                                    <Input disabled value={formData.gstin} className="bg-slate-950/50 border-slate-800 text-slate-400" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Branding (Logo URL)</label>
                                <Input
                                    value={formData.logoUrl}
                                    onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                                    placeholder="https://your-website.com/logo.png"
                                    className="bg-slate-950/80 border-slate-700 text-white focus:border-indigo-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Enter a direct URL to your logo image (PNG/JPG)</p>
                            </div>

                            {formData.logoUrl && (
                                <div className="mt-2 bg-white/5 p-4 rounded-lg flex items-center justify-center">
                                    <img src={formData.logoUrl} alt="Logo Preview" className="max-h-16 object-contain" />
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Bank Details & Contact */}
                    <div className="space-y-6">
                        <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6 space-y-6">
                            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                                <CreditCard className="w-6 h-6 text-emerald-400" />
                                <h2 className="text-xl font-bold text-white">Bank Details</h2>
                            </div>

                            <p className="text-xs text-slate-400">These details will appear on your invoices for payment.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Bank Name</label>
                                    <Input
                                        value={formData.bankName}
                                        onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                        className="bg-slate-950/80 border-slate-700 text-white focus:border-emerald-500"
                                        placeholder="e.g. HDFC Bank"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Account Number</label>
                                    <Input
                                        value={formData.accountNumber}
                                        onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                        className="bg-slate-950/80 border-slate-700 text-white focus:border-emerald-500"
                                        placeholder="e.g. 502000..."
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">IFSC Code</label>
                                    <Input
                                        value={formData.ifscCode}
                                        onChange={e => setFormData({ ...formData, ifscCode: e.target.value })}
                                        className="bg-slate-950/80 border-slate-700 text-white focus:border-emerald-500"
                                        placeholder="e.g. HDFC0001234"
                                    />
                                </div>
                            </div>
                        </Card>

                        <Button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="w-full h-12 text-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-900/30"
                        >
                            {saving ? 'Saving...' : 'Save Settings'} <Save className="ml-2 w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
