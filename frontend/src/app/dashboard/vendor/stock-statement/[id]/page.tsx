'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Download, CheckCircle, Clock, Save, AlertTriangle } from 'lucide-react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';

interface StockItem {
    id: string;
    partNumber: string;
    partDescription: string;
    openingBalance: number;
    inwardQuantity: number;
    outwardQuantity: number;
    closingBalance: number;

    // Editable fields
    physicalStock?: number | null;
    variance?: number | null;
    remarks?: string | null;
}

interface StockStatement {
    id: string;
    statementNumber: string;
    periodFrom: string;
    periodTo: string;
    status: string;
    items: StockItem[];
    managedBy?: {
        firstName: string;
        lastName: string;
    };
}

export default function ViewStockStatement() {
    const router = useRouter();
    const params = useParams();
    const [statement, setStatement] = useState<StockStatement | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Local state for edits
    const [edits, setEdits] = useState<Record<string, { physicalStock: string, remarks: string }>>({});

    useEffect(() => {
        if (params.id) {
            fetchStatement(params.id as string);
        }
    }, [params.id]);

    const fetchStatement = async (id: string) => {
        try {
            const res = await apiClient.get(`/stock-statements/${id}`);
            setStatement(res.data);

            // Initialize edits
            const initialEdits: any = {};
            res.data.items.forEach((item: StockItem) => {
                initialEdits[item.id] = {
                    physicalStock: item.physicalStock !== null && item.physicalStock !== undefined ? item.physicalStock.toString() : '',
                    remarks: item.remarks || ''
                };
            });
            setEdits(initialEdits);
        } catch (error) {
            console.error('Failed to fetch statement:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (itemId: string, field: 'physicalStock' | 'remarks', value: string) => {
        setEdits(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [field]: value
            }
        }));
    };

    const handleSave = async (submit: boolean = false) => {
        if (!statement) return;
        setSaving(true);

        try {
            const itemsPayload = Object.keys(edits).map(itemId => {
                const edit = edits[itemId];
                return {
                    id: itemId,
                    physicalStock: edit.physicalStock === '' ? null : parseInt(edit.physicalStock),
                    remarks: edit.remarks
                };
            });

            const payload = {
                status: submit ? 'submitted' : statement.status,
                items: itemsPayload
            };

            await apiClient.patch(`/stock-statements/${statement.id}`, payload);

            // Refresh
            await fetchStatement(statement.id);
            if (submit) {
                toast.success('Stock Statement submitted successfully!');
            } else {
                // toast.success('Saved successfully');
            }
        } catch (error) {
            console.error('Failed to save:', error);
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const calculateVariance = (item: StockItem, physicalVal: string) => {
        if (physicalVal === '') return null;
        const physical = parseInt(physicalVal);
        if (isNaN(physical)) return null;
        return physical - item.closingBalance;
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
    if (!statement) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Statement not found</div>;

    const isEditable = statement.status === 'draft' || statement.status === 'pending';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-6 md:p-8">
            <div className="max-w-[85rem] mx-auto space-y-6">
                <div className="flex items-center justify-between mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="text-slate-400 hover:text-white pl-0"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to List
                    </Button>
                    <div className="flex gap-3">
                        {isEditable && (
                            <>
                                <Button
                                    onClick={() => handleSave(false)}
                                    disabled={saving}
                                    variant="outline"
                                    className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Draft
                                </Button>
                                <Button
                                    onClick={() => handleSave(true)}
                                    disabled={saving}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                                >
                                    Submit for Verification
                                </Button>
                            </>
                        )}
                        <Button variant="outline" className="border-slate-700 text-slate-300">
                            <Download className="w-4 h-4 mr-2" />
                            Excel
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-6">
                    {/* Sidebar Info */}
                    <div className="w-full xl:w-80 space-y-6">
                        <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6">
                            <h2 className="text-xl font-bold text-white mb-4">{statement.statementNumber}</h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Status</div>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium capitalize border ${statement.status === 'approved' ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400' :
                                            statement.status === 'submitted' ? 'bg-blue-950/30 border-blue-900/50 text-blue-400' :
                                                'bg-amber-950/30 border-amber-900/50 text-amber-400'
                                        }`}>
                                        {statement.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                        {statement.status}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Period</div>
                                    <div className="text-white">
                                        {new Date(statement.periodFrom).toLocaleDateString()} - <br />
                                        {new Date(statement.periodTo).toLocaleDateString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Managed By</div>
                                    <div className="text-slate-300">
                                        {statement.managedBy ? `${statement.managedBy.firstName} ${statement.managedBy.lastName}` : 'System'}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-700/50">
                                <h3 className="text-lg font-bold text-white">Statement Verification</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-950/50 border-b border-slate-700/50">
                                        <tr className="text-xs font-bold text-slate-400 uppercase">
                                            <th className="px-6 py-3 text-left">Part Number</th>
                                            <th className="px-6 py-3 text-right">Opening</th>
                                            <th className="px-6 py-3 text-right">Inward</th>
                                            <th className="px-6 py-3 text-right">Consumed</th>
                                            <th className="px-6 py-3 text-right">Closing (Calc)</th>
                                            <th className="px-6 py-3 text-right w-32 bg-indigo-950/20 text-indigo-300">Physical Stock</th>
                                            <th className="px-6 py-3 text-right w-24">Variance</th>
                                            <th className="px-6 py-3 text-left w-48">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {statement.items.map((item) => {
                                            const edit = edits[item.id] || { physicalStock: '', remarks: '' };
                                            const variance = calculateVariance(item, edit.physicalStock);
                                            const hasVariance = variance !== null && variance !== 0;

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-mono text-white text-sm">{item.partNumber}</div>
                                                        <div className="text-xs text-slate-500 truncate max-w-[150px]" title={item.partDescription}>{item.partDescription}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-slate-400">{item.openingBalance}</td>
                                                    <td className="px-6 py-4 text-right text-emerald-400 font-medium">+{item.inwardQuantity}</td>
                                                    <td className="px-6 py-4 text-right text-amber-400 font-medium">
                                                        -{/* Consumed column - adding rejected to this usually, or separating? 
                                                           Backend sends 'consumedQty' and 'rejectedQty'.
                                                           Let's sum them for display or show consumed. 
                                                           The interface has outwardQuantity? No, stock-statements.service returns consumedQty/rejectedQty/returnedQty.
                                                           The previous interface had outwardQuantity. Let's fix that calculation or display.
                                                           Backend results: opening, receivedQty, consumedQty, rejectedQty, returnedQty, closingBalance.
                                                           Frontend interface earlier was: opening, inward, outward, closing.
                                                           Let's map them.
                                                         */}
                                                        {item.outwardQuantity || ((item as any).consumedQty + (item as any).rejectedQty + (item as any).returnedQty)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-indigo-400 font-bold">{item.closingBalance}</td>

                                                    {/* Editable Physical Stock */}
                                                    <td className="px-6 py-4 bg-indigo-950/10">
                                                        {isEditable ? (
                                                            <Input
                                                                type="number"
                                                                value={edit.physicalStock}
                                                                onChange={(e) => handleInputChange(item.id, 'physicalStock', e.target.value)}
                                                                className="h-8 w-24 text-right font-mono bg-slate-950 border-slate-700 focus:border-indigo-500"
                                                                placeholder="0"
                                                            />
                                                        ) : (
                                                            <div className="text-right font-mono text-white">{item.physicalStock}</div>
                                                        )}
                                                    </td>

                                                    {/* Variance */}
                                                    <td className="px-6 py-4 text-right">
                                                        {hasVariance ? (
                                                            <div className={`font-bold flex items-center justify-end gap-1 ${variance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                {variance > 0 ? '+' : ''}{variance}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-600">-</span>
                                                        )}
                                                    </td>

                                                    {/* Remarks */}
                                                    <td className="px-6 py-4">
                                                        {isEditable ? (
                                                            <Input
                                                                value={edit.remarks}
                                                                onChange={(e) => handleInputChange(item.id, 'remarks', e.target.value)}
                                                                className="h-8 w-full text-xs bg-slate-950 border-slate-700 focus:border-indigo-500"
                                                                placeholder="Reason..."
                                                            />
                                                        ) : (
                                                            <div className="text-xs text-slate-400">{item.remarks}</div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Summary Footer */}
                        <div className="mt-6 flex justify-end">
                            <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-4">
                                <div className="flex gap-8 text-sm">
                                    <div className="text-slate-400">Total Items: <span className="text-white font-bold ml-2">{statement.items.length}</span></div>
                                    <div className="text-slate-400">With Variance: <span className="text-rose-400 font-bold ml-2">
                                        {statement.items.filter(item => {
                                            const edit = edits[item.id];
                                            const val = calculateVariance(item, edit?.physicalStock || '');
                                            return val !== null && val !== 0;
                                        }).length}
                                    </span></div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
