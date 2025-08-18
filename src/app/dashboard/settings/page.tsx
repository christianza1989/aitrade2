"use client";

import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Define an interface for the settings object
interface Settings {
    [key: string]: string | number;
}

const settingsConfig = [
    { name: 'sellStrategy', label: 'Sell Strategy', type: 'select', options: ['takeProfit', 'trailingStop'], tooltip: 'Choose the strategy for selling assets.' },
    { name: 'takeProfitPercent', label: 'Take Profit (%)', type: 'number', condition: (s: Settings) => s.sellStrategy === 'takeProfit', tooltip: 'The percentage of profit at which to automatically sell an asset.' },
    { name: 'stopLossPercent', label: 'Stop Loss (%)', type: 'number', tooltip: 'The percentage of loss at which to automatically sell an asset.' },
    { name: 'trailingStopPercent', label: 'Trailing Stop (%)', type: 'number', condition: (s: Settings) => s.sellStrategy === 'trailingStop', tooltip: 'The percentage below the highest price at which to sell an asset.' },
    { name: 'riskAmountPercent', label: 'Risk Amount (%)', type: 'number', tooltip: 'The percentage of your total balance to risk on a single trade.' },
    { name: 'rsiPeriod', label: 'RSI Period', type: 'number', tooltip: 'The number of periods to use for the Relative Strength Index (RSI) calculation.' },
    { name: 'symbolsToAnalyze', label: 'Symbols to Analyze', type: 'number', tooltip: 'The number of top symbols to analyze in each cycle.' },
    { name: 'batchSize', label: 'Batch Size', type: 'number', tooltip: 'The number of symbols to analyze in a single AI request.' },
    { name: 'macroScoreThreshold', label: 'Macro Score Threshold', type: 'number', tooltip: 'The minimum macroeconomic score required to consider buying.' },
    { name: 'minimumBalance', label: 'Minimum Balance to Trade', type: 'number', tooltip: 'The minimum balance required to start a new trading cycle.' },
    { name: 'cycleIntervalMinutes', label: 'Cycle Interval (Minutes)', type: 'number', tooltip: 'The time in minutes between each trading cycle.' },
    { name: 'smaShortPeriod', label: 'SMA (Short) Period', type: 'number', tooltip: 'The period for the short-term Simple Moving Average.' },
    { name: 'smaLongPeriod', label: 'SMA (Long) Period', type: 'number', tooltip: 'The period for the long-term Simple Moving Average.' },
    { name: 'macdShortPeriod', label: 'MACD (Short) Period', type: 'number', tooltip: 'The short period for the MACD calculation.' },
    { name: 'macdLongPeriod', label: 'MACD (Long) Period', type: 'number', tooltip: 'The long period for the MACD calculation.' },
    { name: 'macdSignalPeriod', label: 'MACD (Signal) Period', type: 'number', tooltip: 'The signal period for the MACD calculation.' },
];

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchSettings() {
            setIsLoading(true);
            try {
                const response = await fetch('/api/settings');
                const data = await response.json();
                setSettings(data);
            } catch (error) {
                console.error("Failed to fetch settings", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSettings();
    }, []);

    const handleSave = async () => {
        const toastId = toast.loading('Saving settings...');
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            toast.success('Settings saved!', { id: toastId });
        } catch {
            toast.error('Failed to save settings.', { id: toastId });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings({ ...settings, [name]: name === 'sellStrategy' ? value : parseFloat(value) });
    };

    if (isLoading) {
        return <div className="text-white p-6">Loading settings...</div>;
    }

    return (
        <div className="text-white p-6">
            <h1 className="text-2xl font-bold mb-6">Strategy Settings</h1>
            <div className="bg-gray-800 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {settingsConfig.map((item) => (
                        (!item.condition || item.condition(settings)) && (
                            <div key={item.name}>
                                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
                                    {item.label}
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <HelpCircle size={14} className="ml-2 text-gray-500" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{item.tooltip}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </label>
                                {item.type === 'select' ? (
                                    <select name={item.name} value={settings[item.name] || ''} onChange={handleChange} className="bg-gray-700 rounded p-2 w-full">
                                        {item.options?.map(opt => <option key={opt} value={opt}>{opt.replace(/([A-Z])/g, ' $1').trim()}</option>)}
                                    </select>
                                ) : (
                                    <input type="number" name={item.name} value={settings[item.name] || ''} onChange={handleChange} className="bg-gray-700 rounded p-2 w-full" />
                                )}
                            </div>
                        )
                    ))}
                </div>
                <div className="mt-8">
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
