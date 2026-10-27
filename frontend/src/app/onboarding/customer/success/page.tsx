import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CustomerSuccessPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5 pointer-events-none"></div>

            <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100 shadow-2xl text-center">
                <CardHeader className="space-y-4">
                    <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <CardTitle className="text-3xl font-bold">Welcome, Partner!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-slate-400 text-lg">
                        Your OEM account is ready. Start optimizing your supply chain today.
                    </p>
                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg text-left">
                        <h4 className="font-semibold text-orange-400 mb-2">Getting Started:</h4>
                        <ul className="text-slate-400 text-sm space-y-2 list-disc pl-5">
                            <li>Invite your vendors to the platform.</li>
                            <li>Create your first Purchase Order or Challan.</li>
                            <li>Configure your approval workflows.</li>
                        </ul>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center pt-6">
                    <Link href="/dashboard/customer">
                        <Button className="bg-orange-500 hover:bg-orange-600 w-full px-8">
                            Enter Dashboard
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
