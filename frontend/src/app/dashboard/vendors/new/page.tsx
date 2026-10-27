'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

// ... (skipping to replacement logic, need separate chunks if far apart)
// Actually I'll do import separately.

import {
    Building2,
    Mail,
    Phone,
    MapPin,
    FileText,
    Save,
    ChevronLeft,
    CheckCircle2,
    AlertCircle,
    User,
    Hash,
    ShieldCheck,
    Eye,
    EyeOff,
    KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function CreateVendorPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        companyName: '',
        vendorCode: '',
        gstin: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        city: '',
        state: '',
        pincode: ''
    });

    const [createOwnerAccount, setCreateOwnerAccount] = useState(false);
    const [ownerData, setOwnerData] = useState({
        ownerFirstName: '',
        ownerLastName: '',
        ownerEmail: '',
        ownerPassword: '',
    });
    const [showOwnerPwd, setShowOwnerPwd] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Strip empty-string fields so class-validator doesn't reject them
            const payload: any = {};
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== '') payload[key] = value;
            });

            if (createOwnerAccount && ownerData.ownerEmail && ownerData.ownerPassword) {
                if (ownerData.ownerFirstName) payload.ownerFirstName = ownerData.ownerFirstName;
                if (ownerData.ownerLastName) payload.ownerLastName = ownerData.ownerLastName;
                payload.ownerEmail = ownerData.ownerEmail;
                payload.ownerPassword = ownerData.ownerPassword;
            }

            await apiClient.post('/vendors', payload);

            toast.success('Vendor created successfully');
            router.push('/dashboard/vendors');
        } catch (error: any) {
            console.error('Error creating vendor:', error);
            const msg = error.response?.data?.message;
            const errorMsg = Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to create vendor');
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-4 md:p-8">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 left-10 w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="max-w-4xl mx-auto space-y-6 relative z-10">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/vendors">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent flex items-center gap-3">
                            <Building2 className="w-8 h-8 text-blue-600" />
                            Register New Vendor
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Add a new vendor to your approved list
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info Card */}
                    <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl overflow-hidden">
                        <CardHeader className="relative border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/50 to-blue-50/30 dark:from-slate-900/50 dark:to-slate-800/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                                    <FileText className="w-5 h-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-semibold bg-gradient-to-r from-slate-900 to-blue-900 dark:from-white dark:to-blue-100 bg-clip-text text-transparent">
                                    Company Details
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 col-span-2">
                                <label htmlFor="companyName" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-blue-600" />
                                    Company Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="companyName"
                                    placeholder="Enter company name"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    required
                                    className="border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 transition-all duration-300 hover:border-blue-400 shadow-sm hover:shadow-md"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="vendorCode" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-blue-600" />
                                    Vendor Code <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="vendorCode"
                                    placeholder="e.g., VEN-001"
                                    value={formData.vendorCode}
                                    onChange={(e) => setFormData({ ...formData, vendorCode: e.target.value })}
                                    required
                                    className="border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 transition-all duration-300 hover:border-blue-400 shadow-sm hover:shadow-md"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="gstin" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    GSTIN <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="gstin"
                                    placeholder="GSTIN Number"
                                    value={formData.gstin}
                                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                                    required
                                    className="border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 transition-all duration-300 hover:border-blue-400 shadow-sm hover:shadow-md"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Info Card */}
                    <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl overflow-hidden">
                        <CardHeader className="relative border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/50 to-indigo-50/30 dark:from-slate-900/50 dark:to-slate-800/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                                    <Phone className="w-5 h-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-semibold bg-gradient-to-r from-slate-900 to-indigo-900 dark:from-white dark:to-indigo-100 bg-clip-text text-transparent">
                                    Contact Information
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 col-span-2">
                                <label htmlFor="contactPerson" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <User className="w-4 h-4 text-indigo-600" />
                                    Contact Person
                                </label>
                                <Input
                                    id="contactPerson"
                                    placeholder="Full Name"
                                    value={formData.contactPerson}
                                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                    className="border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl px-4 py-3 transition-all duration-300 hover:border-indigo-400 shadow-sm hover:shadow-md"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="contactEmail" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-indigo-600" />
                                    Email
                                </label>
                                <Input
                                    id="contactEmail"
                                    type="email"
                                    placeholder="email@company.com"
                                    value={formData.contactEmail}
                                    onChange={(e) => {
                                        setFormData({ ...formData, contactEmail: e.target.value });
                                        // Auto-fill owner email if owner section is open and owner email is still empty
                                        if (createOwnerAccount && !ownerData.ownerEmail) {
                                            setOwnerData(od => ({ ...od, ownerEmail: e.target.value }));
                                        }
                                    }}
                                    className="border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl px-4 py-3 transition-all duration-300 hover:border-indigo-400 shadow-sm hover:shadow-md"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="contactPhone" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-indigo-600" />
                                    Phone
                                </label>
                                <Input
                                    id="contactPhone"
                                    placeholder="+91 1234567890"
                                    value={formData.contactPhone}
                                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                    className="border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl px-4 py-3 transition-all duration-300 hover:border-indigo-400 shadow-sm hover:shadow-md"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Address Card */}
                    <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl overflow-hidden">
                        <CardHeader className="relative border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/50 to-purple-50/30 dark:from-slate-900/50 dark:to-slate-800/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
                                    <MapPin className="w-5 h-5 text-white" />
                                </div>
                                <CardTitle className="text-xl font-semibold bg-gradient-to-r from-slate-900 to-purple-900 dark:from-white dark:to-purple-100 bg-clip-text text-transparent">
                                    Address Details
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 col-span-2">
                                <label htmlFor="address" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-purple-600" />
                                    Street Address
                                </label>
                                <Input
                                    id="address"
                                    placeholder="Address Line 1"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 rounded-xl px-4 py-3 transition-all duration-300 hover:border-purple-400 shadow-sm hover:shadow-md"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="city" className="text-sm font-semibold text-slate-700 dark:text-slate-300">City</label>
                                <Input
                                    id="city"
                                    placeholder="City"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 rounded-xl px-4 py-3 transition-all duration-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="state" className="text-sm font-semibold text-slate-700 dark:text-slate-300">State</label>
                                <Input
                                    id="state"
                                    placeholder="State"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    className="border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 rounded-xl px-4 py-3 transition-all duration-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="pincode" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pincode</label>
                                <Input
                                    id="pincode"
                                    placeholder="Pincode"
                                    value={formData.pincode}
                                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                    className="border-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 rounded-xl px-4 py-3 transition-all duration-300"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Owner Portal Access Card */}
                    <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl overflow-hidden">
                        <CardHeader className="relative border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 dark:from-slate-900/50 dark:to-slate-800/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                                        <ShieldCheck className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-semibold bg-gradient-to-r from-slate-900 to-emerald-900 dark:from-white dark:to-emerald-100 bg-clip-text text-transparent">
                                            Owner Portal Access
                                        </CardTitle>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Create login credentials for the vendor owner right now
                                        </p>
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                        {createOwnerAccount ? 'Enabled' : 'Skip for now'}
                                    </span>
                                    <div
                                        onClick={() => {
                                            setCreateOwnerAccount(v => !v);
                                            if (!createOwnerAccount && formData.contactEmail) {
                                                setOwnerData(od => ({ ...od, ownerEmail: od.ownerEmail || formData.contactEmail }));
                                            }
                                        }}
                                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${createOwnerAccount ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${createOwnerAccount ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </label>
                            </div>
                        </CardHeader>

                        {createOwnerAccount && (
                            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <User className="w-4 h-4 text-emerald-600" />
                                        First Name
                                    </label>
                                    <Input
                                        placeholder="e.g. Suresh"
                                        value={ownerData.ownerFirstName}
                                        onChange={(e) => setOwnerData({ ...ownerData, ownerFirstName: e.target.value })}
                                        className="border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-4 py-3 transition-all duration-300 hover:border-emerald-400 shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <User className="w-4 h-4 text-emerald-600" />
                                        Last Name
                                    </label>
                                    <Input
                                        placeholder="e.g. Patil"
                                        value={ownerData.ownerLastName}
                                        onChange={(e) => setOwnerData({ ...ownerData, ownerLastName: e.target.value })}
                                        className="border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-4 py-3 transition-all duration-300 hover:border-emerald-400 shadow-sm"
                                    />
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-emerald-600" />
                                        Login Email <span className="text-red-500">*</span>
                                        <span className="ml-1 text-xs font-normal text-slate-400">(used to sign in to the portal)</span>
                                    </label>
                                    <Input
                                        type="email"
                                        required={createOwnerAccount}
                                        placeholder="owner@vendorcompany.com"
                                        value={ownerData.ownerEmail}
                                        onChange={(e) => setOwnerData({ ...ownerData, ownerEmail: e.target.value })}
                                        className="border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-4 py-3 transition-all duration-300 hover:border-emerald-400 shadow-sm"
                                    />
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <KeyRound className="w-4 h-4 text-emerald-600" />
                                        Temporary Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Input
                                            type={showOwnerPwd ? 'text' : 'password'}
                                            required={createOwnerAccount}
                                            minLength={6}
                                            placeholder="Min 6 characters — share this with the vendor owner"
                                            value={ownerData.ownerPassword}
                                            onChange={(e) => setOwnerData({ ...ownerData, ownerPassword: e.target.value })}
                                            className="border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl px-4 py-3 pr-12 transition-all duration-300 hover:border-emerald-400 shadow-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowOwnerPwd(v => !v)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showOwnerPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Note these credentials down — share them with the vendor owner securely.
                                    </p>
                                </div>
                            </CardContent>
                        )}

                        {!createOwnerAccount && (
                            <CardContent className="pt-4 pb-5">
                                <p className="text-sm text-slate-400 dark:text-slate-500 text-center">
                                    Toggle on to set up portal login for the vendor owner immediately.
                                    You can also do this later from the vendor details page.
                                </p>
                            </CardContent>
                        )}
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4 pt-4 pb-8">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            className="h-12 w-32 rounded-xl border-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-12 w-48 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105 font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Registering...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    Register Vendor
                                </span>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
