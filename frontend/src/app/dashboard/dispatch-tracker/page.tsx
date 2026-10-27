'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
    Truck,
    Search,
    Package,
    Building2,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface VendorDispatchInfo {
    vendorId: string;
    vendorCode: string;
    vendorName: string;
    quantityReady: number;
    challanNumbers: string[];
}

interface PartDispatchInfo {
    partNumber: string;
    partDescription: string;
    totalQuantityReady: number;
    vendors: VendorDispatchInfo[];
}

export default function DispatchTrackerPage() {
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [data, setData] = useState<PartDispatchInfo[]>([]);
    const [search, setSearch] = useState('');
    const [summary, setSummary] = useState({ totalParts: 0, totalQuantity: 0 });

    // Collapsible states
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

    const toggleItem = (partNumber: string) => {
        setOpenItems(prev => ({
            ...prev,
            [partNumber]: !prev[partNumber]
        }));
    };

    const fetchData = async () => {
        try {
            setSearching(true);
            const params: any = {};
            if (search) params.partNumber = search;

            const res = await apiClient.get('/jobs/ready-for-dispatch/by-part', { params });
            setData(res.data.data);
            setSummary(res.data.summary);
        } catch (error) {
            console.error('Error fetching dispatch data:', error);
        } finally {
            setLoading(false);
            setSearching(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Truck className="w-8 h-8 text-blue-600" />
                            Dispatch Tracker
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                            Track materials ready for dispatch across all vendors
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={fetchData}
                        className="gap-2"
                        disabled={searching}
                    >
                        <RefreshCw className={`w-4 h-4 ${searching ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </Button>
                </div>

                {/* Stats & Filter Bar */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Stats Cards */}
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg text-white">
                        <CardContent className="p-6">
                            <p className="text-blue-100 font-medium">Total Ready Quantity</p>
                            <h3 className="text-4xl font-bold mt-2">{summary.totalQuantity}</h3>
                            <p className="text-blue-100 text-sm mt-2 flex items-center gap-1">
                                <Package className="w-4 h-4" /> Across all parts
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                        <CardContent className="p-6">
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Parts Ready</p>
                            <h3 className="text-4xl font-bold mt-2 text-slate-900 dark:text-white">{summary.totalParts}</h3>
                            <p className="text-slate-500 text-sm mt-2 flex items-center gap-1">
                                <Filter className="w-4 h-4" /> Distinct part numbers
                            </p>
                        </CardContent>
                    </Card>

                    {/* Search Area */}
                    <Card className="lg:col-span-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                        <CardContent className="p-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                <Input
                                    placeholder="Search by Part Number..."
                                    className="pl-10 h-12 text-lg"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-2 pl-1">
                                Enter a part number to check availability across all vendors
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Results List */}
                <div className="space-y-4">
                    {loading && !data.length ? (
                        <div className="text-center py-20">
                            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-500">Loading dispatch data...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No items found</h3>
                            <p className="text-slate-500">No items are currently ready for dispatch matching your criteria.</p>
                        </div>
                    ) : (
                        data.map((part) => (
                            <Collapsible
                                key={part.partNumber}
                                open={openItems[part.partNumber]}
                                onOpenChange={() => toggleItem(part.partNumber)}
                                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
                            >
                                <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
                                    {/* Part Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                                    {part.partNumber}
                                                </h3>
                                                <p className="text-slate-500 dark:text-slate-400">
                                                    {part.partDescription || 'No description'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Availability Stats */}
                                    <div className="flex items-center gap-8 border-l border-slate-200 dark:border-slate-700 pl-8">
                                        <div className="text-center">
                                            <p className="text-xs text-slate-500 uppercase font-semibold">Ready Quantity</p>
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                {part.totalQuantityReady}
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-slate-500 uppercase font-semibold">Vendors</p>
                                            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                                                {part.vendors.length}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Expand/Collapse Button */}
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="sm" className="gap-2 ml-auto">
                                            {openItems[part.partNumber] ? (
                                                <>Hide Details <ChevronUp className="w-4 h-4" /></>
                                            ) : (
                                                <>View Details <ChevronDown className="w-4 h-4" /></>
                                            )}
                                        </Button>
                                    </CollapsibleTrigger>
                                </div>

                                <CollapsibleContent>
                                    <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-6">
                                        <h4 className="text-sm font-semibold text-slate-500 uppercase mb-4 flex items-center gap-2">
                                            <Building2 className="w-4 h-4" /> Vendor Breakdown
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {part.vendors.map((vendor) => (
                                                <div
                                                    key={vendor.vendorId}
                                                    className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                                {vendor.vendorName}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                Code: {vendor.vendorCode}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                            {vendor.quantityReady} Ready
                                                        </Badge>
                                                    </div>

                                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                                                        <p className="text-xs text-slate-500 mb-1">Source Challans:</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {vendor.challanNumbers.map(chal => (
                                                                <span key={chal} className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-mono">
                                                                    {chal}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
