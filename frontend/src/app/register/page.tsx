'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [role, setRole] = useState<'customer' | 'vendor'>('vendor');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const roleParam = searchParams.get('role');
        if (roleParam === 'customer' || roleParam === 'vendor') {
            setRole(roleParam);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Mock registration logic for now
        // In real app, call API here
        setTimeout(() => {
            setIsLoading(false);
            if (role === 'vendor') {
                router.push('/onboarding/vendor/success');
            } else {
                router.push('/onboarding/customer/success');
            }
        }, 1500);
    };

    return (
        <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">Create an Account</CardTitle>
                <CardDescription className="text-slate-400 text-center">
                    Join Aaniry VMS to streamline your operations
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-4 mb-6 p-1 bg-slate-950 rounded-lg border border-slate-800">
                    <button
                        onClick={() => setRole('customer')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'customer'
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        I am an OEM (Customer)
                    </button>
                    <button
                        onClick={() => setRole('vendor')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'vendor'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        I am a Vendor
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-200">Company Name</label>
                        <Input placeholder="Acme Industries Ltd." required className="bg-slate-950 border-slate-700" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-200">Official Email</label>
                        <Input type="email" placeholder="admin@acme.com" required className="bg-slate-950 border-slate-700" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-200">Password</label>
                        <Input type="password" required className="bg-slate-950 border-slate-700" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-200">GSTIN (Optional)</label>
                        <Input placeholder="27ABCDE1234F1Z5" className="bg-slate-950 border-slate-700" />
                    </div>

                    <Button type="submit" className={`w-full mt-6 ${role === 'customer' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`} disabled={isLoading}>
                        {isLoading ? 'Creating Account...' : `Sign Up as ${role === 'customer' ? 'OEM' : 'Vendor'}`}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-slate-800 pt-6">
                <p className="text-sm text-slate-400">
                    Already have an account?{' '}
                    <Link href="/login" className="text-orange-500 hover:underline">
                        Login here
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5 pointer-events-none"></div>
            <Suspense fallback={<div className="text-white">Loading...</div>}>
                <RegisterForm />
            </Suspense>
        </div>
    );
}
