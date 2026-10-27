'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, X, Send, Zap, ThumbsUp, ThumbsDown, ChevronDown } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// Prefix phrases — gender-neutral, no "sir" (voice is female)
const JARVIS_PREFIXES = [
    'Certainly.',
    'Understood.',
    'Right away.',
    'Of course.',
    'Here\'s what I found.',
    'On it.',
    'Got it.',
];

const JARVIS_ERROR_PREFIX = 'I\'m afraid I\'ve encountered an issue.';

function getJarvisPrefix(text: string): string {
    if (text.toLowerCase().startsWith('no ') || text.toLowerCase().startsWith('there are no')) {
        return 'Nothing to flag there —';
    }
    if (text.toLowerCase().includes('error') || text.toLowerCase().includes('failed')) {
        return JARVIS_ERROR_PREFIX;
    }
    return JARVIS_PREFIXES[Math.floor(Math.random() * JARVIS_PREFIXES.length)];
}

// Female-first voice priority — most realistic Microsoft Natural voices on top
function selectJarvisVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    // Tier 1 — best female Natural/Online voices (most realistic, requires internet)
    const femaleNaturalNames = [
        'Microsoft Aria Online (Natural) - English (United States)',
        'Microsoft Jenny Online (Natural) - English (United States)',
        'Microsoft Sonia Online (Natural) - English (United Kingdom)',
        'Microsoft Libby Online (Natural) - English (United Kingdom)',
        'Microsoft Emma Online (Natural) - English (United Kingdom)',
        'Microsoft Jane Online (Natural) - English (United States)',
        'Microsoft Natasha Online (Natural) - English (Australia)',
        'Microsoft Clara Online (Natural) - English (Canada)',
    ];
    for (const name of femaleNaturalNames) {
        const v = voices.find(v => v.name === name);
        if (v) return v;
    }

    // Tier 2 — any Microsoft Natural female English voice
    const femaleKeywords = ['aria', 'jenny', 'sonia', 'libby', 'emma', 'jane', 'natasha', 'clara', 'zira', 'hazel'];
    const t2 = voices.find(v =>
        v.name.includes('Microsoft') && v.name.includes('Natural') && v.lang.startsWith('en') &&
        femaleKeywords.some(k => v.name.toLowerCase().includes(k))
    );
    if (t2) return t2;

    // Tier 3 — any Microsoft Online female English voice
    const t3 = voices.find(v =>
        v.name.includes('Microsoft') && v.name.includes('Online') && v.lang.startsWith('en') &&
        femaleKeywords.some(k => v.name.toLowerCase().includes(k))
    );
    if (t3) return t3;

    // Tier 4 — Google female voices
    const googleFemale = ['Google UK English Female', 'Google US English'];
    for (const name of googleFemale) {
        const v = voices.find(v => v.name === name);
        if (v) return v;
    }

    // Tier 5 — Microsoft Zira (offline female fallback)
    const t5 = voices.find(v => v.name.includes('Zira'));
    if (t5) return t5;

    // Last resort — any English female voice by heuristic
    return voices.find(v => v.lang.startsWith('en') && femaleKeywords.some(k => v.name.toLowerCase().includes(k)))
        || voices.find(v => v.lang === 'en-GB')
        || voices.find(v => v.lang.startsWith('en'))
        || voices[0];
}

// ── Feedback panel component ──────────────────────────────────────────────────

const FEEDBACK_REASONS = [
    { value: 'wrong_data', label: 'Wrong data' },
    { value: 'not_useful', label: 'Not useful' },
    { value: 'missed_context', label: 'Missed the context' },
    { value: 'other', label: 'Other' },
];

interface FeedbackPanelProps {
    query: string;
    response: string;
    onClose: () => void;
}

