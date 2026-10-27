'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { UserRole } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Building2, MapPin, Save, Loader2, Phone, Mail, User, FileText } from 'lucide-react';

interface Plant {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstin: string;
}

export default function AdminSettingsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Company-level details
    const [orgName, setOrgName] = useState('');
    const [orgGstin, setOrgGstin] = useState('');
    const [orgPan, setOrgPan] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');

    // Plants
    const [plants, setPlants] = useState<Plant[]>([]);

    useEffect(() => {
        const allowedRoles: (string | UserRole)[] = [UserRole.PLATFORM_ADMIN, 'admin', UserRole.DIRECTOR, UserRole.GM];
        if (!user || (!allowedRoles.includes(user.role as any) && (user.role as string) !== 'admin')) {
            router.push('/dashboard');
            return;
        }

        fetchOrganizationDetails();
    }, [user, router]);

    const fetchOrganizationDetails = async () => {
        try {
            const res = await apiClient.get('/organizations/mine');
            const org = res.data;
            setOrgName(org.name || '');
            setOrgGstin(org.gstin || '');
            setOrgPan(org.pan || '');
            setContactPerson(org.contactPerson || '');
            setContactEmail(org.contactEmail || '');
            setContactPhone(org.contactPhone || '');

            // Handle plants array
            if (org.plants && Array.isArray(org.plants)) {
                setPlants(org.plants);
            } else if (org.address || org.gstin) {
                // Migrate old singular address format to first plant
                setPlants([{
                    id: crypto.randomUUID(),
                    name: 'Main Plant',
                    address: org.address || '',
                    city: org.city || '',
                    state: org.state || '',
                    pincode: org.pincode || '',
                    gstin: org.gstin || ''
                }]);
            }
        } catch (error) {
            toast.error('Failed to load organization settings');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPlant = () => {
        setPlants([
            ...plants,
            { id: crypto.randomUUID(), name: '', address: '', city: '', state: '', pincode: '', gstin: '' }
        ]);
    };

    const handleRemovePlant = (id: string) => {
        setPlants(plants.filter(p => p.id !== id));
    };

    const handlePlantChange = (id: string, field: keyof Plant, value: string) => {
        setPlants(plants.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleSave = async () => {
        if (!orgName.trim()) {
            toast.error('Organization name is required');
            return;
        }
        if (plants.some(p => !p.name.trim())) {
            toast.error('Please provide a name for all plants');
            return;
        }

        setSaving(true);
        try {
            await apiClient.patch('/organizations/mine', {
                name: orgName.trim(),
                gstin: orgGstin.trim() || undefined,
                pan: orgPan.trim() || undefined,
                contactPerson: contactPerson.trim() || undefined,
                contactEmail: contactEmail.trim() || undefined,
                contactPhone: contactPhone.trim() || undefined,
                plants,
            });
            toast.success('Organization settings saved successfully');
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
            {/* Page Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Organization Settings</h1>
                    <p className="text-sm text-slate-500 mt-1">{orgName} · configuration & master data</p>
                </div>
                <div className="ml-auto">
                    <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 min-w-[140px]">
                        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                    </Button>
                </div>
            </div>

            <div className="space-y-8">

                {/* ── Company Details ── */}
                <div>
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-500" /> Company Details
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            These details appear on all Delivery Challans and official documents.
                        </p>
                    </div>

                    <Card className="border-slate-200 dark:border-slate-800">
                        <CardContent className="pt-6 space-y-6">
                            {/* Row 1: Org name */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5" /> Organization Name *
                                </Label>
                                <Input
                                    value={orgName}
                                    onChange={e => setOrgName(e.target.value)}
                                    placeholder="e.g. Aaniry Manufacturing Pvt. Ltd."
                                />
                            </div>

                            {/* Row 2: GSTIN + PAN */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5" /> GSTIN (Company-level)
                                    </Label>
                                    <Input
                                        value={orgGstin}
                                        onChange={e => setOrgGstin(e.target.value.toUpperCase())}
                                        placeholder="27XXXXX0000X1Z5"
                                        className="font-mono uppercase"
                                        maxLength={15}
                                    />
                                    <p className="text-xs text-slate-400">Used as fallback if a plant has no GSTIN.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5" /> PAN
                                    </Label>
                                    <Input
                                        value={orgPan}
                                        onChange={e => setOrgPan(e.target.value.toUpperCase())}
                                        placeholder="ABCDE1234F"
                                        className="font-mono uppercase"
                                        maxLength={10}
                                    />
                                </div>
                            </div>

                            {/* Row 3: Contact */}
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contact Information</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                            <User className="h-3.5 w-3.5" /> Contact Person
                                        </Label>
                                        <Input
                                            value={contactPerson}
                                            onChange={e => setContactPerson(e.target.value)}
                                            placeholder="Full name"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                            <Mail className="h-3.5 w-3.5" /> Email
                                        </Label>
                                        <Input
                                            type="email"
                                            value={contactEmail}
                                            onChange={e => setContactEmail(e.target.value)}
                                            placeholder="contact@company.com"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                            <Phone className="h-3.5 w-3.5" /> Phone
                                        </Label>
                                        <Input
                                            value={contactPhone}
                                            onChange={e => setContactPhone(e.target.value)}
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Plants & Locations ── */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-indigo-500" /> Company Plants & Locations
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Add all your dispatch locations. These appear as the "From" address on Delivery Challans.
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleAddPlant} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Add Plant
                        </Button>
                    </div>

                    {plants.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <MapPin className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No Plants Configured</h3>
                            <p className="text-slate-500 mb-4 max-w-sm mx-auto text-sm">You haven&apos;t added any company locations yet. Add at least one plant to issue Delivery Challans from.</p>
                            <Button onClick={handleAddPlant} className="bg-indigo-600 hover:bg-indigo-700">
                                <Plus className="h-4 w-4 mr-2" /> Add First Plant
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {plants.map((plant, index) => (
                                <Card key={plant.id} className="relative overflow-hidden group border-slate-200 dark:border-slate-800 hover:border-indigo-300 transition-colors">
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleRemovePlant(plant.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            Plant {index + 1}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-600">Location Name *</Label>
                                            <Input
                                                value={plant.name}
                                                onChange={e => handlePlantChange(plant.id, 'name', e.target.value)}
                                                placeholder="e.g. Unit 1 / Main Plant"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-600">Address line</Label>
                                            <Input
                                                value={plant.address}
                                                onChange={e => handlePlantChange(plant.id, 'address', e.target.value)}
                                                placeholder="Street address, Industrial Area"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold text-slate-600">City</Label>
                                                <Input
                                                    value={plant.city}
                                                    onChange={e => handlePlantChange(plant.id, 'city', e.target.value)}
                                                    placeholder="City"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold text-slate-600">State</Label>
                                                <Input
                                                    value={plant.state}
                                                    onChange={e => handlePlantChange(plant.id, 'state', e.target.value)}
                                                    placeholder="State"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold text-slate-600">Pincode</Label>
                                                <Input
                                                    value={plant.pincode}
                                                    onChange={e => handlePlantChange(plant.id, 'pincode', e.target.value)}
                                                    placeholder="Pincode"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold text-indigo-600">GSTIN (Plant-specific)</Label>
                                                <Input
                                                    value={plant.gstin}
                                                    onChange={e => handlePlantChange(plant.id, 'gstin', e.target.value.toUpperCase())}
                                                    placeholder="27XXXXX0000X1Z5"
                                                    className="font-mono uppercase"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
