"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { userService } from "@/services/user-service";
import { UserRole, Department, CreateUserDto, User } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import toast from 'react-hot-toast';

export default function CreateUserPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [managers, setManagers] = useState<User[]>([]);
    const [formData, setFormData] = useState<CreateUserDto>({
        email: "",
        role: UserRole.PRODUCTION_MANAGER,
        firstName: "",
        lastName: "",
        phone: "",
        department: Department.PRODUCTION,
        designation: "",
        reportsToId: "",
        organizationId: "", // Will be set by backend if not provided, or needed if platform admin
    });

    useEffect(() => {
        // Fetch potential managers (e.g. Director, GM, other PMs)
        const fetchManagers = async () => {
            try {
                const users = await userService.getAll({ isActive: true });
                setManagers(users.filter(u =>
                    [UserRole.DIRECTOR, UserRole.GM, UserRole.PLATFORM_ADMIN].includes(u.role)
                ));
            } catch (error) {
                console.error("Failed to fetch managers", error);
            }
        };
        fetchManagers();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await userService.create({
                ...formData,
                password: "Password@123", // Default password for now
            });
            router.push("/users");
        } catch (error) {
            console.error("Failed to create user", error);
            toast.error("Failed to create user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create User</h1>
                    <p className="text-muted-foreground">Add a new user to the organization.</p>
                </div>
                <Link href="/users">
                    <Button variant="outline">Cancel</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>User Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">First Name</label>
                                <Input
                                    name="firstName"
                                    required
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Last Name</label>
                                <Input
                                    name="lastName"
                                    required
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="john.doe@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Phone</label>
                            <Input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+91 9876543210"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {Object.values(UserRole).map((role) => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Department</label>
                                <select
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {Object.values(Department).map((dept) => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Designation</label>
                            <Input
                                name="designation"
                                value={formData.designation}
                                onChange={handleChange}
                                placeholder="Senior Manager"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reports To</label>
                            <select
                                name="reportsToId"
                                value={formData.reportsToId}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Manager (Optional)</option>
                                {managers.map((manager) => (
                                    <option key={manager.id} value={manager.id}>
                                        {manager.firstName} {manager.lastName} ({manager.role})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="pt-4">
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Create User
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
