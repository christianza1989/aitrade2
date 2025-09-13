"use client";
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';
import { useDashboard } from '../context/DashboardContext';

interface OnboardingTourProps {
    run: boolean;
    onComplete: () => void;
}

export const OnboardingTour = ({ run, onComplete }: OnboardingTourProps) => {
    const { state } = useDashboard();

    const steps: Step[] = [
        {
            target: 'body',
            content: 'Welcome to Lucid Hive! Let\'s start with an interactive tour.',
            placement: 'center',
            title: 'Welcome!',
        },
        {
            target: '#kpi-cards',
            content: 'This is your real-time portfolio overview. Now, let\'s analyze a specific asset. Please click on "BTCUSDT" in the Market Scanner table.',
            title: 'Your Financial Snapshot',
            disableBeacon: true,
        },
        {
            target: '#chat-interface-card', // Pridėkite ID prie ChatInterface Card komponente
            content: 'Excellent! Now, ask the AI Assistant for an analysis. Type "analyze BTCUSDT" in the input field and press Send.',
            title: 'AI Assistant',
            spotlightClicks: true,
        },
        {
            target: '#sidebar-nav',
            content: 'Great job! You\'ve completed the basic workflow. Use this navigation bar to explore advanced tools like the Memory Explorer and system Settings. You can restart this tour anytime from the settings page.',
            title: 'Deeper Analysis Tools',
        }
    ];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, step, type } = data;

        // Jei turas baigtas arba praleistas, kviečiame onComplete
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            onComplete();
        }

        // Papildoma logika interaktyvumui (bus tobulinama ateityje)
        console.log(`Joyride event: ${type} for step:`, step);
    };

    return (
        <Joyride
            run={run}
            steps={steps}
            continuous
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    arrowColor: '#1f2937',
                    backgroundColor: '#1f2937',
                    primaryColor: '#2563eb',
                    textColor: '#d1d5db',
                    zIndex: 1000,
                },
            }}
        />
    );
};