function FeedbackPanel({ query, response, onClose }: FeedbackPanelProps) {
    const [reason, setReason] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        try {
            await apiClient.post('/ai-feedback', {
                query,
                response,
                rating: -1,
                reason: reason || undefined,
                comment: comment.trim() || undefined,
            });
            toast.success('Feedback recorded. Thanks for helping train JARVIS.');
            onClose();
        } catch {
            toast.error('Failed to send feedback');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-2 bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-2.5">
            <p className="text-xs font-semibold text-slate-400">What went wrong?</p>
            <div className="grid grid-cols-2 gap-1.5">
                {FEEDBACK_REASONS.map(r => (
                    <button
                        key={r.value}
                        onClick={() => setReason(reason === r.value ? '' : r.value)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${reason === r.value ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
                    >
                        {r.label}
                    </button>
                ))}
            </div>
            <input
                type="text"
                placeholder="Optional comment..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500 transition-colors"
            />
            <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
                <button
                    onClick={submit}
                    disabled={submitting}
                    className="flex-1 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                >
                    {submitting ? 'Sending...' : 'Send Feedback'}
                </button>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [lastQuery, setLastQuery] = useState('');
    const [lastRawResponse, setLastRawResponse] = useState('');
    const [inputText, setInputText] = useState('');
    const [voiceReady, setVoiceReady] = useState(false);
    const [showThumbsDown, setShowThumbsDown] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);

    const recognitionRef = useRef<any>(null);
    const isProcessingRef = useRef(false);
    const isOpenRef = useRef(false);
    const transcriptRef = useRef('');
    const handleSendPromptRef = useRef<((text: string) => Promise<void>) | null>(null);
    const jarvisVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

    useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    useEffect(() => {
        const loadVoice = () => {
            const voice = selectJarvisVoice();
            if (voice) {
                jarvisVoiceRef.current = voice;
                setVoiceReady(true);
            }
        };
        loadVoice();
        window.speechSynthesis.onvoiceschanged = loadVoice;
        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            // BARGE-IN: immediately stop any ongoing JARVIS speech when the user starts talking.
            // This makes the conversation feel natural — JARVIS stops the moment you speak.
            if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            let fullTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
                fullTranscript += event.results[i][0].transcript;
            }
            transcriptRef.current = fullTranscript;
            setTranscript(fullTranscript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            if (event.error !== 'no-speech') {
                toast.error(`Voice error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            const text = transcriptRef.current.trim();
            if (text && !isProcessingRef.current && isOpenRef.current) {
                setTimeout(() => {
                    handleSendPromptRef.current?.(text);
                }, 100);
            }
        };

        recognitionRef.current = recognition;
    }, []);

    const handleSendPrompt = useCallback(async (text: string) => {
        if (!text.trim()) return;

        transcriptRef.current = '';
        setIsProcessing(true);
        setResponse('Processing your request...');
        setShowThumbsDown(false);
        setFeedbackGiven(null);
        setLastQuery(text);

        try {
            const res = await apiClient.post('/ai/chat', { prompt: text }, { timeout: 120000 });
            const rawResponse: string = res.data.response || '';
            const prefix = getJarvisPrefix(rawResponse);
            const fullResponse = `${prefix} ${rawResponse}`;
            setResponse(fullResponse);
            setLastRawResponse(fullResponse);
            speakResponse(fullResponse);
        } catch (error: any) {
            console.error('AI Error:', error);
            const isTimeout = error.code === 'ECONNABORTED';
            const msg = isTimeout
                ? `${JARVIS_ERROR_PREFIX} The request has timed out. Please try again momentarily.`
                : `${JARVIS_ERROR_PREFIX} I was unable to reach the backend service.`;
            setResponse(msg);
            setLastRawResponse(msg);
            toast.error(isTimeout ? 'AI request timed out' : 'AI request failed');
        } finally {
            setIsProcessing(false);
            setInputText('');
        }
    }, []);

    useEffect(() => { handleSendPromptRef.current = handleSendPrompt; }, [handleSendPrompt]);

    // Clean text for speech: removes symbols, brackets, reference codes, etc.
    // Written to avoid any regex that contains / inside a character class (Next.js SWC bug-prone).
    const cleanForSpeech = (text: string): string => {
        let s = text;
        // Remove action tags [ACTION:...]
        s = s.replace(/\[ACTION:[^\]]+\]/g, '');
        // Remove square bracket annotations like [approved] [pending]
        s = s.replace(/\[[^\]]{1,30}\]/g, '');
        // Remove doc reference codes (DC/..., PO/..., INV/..., GRN/..., NCR/...)
        s = s.replace(/\b(DC|PO|INV|GRN|NCR)\/\S+/gi, '');
        // Remove arrows and middot bullets — replace with comma pause
        s = s.replace(/[\u2192\u2190\u2191\u2193\u25ba\u25b6\u2022\u00b7]/g, ',');
        // Remove box-drawing characters
        s = s.replace(/[\u2554\u2557\u255a\u255d\u2550\u2551\u2500\u250c\u2510\u2514\u2518\u2502\u251c\u2524\u252c\u2534\u253c]/g, '');
        // Remove status/warning emoji
        s = s.replace(/[\u26a0\u26a1\u2705\u274c\ud83d\udc08]/g, '');
        // Replace ₹ (U+20B9) with spoken form
        s = s.replace(/\u20b9([\d,]+)/g, (_, n) => `${n} rupees`);
        // Remove misc separator chars
        s = s.replace(/[|#@~`^*_=+<>{}\\]/g, ' ');
        // Collapse whitespace
        s = s.replace(/\s{2,}/g, ' ');
        return s.trim();
    };

    const speakResponse = (text: string) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
        utterance.lang = 'en-US';

        const voiceName = jarvisVoiceRef.current?.name ?? '';
        const isNaturalOnline = voiceName.includes('Natural') || voiceName.includes('Online');

        if (isNaturalOnline) {
            // Natural neural voices — don't artificially alter pitch (they're already female and realistic).
            // Slight speed-up makes it feel confident rather than narrated.
            utterance.rate = 1.05;
            utterance.pitch = 1.0;
        } else {
            // Offline / legacy voices — slow down a touch, small pitch lift to sound less robotic.
            utterance.rate = 0.92;
            utterance.pitch = 1.1;
        }

        utterance.volume = 1.0;

        if (jarvisVoiceRef.current) {
            utterance.voice = jarvisVoiceRef.current;
        }

        window.speechSynthesis.speak(utterance);
    };

    const toggleListening = () => {
        if (!recognitionRef.current) {
            toast.error('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            // BARGE-IN: cancel any speech immediately when mic is activated
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();

            setTranscript('');
            setResponse('');
            setInputText('');
            setShowThumbsDown(false);
            setFeedbackGiven(null);
            transcriptRef.current = '';
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.warn('Recognition start error:', e);
            }
        }
    };

    const handleInputSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || isProcessing) return;
        setTranscript(inputText);
        transcriptRef.current = inputText;
        handleSendPrompt(inputText);
    };

    const closeAssistant = () => {
        setIsOpen(false);
        if (isListening && recognitionRef.current) recognitionRef.current.stop();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };

    const handleThumbsUp = async () => {
        if (feedbackGiven) return;
        setFeedbackGiven('up');
        try {
            await apiClient.post('/ai-feedback', {
                query: lastQuery,
                response: lastRawResponse,
                rating: 1,
            });
            toast.success('Thanks for the feedback!');
        } catch { /* silent */ }
    };

    const handleThumbsDownToggle = () => {
        if (feedbackGiven === 'up') return;
        setShowThumbsDown(!showThumbsDown);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 z-50 group"
                title="Open JARVIS Assistant"
            >
                <Zap className="w-6 h-6" />
                <span className="absolute right-full mr-4 bg-slate-900 text-white px-3 py-1 rounded text-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    JARVIS Assistant
                </span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-80 bg-slate-900 border border-indigo-500/40 shadow-2xl shadow-indigo-500/10 rounded-2xl overflow-hidden z-50 flex flex-col transition-all duration-300 transform origin-bottom-right">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2 font-medium">
                    <Zap className="w-5 h-5 text-yellow-300" />
                    <span>J.A.R.V.I.S</span>
                    {voiceReady && <span className="text-xs text-indigo-200 font-normal ml-1">· voice ready</span>}
                </div>
                <button onClick={closeAssistant} className="text-white/70 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages */}
            <div className="p-4 flex-1 flex flex-col gap-3 min-h-[260px] max-h-[440px] overflow-y-auto">
                {transcript && (
                    <div className="bg-slate-800 rounded-xl p-3 text-slate-200 text-sm border border-slate-700/60">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">You</span>
                        {transcript}
                        {isListening && (
                            <span className="inline-flex gap-0.5 ml-2 align-middle">
                                <span className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                        )}
                    </div>
                )}

                {response && (
                    <div className="bg-indigo-950/50 border border-indigo-500/20 rounded-xl p-3 text-indigo-100 text-sm">
                        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest block mb-1.5">
                            J.A.R.V.I.S
                        </span>
                        {isProcessing ? (
                            <div className="flex items-center gap-2 text-indigo-300">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {response}
                            </div>
                        ) : (
                            <>
                                <p className="whitespace-pre-wrap leading-relaxed">{response}</p>

                                {/* ── Feedback buttons ── */}
                                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-indigo-500/10">
                                    <span className="text-xs text-indigo-500 flex-1">Helpful?</span>
                                    <button
                                        onClick={handleThumbsUp}
                                        title="This was helpful"
                                        className={`p-1.5 rounded-lg transition-all ${feedbackGiven === 'up' ? 'bg-emerald-500/20 text-emerald-400' : 'text-indigo-400/50 hover:text-indigo-300 hover:bg-indigo-500/10'}`}
              >
                                        <ThumbsUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={handleThumbsDownToggle}
                                        title="This wasn't helpful"
                                        className={`p-1.5 rounded-lg transition-all ${feedbackGiven === 'down' || showThumbsDown ? 'bg-red-500/20 text-red-400' : 'text-indigo-400/50 hover:text-indigo-300 hover:bg-indigo-500/10'}`}
                                    >
                                        <ThumbsDown className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                {showThumbsDown && (
                                    <FeedbackPanel
                                        query={lastQuery}
                                        response={lastRawResponse}
                                        onClose={() => { setShowThumbsDown(false); setFeedbackGiven('down'); }}
                                    />
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
            {/* Input */}
            <div className="p-3 border-t border-indigo-500/20 bg-slate-900/80">
                <form onSubmit={handleInputSubmit} className="flex items-center gap-2">
                    <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Ask JARVIS anything…" disabled={isProcessing} className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50" />
                    <button type="button" onClick={toggleListening} disabled={isProcessing} className={`p-2 rounded-lg transition-all ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10'} disabled:opacity-40`}>
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <button type="submit" disabled={!inputText.trim() || isProcessing} className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
