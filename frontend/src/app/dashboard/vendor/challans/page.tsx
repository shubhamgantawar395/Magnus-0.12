'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { List, ArrowLeft, Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Challan {
    id: string;
    challanNumber: string;
    challanDate: string;
    customer: {
        companyName: string;
    };
    items: {
        id: string;
        partNumber: string;
        quantityIssued: number;
    }[];
}

export default function VendorChallansPage() {
    const router = useRouter();
    const [challans, setChallans] = useState<Challan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchChallans();
    }, []);

    const fetchChallans = async () => {
        try {
            // Using /vendors/jobs as it returns the relevant challans for the vendor
            const res = await apiClient.get('/vendors/jobs');
            setChallans(res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch challans:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async (challanId: string) => {
        try {
            const response = await apiClient.get(`/challans/${challanId}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `challan-${challanId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Failed to download PDF:', error);
        }
    };

    const filteredChallans = challans.filter(c =>
        c.challanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customer.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/dashboard/vendor')}
                            className="text-slate-400 hover:text-white pl-0"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">Delivery Challans</h1>
                            <p className="text-sm text-slate-400 mt-1">View all material issued to you</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                            placeholder="Search by challan no..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500"
                        />
                    </div>
                </div>

                {filteredChallans.length === 0 ? (
                    <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-12 text-center">
                        <div className="text-slate-500">No challans found.</div>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filteredChallans.map(challan => (
                            <Card key={challan.id} className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-4">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <List className="w-4 h-4 text-blue-400" />
                                            <span className="text-xl font-mono font-bold text-white">{challan.challanNumber}</span>
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            Date: {new Date(challan.challanDate).toLocaleDateString()}
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            Customer: <span className="text-slate-200">{challan.customer.companyName}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-between items-end">
                                        <div className="flex flex-col items-end mb-4">
                                            <div className="text-sm text-slate-500 mb-1">Items Included:</div>
                                            <div className="flex flex-wrap gap-2 justify-end">
                                                {challan.items.map(item => (
                                                    <span key={item.id} className="inline-flex items-center px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300 font-mono">
                                                        {item.partNumber} ({item.quantityIssued})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadPdf(challan.id);
                                            }}
                                            className="border-slate-700 hover:bg-slate-800 text-slate-300 gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download PDF
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
