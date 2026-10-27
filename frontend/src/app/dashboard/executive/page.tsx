'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import TeamStatusPanel from '@/components/TeamStatusPanel';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Package,
    Truck,
    Search,
    Users,
    ChevronRight,
    Activity,
    Loader2,
    ArrowUpRight,
    Circle,
    RefreshCw,
    DollarSign,
    FileText,
    SendHorizonal,
    Bot,
    BrainCircuit,
    Sun,
    TrendingUp,
    ShieldAlert,
    Volume2,
    VolumeX,
    Mic,
    MicOff,
    Square,
} from 'lucide-react';
import {
    executiveService,
    type PartOverview,
    type CustomerHealth,
    type TrackedPart,
    type MorningBriefing,
    type BriefingKPIs,
} from '@/services/executive.service';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

// ── Stage / Health Config ─────────────────────────────────────────────────────

const STAGE_CONFIG = {
    raw: { label: 'Raw Material', color: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-500' },
    wip: { label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
    finished: { label: 'Ready to Dispatch', color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
    dispatched: { label: 'Dispatched', color: 'text-violet-400', bg: 'bg-violet-500/10', dot: 'bg-violet-500' },
};

const HEALTH_CONFIG = {
    overdue: { label: 'Overdue', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', badge: 'bg-red-500/15 text-red-400' },
    at_risk: { label: 'At Risk', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', badge: 'bg-amber-500/15 text-amber-400' },
    on_track: { label: 'On Track', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', badge: 'bg-emerald-500/15 text-emerald-400' },
    no_deadline: { label: 'No Deadline', color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20', badge: 'bg-slate-500/15 text-slate-500' },
};

// ── Voice Utilities ───────────────────────────────────────────────────────────

function getTimeOfDay() {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
}

function formatINR(value: number) {
    if (value >= 10000000) return `${(value / 10000000).toFixed(1)} crore rupees`;
    if (value >= 100000) return `${(value / 100000).toFixed(1)} lakh rupees`;
    return `${value.toLocaleString('en-IN')} rupees`;
}

function buildBriefingScript(firstName: string, kpis: BriefingKPIs, customers: MorningBriefing['customers']): string {
    const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    const parts: string[] = [];

    parts.push(`Good ${getTimeOfDay()}, ${firstName}. Today is ${date}. Here is your morning operations briefing.`);

    // PO status
    if (kpis.pendingApprovals > 0) {
        parts.push(`You have ${kpis.pendingApprovals} purchase order${kpis.pendingApprovals > 1 ? 's' : ''} pending your approval.`);
    } else {
        parts.push(`No purchase orders are awaiting your approval.`);
    }

    if (kpis.approvedPOValue > 0) {
        parts.push(`Total value of approved and in-progress purchase orders stands at ${formatINR(kpis.approvedPOValue)}.`);
    }

    // Material at vendor
    if (kpis.materialAtVendor > 0) {
        parts.push(`There are currently ${kpis.materialAtVendor} delivery challan${kpis.materialAtVendor > 1 ? 's' : ''} with material dispatched to vendors.`);
    }

    if (kpis.overdueChallans > 0) {
        parts.push(`Alert: ${kpis.overdueChallans} challan${kpis.overdueChallans > 1 ? 's have' : ' has'} been at the vendor for more than 7 days without return. Please follow up.`);
    } else {
        parts.push(`All material dispatched to vendors is within acceptable timeframes.`);
    }

    // Vendors and jobs
    parts.push(`${kpis.activeVendors} vendor${kpis.activeVendors !== 1 ? 's are' : ' is'} currently active.`);

    if (kpis.jobsCompletedToday > 0) {
        parts.push(`${kpis.jobsCompletedToday} job process${kpis.jobsCompletedToday > 1 ? 'es have' : ' has'} been completed so far today.`);
    }

    if (kpis.draftPOs > 0) {
        parts.push(`${kpis.draftPOs} purchase order${kpis.draftPOs > 1 ? 's remain' : ' remains'} in draft and ${kpis.draftPOs > 1 ? 'have' : 'has'} not been submitted for approval.`);
    }

    // Customers
    if (customers.length > 0) {
        const names = customers.map(c => c.companyName);
        if (names.length <= 3) {
            parts.push(`Your active customers are: ${names.join(', ')}.`);
        } else {
            parts.push(`You have ${names.length} active customers, including ${names.slice(0, 3).join(', ')}, and others.`);
        }
    }

    parts.push(`End of briefing. Have a productive ${getTimeOfDay()}.`);
    return parts.join(' ');
}

function useSpeech() {
    const [speaking, setSpeaking] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const speak = useCallback((text: string) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utter;

        // Select best available voice — prefer Neural/Online, then Google, then any English
        const voices = window.speechSynthesis.getVoices();
        const preferred = (
            voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online'))) ??
            voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ??
            voices.find(v => v.lang.startsWith('en'))
        ) ?? null;
        if (preferred) utter.voice = preferred;

        const isNatural = preferred?.name.includes('Natural') || preferred?.name.includes('Online') || preferred?.name.includes('Google');
        // Energetic delivery — Natural voices at 1.08x, legacy at 0.93x
        utter.rate = isNatural ? 1.08 : 0.93;
        utter.pitch = isNatural ? 1.04 : 0.88;
        utter.volume = 1;
        utter.onstart = () => setSpeaking(true);
        utter.onend = () => setSpeaking(false);
        utter.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utter);
    }, []);

    const stop = useCallback(() => {
        if (typeof window === 'undefined') return;
        window.speechSynthesis.cancel();
        setSpeaking(false);
    }, []);

    // Voices load asynchronously
    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.speechSynthesis.onvoiceschanged = () => { /* trigger re-render if needed */ };
    }, []);

    return { speak, stop, speaking };
}

function useMic(onResult: (text: string) => void) {
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const startListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Voice input not supported in this browser.');
            return;
        }
        const rec = new SpeechRecognition();
        recognitionRef.current = rec;
        rec.lang = 'en-IN';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.onstart = () => setListening(true);
        rec.onresult = (e: any) => {
            const text = e.results[0][0].transcript;
            onResult(text);
        };
        rec.onerror = () => setListening(false);
        rec.onend = () => setListening(false);
        rec.start();
    }, [onResult]);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setListening(false);
    }, []);

    return { startListening, stopListening, listening };
}

