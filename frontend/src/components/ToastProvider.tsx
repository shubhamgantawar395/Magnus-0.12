'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                duration: 4000,
                style: {
                    background: '#ffffff',
                    color: '#1e293b',
                    border: '1px solid #e2e8f0',
                    padding: '16px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                },
                success: {
                    duration: 3000,
                    iconTheme: {
                        primary: '#10b981',
                        secondary: '#ffffff',
                    },
                },
                error: {
                    duration: 5000,
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: '#ffffff',
                    },
                },
            }}
        />
    );
}
