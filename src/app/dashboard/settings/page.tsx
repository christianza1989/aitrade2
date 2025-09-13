// src/app/dashboard/settings/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Save, RotateCcw, Trash2, PlusCircle, Bot, Activity, BrainCircuit, LoaderCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { get, set, cloneDeep } from 'lodash';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormField } from '@/components/ui/FormField';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ContextualHelp } from '@/components/ContextualHelp';

// Tipai (supaprastinti, bet pakankami UI)
type Strategy = Record<string, any>;
type Config = {
  strategy_mapping: Record<string, string>;
  strategies: Record<string, Strategy>;
  [key: string]: any;
};
type LiveStatus = {
    marketRegime: string;
    activeStrategyName: string;
};

const REGIME_DESCRIPTIONS: Record<string, string> = {
    BULL_VOLATILITY: "Strong uptrend with high volatility. Good for momentum strategies.",
    BEAR_VOLATILITY: "Strong downtrend with high volatility. Good for shorting strategies.",
    RANGING: "No clear trend, but price moves in a channel. Good for scalping.",
    COMPRESSION: "Low volatility and tight price range. Often precedes a major breakout.",
    default: "A fallback strategy used if no specific regime is matched."
};

export default function SettingsPage() {
    const [config, setConfig] = useState<Config | null>(null);
    const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const [newStrategyName, setNewStrategyName] = useState("");
    const [cloneSource, setCloneSource] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [proposedStrategy, setProposedStrategy] = useState<any | null>(null);
    const [tradeCount, setTradeCount] = useState(0);

    // --- DUOMENŲ GAVIMAS ---
    useEffect(() => {
        const fetchConfig = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/settings');
                if (!response.ok) throw new Error("Failed to load settings.");
                setConfig(await response.json());
            } catch (error) {
                toast.error((error as Error).message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        const fetchLiveStatus = async () => {
            try {
                const response = await fetch('/api/system-status/live');
                if (response.ok) setLiveStatus(await response.json());
            } catch (error) {
                console.error("Could not fetch live system status:", error);
            }
        };
        fetchLiveStatus();
        const interval = setInterval(fetchLiveStatus, 15000); // Atnaujinti kas 15 sekundžių
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchTradeCount = async () => {
            try {
                const response = await fetch('/api/history');
                if (response.ok) {
                    const trades = await response.json();
                    setTradeCount(trades.length);
                }
            } catch (e) {
                console.error("Could not fetch trade count for settings page", e);
            }
        };
        fetchTradeCount();
    }, []);

    // --- BŪSENOS VALDYMO FUNKCIJOS ---
    const handleConfigChange = (path: string, value: any) => {
        const newConfig = cloneDeep(config);
        set(newConfig!, path, value);
        setConfig(newConfig);
        setIsDirty(true);
    };

    const handleSave = async () => {
        const toastId = toast.loading('Saving settings...');
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (!response.ok) throw new Error("Failed to save settings.");
            toast.success('Settings saved successfully!', { id: toastId });
            setIsDirty(false);
        } catch (error) {
            toast.error((error as Error).message, { id: toastId });
        }
    };

    const handleAddNewStrategy = () => {
        if (!newStrategyName || !cloneSource || !config) return;
        if (config.strategies[newStrategyName]) {
            toast.error("A strategy with this name already exists.");
            return;
        }

        const newConfig = cloneDeep(config);
        newConfig.strategies[newStrategyName] = cloneDeep(config.strategies[cloneSource]);
        setConfig(newConfig);
        setIsDirty(true);
        toast.success(`Strategy '${newStrategyName}' created.`);
        setNewStrategyName("");
        setCloneSource("");
        // Uždaryti dialogą
    };

    const handleDeleteStrategy = (strategyName: string) => {
        if (!config) return;
        const newConfig = cloneDeep(config);
        delete newConfig.strategies[strategyName];

        // Atnaujinti mapping, jei ištrinta strategija buvo naudojama
        Object.keys(newConfig.strategy_mapping).forEach(key => {
            if (newConfig.strategy_mapping[key] === strategyName) {
                newConfig.strategy_mapping[key] = 'default';
            }
        });

        setConfig(newConfig);
        setIsDirty(true);
        toast.success(`Strategy '${strategyName}' deleted.`);
    };

    const isStrategyInUse = useMemo(() => {
        if (!config) return () => false;
        const usedStrategies = new Set(Object.values(config.strategy_mapping));
        return (strategyName: string) => usedStrategies.has(strategyName);
    }, [config]);

    const handleGenerateStrategy = async () => {
        setIsGenerating(true);
        const toastId = toast.loading("AI is analyzing your performance... This may take a moment.");

        try {
            const response = await fetch('/api/strategies/generate', { method: 'POST' });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate strategy.");
            }

            setProposedStrategy(data);
            toast.success("AI has generated a new strategy proposal!", { id: toastId });

        } catch (error) {
            toast.error((error as Error).message, { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAcceptProposal = () => {
        if (!proposedStrategy || !config) return;

        const { newStrategyName, newStrategy } = proposedStrategy;

        const newConfig = cloneDeep(config);
        newConfig.strategies[newStrategyName] = newStrategy;

        setConfig(newConfig);
        setIsDirty(true);
        toast.success(`Strategy '${newStrategyName}' added to your library. Don't forget to save changes!`);

        setProposedStrategy(null); // Uždaro dialogo langą
    };


    if (isLoading) return <div className="text-white p-6">Loading settings...</div>;
    if (!config) return <div className="text-white p-6">Could not load configuration.</div>;

    const strategyNames = Object.keys(config.strategies);

    return (
        <div className="text-white p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Adaptive Intelligence Settings</h1>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => { /* TODO: Reset to defaults */ }}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Reset to Defaults
                    </Button>
                    <Button onClick={handleSave} disabled={!isDirty}>
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                        {isDirty && <span className="ml-2 w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>}
                    </Button>
                </div>
            </div>

            {/* "The Pulse" - Live Status Indicator */}
            <Card>
                <CardHeader>
                    <CardTitle>Live System Status</CardTitle>
                    <CardDescription>What the system is seeing and doing right now.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4">
                        <Activity className="h-10 w-10 text-blue-400" />
                        <div>
                            <Label>Current Market Regime</Label>
                            <Badge className="text-lg mt-1">{liveStatus?.marketRegime || 'Loading...'}</Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Bot className="h-10 w-10 text-purple-400" />
                        <div>
                            <Label>Active Strategy</Label>
                            <Badge variant="secondary" className="text-lg mt-1">{liveStatus?.activeStrategyName || 'Loading...'}</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* "The Control Map" - Strategy Mapping */}
            <Card>
                <CardHeader>
                    <CardTitle>Strategy Mapping</CardTitle>
                    <CardDescription>Assign your custom strategies to different market regimes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {Object.keys(config.strategy_mapping).map(regime => (
                        <div key={regime} className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                                {regime}
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                        <TooltipContent><p>{REGIME_DESCRIPTIONS[regime]}</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </Label>
                            <Select
                                value={config.strategy_mapping[regime]}
                                onValueChange={(value) => handleConfigChange(`strategy_mapping.${regime}`, value)}
                            >
                                <SelectTrigger className="w-[250px]">
                                    <SelectValue placeholder="Select strategy" />
                                </SelectTrigger>
                                <SelectContent>
                                    {strategyNames.map(name => (
                                        <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* "The Arsenal" - Strategy Library */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Strategy Library</CardTitle>
                        <CardDescription>Create, edit, and manage your arsenal of trading strategies.</CardDescription>
                    </div>
                    {/* --- PRIDĖTI ŠĮ MYGTUKĄ --- */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {/* Papildoma div pakuotė reikalinga, kad Tooltip veiktų su neaktyviu mygtuku */}
                                <div>
                                    <Button onClick={handleGenerateStrategy} disabled={isGenerating || tradeCount < 10}>
                                        {isGenerating ? (
                                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <BrainCircuit className="mr-2 h-4 w-4" />
                                        )}
                                        Generate with AI
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                {tradeCount < 10
                                    ? <p>Requires at least 10 trades in history to provide a meaningful analysis.</p>
                                    : <p>Ask the AI to analyze your entire trade history and propose a new, optimized strategy.</p>
                                }
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    {/* --- MYGTUKO PABAIGA --- */}
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue={strategyNames[0]} className="w-full">
                        <div className="flex items-center border-b">
                            <TabsList className="flex-grow justify-start">
                                {strategyNames.map(name => (
                                    <TabsTrigger key={name} value={name}>{name}</TabsTrigger>
                                ))}
                            </TabsList>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="ml-4">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Strategy
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Create New Strategy</DialogTitle></DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="new-strategy-name">New Strategy Name (ID)</Label>
                                            <Input id="new-strategy-name" value={newStrategyName} onChange={(e) => setNewStrategyName(e.target.value)} placeholder="e.g., aggressive_v2" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Clone from Existing Strategy</Label>
                                            <Select onValueChange={setCloneSource}>
                                                <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                                                <SelectContent>
                                                    {strategyNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleAddNewStrategy} disabled={!newStrategyName || !cloneSource}>Create Strategy</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        {strategyNames.map(name => (
                            <TabsContent key={name} value={name} className="mt-4">
                                <Accordion type="single" collapsible defaultValue="item-1">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>Risk Management</AccordionTrigger>
                                        <AccordionContent className="space-y-4 p-2">
                                            <FormField
                                                label="Capital Per Trade (%)"
                                                helpText="Recommended: 1-5% of portfolio"
                                                required
                                            >
                                                <Input
                                                    type="number"
                                                    placeholder="1.0"
                                                    step="0.1"
                                                    value={get(config, `strategies.${name}.risk_management.capital_per_trade_percent`, '')}
                                                    onChange={(e) => handleConfigChange(`strategies.${name}.risk_management.capital_per_trade_percent`, parseFloat(e.target.value))}
                                                />
                                            </FormField>
                                            <FormField
                                                label="Stop Loss Percentage"
                                                helpText="Recommended: 2-10% based on risk tolerance"
                                                required
                                            >
                                                <Input
                                                    type="number"
                                                    placeholder="5"
                                                    value={config.strategies[name]?.stopLossPercentage || ''}
                                                    onChange={(e) => handleConfigChange(`strategies.${name}.stopLossPercentage`, parseFloat(e.target.value))}
                                                />
                                            </FormField>
                                            <div className="space-y-2">
                                                <Label htmlFor="take-profit" className="flex items-center">
                                                    Take Profit Percentage
                                                    <ContextualHelp topicId="take-profit-percentage" />
                                                </Label>
                                                <Input
                                                    id="take-profit"
                                                    type="number"
                                                    placeholder="10"
                                                    value={config.strategies[name]?.takeProfitPercentage || ''}
                                                    onChange={(e) => handleConfigChange(`strategies.${name}.takeProfitPercentage`, parseFloat(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="max-position-size" className="flex items-center">
                                                    Max Position Size (% of portfolio)
                                                    <ContextualHelp topicId="max-position-size" />
                                                </Label>
                                                <Input
                                                    id="max-position-size"
                                                    type="number"
                                                    placeholder="20"
                                                    value={config.strategies[name]?.maxPositionSize || ''}
                                                    onChange={(e) => handleConfigChange(`strategies.${name}.maxPositionSize`, parseFloat(e.target.value))}
                                                />
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger>Market Scanning</AccordionTrigger>
                                        <AccordionContent className="space-y-4 p-2">
                                            <FormField
                                                label="Minimum Macro Score for Entry"
                                                helpText="Higher values = more selective entries (0-10 scale)"
                                                required
                                            >
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    placeholder="4.0"
                                                    value={get(config, `strategies.${name}.entry_criteria.min_macro_sentiment_score`, '')}
                                                    onChange={(e) => handleConfigChange(`strategies.${name}.entry_criteria.min_macro_sentiment_score`, parseFloat(e.target.value))}
                                                />
                                            </FormField>
                                            <div className="space-y-2">
                                                <Label htmlFor="min-volume" className="flex items-center">
                                                    Minimum Volume Threshold
                                                    <ContextualHelp topicId="min-volume-threshold" />
                                                </Label>
                                                <Input
                                                    id="min-volume"
                                                    type="number"
                                                    placeholder="1000000"
                                                    value={config.strategies[name]?.minVolume || ''}
                                                    onChange={(e) => handleConfigChange(`strategies.${name}.minVolume`, parseFloat(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="volatility-threshold" className="flex items-center">
                                                    Volatility Threshold
                                                    <ContextualHelp topicId="volatility-threshold" />
                                                </Label>
                                                <Input
                                                    id="volatility-threshold"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.05"
                                                    value={config.strategies[name]?.volatilityThreshold || ''}
                                                    onChange={(e) => handleConfigChange(`strategies.${name}.volatilityThreshold`, parseFloat(e.target.value))}
                                                />
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>

                                <div className="mt-6 border-t pt-4">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" disabled={isStrategyInUse(name) || name === 'default' || strategyNames.length <= 1}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Strategy
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the '{name}' strategy.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteStrategy(name)}>Continue</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    {(isStrategyInUse(name) || name === 'default' || strategyNames.length <= 1) &&
                                        <p className="text-xs text-muted-foreground mt-2">Cannot delete a strategy that is currently in use, is the default, or is the last one remaining.</p>
                                    }
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>

            {/* Trading Mode Toggle */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-red-500">🔴 Live Trading Zone</CardTitle>
                    <CardDescription>
                        Use these settings with extreme caution. Enabling live mode will execute trades with real funds.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 bg-gray-900 rounded-md">
                        <div className="space-y-1">
                            <Label htmlFor="trading-mode" className="text-base font-semibold">
                                Trading Mode
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Select the operational mode for the bot. Use Testnet before going live.
                            </p>
                        </div>
                        <Select
                            value={config?.global_settings?.trading_mode || 'paper'}
                            onValueChange={(value) => handleConfigChange('global_settings.trading_mode', value)}
                        >
                            <SelectTrigger className="w-[240px]">
                                <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="paper">
                                    <span className="font-semibold">📜 Paper Trading (Simulation)</span>
                                </SelectItem>
                                <SelectItem value="testnet">
                                    <span className="font-semibold text-yellow-500">🔬 Binance Testnet (Realistic)</span>
                                </SelectItem>
                                <SelectItem value="live">
                                    <span className="font-semibold text-red-500">🔴 Live Trading (Real Funds)</span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Pridėti šį kodą pačioje `SettingsPage` komponento JSX pabaigoje, prieš uždarantį </div> */}
            <Dialog open={!!proposedStrategy} onOpenChange={() => setProposedStrategy(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BrainCircuit className="text-purple-400" />
                            AI Strategy Proposal
                        </DialogTitle>
                        <CardDescription>
                            Based on your personal trading history, the AI suggests the following new strategy.
                        </CardDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <Card className="bg-background/50">
                            <CardHeader><CardTitle className="text-base">AI Analysis Summary</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground italic">"{proposedStrategy?.analysisSummary}"</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">New Strategy: {proposedStrategy?.newStrategyName}</CardTitle>
                                <CardDescription>{proposedStrategy?.newStrategy?.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">This new strategy has been generated and can be added to your library. You can review and edit its parameters before assigning it to a market regime.</p>
                            </CardContent>
                        </Card>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProposedStrategy(null)}>Discard</Button>
                        <Button onClick={handleAcceptProposal}>Add to Library</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
