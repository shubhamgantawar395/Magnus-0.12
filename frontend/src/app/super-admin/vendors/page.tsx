'use client';

import React, { useEffect, useState } from 'react';
import { platformService } from '@/services/platform-service';
import {
    CheckCircle, XCircle, Truck, AlertCircle, RefreshCw,
    Settings, FileText, Clock, Search, Filter,
} from 'lucide-react';

interface Vendor {
    id: string;
    companyName: string;
    gstin?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    capabilities: { id: string; processName: string; machineCount: number; capacityPerMonth: number }[];
    createdAt: string;
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function RejectModal({ vendor, onClose, onConfirm }: { vendor: Vendor; onClose: () => void; onConfirm: (reason: string) => void }) {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-900">Reject Vendor Application</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{vendor.companyName}</p>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-slate-600">Provide a reason for rejection (optional but recommended for records):</p>
                    <textarea
                        value={reason} onChange={e => setReason(e.target.value)} rows={3}
                        placeholder="e.g. Incomplete capability information, GSTIN mismatch..."
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 outline-none resize-none"
                    />
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
                            Cancel
                        </button>
                        <button onClick={() => onConfirm(reason)}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                            Confirm Rejection
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function VendorQueuePage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [approving, setApproving] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState<string | null>(null);
    const [rejectModal, setRejectModal] = useState<Vendor | null>(null);

    const load = async () => {
        setLoading(true);
        try { const data = await platformService.getPendingVendors(); setVendors(data); }
        catch {} finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleApprove = async (vendor: Vendor) => {
        if (!confirm(`Approve ${vendor.companyName} and publish to the global marketplace?`)) return;
        setApproving(vendor.id);
        try { await platformService.approveVendor(vendor.id); setVendors(prev => prev.filter(v => v.id !== vendor.id)); }
        catch { alert('Failed to approve vendor'); } finally { setApproving(null); }
    };

    const handleReject = async (reason: string) => {
        if (!rejectModal) return;
        setRejecting(rejectModal.id);
        setRejectModal(null);
        try { await platformService.rejectVendor(rejectModal.id, reason); setVendors(prev => prev.filter(v => v.id !== rejectModal.id)); }
        catch { alert('Failed to reject vendor'); } finally { setRejecting(null); }
    };

    const filtered = vendors.filter(v =>
        v.companyName.toLowerCase().includes(search.toLowerCase()) ||
        (v.gstin || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Vendor Approval Queue</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Review and verify self-registered global vendors before they enter the marketplace.
                    </p>
                </div>
                <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Status Banner */}
            {!loading && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${vendors.length === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                    {vendors.length === 0 ? (
                        <><CheckCircle className="w-4 h-4 shrink-0" /> Queue is clear — no pending vendor applications.</>
                    ) : (
                        <><AlertCircle className="w-4 h-4 shrink-0" /> {vendors.length} vendor application{vendors.length > 1 ? 's require' : ' requires'} your review before going live.</>
                    )}
                </div>
            )}

            {/* Search */}
            {vendors.length > 0 && (
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search by name or GSTIN..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 h-48 animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-20 text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                    <p className="text-base font-semibold text-slate-700">{vendors.length === 0 ? 'Queue is empty' : 'No results match your search'}</p>
                    <p className="text-sm text-slate-400 mt-1">{vendors.length === 0 ? 'All vendor applications have been processed.' : 'Try a different search term.'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filtered.map(vendor => (
                        <div key={vendor.id} className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden flex flex-col">
                            {/* Card Header */}
                            <div className="px-5 py-4 bg-amber-50/40 border-b border-amber-100 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Truck className="w-4 h-4 text-slate-500 shrink-0" />
                                        <h3 className="font-bold text-slate-900 text-base truncate">{vendor.companyName}</h3>
                                    </div>
                                    {vendor.gstin && (
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <FileText className="w-3 h-3" /> GSTIN: <span className="font-mono text-slate-700">{vendor.gstin}</span>
                                        </p>
                                    )}
                                    {vendor.contactEmail && (
                                        <p className="text-xs text-slate-400 mt-0.5">{vendor.contactEmail}</p>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                                        Pending
                                    </span>
                                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                        <Clock className="w-3 h-3" /> {timeAgo(vendor.createdAt)}
                                    </span>
                                </div>
                            </div>

                            {/* Capabilities */}
                            <div className="px-5 py-4 flex-1">
                                <div className="flex items-center gap-1.5 mb-3">
                                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Declared Capabilities</p>
                                </div>
                                {(!vendor.capabilities || vendor.capabilities.length === 0) ? (
                                    <p className="text-xs text-slate-400 italic">No capabilities declared by this vendor.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {vendor.capabilities.map(cap => (
                                            <div key={cap.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                                                <span className="text-sm font-medium text-slate-700">{cap.processName}</span>
                                                <div className="text-xs text-slate-400 text-right">
                                                    <span>{cap.machineCount} machines</span>
                                                    <span className="mx-1">·</span>
                                                    <span>{cap.capacityPerMonth}/mo capacity</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex gap-2.5">
                                <button
                                    onClick={() => handleApprove(vendor)}
                                    disabled={approving === vendor.id || rejecting === vendor.id}
                                    className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                >
                                    {approving === vendor.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    {approving === vendor.id ? 'Approving...' : 'Approve & Publish'}
                                </button>
                                <button
                                    onClick={() => setRejectModal(vendor)}
                                    disabled={approving === vendor.id || rejecting === vendor.id}
                                    className="inline-flex justify-center items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white text-sm font-medium rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:opacity-50 transition-colors"
                                >
                                    {rejecting === vendor.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {rejectModal && (
                <RejectModal vendor={rejectModal} onClose={() => setRejectModal(null)} onConfirm={handleReject} />
            )}
        </div>
    );
}
