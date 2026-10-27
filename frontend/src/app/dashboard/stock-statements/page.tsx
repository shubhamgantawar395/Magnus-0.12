'use client';

import Link from 'next/link';
import { BarChart2, Layers, Globe } from 'lucide-react';

export default function StockStatementsPage() {
    return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
                        <BarChart2 className="w-8 h-8 text-indigo-400" />
                        Stock Statements
                    </h1>
                    <p className="text-slate-400">
                        Real-time material tracking — from customer demand to vendor delivery.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Global */}
                    <Link href="/dashboard/stock-statements/global">
                        <div className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/10">
                            <div className="w-12 h-12 bg-emerald-600/15 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600/25 transition-colors">
                                <Globe className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Global Stock Statement</h2>
                            <p className="text-slate-400 text-sm mb-4">
                                Part-centric cross-vendor view. See customer demand vs. procurement vs. live vendor balance — per part, per OEM.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {['Customer Demand', 'Total Procured', 'Balance at Vendors', 'Stage', 'Rejections'].map(col => (
                                    <span key={col} className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full border border-slate-700">
                                        {col}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-5 flex items-center gap-2 text-emerald-400 text-sm font-medium group-hover:gap-3 transition-all">
                                Open statement →
                            </div>
                        </div>
                    </Link>

                    {/* Vendor Wise */}
                    <Link href="/dashboard/stock-statements/vendor-wise">
                        <div className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/10">
                            <div className="w-12 h-12 bg-indigo-600/15 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600/25 transition-colors">
                                <Layers className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Vendor Wise Stock Statement</h2>
                            <p className="text-slate-400 text-sm mb-4">
                                Per-vendor, per-challan breakdown of material issued, dispatched back, balance, casting defects, rejections, and WIP.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {['Challan No', 'Challan Date', 'Challan Qty', 'Dispatch Qty', 'Balance', 'Defects', 'Rejections', 'WIP'].map(col => (
                                    <span key={col} className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full border border-slate-700">
                                        {col}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-5 flex items-center gap-2 text-indigo-400 text-sm font-medium group-hover:gap-3 transition-all">
                                Open statement →
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
