"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { userService } from "@/services/user-service";
import { User, UserRole, Department } from "@/types/user";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, Trash2, Pencil, X, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

// ─── Hierarchy display ────────────────────────────────────────────────────────
const HierarchyNode = ({ user, level = 0 }: { user: User; level?: number }) => (
    <div className="relative" style={{ marginLeft: `${level * 24}px` }}>
        {level > 0 && (
            <div className="absolute left-[-12px] top-5 w-3 h-px bg-border" />
        )}
        <div className="mb-2 p-3 border rounded-md bg-card shadow-sm flex items-center justify-between hover:border-primary transition-colors">
            <div>
                <div className="font-medium flex items-center gap-2">
                    {user.firstName} {user.lastName}
                    <Badge variant="outline" className="text-xs">{user.role}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                    {user.designation || 'No Designation'} • {user.department || 'No Dept'}
                </div>
            </div>
        </div>
        {user.subordinates && user.subordinates.length > 0 && (
            <div className="border-l ml-3 pl-3 py-1 space-y-2 border-border">
                {user.subordinates.map(sub => (
                    <HierarchyNode key={sub.id} user={sub} level={level + 1} />
                ))}
            </div>
        )}
    </div>
);

// ─── Modal wrapper ────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div className="px-6 py-4">{children}</div>
        </div>
    </div>
);

export default function UserDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { user: currentUser } = useAuthStore();

    const [user, setUser] = useState<User | null>(null);
    const [hierarchy, setHierarchy] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showEdit, setShowEdit] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    // Edit form
    const [editData, setEditData] = useState({ firstName: '', lastName: '', phone: '', designation: '', department: '', role: '' });
    const [editLoading, setEditLoading] = useState(false);

    // Password form
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);

    // Delete
    const [deleteLoading, setDeleteLoading] = useState(false);

    const isAdmin = currentUser?.role === 'platform_admin' || currentUser?.role === 'admin';

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                setLoading(true);
                const [userData, hierarchyData] = await Promise.all([
                    userService.getById(id),
                    userService.getHierarchy(id).catch(() => null),
                ]);
                setUser(userData);
                setHierarchy(hierarchyData);
                setEditData({
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    phone: userData.phone || '',
                    designation: userData.designation || '',
                    department: userData.department || '',
                    role: userData.role || '',
                });
            } catch {
                toast.error('Failed to load user');
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEditLoading(true);
        try {
            const updated = await userService.update(id, editData as any);
            setUser(updated);
            setShowEdit(false);
            toast.success('User updated');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Update failed'));
        } finally {
            setEditLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
        if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        setPwdLoading(true);
        try {
            await userService.resetPassword(id, newPassword);
            setShowPassword(false);
            setNewPassword('');
            setConfirmPassword('');
            toast.success('Password updated successfully');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to update password'));
        } finally {
            setPwdLoading(false);
        }
    };

    const handleDelete = async () => {
        setDeleteLoading(true);
        try {
            await userService.delete(id);
            toast.success('User deleted');
            router.push('/users');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to delete user'));
        } finally {
            setDeleteLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <div className="p-8 text-center text-muted-foreground">User not found</div>;
    }

    return (
        <div className="container mx-auto py-10 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{user.firstName} {user.lastName}</h1>
                    <p className="text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Link href="/users">
                        <Button variant="outline">Back</Button>
                    </Link>
                    {isAdmin && (
                        <>
                            <Button variant="outline" onClick={() => setShowEdit(true)}>
                                <Pencil className="w-4 h-4 mr-2" /> Edit
                            </Button>
                            <Button variant="outline" onClick={() => setShowPassword(true)}>
                                <KeyRound className="w-4 h-4 mr-2" /> Change Password
                            </Button>
                            <Button variant="destructive" onClick={() => setShowDelete(true)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Profile + Hierarchy */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Profile Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Role</label>
                                <div className="font-medium capitalize">{user.role?.replace(/_/g, ' ')}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Department</label>
                                <div className="font-medium capitalize">{user.department || '-'}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Designation</label>
                                <div className="font-medium">{user.designation || '-'}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                                <div className="font-medium">{user.phone || '-'}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <Badge variant={user.isActive ? "secondary" : "destructive"}>
                                    {user.isActive ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Joined</label>
                                <div className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Organizational Hierarchy</CardTitle></CardHeader>
                    <CardContent>
                        {hierarchy ? (
                            <div className="border rounded-md p-4 bg-slate-50 dark:bg-slate-900">
                                <HierarchyNode user={hierarchy} />
                            </div>
                        ) : (
                            <div className="text-muted-foreground text-center py-8">No hierarchy data available.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Edit Modal ── */}
            {showEdit && (
                <Modal title="Edit User" onClose={() => setShowEdit(false)}>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>First Name</Label>
                                <Input value={editData.firstName} onChange={e => setEditData({ ...editData, firstName: e.target.value })} required />
                            </div>
                            <div>
                                <Label>Last Name</Label>
                                <Input value={editData.lastName} onChange={e => setEditData({ ...editData, lastName: e.target.value })} required />
                            </div>
                        </div>
                        <div>
                            <Label>Phone</Label>
                            <Input value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                        </div>
                        <div>
                            <Label>Designation</Label>
                            <Input value={editData.designation} onChange={e => setEditData({ ...editData, designation: e.target.value })} />
                        </div>
                        <div>
                            <Label>Department</Label>
                            <select
                                value={editData.department}
                                onChange={e => setEditData({ ...editData, department: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">No Department</option>
                                {Object.values(Department).map(d => (
                                    <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Role</Label>
                            <select
                                value={editData.role}
                                onChange={e => setEditData({ ...editData, role: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {Object.values(UserRole).map(r => (
                                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
                            <Button type="submit" disabled={editLoading}>
                                {editLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Change Password Modal ── */}
            {showPassword && (
                <Modal title="Change Password" onClose={() => setShowPassword(false)}>
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Set a new password for <span className="font-medium text-foreground">{user.firstName} {user.lastName}</span>.
                        </p>
                        <div>
                            <Label>New Password</Label>
                            <div className="relative">
                                <Input
                                    type={showPwd ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    placeholder="Min. 6 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <Label>Confirm Password</Label>
                            <Input
                                type={showPwd ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Repeat password"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowPassword(false)}>Cancel</Button>
                            <Button type="submit" disabled={pwdLoading}>
                                {pwdLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Update Password
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {showDelete && (
                <Modal title="Delete User" onClose={() => setShowDelete(false)}>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to permanently delete{' '}
                            <span className="font-semibold text-foreground">{user.firstName} {user.lastName}</span>?
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
                                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Delete User
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
