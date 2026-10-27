'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import {
    Brain, Plus, Pencil, Trash2, CheckCircle, Users, Factory,
    Settings, ArrowLeft, ThumbsDown, ThumbsUp, Tag, Shield,
    BookOpen, FileText, Zap, ChevronDown, X, Check, Search,
    MessageSquare, AlertTriangle, SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ───────────────────────────────────────────────────────────────────────

type KnowledgeCategory =
    | 'customer_profile'
    | 'vendor_profile'
    | 'part_profile'
    | 'business_rule'
    | 'sop'
    | 'company_context';

interface KnowledgeItem {
    id: string;
    category: KnowledgeCategory;
    title: string;
    content: string;
    tags: string[];
    visibleToRoles: string[];
    isActive: boolean;
    createdAt: string;
    createdBy?: { firstName: string; lastName: string; role: string };
}

interface AiFeedback {
    id: string;
    query: string;
    response: string;
    rating: number;
    reason?: string;
    comment?: string;
    createdAt: string;
    user?: { firstName: string; lastName: string; role: string };
}

// ── Constants ───────────────────────────────────────────────────────────────────

const CATEGORIES: { value: KnowledgeCategory; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
    { value: 'customer_profile', label: 'Customer Profiles', icon: <Users className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { value: 'vendor_profile', label: 'Vendor Profiles', icon: <Factory className="w-4 h-4" />, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { value: 'part_profile', label: 'Part Profiles', icon: <Settings className="w-4 h-4" />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { value: 'business_rule', label: 'Business Rules', icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { value: 'sop', label: 'SOPs', icon: <FileText className="w-4 h-4" />, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { value: 'company_context', label: 'Company Context', icon: <BookOpen className="w-4 h-4" />, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
];

const ALL_ROLES = [
    { value: 'director', label: 'Director' },
    { value: 'gm', label: 'General Manager' },
    { value: 'executive', label: 'Executive' },
    { value: 'plant_head', label: 'Plant Head' },
    { value: 'ppc_manager', label: 'PPC Manager' },
    { value: 'production_manager', label: 'Production Manager' },
    { value: 'store_keeper', label: 'Store Keeper' },
    { value: 'accounts_manager', label: 'Accounts Manager' },
    { value: 'quality_head', label: 'Quality Head' },
    { value: 'quality_supervisor', label: 'Quality Supervisor' },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

// ── Form State ──────────────────────────────────────────────────────────────────

interface FormState {
    category: KnowledgeCategory;
    title: string;
    content: string;
    tags: string;
    visibleToRoles: string[];
}

const EMPTY_FORM: FormState = {
    category: 'customer_profile',
    title: '',
    content: '',
    tags: '',
    visibleToRoles: [],
};

// ── Main Page ───────────────────────────────────────────────────────────────────

export default function KnowledgeCenterPage() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [activeTab, setActiveTab] = useState<'knowledge' | 'feedback'>('knowledge');
    const [items, setItems] = useState<KnowledgeItem[]>([]);
    const [feedback, setFeedback] = useState<AiFeedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'negative' | 'positive'>('all');

    // ── Auth guard ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) { router.push('/login'); return; }
        if (!['admin', 'director', 'gm', 'plant_head'].includes(user.role)) {
            router.replace('/dashboard');
        }
    }, [user, router]);

    // ── Data fetch ────────────────────────────────────────────────────────────
    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/ai-knowledge?isActive=true');
            setItems(res.data);
        } catch {
            toast.error('Failed to load knowledge base');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchFeedback = useCallback(async () => {
        try {
            const res = await apiClient.get('/ai-feedback');
            setFeedback(res.data);
        } catch {
            toast.error('Failed to load feedback');
        }
    }, []);

    useEffect(() => {
        fetchItems();
        fetchFeedback();
    }, [fetchItems, fetchFeedback]);

    // ── Form handlers ─────────────────────────────────────────────────────────
    const openCreate = () => {
        setEditingItem(null);
        setForm(EMPTY_FORM);
        setShowForm(true);
    };

    const openEdit = (item: KnowledgeItem) => {
        setEditingItem(item);
        setForm({
            category: item.category,
            title: item.title,
            content: item.content,
            tags: item.tags.join(', '),
            visibleToRoles: item.visibleToRoles,
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.title.trim() || !form.content.trim()) {
            toast.error('Title and content are required');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                category: form.category,
                title: form.title.trim(),
                content: form.content.trim(),
                tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
                visibleToRoles: form.visibleToRoles,
            };
            if (editingItem) {
                await apiClient.patch(`/ai-knowledge/${editingItem.id}`, payload);
                toast.success('Knowledge item updated');
            } else {
                await apiClient.post('/ai-knowledge', payload);
                toast.success('Knowledge item created');
            }
            setShowForm(false);
            await fetchItems();
        } catch {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Archive this knowledge item? It will no longer be shown to JARVIS.')) return;
        try {
            await apiClient.delete(`/ai-knowledge/${id}`);
            toast.success('Item archived');
            await fetchItems();
        } catch {
            toast.error('Failed to archive');
        }
    };

    const toggleRole = (role: string) => {
        setForm(f => ({
            ...f,
            visibleToRoles: f.visibleToRoles.includes(role)
                ? f.visibleToRoles.filter(r => r !== role)
                : [...f.visibleToRoles, role],
        }));
    };

    // ── Filtered items ────────────────────────────────────────────────────────
    const filtered = items.filter(item => {
        const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
        const q = searchQuery.toLowerCase();
        const matchSearch = !q || item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q) || item.tags.some(t => t.toLowerCase().includes(q));
        return matchCat && matchSearch;
    });

    const filteredFeedback = feedback.filter(f => {
        if (feedbackFilter === 'positive') return f.rating === 1;
        if (feedbackFilter === 'negative') return f.rating === -1;
        return true;
    });

    const negativeCount = feedback.filter(f => f.rating === -1).length;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* ── Header ────────────────────────────────────────────────────── */}
            <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/admin" className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                <Brain className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-base font-semibold text-white">Knowledge Center</h1>
                                <p className="text-xs text-slate-500">Train JARVIS with business context</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
                            <button
                                onClick={() => setActiveTab('knowledge')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'knowledge' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Knowledge Base
                            </button>
                            <button
                                onClick={() => setActiveTab('feedback')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'feedback' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Feedback
                                {negativeCount > 0 && (
                                    <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{negativeCount}</span>
                                )}
                            </button>
                        </div>
                        {activeTab === 'knowledge' && (
                            <button
                                onClick={openCreate}
                                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-all shadow shadow-violet-500/20 hover:shadow-violet-500/30"
                            >
                                <Plus className="w-4 h-4" />
                                Add Knowledge
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* ── JARVIS status banner ──────────────────────────────────── */}
                <div className="mb-8 rounded-2xl bg-gradient-to-r from-violet-900/30 via-indigo-900/20 to-slate-900/30 border border-violet-500/20 p-6 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-semibold text-violet-200 mb-1">What you enter here trains JARVIS</p>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Every item in this Knowledge Base is automatically injected into JARVIS's context before it responds.
                            Add Vendor Profiles like <span className="text-slate-300 font-medium">"Sharma Machining turns around CNC jobs in 5 days on average"</span> so JARVIS
                            can tell you when something is running longer than normal. Add Customer Profiles, Business Rules, SOPs — anything
                            that helps JARVIS reason, not just report.
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            <span className="font-medium text-violet-400">{items.length} knowledge item{items.length !== 1 ? 's' : ''}</span> active · All injected into every JARVIS conversation
                        </p>
                    </div>
                </div>

                {activeTab === 'knowledge' ? (
                    <>
                        {/* ── Category filter + search ──────────────────────── */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border ${selectedCategory === 'all' ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'}`}
                                >
                                    <SlidersHorizontal className="w-3.5 h-3.5" />
                                    All ({items.length})
                                </button>
                                {CATEGORIES.map(cat => {
                                    const count = items.filter(i => i.category === cat.value).length;
                                    return (
                                        <button
                                            key={cat.value}
                                            onClick={() => setSelectedCategory(cat.value)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border ${selectedCategory === cat.value ? `${cat.bg} ${cat.color} border-current` : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'}`}
                                        >
                                            {cat.icon}
                                            {cat.label} {count > 0 && `(${count})`}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="relative shrink-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 w-48"
                                />
                            </div>
                        </div>

                        {/* ── Knowledge items grid ──────────────────────────── */}
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-800/50 rounded-2xl animate-pulse" />)}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                                    <Brain className="w-8 h-8 text-slate-600" />
                                </div>
                                <p className="text-slate-400 font-medium mb-1">No knowledge items yet</p>
                                <p className="text-slate-600 text-sm mb-4">Add your first item to start training JARVIS</p>
                                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-all">
                                    <Plus className="w-4 h-4" /> Add Knowledge Item
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filtered.map(item => {
                                    const cat = CATEGORY_MAP[item.category];
                                    const isExpanded = expandedItem === item.id;
                                    return (
                                        <div key={item.id} className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-slate-900/50 flex flex-col gap-3">
                                            {/* Card header */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${cat.bg} ${cat.color}`}>
                                                        {cat.icon} {cat.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors" title="Edit">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors" title="Archive">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Title */}
                                            <h3 className="font-semibold text-slate-100 text-sm leading-snug">{item.title}</h3>

                                            {/* Content */}
                                            <p className={`text-slate-400 text-sm leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                                                {item.content}
                                            </p>
                                            {item.content.length > 150 && (
                                                <button onClick={() => setExpandedItem(isExpanded ? null : item.id)} className="text-xs text-violet-400 hover:text-violet-300 transition-colors text-left">
                                                    {isExpanded ? 'Show less' : 'Show more'}
                                                </button>
                                            )}

                                            {/* Tags */}
                                            {item.tags.length > 0 && (
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <Tag className="w-3 h-3 text-slate-600" />
                                                    {item.tags.map(tag => (
                                                        <span key={tag} className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Access */}
                                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                                                <Shield className="w-3 h-3 text-slate-600" />
                                                <span className="text-xs text-slate-600">
                                                    {item.visibleToRoles.length === 0 ? 'Visible to all internal roles' : `Restricted: ${item.visibleToRoles.join(', ')}`}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    /* ── Feedback tab ──────────────────────────────────────── */
                    <>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
                                {(['all', 'negative', 'positive'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFeedbackFilter(f)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${feedbackFilter === f ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        {f === 'negative' && <ThumbsDown className="w-3.5 h-3.5" />}
                                        {f === 'positive' && <ThumbsUp className="w-3.5 h-3.5" />}
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                        {f === 'negative' && negativeCount > 0 && (
                                            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{negativeCount}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm text-slate-500">
                                Use thumbs-down responses to identify gaps in your knowledge base
                            </p>
                        </div>

                        {filteredFeedback.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <MessageSquare className="w-12 h-12 text-slate-700 mb-4" />
                                <p className="text-slate-400 font-medium">No feedback yet</p>
                                <p className="text-slate-600 text-sm mt-1">Thumbs up/down on JARVIS responses will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredFeedback.map(f => (
                                    <div key={f.id} className={`bg-slate-900 border rounded-2xl p-5 ${f.rating === -1 ? 'border-red-500/20' : 'border-emerald-500/20'}`}>
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${f.rating === -1 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                                    {f.rating === -1 ? <ThumbsDown className="w-3 h-3" /> : <ThumbsUp className="w-3 h-3" />}
                                                    {f.rating === -1 ? 'Not helpful' : 'Helpful'}
                                                </span>
                                                {f.reason && (
                                                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">{f.reason.replace(/_/g, ' ')}</span>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-600">
                                                {f.user ? `${f.user.firstName} ${f.user.lastName}` : 'User'} · {new Date(f.createdAt).toLocaleDateString('en-IN')}
                                            </span>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Query</p>
                                                <p className="text-slate-300 bg-slate-800/60 rounded-lg px-3 py-2">{f.query}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">JARVIS Response</p>
                                                <p className="text-slate-400 bg-slate-800/40 rounded-lg px-3 py-2 text-xs leading-relaxed line-clamp-4">{f.response}</p>
                                            </div>
                                            {f.comment && (
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Comment</p>
                                                    <p className="text-slate-300 italic text-xs">"{f.comment}"</p>
                                                </div>
                                            )}
                                        </div>
                                        {f.rating === -1 && (
                                            <div className="mt-3 pt-3 border-t border-slate-800">
                                                <button
                                                    onClick={() => {
                                                        setActiveTab('knowledge');
                                                        openCreate();
                                                    }}
                                                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" /> Add knowledge to fix this gap
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Slide-over form ─────────────────────────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
                    <div className="relative ml-auto w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full">
                        {/* Form header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <div>
                                <h2 className="font-semibold text-white">{editingItem ? 'Edit Knowledge Item' : 'Add Knowledge Item'}</h2>
                                <p className="text-xs text-slate-500 mt-0.5">This will be injected into every JARVIS conversation</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Category */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Category</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.value}
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${form.category === cat.value ? `${cat.bg} ${cat.color} border-current` : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
                                        >
                                            {cat.icon} {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Title</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="e.g. Eaton — Customer Profile"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>

                            {/* Content */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Content</label>
                                <textarea
                                    value={form.content}
                                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                                    placeholder="Write the knowledge here. Be specific and factual. JARVIS will use this verbatim when reasoning about related queries."
                                    rows={6}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none leading-relaxed"
                                />
                                <p className="text-xs text-slate-600 mt-1">Good: "Sharma Machining averages 5 days on CNC turning jobs. Consistently delays on grinding (8–10 days)." — Be specific, not vague.</p>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Tags <span className="text-slate-600 font-normal normal-case">(comma separated)</span></label>
                                <input
                                    type="text"
                                    value={form.tags}
                                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                                    placeholder="eaton, lead-time, critical"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>

                            {/* Role access */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                                    <Shield className="w-3 h-3 inline mr-1" />
                                    Access Control
                                </label>
                                <p className="text-xs text-slate-500 mb-3">Check roles that can see this in JARVIS. Leave all unchecked = visible to all internal roles.</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {ALL_ROLES.map(role => {
                                        const selected = form.visibleToRoles.includes(role.value);
                                        return (
                                            <button
                                                key={role.value}
                                                type="button"
                                                onClick={() => toggleRole(role.value)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${selected ? 'bg-violet-500/10 border-violet-500/30 text-violet-300' : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
                                            >
                                                <div className={`w-4 h-4 rounded flex items-center justify-center border ${selected ? 'bg-violet-600 border-violet-600' : 'border-slate-600'}`}>
                                                    {selected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                {role.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Form footer */}
                        <div className="p-6 border-t border-slate-800 flex items-center gap-3">
                            <button
                                onClick={() => setShowForm(false)}
                                className="flex-1 px-4 py-2.5 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.title.trim() || !form.content.trim()}
                                className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow shadow-violet-500/20"
                            >
                                {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add to Knowledge Base'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
