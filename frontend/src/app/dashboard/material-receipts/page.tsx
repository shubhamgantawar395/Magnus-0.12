import React from 'react';
import { ArrowDownToLine } from 'lucide-react';

export default function MaterialReceiptsPage() {
    return (
        <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                    <ArrowDownToLine className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gate Material Receipts</h1>
                    <p className="text-slate-500">Log incoming material from vendors and manage gate inspection.</p>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                <p>Backend modules and services are ready. Full UI component is pending implementation.</p>
            </div>
        </div>
    );
}
