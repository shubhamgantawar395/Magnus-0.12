'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth-store';
import { usersService, type User } from '@/services/users.service';
import { UserPlus, Search, Check, X, Edit, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import CreateUserDialog from '@/components/CreateUserDialog';

export default function VendorUsersPage() {
    const { user: currentUser } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [selectedVendor]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            let data: User[];

            if (selectedVendor) {
                data = await usersService.getVendorUsers(selectedVendor);
            } else if (currentUser?.vendorId) {
                // If current user is a vendor, fetch their users
                data = await usersService.getVendorUsers(currentUser.vendorId);
            } else {
                // Fetch all users with vendor role filter
                data = await usersService.getUsers();
                data = data.filter(u => u.vendorId); // Only vendor users
            }

            setUsers(data);
        } catch (error: any) {
            console.error('Error fetching vendor users:', error);
            toast.error(error.response?.data?.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await usersService.toggleUserStatus(userId, !currentStatus);
            toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
            fetchUsers();
        } catch (error: any) {
            console.error('Error toggling user status:', error);
            toast.error(error.response?.data?.message || 'Failed to update user status');
        }
    };

    const getRoleBadge = (role: string) => {
        const roleLabels: Record<string, string> = {
            vendor_owner: 'Owner',
            vendor_ppc: 'PPC',
            vendor_supervisor: 'Supervisor',
            vendor_user: 'User',
        };

        return roleLabels[role] || role;
    };

    const filteredUsers = users.filter((user) =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.vendor?.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading vendor users...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Vendor User Management</h1>
                    <p className="text-slate-600 mt-1">Manage vendor staff and permissions</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setCreateDialogOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Vendor User
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="text-sm text-slate-600">Total Users</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{users.length}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-slate-600">Active Users</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">
                        {users.filter(u => u.isActive).length}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-slate-600">Inactive Users</div>
                    <div className="text-2xl font-bold text-slate-400 mt-1">
                        {users.filter(u => !u.isActive).length}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-slate-600">Vendors</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">
                        {new Set(users.map(u => u.vendorId).filter(Boolean)).size}
                    </div>
                </Card>
            </div>

            {/* Search */}
            <Card className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by name, email, or vendor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </Card>

            {/* Users Table */}
            <Card>
                <div className="p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Vendor Staff</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Name</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Vendor</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Role</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-slate-500">
                                            {searchTerm ? 'No users match your search' : 'No vendor users found'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-slate-900">
                                                    {user.firstName} {user.lastName}
                                                </div>
                                                {user.designation && (
                                                    <div className="text-xs text-slate-500">{user.designation}</div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-600">{user.email}</td>
                                            <td className="py-3 px-4 text-sm text-slate-600">
                                                {user.vendor?.companyName || 'N/A'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge className="bg-purple-100 text-purple-800">
                                                    {getRoleBadge(user.role)}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4">
                                                {user.isActive ? (
                                                    <Badge className="bg-green-100 text-green-800">
                                                        <Check className="w-3 h-3 mr-1" />
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-slate-100 text-slate-600">
                                                        <X className="w-3 h-3 mr-1" />
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleToggleStatus(user.id, user.isActive)}
                                                    >
                                                        {user.isActive ? 'Deactivate' : 'Activate'}
                                                    </Button>
                                                    <Button variant="ghost" size="sm">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>

            <CreateUserDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={fetchUsers}
                userType="vendor"
                vendorId={currentUser?.vendorId || selectedVendor}
            />
        </div>
    );
}
