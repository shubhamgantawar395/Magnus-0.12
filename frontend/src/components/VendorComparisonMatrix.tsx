'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VendorComparison } from '@/services/executive.service';
import { ArrowUpDown, ShieldCheck, Truck, Coins, Award } from 'lucide-react';
import { useState } from 'react';

interface VendorComparisonMatrixProps {
    data: VendorComparison[];
}

type SortField = 'name' | 'quality' | 'delivery' | 'cost' | 'overall' | 'totalSpend';

export default function VendorComparisonMatrix({ data }: VendorComparisonMatrixProps) {
    const [sortField, setSortField] = useState<SortField>('overall');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const sortedData = [...data].sort((a, b) => {
        let valA: number | string = '';
        let valB: number | string = '';

        if (field === 'name') {
            valA = a.name;
            valB = b.name;
        } else if (['quality', 'delivery', 'cost', 'overall'].includes(field)) {
            valA = a.metrics[field as keyof typeof a.metrics];
            valB = b.metrics[field as keyof typeof b.metrics];
        } else if (field === 'totalSpend') {
            valA = a.totalSpend;
            valB = b.totalSpend;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const field = sortField; // Helper for closure above

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-emerald-400';
        if (score >= 70) return 'text-amber-400';
        return 'text-red-400';
    };

    return (
        <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 col-span-1 lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-400" />
                    Vendor Comparison Matrix
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-950/50">
                            <TableRow className="border-slate-800 hover:bg-slate-900/50">
                                <TableHead onClick={() => handleSort('name')} className="cursor-pointer text-slate-400 hover:text-white">
                                    <div className="flex items-center gap-1">Vendor <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('quality')} className="text-right cursor-pointer text-slate-400 hover:text-white">
                                    <div className="flex items-center justify-end gap-1"><ShieldCheck className="w-3 h-3" /> Quality <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('delivery')} className="text-right cursor-pointer text-slate-400 hover:text-white">
                                    <div className="flex items-center justify-end gap-1"><Truck className="w-3 h-3" /> Delivery <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('cost')} className="text-right cursor-pointer text-slate-400 hover:text-white">
                                    <div className="flex items-center justify-end gap-1"><Coins className="w-3 h-3" /> Cost Index <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('overall')} className="text-right cursor-pointer text-slate-400 hover:text-white">
                                    <div className="flex items-center justify-end gap-1">Overall <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('totalSpend')} className="text-right cursor-pointer text-slate-400 hover:text-white">
                                    <div className="flex items-center justify-end gap-1">Total Spend <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedData.map((vendor) => (
                                <TableRow key={vendor.id} className="border-slate-800 hover:bg-slate-800/30">
                                    <TableCell className="font-medium text-white">{vendor.name}</TableCell>
                                    <TableCell className={`text-right ${getScoreColor(vendor.metrics.quality)}`}>
                                        {vendor.metrics.quality}%
                                    </TableCell>
                                    <TableCell className={`text-right ${getScoreColor(vendor.metrics.delivery)}`}>
                                        {vendor.metrics.delivery}%
                                    </TableCell>
                                    <TableCell className={`text-right ${getScoreColor(vendor.metrics.cost)}`}>
                                        {vendor.metrics.cost}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${getScoreColor(vendor.metrics.overall).replace('text-', 'bg-')}`}
                                                    style={{ width: `${vendor.metrics.overall}%` }}
                                                />
                                            </div>
                                            <span className="text-white font-bold">{vendor.metrics.overall}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-slate-300">
                                        ₹{vendor.totalSpend.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
