import Link from 'next/link';
import { ArrowRight, Settings, Users, Truck, BarChart3, ShieldCheck, Zap } from 'lucide-react';

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col bg-slate-950 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[20%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
            </div>

            {/* Navigation */}
            <nav className="border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group">
                            <Settings className="w-6 h-6 text-white animate-spin-slow group-hover:rotate-180 transition-transform duration-700" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            Magnus VMS
                        </span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors relative group">
                            Login
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all group-hover:w-full"></span>
                        </Link>
                        <Link href="/login" className="hidden sm:flex items-center gap-2 bg-white text-slate-950 px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-slate-100 transition-colors shadow-lg shadow-white/10 hover:shadow-white/20 hover:scale-105 transform duration-200">
                            Get Started
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-40 overflow-hidden z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center justify-center p-1.5 px-4 mb-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium backdrop-blur-sm animate-fade-in-up">
                        <span className="flex w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
                        Next-Generation Supply Chain Intelligence
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-8 leading-tight">
                        Digitizing <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 animate-gradient-x">
                            CNC Operations
                        </span>
                    </h1>

                    <p className="mt-4 text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
                        Eliminate manual coordination. Gain <span className="text-white font-medium">real-time visibility</span> into vendor performance, production status, and dispatch logistics.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
                        <div className="group relative w-full sm:w-auto">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                            <Link href="/login" className="relative flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-2xl transition-all hover:translate-y-[-2px]">
                                <Users className="w-5 h-5" />
                                Customers (OEM) Portal
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <Link href="/login" className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-white border border-white/10 hover:border-white/20 rounded-xl font-semibold backdrop-blur-md transition-all hover:translate-y-[-2px]">
                            <Truck className="w-5 h-5 text-emerald-400" />
                            Vendor Portal
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-32 bg-slate-950 relative z-10">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Features built for scale</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">Everything you need to manage complex manufacturing supply chains with ease.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <BarChart3 className="w-8 h-8 text-blue-400" />,
                                title: "Real-time Visibility",
                                desc: "Track every job from raw material to dispatch with live dashboard updates and granular status tracking.",
                                color: "blue"
                            },
                            {
                                icon: <ShieldCheck className="w-8 h-8 text-violet-400" />,
                                title: "Quality Assurance",
                                desc: "Integrated QA workflows ensuring zero-defect delivery, complete traceability, and instant rejection handling.",
                                color: "violet"
                            },
                            {
                                icon: <Zap className="w-8 h-8 text-emerald-400" />,
                                title: "Smart Logistics",
                                desc: "Automated dispatch planning, part-number-based tracking, and seamless inventory management.",
                                color: "emerald"
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className="group p-8 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-white/10 hover:bg-slate-900/60 transition-all duration-300 hover:-translate-y-2 relative overflow-hidden">
                                <div className={`absolute inset-0 bg-gradient-to-br from-${feature.color}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                                <div className="mb-6 bg-slate-950 border border-white/5 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 relative z-10">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-white relative z-10">{feature.title}</h3>
                                <p className="text-slate-400 leading-relaxed relative z-10">
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 bg-slate-950 border-t border-white/5 relative z-10">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-blue-600"></div>
                        <p className="text-slate-500 text-sm">&copy; 2026 Aaniry Overseas Pvt. Ltd.</p>
                    </div>
                    <div className="flex gap-8 text-sm">
                        <Link href="#" className="text-slate-500 hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="#" className="text-slate-500 hover:text-white transition-colors">Terms of Service</Link>
                        <Link href="#" className="text-slate-500 hover:text-white transition-colors">Contact Support</Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}
