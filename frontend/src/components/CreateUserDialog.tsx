'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usersService } from '@/services/users.service';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface CreateUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    userType: 'vendor' | 'executive';
    vendorId?: string;
}

export default function CreateUserDialog({ open, onOpenChange, onSuccess, userType, vendorId }: CreateUserDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        designation: '',
        department: '',
        role: userType === 'vendor' ? 'vendor_user' : 'executive',
        vendorId: '',
    });

    const [vendors, setVendors] = useState<any[]>([]);

    useEffect(() => {
        if (open && userType === 'vendor' && !vendorId) {
            apiClient.get('/vendors').then(res => {
                setVendors(res.data.data || res.data || []);
            }).catch(console.error);
        }
    }, [open, userType, vendorId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload: any = { ...formData };
            if (!payload.department) delete payload.department;
            if (!payload.designation) delete payload.designation;
            if (!payload.phone) delete payload.phone;

            payload.vendorId = userType === 'vendor' ? (vendorId || formData.vendorId) : undefined;
            if (!payload.vendorId) delete payload.vendorId;

            await usersService.createUser(payload);
            toast.success('User created successfully');
            onSuccess();
            onOpenChange(false);
            // Reset form
            setFormData({
                email: '',
                password: '',
                firstName: '',
                lastName: '',
                phone: '',
                designation: '',
                department: '',
                role: userType === 'vendor' ? 'vendor_user' : 'executive',
                vendorId: '',
            });
        } catch (error: any) {
            console.error('Error creating user:', error);
            const msg = error.response?.data?.message;
            const errorMsg = Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to create user');
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Create {userType === 'vendor' ? 'Vendor' : 'Executive'} User
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="firstName">First Name *</Label>
                            <Input
                                id="firstName"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="lastName">Last Name *</Label>
                            <Input
                                id="lastName"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="password">Password *</Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={6}
                        />
                    </div>

                    <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    <div>
                        <Label htmlFor="role">Role *</Label>
                        <select
                            id="role"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            {userType === 'vendor' ? (
                                <>
                                    <option value="vendor_user">Vendor User</option>
                                    <option value="vendor_supervisor">Vendor Supervisor</option>
                                    <option value="vendor_ppc">Vendor PPC</option>
                                    <option value="vendor_owner">Vendor Owner</option>
                                </>
                            ) : (
                                <>
                                    <optgroup label="Leadership">
                                        <option value="admin">Admin</option>
                                        <option value="director">Director</option>
                                        <option value="gm">General Manager</option>
                                        <option value="executive">Executive</option>
                                        <option value="plant_head">Plant Head</option>
                                    </optgroup>
                                    <optgroup label="Managers">
                                        <option value="production_manager">Production Manager</option>
                                        <option value="ppc_manager">PPC Manager</option>
                                        <option value="quality_head">Quality Head</option>
                                        <option value="accounts_manager">Accounts Manager</option>
                                    </optgroup>
                                    <optgroup label="Operations">
                                        <option value="quality_supervisor">Quality Supervisor</option>
                                        <option value="store_keeper">Store Keeper</option>
                                        <option value="security">Security</option>
                                    </optgroup>
                                </>
                            )}
                        </select>
                    </div>

                    <div>
                        <Label htmlFor="designation">Designation</Label>
                        <Input
                            id="designation"
                            value={formData.designation}
                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        />
                    </div>

                    {userType === 'vendor' && !vendorId && (
                        <div>
                            <Label htmlFor="vendorId">Vendor *</Label>
                            <select
                                id="vendorId"
                                name="vendorId"
                                value={formData.vendorId}
                                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select Vendor</option>
                                {vendors.map(v => (
                                    <option key={v.id} value={v.id}>{v.companyName}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {userType === 'executive' && (
                        <div>
                            <Label htmlFor="department">Department</Label>
                            <select
                                id="department"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Department</option>
                                <option value="executive">Executive</option>
                                <option value="production">Production</option>
                                <option value="quality">Quality</option>
                                <option value="store">Store</option>
                                <option value="ppc">PPC</option>
                                <option value="planning">Planning</option>
                                <option value="accounts">Accounts</option>
                                <option value="security">Security</option>
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create User'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
