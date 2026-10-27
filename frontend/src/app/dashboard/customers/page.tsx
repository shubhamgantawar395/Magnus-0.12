'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import {
    Plus, Building2, Search, Edit2, Package, Trash2,
    ChevronDown, ChevronUp, GripVertical, ArrowUp, ArrowDown, X, Layers
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stage {
    sequence: number;
    name: string;
}

interface Part {
    id: string;
    partNumber: string;
    description?: string;
    capacity: number;
    unit: string;
    stages?: Stage[];
}

// Common production stages for quick-add
const SUGGESTED_STAGES = [
    'Casting / Forging',
    'Turning',
    'Milling',
    'Drilling',
    'Broaching',
    'Grinding',
    'VMC',
    'CNC',
    'Heat Treatment',
    'Phosphating',
    'Painting',
    'Numbering / Marking',
    'Assembly',
    'Inspection / QC',
    'Packing',
];

// ── Stages Builder Component ──────────────────────────────────────────────────

function StagesBuilder({ stages, onChange }: { stages: Stage[]; onChange: (stages: Stage[]) => void }) {
    const [customInput, setCustomInput] = useState('');

    const addStage = (name: string) => {
        if (!name.trim()) return;
        if (stages.some(s => s.name.toLowerCase() === name.toLowerCase().trim())) {
            toast.error('Stage already added');
            return;
        }
        onChange([...stages, { sequence: stages.length + 1, name: name.trim() }]);
        setCustomInput('');
    };

    const removeStage = (idx: number) => {
        const updated = stages.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sequence: i + 1 }));
        onChange(updated);
    };

    const moveUp = (idx: number) => {
        if (idx === 0) return;
        const arr = [...stages];
        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
        onChange(arr.map((s, i) => ({ ...s, sequence: i + 1 })));
    };

    const moveDown = (idx: number) => {
        if (idx === stages.length - 1) return;
        const arr = [...stages];
        [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
        onChange(arr.map((s, i) => ({ ...s, sequence: i + 1 })));
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-200">
                <Layers className="inline w-4 h-4 mr-1 text-indigo-400" />
                Production Stages
                <span className="ml-2 text-xs text-slate-500 font-normal">(ordered — drag to reorder)</span>
            </label>

            {/* Current stages */}
            {stages.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {stages.map((stage, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                        >
                            <span className="w-5 h-5 flex items-center justify-center bg-indigo-600/30 text-indigo-300 text-xs font-bold rounded-full shrink-0">
                                {stage.sequence}
                            </span>
                            <span className="flex-1 text-sm text-white">{stage.name}</span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => moveUp(idx)}
                                    disabled={idx === 0}
                                    className="p-0.5 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"
                                    title="Move up"
                                >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => moveDown(idx)}
                                    disabled={idx === stages.length - 1}
                                    className="p-0.5 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"
                                    title="Move down"
                                >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => removeStage(idx)}
                                    className="p-0.5 text-slate-500 hover:text-red-400 transition-colors ml-1"
                                    title="Remove stage"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-xs text-slate-600 italic py-2 px-3 bg-slate-800/40 rounded-lg border border-dashed border-slate-700">
                    No stages added yet. Use the suggestions below or type a custom stage.
                </div>
            )}

            {/* Custom input */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStage(customInput); } }}
                    placeholder="Type a stage name and press Enter..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                    type="button"
                    onClick={() => addStage(customInput)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Quick suggestions */}
            <div>
                <p className="text-xs text-slate-500 mb-2">Quick add:</p>
                <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_STAGES.filter(s => !stages.some(st => st.name.toLowerCase() === s.toLowerCase())).map(s => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => addStage(s)}
                            className="text-xs px-2.5 py-1 bg-slate-700 hover:bg-indigo-600/40 hover:text-indigo-200 text-slate-400 rounded-full border border-slate-600 hover:border-indigo-500 transition-colors"
                        >
                            + {s}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomersAndPartsPage() {
    const { user } = useAuthStore();
    const [customers, setCustomers] = useState<any[]>([]);
    const [parts, setParts] = useState<Part[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

    const canEdit = ['admin', 'executive', 'platform_admin'].includes(user?.role || '');

    // Modals
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isPartModalOpen, setIsPartModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState<Part | null>(null);

    // Form States
    const [customerForm, setCustomerForm] = useState({
        companyName: '', gstin: '', address: '', state: '', contactPerson: ''
    });

    const [partForm, setPartForm] = useState({
        partNumber: '',
        description: '',
        capacity: 100,
        unit: 'NOS',
        stages: [] as Stage[],
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await apiClient.get('/customers');
            setCustomers(res.data.data || res.data);
        } catch { toast.error('Failed to load customers'); }
        finally { setLoading(false); }
    };

    const fetchPartsForCustomer = async (customerId: string) => {
        try {
            const res = await apiClient.get('/trays/config', { params: { customerId } });
            setParts(res.data.data || res.data);
        } catch { /* silent */ }
    };

    const openAddPart = (customerId: string) => {
        setEditingPart(null);
        setPartForm({ partNumber: '', description: '', capacity: 100, unit: 'NOS', stages: [] });
        setIsPartModalOpen(true);
    };

    const openEditPart = (part: Part) => {
        setEditingPart(part);
        setPartForm({
            partNumber: part.partNumber,
            description: part.description || '',
            capacity: part.capacity,
            unit: part.unit,
            stages: (part.stages || []).sort((a, b) => a.sequence - b.sequence),
        });
        setIsPartModalOpen(true);
    };

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.post('/customers', customerForm);
            toast.success('Customer created successfully');
            setIsCustomerModalOpen(false);
            setCustomerForm({ companyName: '', gstin: '', address: '', state: '', contactPerson: '' });
            fetchCustomers();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Error creating customer');
        }
    };

    const handleSavePart = async (e: React.FormEvent) => {
        e.preventDefault();
        if (partForm.stages.length === 0) {
            toast.error('Please add at least one production stage');
            return;
        }
        try {
            await apiClient.post('/trays/config', {
                customerId: expandedCustomer,
                partNumber: partForm.partNumber,
                description: partForm.description,
                capacity: partForm.capacity,
                unit: partForm.unit,
                stages: partForm.stages,
            });
            toast.success(editingPart ? 'Part updated successfully' : 'Part added successfully');
            setIsPartModalOpen(false);
            if (expandedCustomer) fetchPartsForCustomer(expandedCustomer);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Error saving part');
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Customers & Parts</h1>
                    <p className="text-slate-400">Manage OEM organizations and their designated parts with production stages.</p>
                </div>
                {canEdit && (
                    <button
                        onClick={() => setIsCustomerModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Add Customer
                    </button>
                )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="divide-y divide-slate-800">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Loading customers...</div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">No customers found.</div>
                    ) : (
                        filteredCustomers.map(customer => (
                            <div key={customer.id} className="bg-slate-900">
                                <div
                                    className="p-4 flex items-center justify-between hover:bg-slate-800/50 cursor-pointer transition-colors"
                                    onClick={() => {
                                        const isExpanding = expandedCustomer !== customer.id;
                                        setExpandedCustomer(isExpanding ? customer.id : null);
                                        if (isExpanding) {
                                            fetchPartsForCustomer(customer.id);
                                        } else {
                                            setParts([]); // clear when collapsing
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium">{customer.companyName}</h3>
                                            <p className="text-sm text-slate-400">{customer.code || customer.gstin || 'No Code'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden md:block">
                                            <p className="text-sm text-white">{customer.contactPerson}</p>
                                            <p className="text-xs text-slate-400">{customer.email}</p>
                                        </div>
                                        {expandedCustomer === customer.id ? (
                                            <ChevronUp className="w-5 h-5 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Parts View */}
                                {expandedCustomer === customer.id && (
                                    <div className="bg-slate-800/50 p-6 border-t border-slate-800">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-white font-medium flex items-center gap-2">
                                                <Package className="w-4 h-4 text-indigo-400" />
                                                Parts & Production Stages
                                            </h4>
                                            {canEdit && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openAddPart(customer.id); }}
                                                    className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Add Part
                                                </button>
                                            )}
                                        </div>

                                        <div className="mt-2">
                                            {parts.length > 0 ? (
                                                <div className="space-y-3">
                                                    {parts.map(part => (
                                                        <div key={part.id || part.partNumber} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-3 mb-1">
                                                                        <span className="font-mono font-bold text-white">{part.partNumber}</span>
                                                                        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                                                            {part.capacity} {part.unit}/tray
                                                                        </span>
                                                                        {(part.stages?.length ?? 0) > 0 && (
                                                                            <span className="text-xs text-indigo-400 bg-indigo-600/10 border border-indigo-600/20 px-2 py-0.5 rounded flex items-center gap-1">
                                                                                <Layers className="w-3 h-3" />
                                                                                {part.stages!.length} stages
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-slate-400">{part.description || '—'}</p>

                                                                    {/* Stages pipeline inline */}
                                                                    {(part.stages?.length ?? 0) > 0 && (
                                                                        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                                                                            {(part.stages || []).sort((a, b) => a.sequence - b.sequence).map((stage, idx) => (
                                                                                <div key={idx} className="flex items-center gap-1">
                                                                                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5">
                                                                                        <span className="w-4 h-4 flex items-center justify-center bg-indigo-600/30 text-indigo-300 text-[10px] font-bold rounded-full">
                                                                                            {stage.sequence}
                                                                                        </span>
                                                                                        {stage.name}
                                                                                    </span>
                                                                                    {idx < (part.stages!.length - 1) && (
                                                                                        <span className="text-slate-600 text-xs">→</span>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {canEdit && (
                                                                    <button
                                                                        onClick={() => openEditPart(part)}
                                                                        className="text-slate-500 hover:text-indigo-400 transition-colors shrink-0"
                                                                        title="Edit stages"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center text-slate-400 text-sm">
                                                    No parts defined yet. Click 'Add Part' to register a component with its production stages.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── Customer Modal ─────────────────────────────────────────────────────── */}
            {isCustomerModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">Add New Customer</h2>
                        <form onSubmit={handleCreateCustomer} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Company Name</label>
                                    <input required type="text" value={customerForm.companyName} onChange={e => setCustomerForm({ ...customerForm, companyName: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">GSTIN</label>
                                    <input type="text" value={customerForm.gstin} onChange={e => setCustomerForm({ ...customerForm, gstin: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-300 mb-1">State / Region</label>
                                    <input type="text" value={customerForm.state} onChange={e => setCustomerForm({ ...customerForm, state: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Contact Person</label>
                                    <input type="text" value={customerForm.contactPerson} onChange={e => setCustomerForm({ ...customerForm, contactPerson: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
                                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg">Cancel</button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium">Save Customer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Part Modal (with Stages Builder) ──────────────────────────────────── */}
            {isPartModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 py-8 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-xl shadow-2xl my-auto">
                        <h2 className="text-xl font-bold text-white mb-1">
                            {editingPart ? `Edit Part: ${editingPart.partNumber}` : 'Add New Part'}
                        </h2>
                        <p className="text-slate-500 text-sm mb-5">
                            Define the part details and its ordered production stages (the route the part takes through vendors).
                        </p>

                        <form onSubmit={handleSavePart} className="space-y-5">
                            {/* Part basics */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Part Number <span className="text-red-400">*</span></label>
                                    <input
                                        required type="text"
                                        value={partForm.partNumber}
                                        onChange={e => setPartForm({ ...partForm, partNumber: e.target.value })}
                                        placeholder="e.g. 16706"
                                        disabled={!!editingPart}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Part Name / Description <span className="text-red-400">*</span></label>
                                    <input
                                        required type="text"
                                        value={partForm.description}
                                        onChange={e => setPartForm({ ...partForm, description: e.target.value })}
                                        placeholder="e.g. Rotor Hub"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Tray Capacity</label>
                                    <input
                                        type="number" min="1"
                                        value={partForm.capacity}
                                        onChange={e => setPartForm({ ...partForm, capacity: parseInt(e.target.value) })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Unit of Measure</label>
                                    <input
                                        type="text"
                                        value={partForm.unit}
                                        onChange={e => setPartForm({ ...partForm, unit: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Stages builder */}
                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                <StagesBuilder
                                    stages={partForm.stages}
                                    onChange={stages => setPartForm({ ...partForm, stages })}
                                />
                            </div>

                            {partForm.stages.length === 0 && (
                                <p className="text-amber-400 text-xs flex items-center gap-1.5">
                                    ⚠️ At least one production stage is required before saving.
                                </p>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                <button type="button" onClick={() => setIsPartModalOpen(false)} className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={partForm.stages.length === 0}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                                >
                                    <Layers className="w-4 h-4" />
                                    {editingPart ? 'Update Part' : 'Register Part'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
