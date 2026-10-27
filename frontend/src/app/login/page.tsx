'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Settings, ArrowRight, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
    const router = useRouter();
    const login = useAuthStore((state) => state.login);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting login with:', email);
        setError('');
        setLoading(true);

        try {
            const response = await apiClient.post('/auth/login', {
                email,
                password
            });
            console.log('API Response:', response.data);

            const { access_token, user } = response.data;

            login(user, access_token);
            console.log('Store updated. Redirecting based on role:', user.role);
            setLoading(false);

            // Redirect based on role
            switch (user.role) {
                case 'platform_admin':
                    console.log('Going to platform');
                    router.push('/dashboard/platform');
                    break;
                case 'executive':
                case 'director':
                case 'gm':
                    console.log('Going to executive');
                    router.push('/dashboard/executive');
                    break;
                case 'quality_head':
                    console.log('Going to quality');
                    router.push('/dashboard/quality');
                    break;
                case 'production_manager':
                case 'ppc_manager':
                    // Map these roles to the main admin dashboard for now
                    console.log('Going to admin (PPC/Production)');
                    router.push('/dashboard/admin');
                    break;
                case 'admin':
                case 'store_head':
                    console.log('Going to admin');
                    router.push('/dashboard/admin');
                    break;
                case 'security':
                    console.log('Going to gate-receipts');
                    router.push('/dashboard/gate-receipts');
                    break;
                case 'customer':
                    console.log('Going to customer');
                    router.push('/dashboard/customer');
                    break;
                case 'vendor':
                case 'vendor_user':
                case 'vendor_owner':
                case 'vendor_ppc':
                case 'vendor_supervisor':
                    console.log('Going to vendor');
                    router.push('/dashboard/vendor');
                    break;
                default:
                    // Fallback to admin dashboard if role is unknown internal
                    console.log('Going to admin (Fallback)');
                    router.push('/dashboard/admin');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
                <div className="absolute top-[20%] right-[30%] w-[20%] h-[20%] bg-cyan-600/10 rounded-full blur-[80px] animate-pulse delay-500"></div>
            </div>

            <div className="w-full max-w-lg relative z-10 perspective-1000">
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden hover:shadow-blue-900/20 transition-all duration-500">
                    <div className="p-8 md:p-10">
                        {/* Logo and Header */}
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/20 group hover:scale-105 transition-transform duration-300">
                                <Settings className="w-10 h-10 text-white animate-spin-slow group-hover:rotate-90 transition-transform duration-700" />
                            </div>
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-300 mb-3 tracking-tight">
                                Welcome Back
                            </h1>
                            <p className="text-slate-400 text-lg">
                                Sign in to your Aaniry VMS account
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                {/* Email Input */}
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                        </div>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="pl-10 h-12 bg-slate-950/40 border-slate-700/50 text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 placeholder:text-slate-600"
                                            placeholder="name@company.com"
                                        />
                                    </div>
                                </div>

                                {/* Password Input */}
                                <div className="space-y-2">
                                    <label htmlFor="password" className="text-sm font-medium text-slate-300 ml-1">Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <ShieldCheck className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                        </div>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="pl-10 h-12 bg-slate-950/40 border-slate-700/50 text-white rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 placeholder:text-slate-600"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 animate-shake">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                    {error}
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Signing in...
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        Sign In
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                )}
                            </Button>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-slate-950/30 border-t border-white/5 text-center">
                        <p className="text-sm text-slate-500">
                            Don't have an account?{' '}
                            <Link href="/" className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors decoration-blue-400/30 decoration-2 underline-offset-4">
                                Contact Administrator
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="text-center mt-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors py-2 px-4 rounded-full hover:bg-white/5">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        Back to Landing Page
                    </Link>
                </div>
            </div>
        </div>
    );
}
