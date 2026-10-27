import React from 'react';
import { Wallet } from 'lucide-react';

export default function VendorLedgerPage() {
    return (
        <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                    <Wallet className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Vendor Material Ledger</h1>
                    <p className="text-slate-500">Track running balance of material for each vendor.</p>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                <p>Backend modules and services are ready. Full UI component is pending implementation.</p>
            </div>
        </div>
    );
}
