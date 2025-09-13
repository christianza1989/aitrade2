"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { DashboardProvider, useDashboard } from '@/context/DashboardContext';
// import { OnboardingTour } from '@/components/OnboardingTour';

function DashboardContent({ children }: { children: React.ReactNode }) {
    const [runTour, setRunTour] = useState(false);
    const { data: session, status } = useSession();
    const { state, dispatch } = useDashboard();

    useEffect(() => {
        const checkOnboardingStatus = async () => {
            if (status === 'authenticated') {
                // This part is simplified. In a real project, user object would come with session
                // or be fetched via a separate API call.
                // For now, we'll assume we can get the state.
                // TODO: Integrate real user onboarding state fetching in the future.
                const onboardingState = localStorage.getItem('onboardingState');
                if (!onboardingState || !JSON.parse(onboardingState).mainDashboardTour) {
                    setRunTour(true);
                }
            }
        };
        checkOnboardingStatus();
    }, [status]);

    const handleTourComplete = async () => {
        setRunTour(false);
        localStorage.setItem('onboardingState', JSON.stringify({ mainDashboardTour: 'completed' }));
        await fetch('/api/user/update-onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tourName: 'mainDashboardTour', status: 'completed' }),
        });
    };

    const handleBackdropClick = () => {
        dispatch({ type: 'SET_SIDEBAR_OPEN', payload: false });
    };

    return (
        <>
            {/* <OnboardingTour run={runTour} onComplete={handleTourComplete} /> */}

            {/* Mobile Backdrop */}
            {state.sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 md:hidden"
                    onClick={handleBackdropClick}
                    aria-hidden="true"
                />
            )}

            {/* Main Layout */}
            <div className="md:grid md:grid-cols-[auto_1fr] h-screen bg-background">
                <Sidebar />
                <div className="flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardProvider>
            <DashboardContent>{children}</DashboardContent>
        </DashboardProvider>
    );
}
