'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Bot, BrainCircuit, Volume2, VolumeX, Mic, MicOff, SendHorizonal, Square, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface ChatMessage { role: 'user' | 'jarvis'; text: string; }

// --- Helpers ---
function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// --- Component ---
export const JarvisWidget = ({ userName, role = 'executive' }: { userName: string, role?: 'executive' | 'vendor' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const greeting = role === 'executive' 
      ? `Good ${getTimeOfDay()}, ${userName}. J.A.R.V.I.S. online. I have live access to all challans, POs, and vendor readiness scores. What's the status of the floor?`
      : `Hello ${userName}. I'm your J.A.R.V.I.S. assistant. I can help you track your pending jobs, check material status, or assist with invoice queries. How can I help today?`;
    
    setMessages([{ role: 'jarvis', text: greeting }]);
  }, [userName, role]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speech Synthesis
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !voiceEnabled) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utter;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en')) || null;
    if (preferred) utter.voice = preferred;
    utter.rate = 1.0;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, [voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  // Sync Input from Recognition
  const onSpeechResult = useCallback((text: string) => setInput(text), []);

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input not supported');
      return;
    }
    const rec = new SpeechRecognition();
    recognitionRef.current = rec;
    rec.lang = 'en-IN';
    rec.onstart = () => setListening(true);
    rec.onresult = (e: any) => setInput(e.results[0][0].transcript);
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  const sendMessage = async (overridePrompt?: string) => {
    const prompt = (overridePrompt ?? input).trim();
    if (!prompt || thinking) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: prompt }]);
    setThinking(true);
    try {
      const res = await apiClient.post('/ai/chat', { prompt, context: { role, userName } });
      const reply = res.data?.response ?? 'I processed your request, but received no specific response.';
      setMessages(m => [...m, { role: 'jarvis', text: reply }]);
      if (voiceEnabled) speak(reply);
    } catch {
      const err = 'I encountered a connection issue while reaching my neural core.';
      setMessages(m => [...m, { role: 'jarvis', text: err }]);
      speak(err);
    } finally {
      setThinking(false);
    }
  };

  return (
    <Card className="bg-slate-900/60 border border-indigo-500/30 flex flex-col h-[520px] overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
        <div className="p-1.5 bg-indigo-500/20 rounded-lg">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-tighter">J.A.R.V.I.S.</h3>
          <p className="text-[10px] text-slate-500 font-mono">NEURAL INTERFACE v2.0</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-1.5 rounded-lg ${voiceEnabled ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 bg-slate-800'}`}
          >
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-emerald-500 font-bold">LIVE</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'jarvis' && <Bot size={28} className="text-indigo-400 mt-1 shrink-0" />}
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex gap-3">
            <Bot size={28} className="text-indigo-400 mt-1" />
            <div className="bg-slate-800 px-4 py-3 rounded-2xl flex gap-1 items-center">
              <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" />
              <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-slate-900/40 border-t border-slate-800">
        <div className="flex gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1 focus-within:border-indigo-500/50 transition-all">
          <button 
            onClick={toggleMic}
            className={`p-2 transition-colors ${listening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-indigo-400'}`}
          >
            {listening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={listening ? "Listening..." : "Ask me anything..."}
            className="flex-1 bg-transparent border-none outline-none text-white text-sm px-2"
          />
          {speaking ? (
            <button onClick={stopSpeaking} className="p-2 text-red-500">
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button 
              onClick={() => sendMessage()}
              disabled={!input.trim() || thinking}
              className="p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-30"
            >
              <SendHorizonal size={20} />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};
