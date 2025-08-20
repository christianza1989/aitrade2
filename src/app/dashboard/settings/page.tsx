// src/app/dashboard/settings/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Define an interface for the settings object
interface Settings {
    [key: string]: string | number | boolean;
}

// Helper component for section titles
const SectionTitle = ({ title, description }: { title: string, description: string }) => (
    <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-6 mb-2 border-b border-gray-700 pb-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-gray-400">{description}</p>
    </div>
);

// Helper component for individual settings
const SettingInput = ({ name, label, tooltip, type = 'number', value, onChange, options, step }: any) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
            {label}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <HelpCircle size={14} className="ml-2 text-gray-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="max-w-xs">{tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </label>
        {type === 'select' && (
            <select name={name} value={value} onChange={onChange} className="bg-gray-700 rounded p-2 w-full">
                {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        )}
        {type === 'number' && (
            <input type="number" name={name} value={value} onChange={onChange} className="bg-gray-700 rounded p-2 w-full" step={step || '1'} />
        )}
        {type === 'checkbox' && (
            <label className="flex items-center space-x-2 cursor-pointer mt-2">
                <input type="checkbox" name={name} checked={!!value} onChange={onChange} className="bg-gray-700 rounded h-5 w-5 text-blue-500 focus:ring-blue-500 border-gray-600" />
                <span className="text-gray-300">{!!value ? 'Enabled' : 'Disabled'}</span>
            </label>
        )}
    </div>
);


export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings>({});
    const [isLoading, setIsLoading] = useState(true);

    // Mock fetch, in real life this would be a fetch call
    useEffect(() => {
        setIsLoading(true);
        // Mock data that includes the new settings
        const mockSettings = {
            takeProfitPercent: 7.5,
            stopLossPercent: -3.0,
            riskAmountPercent: 2.0,
            symbolsToAnalyze: 50,
            batchSize: 10,
            macroScoreThreshold: 4.5,
            cycleIntervalMinutes: 15,
            // New Narrative Trading Settings
            enableNarrativeTrading: true,
            narrativeAllocationBoost: 25,
            // New DEX Hunting Settings
            enableDexHunting: false,
            dexMaxAllocationPercent: 5,
            // New Autonomous Improvement Settings
            enableAutoImprovement: false,
        };
        setSettings(mockSettings);
        setIsLoading(false);
    }, []);

    const handleSave = async () => {
        // ... existing save logic ...
        toast.success('Settings saved!');
    };
    
    const handleReset = async () => {
        // ... existing reset logic ...
        toast.success('All logs and portfolio have been reset!');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue;
        if (type === 'checkbox') {
            finalValue = (e.target as HTMLInputElement).checked;
        } else if (type === 'number') {
            finalValue = parseFloat(value);
        } else {
            finalValue = value;
        }
        setSettings(prev => ({ ...prev, [name]: finalValue }));
    };

    if (isLoading) {
        return <div className="text-white p-6">Loading settings...</div>;
    }

    return (
        <div className="text-white p-6">
            <h1 className="text-3xl font-bold mb-6">Bot Settings</h1>
            <div className="bg-gray-800 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    <SectionTitle title="Trade Execution" description="Core parameters for buying and selling assets."/>
                    <SettingInput name="takeProfitPercent" label="Take Profit (%)" tooltip="The percentage of profit at which to consider selling." value={settings.takeProfitPercent} onChange={handleChange} step="0.1" />
                    <SettingInput name="stopLossPercent" label="Stop Loss (%)" tooltip="The percentage of loss at which to automatically sell an asset. Should be negative." value={settings.stopLossPercent} onChange={handleChange} step="0.1" />
                    <SettingInput name="riskAmountPercent" label="Risk per Trade (%)" tooltip="The percentage of your total balance to risk on a single trade." value={settings.riskAmountPercent} onChange={handleChange} step="0.1" />

                    <SectionTitle title="Market Analysis" description="How the bot scans the market and decides which assets to analyze."/>
                    <SettingInput name="symbolsToAnalyze" label="Symbols to Analyze" tooltip="The number of top symbols by volume to analyze in each cycle." value={settings.symbolsToAnalyze} onChange={handleChange} />
                    <SettingInput name="batchSize" label="Analysis Batch Size" tooltip="The number of symbols to analyze in a single AI request to avoid rate limits." value={settings.batchSize} onChange={handleChange} />
                    <SettingInput name="macroScoreThreshold" label="Macro Score Threshold" tooltip="The minimum macroeconomic score (0-10) required to consider entering new trades." value={settings.macroScoreThreshold} onChange={handleChange} step="0.1" />
                    <SettingInput name="cycleIntervalMinutes" label="Cycle Interval (Minutes)" tooltip="The time in minutes between each trading cycle." value={settings.cycleIntervalMinutes} onChange={handleChange} />
                    
                    <SectionTitle title="Advanced Strategies" description="Enable and configure higher-level strategic modules."/>
                    <div className="p-4 bg-gray-900 rounded-lg col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SettingInput name="enableNarrativeTrading" label="Narrative Trading" tooltip="If enabled, the bot will prioritize assets from the currently dominant market narrative (e.g., AI, GameFi)." type="checkbox" value={settings.enableNarrativeTrading} onChange={handleChange} />
                        <SettingInput name="narrativeAllocationBoost" label="Narrative Allocation Boost (%)" tooltip="Increase the allocated capital for assets within the dominant narrative by this percentage." value={settings.narrativeAllocationBoost} onChange={handleChange} />
                    </div>
                    
                     <SectionTitle title="Future Features (High Risk)" description="Experimental features for advanced users."/>
                     <div className="p-4 bg-gray-900 rounded-lg col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SettingInput name="enableDexHunting" label="DEX Hunting" tooltip="Enable the DEX Scout agent to find new, high-risk opportunities on decentralized exchanges." type="checkbox" value={settings.enableDexHunting} onChange={handleChange} />
                        <SettingInput name="dexMaxAllocationPercent" label="DEX Max Allocation (%)" tooltip="The maximum percentage of the portfolio to allocate to high-risk DEX opportunities." value={settings.dexMaxAllocationPercent} onChange={handleChange} />
                    </div>
                     <div className="p-4 bg-gray-900 rounded-lg col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SettingInput name="enableAutoImprovement" label="Autonomous Improvement" tooltip="Allow the MasterAgent to automatically apply new settings after a successful 'Shadow Mode' test." type="checkbox" value={settings.enableAutoImprovement} onChange={handleChange} />
                    </div>
                </div>

                <div className="mt-8 border-t border-gray-700 pt-6">
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition-colors">
                        Save Settings
                    </button>
                    <button onClick={handleReset} className="bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors ml-4">
                        Reset All Logs & Portfolio
                    </button>
                </div>
            </div>
        </div>
    );
}