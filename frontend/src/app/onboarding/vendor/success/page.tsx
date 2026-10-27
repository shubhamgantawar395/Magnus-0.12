import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function VendorSuccessPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5 pointer-events-none"></div>

            <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100 shadow-2xl text-center">
                <CardHeader className="space-y-4">
                    <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <CardTitle className="text-3xl font-bold">Registration Successful!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-slate-400 text-lg">
                        Welcome to Aaniry VMS. Your vendor account has been created successfully.
                    </p>
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-left">
                        <h4 className="font-semibold text-blue-400 mb-2">Next Steps:</h4>
                        <ul className="text-slate-400 text-sm space-y-2 list-disc pl-5">
                            <li>Complete your company profile.</li>
                            <li>Upload compliance documents (GST, PAN).</li>
                            <li>Wait for admin verification (usually 24-48 hours).</li>
                        </ul>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center pt-6">
                    <Link href="/dashboard/vendor">
                        <Button className="bg-blue-600 hover:bg-blue-700 w-full px-8">
                            Go to Dashboard
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
