"use client";

import { useEffect, useState } from "react";
import { organizationService } from "@/services/organization-service";
import { Organization } from "@/types/organization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, CreditCard, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

export default function SubscriptionsPage() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        mrr: 0,
        active: 0,
        trial: 0,
        enterprise: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await organizationService.getAll();
            setOrganizations(data);

            // Calculate Stats
            let mrr = 0;
            let active = 0;
            let trial = 0;
            let enterprise = 0;

            data.forEach(org => {
                if (org.subscriptionStatus === 'active') active++;
                if (org.subscriptionTier === 'trial') trial++;
                if (org.subscriptionTier === 'enterprise') enterprise++;

                // Mock MRR Pricing
                if (org.subscriptionStatus === 'active') {
                    if (org.subscriptionTier === 'basic') mrr += 2000;
                    if (org.subscriptionTier === 'professional') mrr += 5000;
                    if (org.subscriptionTier === 'enterprise') mrr += 10000;
                }
            });

            setStats({ mrr, active, trial, enterprise });
        } catch (error) {
            console.error("Failed to load subscriptions", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Subscription & Billing</h1>
            <p className="text-muted-foreground mb-8">Overview of organization subscriptions and revenue.</p>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.mrr.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Trials</CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.trial}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Enterprise Clients</CardTitle>
                        <CreditCard className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.enterprise}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Subscriptions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Organization Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Organization</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>Renewal Date</TableHead>
                                <TableHead className="text-right">Amount (Est.)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {organizations.map((org) => (
                                <TableRow key={org.id}>
                                    <TableCell className="font-medium">{org.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">{org.subscriptionTier}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={org.subscriptionStatus === 'active' ? 'default' : 'destructive'} className="capitalize">
                                            {org.subscriptionStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {org.subscriptionStartDate ? new Date(org.subscriptionStartDate).toLocaleDateString() : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        {org.subscriptionEndDate ? new Date(org.subscriptionEndDate).toLocaleDateString() : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {org.subscriptionTier === 'trial' ? '₹0' :
                                            org.subscriptionTier === 'basic' ? '₹2,000' :
                                                org.subscriptionTier === 'professional' ? '₹5,000' : '₹10,000'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