// ── Sub-Components ────────────────────────────────────────────────────────────

function ProcessPipeline({ pipeline }: { pipeline: TrackedPart['pipeline'] }) {
    if (pipeline.length === 0) {
        return <span className="text-xs text-slate-600 italic">No processes defined</span>;
    }
    return (
        <div className="flex items-center gap-1 flex-wrap">
            {pipeline.map((step, i) => {
                const colors = step.status === 'completed'
                    ? 'bg-emerald-500 text-white'
                    : step.status === 'in_progress'
                        ? 'bg-blue-500 text-white animate-pulse'
                        : step.status === 'rejected'
                            ? 'bg-red-500 text-white'
                            : 'bg-slate-700 text-slate-400';
                const pct = step.target ? Math.round((step.completed / step.target) * 100) : 0;
                return (
                    <div key={step.id} className="flex items-center gap-1">
                        <div
                            title={`${step.name}: ${step.completed}/${step.target ?? '?'} (${pct}%)`}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium ${colors}`}
                        >
                            {i + 1}. {step.name}
                            {step.status === 'in_progress' && <span className="opacity-80">{pct}%</span>}
                        </div>
                        {i < pipeline.length - 1 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                    </div>
                );
            })}
        </div>
    );
}

function CustomerCard({ c, onClick }: { c: CustomerHealth; onClick: () => void }) {
    const healthPct = c.total > 0 ? Math.round((c.onTrack / c.total) * 100) : 0;
    const overduePct = c.total > 0 ? Math.round((c.overdue / c.total) * 100) : 0;
    const atRiskPct = c.total > 0 ? Math.round((c.atRisk / c.total) * 100) : 0;
    const status = c.overdue > 0 ? 'danger' : c.atRisk > 0 ? 'warning' : 'healthy';
    const statusColors = {
        danger: 'border-red-500/40 hover:border-red-500/70',
        warning: 'border-amber-500/40 hover:border-amber-500/70',
        healthy: 'border-emerald-500/30 hover:border-emerald-500/60',
    };
    const dotColors = { danger: 'bg-red-500', warning: 'bg-amber-500', healthy: 'bg-emerald-500' };

    return (
        <button
            onClick={onClick}
            className={`w-full text-left bg-slate-900/60 border ${statusColors[status]} rounded-2xl p-5 transition-all duration-300 hover:bg-slate-900/80 hover:scale-[1.02] group`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${dotColors[status]}`} />
                    <h3 className="text-white font-bold text-lg leading-tight">{c.name}</h3>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
                {c.overdue > 0 && (
                    <div className="bg-red-500/10 rounded-lg p-2 text-center">
                        <p className="text-red-400 font-bold text-xl">{c.overdue}</p>
                        <p className="text-red-400/70 text-xs">Overdue</p>
                    </div>
                )}
                {c.atRisk > 0 && (
                    <div className="bg-amber-500/10 rounded-lg p-2 text-center">
                        <p className="text-amber-400 font-bold text-xl">{c.atRisk}</p>
                        <p className="text-amber-400/70 text-xs">At Risk</p>
                    </div>
                )}
                <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
                    <p className="text-emerald-400 font-bold text-xl">{c.readyToDispatch}</p>
                    <p className="text-emerald-400/70 text-xs">Ready</p>
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                    <span>{c.total} parts total</span>
                    <span>{healthPct}% on track</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-red-500 transition-all" style={{ width: `${overduePct}%` }} />
                    <div className="h-full bg-amber-500 transition-all" style={{ width: `${atRiskPct}%` }} />
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${healthPct}%` }} />
                </div>
            </div>
        </button>
    );
}

// ── Jarvis Chat Panel (with Voice) ────────────────────────────────────────────

interface ChatMessage { role: 'user' | 'jarvis'; text: string; }

function JarvisPanel({ userName }: { userName: string }) {
    const { speak, stop, speaking } = useSpeech();
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'jarvis', text: `Good ${getTimeOfDay()}, ${userName}. J.A.R.V.I.S. online — wired into live Postgres. Challans, invoices, POs, parts, vendors — all live data, right now. What do you need?` }
    ]);
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    const handleResult = useCallback((text: string) => setInput(text), []);
    const { startListening, stopListening, listening } = useMic(handleResult);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (overridePrompt?: string) => {
        const prompt = (overridePrompt ?? input).trim();
        if (!prompt || thinking) return;
        setInput('');
        setMessages(m => [...m, { role: 'user', text: prompt }]);
        setThinking(true);
        try {
            const res = await apiClient.post('/ai/chat', { prompt });
            const reply = res.data?.response ?? 'No response received.';
            setMessages(m => [...m, { role: 'jarvis', text: reply }]);
            if (voiceEnabled) speak(reply);
        } catch {
            const errMsg = 'I was unable to process that request. Please try again.';
            setMessages(m => [...m, { role: 'jarvis', text: errMsg }]);
            if (voiceEnabled) speak(errMsg);
        } finally {
            setThinking(false);
        }
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const toggleMic = () => {
        if (listening) stopListening();
        else startListening();
    };

    return (
        <Card className="bg-slate-900/60 border border-indigo-500/30 flex flex-col h-[520px]">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
                <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                    <BrainCircuit className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm">J.A.R.V.I.S.</h3>
                    <p className="text-slate-500 text-xs">Operations Intelligence · Powered by Claude</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    {/* Voice toggle for responses */}
                    <button
                        onClick={() => { setVoiceEnabled(v => !v); if (speaking) stop(); }}
                        title={voiceEnabled ? 'Mute Jarvis voice' : 'Enable Jarvis voice'}
                        className={`p-1.5 rounded-lg transition-colors ${voiceEnabled ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                    >
                        {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-emerald-400 text-xs">Online</span>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'jarvis' && (
                            <div className="w-7 h-7 shrink-0 rounded-full bg-indigo-500/20 flex items-center justify-center mt-0.5">
                                <Bot className="w-4 h-4 text-indigo-400" />
                            </div>
                        )}
                        <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                            msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-sm'
                                : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                        }`}>
                            {msg.text}
                        </div>
                        {/* Replay button on jarvis messages */}
                        {msg.role === 'jarvis' && voiceEnabled && (
                            <button
                                onClick={() => speak(msg.text)}
                                className="self-end mb-1 p-1 text-slate-600 hover:text-indigo-400 transition-colors"
                                title="Replay"
                            >
                                <Volume2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                ))}
                {thinking && (
                    <div className="flex gap-2.5 justify-start">
                        <div className="w-7 h-7 shrink-0 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="bg-slate-800 px-3.5 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Suggested queries */}
            <div className="px-4 pb-2 flex gap-2 flex-wrap">
                {['Pending PO approvals', 'Material at vendor', 'Parts ready to dispatch'].map(s => (
                    <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full border border-slate-700 transition-colors"
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Input row */}
            <div className="px-4 pb-4">
                <div className="flex gap-2 bg-slate-800 rounded-xl border border-slate-700 focus-within:border-indigo-500/50 transition-colors">
                    {/* Mic button */}
                    <button
                        onClick={toggleMic}
                        title={listening ? 'Stop listening' : 'Speak to Jarvis'}
                        className={`pl-3 transition-colors ${listening ? 'text-red-400 animate-pulse' : 'text-slate-500 hover:text-indigo-400'}`}
                    >
                        {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder={listening ? 'Listening...' : 'Ask J.A.R.V.I.S. anything...'}
                        className="flex-1 bg-transparent px-2 py-3 text-sm text-white placeholder-slate-500 outline-none"
                        disabled={thinking}
                    />
                    {speaking ? (
                        <button onClick={stop} className="px-3 text-red-400 hover:text-red-300 transition-colors" title="Stop speaking">
                            <Square className="w-4 h-4 fill-current" />
                        </button>
                    ) : (
                        <button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || thinking}
                            className="px-3 text-indigo-400 hover:text-indigo-300 disabled:opacity-30 transition-colors"
                        >
                            <SendHorizonal className="w-4 h-4" />
                        </button>
                    )}
                </div>
                {listening && (
                    <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse inline-block" />
                        Listening — speak now, then press mic to confirm
                    </p>
                )}
            </div>
        </Card>
    );
}

// ── Voice Briefing Button ─────────────────────────────────────────────────────

function VoiceBriefingButton({ briefing, firstName }: { briefing: MorningBriefing; firstName: string }) {
    const { speak, stop, speaking } = useSpeech();

    const handlePlay = () => {
        if (speaking) { stop(); return; }
        const script = buildBriefingScript(firstName, briefing.kpis, briefing.customers);
        speak(script);
    };

    return (
        <button
            onClick={handlePlay}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 border ${
                speaking
                    ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
                    : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/25'
            }`}
            title={speaking ? 'Stop briefing' : 'Play voice briefing'}
        >
            {speaking ? (
                <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop Briefing</span>
                    {/* Sound wave animation */}
                    <span className="flex gap-0.5 items-end h-4">
                        {[1,2,3,4,3,2].map((h, i) => (
                            <span key={i} className="w-0.5 bg-red-400 rounded-full animate-bounce"
                                style={{ height: `${h * 3}px`, animationDelay: `${i * 80}ms` }} />
                        ))}
                    </span>
                </>
            ) : (
                <>
                    <Volume2 className="w-4 h-4" />
                    <span>Play Briefing</span>
                </>
            )}
        </button>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function ExecutiveDashboard() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<PartOverview | null>(null);
    const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
    const [urgentParts, setUrgentParts] = useState<TrackedPart[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [customerParts, setCustomerParts] = useState<TrackedPart[]>([]);
    const [customerPartsLoading, setCustomerPartsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (user && user.role === 'vendor') {
            router.push('/dashboard/vendor');
            return;
        }
        fetchData();
    }, [user, router]);

    const fetchData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            const [ovRes, urgentRes, briefRes] = await Promise.all([
                executiveService.getPartOverview(),
                executiveService.getPartTracker({ status: 'overdue' }).catch(() => ({ data: [], summary: { total: 0, byStage: { raw: 0, wip: 0, finished: 0, dispatched: 0 } } })),
                executiveService.getMorningBriefing().catch(() => null),
            ]);
            const atRiskRes = await executiveService.getPartTracker({ status: 'at_risk' }).catch(() => ({ data: [], summary: { total: 0, byStage: { raw: 0, wip: 0, finished: 0, dispatched: 0 } } }));

            setOverview(ovRes);
            setBriefing(briefRes);
            const merged = [...urgentRes.data, ...atRiskRes.data].sort((a, b) => {
                if (a.scheduleHealth === 'overdue' && b.scheduleHealth !== 'overdue') return -1;
                if (b.scheduleHealth === 'overdue' && a.scheduleHealth !== 'overdue') return 1;
                if (a.daysRemaining !== null && b.daysRemaining !== null) return a.daysRemaining - b.daysRemaining;
                return 0;
            });
            setUrgentParts(merged);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const handleCustomerClick = async (customerId: string) => {
        if (selectedCustomerId === customerId) {
            setSelectedCustomerId(null);
            setCustomerParts([]);
            return;
        }
        setSelectedCustomerId(customerId);
        setCustomerPartsLoading(true);
        try {
            const res = await executiveService.getCustomerParts(customerId);
            setCustomerParts(res.data.filter(p => p.stage !== 'dispatched'));
        } catch {
            toast.error('Failed to load customer parts');
        } finally {
            setCustomerPartsLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    <p className="text-slate-400 text-sm">Preparing your briefing...</p>
                </div>
            </div>
        );
    }

    const kpis = overview?.kpis;
    const customers = overview?.customers ?? [];
    const bkpis = briefing?.kpis;
    const firstName = user?.firstName ?? 'Director';

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-8 space-y-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Sun className="w-5 h-5 text-amber-400" />
                            <span className="text-amber-400 text-sm font-medium">Good {getTimeOfDay()}, {firstName}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white">Executive War Room</h1>
                        <p className="text-slate-400 mt-1">
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Voice Briefing */}
                        {briefing && <VoiceBriefingButton briefing={briefing} firstName={firstName} />}

                        <button
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <Link href="/dashboard/executive/parts" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                            <Search className="w-4 h-4" />
                            Part Tracker
                        </Link>
                    </div>
                </div>

                {/* ── Morning Briefing KPIs ── */}
                {bkpis && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-indigo-400" />
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Morning Briefing</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <Card className="bg-amber-500/10 border border-amber-500/20 p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-amber-400" />
                                    <p className="text-xs text-amber-400/70">Pending Approvals</p>
                                </div>
                                <p className="text-3xl font-bold text-amber-400">{bkpis.pendingApprovals}</p>
                                <p className="text-xs text-slate-500 mt-1">POs awaiting sign-off</p>
                            </Card>
                            <Card className="bg-emerald-500/10 border border-emerald-500/20 p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <DollarSign className="w-4 h-4 text-emerald-400" />
                                    <p className="text-xs text-emerald-400/70">Approved PO Value</p>
                                </div>
                                <p className="text-2xl font-bold text-emerald-400">
                                    ₹{(bkpis.approvedPOValue / 100000).toFixed(1)}L
                                </p>
                                <p className="text-xs text-slate-500 mt-1">{bkpis.approvedPOCount} active orders</p>
                            </Card>
                            <Card className="bg-blue-500/10 border border-blue-500/20 p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Truck className="w-4 h-4 text-blue-400" />
                                    <p className="text-xs text-blue-400/70">Material at Vendor</p>
                                </div>
                                <p className="text-3xl font-bold text-blue-400">{bkpis.materialAtVendor}</p>
                                <p className="text-xs text-slate-500 mt-1">open challans</p>
                            </Card>
                            <Card className={`border p-4 ${bkpis.overdueChallans > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-500/10 border-slate-700'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <ShieldAlert className={`w-4 h-4 ${bkpis.overdueChallans > 0 ? 'text-red-400' : 'text-slate-500'}`} />
                                    <p className={`text-xs ${bkpis.overdueChallans > 0 ? 'text-red-400/70' : 'text-slate-500'}`}>Overdue at Vendor</p>
                                </div>
                                <p className={`text-3xl font-bold ${bkpis.overdueChallans > 0 ? 'text-red-400' : 'text-slate-400'}`}>{bkpis.overdueChallans}</p>
                                <p className="text-xs text-slate-500 mt-1">&gt;7 days at vendor</p>
                            </Card>
                        </div>

                        {/* Secondary KPIs row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                            {[
                                { label: 'Active Vendors', value: bkpis.activeVendors, icon: Users, color: 'text-sky-400' },
                                { label: 'Jobs Done Today', value: bkpis.jobsCompletedToday, icon: CheckCircle2, color: 'text-emerald-400' },
                                { label: 'Draft POs', value: bkpis.draftPOs, icon: FileText, color: 'text-slate-400' },
                                { label: 'Approved Orders', value: bkpis.approvedPOCount, icon: Activity, color: 'text-violet-400' },
                            ].map(({ label, value, icon: Icon, color }) => (
                                <div key={label} className="flex items-center gap-3 bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3">
                                    <Icon className={`w-4 h-4 ${color}`} />
                                    <div>
                                        <p className={`text-lg font-bold ${color}`}>{value}</p>
                                        <p className="text-xs text-slate-500">{label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Jarvis + Material in Transit ── */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <JarvisPanel userName={firstName} />

                    <Card className="bg-slate-900/50 border border-slate-800 flex flex-col">
                        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-blue-400" />
                                <h3 className="text-white font-bold text-sm">Material in Transit</h3>
                                <span className="text-xs text-slate-500">({briefing?.materialInTransit?.length ?? 0} challans)</span>
                            </div>
                            <Link href="/dashboard/challans" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                                All Challans <ArrowUpRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {!briefing?.materialInTransit?.length ? (
                                <div className="flex flex-col items-center gap-3 py-12 text-center">
                                    <Truck className="w-8 h-8 text-slate-700" />
                                    <p className="text-slate-500 text-sm">No material currently at vendors.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left">Challan</th>
                                            <th className="px-4 py-2.5 text-left">Vendor</th>
                                            <th className="px-4 py-2.5 text-center">Items</th>
                                            <th className="px-4 py-2.5 text-center">Days Out</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {briefing.materialInTransit.map(c => (
                                            <tr key={c.id} className="hover:bg-slate-800/20 cursor-pointer" onClick={() => router.push(`/dashboard/challans/${c.id}`)}>
                                                <td className="px-4 py-2.5 font-mono text-indigo-400 font-semibold text-xs">{c.challanNumber}</td>
                                                <td className="px-4 py-2.5 text-slate-300 text-xs truncate max-w-[120px]">{c.vendor?.companyName}</td>
                                                <td className="px-4 py-2.5 text-center text-slate-400 text-xs">{c._count?.items ?? '—'}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                        c.daysOut > 30 ? 'bg-red-500/15 text-red-400' :
                                                        c.daysOut > 14 ? 'bg-amber-500/15 text-amber-400' :
                                                        'bg-slate-700 text-slate-400'
                                                    }`}>
                                                        {c.daysOut}d
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </Card>
                </div>

                {/* ── War Room KPIs ── */}
                {kpis && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4 text-indigo-400" />
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Live Operations</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                            {[
                                { label: 'Overdue', value: kpis.overdue, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                                { label: 'At Risk', value: kpis.atRisk, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                                { label: 'On Track', value: kpis.onTrack, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                                { label: 'Ready to Dispatch', value: kpis.readyToDispatch, icon: Truck, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
                                { label: 'In Progress (WIP)', value: kpis.wip, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                                { label: 'Raw Material', value: kpis.rawMaterial, icon: Package, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-700' },
                            ].map(({ label, value, icon: Icon, color, bg, border }) => (
                                <Card key={label} className={`${bg} border ${border} p-4 flex flex-col items-center text-center`}>
                                    <Icon className={`w-5 h-5 ${color} mb-1`} />
                                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Customer Health Grid ── */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-400" />
                            Customer Health — Click to drill down
                        </h2>
                        <Link href="/dashboard/executive/sourcing" className="text-sm text-indigo-400 hover:underline flex items-center gap-1">
                            Sourcing Analytics <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {customers.length === 0 ? (
                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>No customer part data yet. Issue challans to see health cards here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {customers.map(c => (
                                <CustomerCard key={c.id} c={c} onClick={() => handleCustomerClick(c.id)} />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Customer Drill-Down ── */}
                {selectedCustomerId && (
                    <Card className="bg-slate-900/60 border border-indigo-500/30 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-white">
                                {customers.find(c => c.id === selectedCustomerId)?.name} — Active Parts
                            </h2>
                            <div className="flex gap-3">
                                <Link href={`/dashboard/executive/parts?customerId=${selectedCustomerId}`} className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                                    Full View <ArrowUpRight className="w-3 h-3" />
                                </Link>
                                <button onClick={() => { setSelectedCustomerId(null); setCustomerParts([]); }} className="text-xs text-slate-500 hover:text-white">✕ Close</button>
                            </div>
                        </div>
                        {customerPartsLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
                        ) : customerParts.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">All parts dispatched or no active parts.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-slate-500 uppercase">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Part #</th>
                                            <th className="px-3 py-2 text-left">Description</th>
                                            <th className="px-3 py-2 text-left">Vendor</th>
                                            <th className="px-3 py-2 text-left">Process Pipeline</th>
                                            <th className="px-3 py-2 text-center">Stage</th>
                                            <th className="px-3 py-2 text-center">Deadline</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {customerParts.slice(0, 20).map(part => {
                                            const stage = STAGE_CONFIG[part.stage];
                                            const health = HEALTH_CONFIG[part.scheduleHealth];
                                            return (
                                                <tr key={part.id} className="hover:bg-slate-800/30">
                                                    <td className="px-3 py-3 font-mono font-semibold text-white">{part.partNumber}</td>
                                                    <td className="px-3 py-3 text-slate-400 max-w-[150px] truncate">{part.partDescription || '—'}</td>
                                                    <td className="px-3 py-3 text-slate-300">{part.vendor.companyName}</td>
                                                    <td className="px-3 py-3"><ProcessPipeline pipeline={part.pipeline} /></td>
                                                    <td className="px-3 py-3 text-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${stage.bg} ${stage.color}`}>{stage.label}</span>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {part.daysRemaining !== null ? (
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${health.badge}`}>
                                                                {part.daysRemaining < 0 ? `${Math.abs(part.daysRemaining)}d late` : `${part.daysRemaining}d left`}
                                                            </span>
                                                        ) : <span className="text-slate-600 text-xs">—</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                )}

                {/* ── Urgent Attention ── */}
                <Card className="bg-slate-900/50 border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            Urgent Attention Required
                            {urgentParts.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-red-500/15 text-red-400 text-xs rounded-full font-bold">{urgentParts.length}</span>
                            )}
                        </h2>
                        <Link href="/dashboard/executive/parts?status=overdue" className="text-sm text-red-400 hover:underline flex items-center gap-1">
                            See all <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {urgentParts.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500/30" />
                            <p className="text-emerald-400 font-semibold">All parts are on track!</p>
                            <p className="text-slate-500 text-sm">No overdue or at-risk parts at this moment.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-950/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-left">Part #</th>
                                        <th className="px-4 py-3 text-left">Description</th>
                                        <th className="px-4 py-3 text-left">Customer</th>
                                        <th className="px-4 py-3 text-left">Vendor</th>
                                        <th className="px-4 py-3 text-left">Stage</th>
                                        <th className="px-4 py-3 text-left">Process Pipeline</th>
                                        <th className="px-4 py-3 text-center">Deadline</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {urgentParts.slice(0, 15).map(part => {
                                        const stage = STAGE_CONFIG[part.stage];
                                        const health = HEALTH_CONFIG[part.scheduleHealth];
                                        return (
                                            <tr key={part.id} className={`hover:bg-slate-800/30 ${part.scheduleHealth === 'overdue' ? 'bg-red-950/10' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${health.badge}`}>{health.label}</span>
                                                </td>
                                                <td className="px-4 py-3 font-mono font-bold text-white">{part.partNumber}</td>
                                                <td className="px-4 py-3 text-slate-400 max-w-[120px] truncate">{part.partDescription || '—'}</td>
                                                <td className="px-4 py-3 text-slate-200 font-medium">{part.customer.companyName}</td>
                                                <td className="px-4 py-3 text-slate-400">{part.vendor.companyName}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`flex items-center gap-1.5 text-xs ${stage.color}`}>
                                                        <Circle className="w-2 h-2 fill-current" />
                                                        {stage.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 max-w-[220px]"><ProcessPipeline pipeline={part.pipeline} /></td>
                                                <td className="px-4 py-3 text-center">
                                                    {part.daysRemaining !== null ? (
                                                        <span className={`font-mono font-bold text-sm ${part.daysRemaining < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                                                            {part.daysRemaining < 0 ? `${Math.abs(part.daysRemaining)}d late` : `${part.daysRemaining}d`}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {/* ── Team Status ── */}
                <TeamStatusPanel />

                {/* ── Bottom Navigation ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { href: '/dashboard/executive/parts', icon: Search, label: 'Part Tracker', desc: 'Search any part number, track its full process pipeline.' },
                        { href: '/dashboard/admin', icon: Activity, label: 'Production Control', desc: 'Live job board, PPC analytics & challan management.' },
                        { href: '/dashboard/executive/sourcing', icon: Users, label: 'Vendor Sourcing', desc: 'Vendor comparison matrix & procurement cost breakdown.' },
                    ].map(item => (
                        <Link key={item.href} href={item.href} className="group block">
                            <Card className="bg-slate-900/50 border border-slate-800 hover:border-indigo-500/50 p-5 transition-all duration-300 hover:bg-slate-900/80">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-white font-bold mb-1 group-hover:text-indigo-300 transition-colors">{item.label}</h3>
                                        <p className="text-slate-500 text-sm">{item.desc}</p>
                                    </div>
                                    <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>

            </div>
        </div>
    );
}
