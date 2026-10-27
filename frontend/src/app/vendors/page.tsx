import Link from 'next/link';
import React from 'react';

export default function VendorsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* Hero Section */}
            <header className="relative overflow-hidden bg-slate-900 border-b border-slate-800">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
                <div className="container mx-auto px-6 py-24 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-block px-4 py-1 mb-6 text-sm font-semibold tracking-wider text-blue-500 uppercase bg-blue-500/10 rounded-full border border-blue-500/20">
                            For Manufacturing Partners
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            Grow Your Business with Consistency
                        </h1>
                        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Join the preferred network of high-compliance vendors.
                            Receive consistent orders, track work digitally, and get paid faster.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/register?role=vendor"
                                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/20 transition-all transform hover:-translate-y-1"
                            >
                                Join Network
                            </Link>
                            <a href="#benefits" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg border border-slate-700 transition-all flex items-center justify-center">
                                Learn More
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            {/* Benefits Grid */}
            <section id="benefits" className="py-24 bg-slate-950">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Partner Benefits</h2>
                        <p className="text-slate-400">Why top machine shops prefer tracking work on Aaniry VMS.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Benefit 1 */}
                        <div className="p-8 bg-slate-900 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-colors group">
                            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Transparent Payments</h3>
                            <p className="text-slate-400">Clear visibility into invoice status and payment schedules. No more chasing accounts payable.</p>
                        </div>

                        {/* Benefit 2 */}
                        <div className="p-8 bg-slate-900 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-colors group">
                            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Digital Challans</h3>
                            <p className="text-slate-400">Generate e-Challans instantly. Eliminate paperwork errors and focus on production.</p>
                        </div>

                        {/* Benefit 3 */}
                        <div className="p-8 bg-slate-900 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-colors group">
                            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Consistent Work</h3>
                            <p className="text-slate-400">High-performing vendors get priority on new orders. Build a long-term partnership.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-gradient-to-br from-slate-900 to-slate-950 border-t border-slate-800">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-6">Ready to Partner?</h2>
                    <p className="text-slate-400 mb-10 max-w-xl mx-auto">
                        Register today to start receiving orders from top OEMs.
                    </p>
                    <Link
                        href="/register?role=vendor"
                        className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/20 transition-all"
                    >
                        Create Vendor Account
                        <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                </div>
            </section>
        </div>
    );
}
