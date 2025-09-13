"use client";
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { LoaderCircle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function ConfirmActionContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
    const [message, setMessage] = useState('');

    const handleConfirm = async () => {
        setStatus('loading');
        try {
            // ČIA ATEITYJE BUS KREIPIMASIS Į API SU TOKENU
            // Kol kas simuliuojame sėkmę
            await new Promise(res => setTimeout(res, 1500));
            setStatus('success');
            setMessage('Action has been successfully confirmed and executed!');
            toast.success('Action confirmed!');
        } catch (error) {
            setStatus('error');
            setMessage('Failed to confirm action. The link might be expired or invalid.');
            toast.error('Confirmation failed!');
        }
    };

    if (!token) return <div>Invalid confirmation link.</div>;

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Confirm Action</CardTitle>
                    <CardDescription>Please review and confirm the action requested via Telegram.</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    {status === 'idle' && <Button onClick={handleConfirm}>Confirm Action</Button>}
                    {status === 'loading' && <LoaderCircle className="animate-spin mx-auto" />}
                    {status === 'success' && <div className="text-green-400"><CheckCircle className="mx-auto mb-2" />{message}</div>}
                    {status === 'error' && <div className="text-red-400"><XCircle className="mx-auto mb-2" />{message}</div>}
                </CardContent>
            </Card>
        </div>
    );
}

export default function ConfirmActionPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <LoaderCircle className="animate-spin" />
            </div>
        }>
            <ConfirmActionContent />
        </Suspense>
    );
}
