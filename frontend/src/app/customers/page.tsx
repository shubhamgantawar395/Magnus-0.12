import Link from 'next/link';
import React from 'react';

export default function OEMsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* Hero Section */}
            <header className="relative overflow-hidden bg-slate-900 border-b border-slate-800">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
                <div className="container mx-auto px-6 py-24 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-block px-4 py-1 mb-6 text-sm font-semibold tracking-wider text-orange-500 uppercase bg-orange-500/10 rounded-full border border-orange-500/20">
                            For Enterprise OEMs
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            Streamline Your Supply Chain
                        </h1>
                        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            A centralized hub for seamless collaboration with your vendors.
                            Automate challans, track job processes, and ensure compliance with Aaniry VMS.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/register?role=customer"
                                className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-lg shadow-orange-500/20 transition-all transform hover:-translate-y-1"
                            >
                                Get Started
                            </Link>
                            <a href="#demo-form" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg border border-slate-700 transition-all flex items-center justify-center">
                                Request Demo
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            {/* Benefits Grid */}
            <section className="py-24 bg-slate-950">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Why Choose Aaniry VMS?</h2>
                        <p className="text-slate-400">Built for precision manufacturing and high-compliance industries.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Benefit 1 */}
                        <div className="p-8 bg-slate-900 rounded-xl border border-slate-800 hover:border-orange-500/50 transition-colors group">
                            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-orange-500/10 group-hover:text-orange-500 transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Real-time Visibility</h3>
                            <p className="text-slate-400">Track part movement across all vendors instantly. Know exactly where your inventory is at any stage of production.</p>
                        </div>

                        {/* Benefit 2 */}
                        <div className="p-8 bg-slate-900 rounded-xl border border-slate-800 hover:border-orange-500/50 transition-colors group">
                            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-orange-500/10 group-hover:text-orange-500 transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Automated Compliance</h3>
                            <p className="text-slate-400">Ensure all delivery challans and invoices meet GST and industry standards automatically before they reach you.</p>
                        </div>

                        {/* Benefit 3 */}
                        <div className="p-8 bg-slate-900 rounded-xl border border-slate-800 hover:border-orange-500/50 transition-colors group">
                            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-6 group-hover:bg-orange-500/10 group-hover:text-orange-500 transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Faster Turnaround</h3>
                            <p className="text-slate-400">Reduce communication delays. Vendors update status directly, and you get notified immediately of any bottlenecks.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-gradient-to-br from-slate-900 to-slate-950 border-t border-slate-800">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-6">Ready to Optimize Your Operations?</h2>
                    <p className="text-slate-400 mb-10 max-w-xl mx-auto">
                        Join top OEMs who trust Aaniry VMS for their vendor operations.
                    </p>
                    <Link
                        href="/register?role=customer"
                        className="inline-flex items-center justify-center px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-lg shadow-orange-500/20 transition-all"
                    >
                        Create OEM Account
                        <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                </div>
            </section>
            {/* Demo Request Form Section */}
            <section id="demo-form" className="py-24 bg-slate-900 border-t border-slate-800">
                <div className="container mx-auto px-6 max-w-2xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">Schedule a Personalized Demo</h2>
                        <p className="text-slate-400">
                            See how Aaniry VMS can transform your specific vendor management challenges.
                        </p>
                    </div>

                    <form className="space-y-6 bg-slate-950 p-8 rounded-xl border border-slate-800 shadow-xl">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">First Name</label>
                                <input type="text" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-100" placeholder="John" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Last Name</label>
                                <input type="text" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-100" placeholder="Doe" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Work Email</label>
                            <input type="email" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-100" placeholder="john@company.com" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Company Name</label>
                            <input type="text" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-100" placeholder="Acme Inc." />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Anything specific you want to see?</label>
                            <textarea className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-100 h-32" placeholder="Tell us about your requirements..."></textarea>
                        </div>

                        <button type="submit" className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg shadow-orange-500/20 transition-all">
                            Submit Request
                        </button>
                        <p className="text-xs text-center text-slate-500 mt-4">
                            By submitting this form, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </form>
                </div>
            </section>
        </div>
    );
}
