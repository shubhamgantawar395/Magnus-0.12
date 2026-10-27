'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth-store';
import { usersService, type User } from '@/services/users.service';
import { UserPlus, Search, Check, X, Edit, Users as UsersIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import CreateUserDialog from '@/components/CreateUserDialog';

export default function ExecutiveUsersPage() {
    const { user: currentUser } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await usersService.getExecutiveUsers();
            setUsers(data);
        } catch (error: any) {
            console.error('Error fetching executive users:', error);
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
        const roleConfig: Record<string, { label: string; color: string }> = {
            admin: { label: 'Admin', color: 'bg-red-100 text-red-800' },
            director: { label: 'Director', color: 'bg-purple-100 text-purple-800' },
            gm: { label: 'General Manager', color: 'bg-indigo-100 text-indigo-800' },
            executive: { label: 'Executive', color: 'bg-blue-100 text-blue-800' },
            plant_head: { label: 'Plant Head', color: 'bg-violet-100 text-violet-800' },
            production_manager: { label: 'Production Manager', color: 'bg-green-100 text-green-800' },
            ppc_manager: { label: 'PPC Manager', color: 'bg-teal-100 text-teal-800' },
            quality_head: { label: 'Quality Head', color: 'bg-orange-100 text-orange-800' },
            quality_supervisor: { label: 'Quality Supervisor', color: 'bg-amber-100 text-amber-800' },
            accounts_manager: { label: 'Accounts Manager', color: 'bg-cyan-100 text-cyan-800' },
            store_keeper: { label: 'Store Keeper', color: 'bg-lime-100 text-lime-800' },
        };

        const config = roleConfig[role] || { label: role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), color: 'bg-slate-100 text-slate-800' };
        return (
            <Badge className={config.color}>
                {config.label}
            </Badge>
        );
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRole = roleFilter === 'all' || user.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    const getRoleStats = () => {
        const stats: Record<string, number> = {};
        users.forEach((user) => {
            stats[user.role] = (stats[user.role] || 0) + 1;
        });
        return stats;
    };

    const roleStats = getRoleStats();

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading staff...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Staff Management</h1>
                    <p className="text-slate-600 mt-1">Manage all internal staff — leadership, managers, and operations</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setCreateDialogOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Staff
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="p-4">
                    <div className="text-sm text-slate-600">Total Staff</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{users.length}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-slate-600">Leadership</div>
                    <div className="text-2xl font-bold text-purple-600 mt-1">
                        {(roleStats.admin || 0) + (roleStats.director || 0) + (roleStats.gm || 0) + (roleStats.plant_head || 0)}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-slate-600">Managers</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">
                        {(roleStats.production_manager || 0) + (roleStats.ppc_manager || 0) + (roleStats.quality_head || 0) + (roleStats.accounts_manager || 0)}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-slate-600">Active</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">
                        {users.filter(u => u.isActive).length}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-slate-600">Inactive</div>
                    <div className="text-2xl font-bold text-slate-400 mt-1">
                        {users.filter(u => !u.isActive).length}
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search by name, email, or department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Roles</option>
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
                        </optgroup>
                    </select>
                </div>
            </Card>

            {/* Users Table */}
            <Card>
                <div className="p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">All Staff</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Name</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Role</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Department</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-slate-500">
                                            {searchTerm || roleFilter !== 'all'
                                                ? 'No staff match your filters'
                                                : 'No staff found — add the first user'}
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
                                            <td className="py-3 px-4">
                                                {getRoleBadge(user.role)}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-600">
                                                {user.department || 'N/A'}
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
                userType="executive"
            />
        </div>
    );
}
