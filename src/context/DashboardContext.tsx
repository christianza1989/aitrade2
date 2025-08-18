"use client";

import { createContext, useContext, useReducer, ReactNode, useEffect, useRef, useState } from 'react';
import { Ticker } from '@/core/binance';
import toast from 'react-hot-toast';

// --- STATE AND TYPES ---
interface Position {
    symbol: string;
    amount: number;
    entryPrice: number;
}

interface Portfolio {
    balance: number;
    positions: Position[];
}

interface AiChat {
    agent: string;
    prompt: string;
    response: Record<string, unknown>;
}

// More specific type for analysis data
interface Analysis {
    [key: string]: unknown;
}

interface DashboardState {
    logs: string[];
    marketData: Ticker[];
    portfolio: Portfolio;
    isLoading: boolean;
    selectedSymbol: string;
    analysis: Analysis | null;
    botStatus: 'active' | 'inactive';
    aiChat: AiChat[];
    nextCycleIn: string;
    lastRunAnalysis: Analysis | null;
}

type Action =
    | { type: 'ADD_LOG'; payload: string }
    | { type: 'ADD_AI_CHAT'; payload: AiChat }
    | { type: 'SET_MARKET_DATA'; payload: Ticker[] }
    | { type: 'SET_PORTFOLIO'; payload: Portfolio }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_SELECTED_SYMBOL'; payload: string }
    | { type: 'SET_ANALYSIS'; payload: Analysis | null }
    | { type: 'SET_BOT_STATUS'; payload: 'active' | 'inactive' }
    | { type: 'SET_TIMER'; payload: string }
    | { type: 'SET_LAST_RUN_ANALYSIS'; payload: Analysis | null };

const initialState: DashboardState = {
    logs: [],
    aiChat: [],
    marketData: [],
    portfolio: { balance: 10000, positions: [] },
    isLoading: false,
    selectedSymbol: 'BTCUSDT',
    analysis: null,
    botStatus: 'inactive',
    nextCycleIn: 'N/A',
    lastRunAnalysis: null,
};

// --- REDUCER ---
function dashboardReducer(state: DashboardState, action: Action): DashboardState {
    switch (action.type) {
        case 'ADD_LOG':
            const newLogs = [...state.logs, `[${new Date().toLocaleTimeString()}] ${action.payload}`];
            return { ...state, logs: newLogs.slice(-100) };
        case 'ADD_AI_CHAT':
            const newChats = [...state.aiChat, action.payload];
            return { ...state, aiChat: newChats.slice(-100) };
        case 'SET_MARKET_DATA':
            return { ...state, marketData: action.payload };
        case 'SET_PORTFOLIO':
            return { ...state, portfolio: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_SELECTED_SYMBOL':
            return { ...state, selectedSymbol: action.payload };
        case 'SET_ANALYSIS':
            return { ...state, analysis: action.payload };
        case 'SET_BOT_STATUS':
            return { ...state, botStatus: action.payload };
        case 'SET_TIMER':
            return { ...state, nextCycleIn: action.payload };
        case 'SET_LAST_RUN_ANALYSIS':
            return { ...state, lastRunAnalysis: action.payload };
        default:
            return state;
    }
}

// --- CONTEXT ---
const DashboardContext = createContext<{ state: DashboardState; dispatch: React.Dispatch<Action>; } | undefined>(undefined);

// --- PROVIDER ---
interface Config {
    cycleIntervalMinutes: number;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(dashboardReducer, initialState);
    const [config, setConfig] = useState<Config | null>(null);
    const timerIdRef = useRef<NodeJS.Timeout | null>(null);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isCycleRunningRef = useRef(false);

    useEffect(() => {
        async function fetchConfig() {
            try {
                const response = await fetch('/api/settings');
                const data = await response.json();
                setConfig(data);
            } catch {
                console.error("Failed to fetch config");
            }
        }
        fetchConfig();

        const fetchDataInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/dashboard-data');
                if (!response.ok) throw new Error('Failed to fetch dashboard data');
                const data = await response.json();
                dispatch({ type: 'SET_MARKET_DATA', payload: data.marketData });
                dispatch({ type: 'SET_PORTFOLIO', payload: data.portfolio });
            } catch {
                // Don't spam logs for background refresh failures
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(fetchDataInterval);
    }, []);

    const CYCLE_INTERVAL = (config?.cycleIntervalMinutes || 20) * 60 * 1000;

    const runCycle = async () => {
        if (isCycleRunningRef.current) {
            dispatch({ type: 'ADD_LOG', payload: 'Cycle already in progress. Skipping.' });
            return;
        }
        isCycleRunningRef.current = true;
        dispatch({ type: 'ADD_LOG', payload: 'Bot cycle started... Attempting to fetch API.' });

        try {
            const res = await fetch('/api/bot/run');
            dispatch({ type: 'ADD_LOG', payload: `API response received. Status: ${res.status}` });

            if (!res.ok || !res.body) {
                const errorText = await res.text();
                dispatch({ type: 'ADD_LOG', payload: `API Error: Response not OK or no body. Details: ${errorText}` });
                throw new Error(`API request failed with status ${res.status}`);
            }
            
            dispatch({ type: 'ADD_LOG', payload: 'Response body is valid. Starting to read stream...' });
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            const currentAnalysis: Analysis = {};

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    dispatch({ type: 'ADD_LOG', payload: 'Bot cycle finished.' });
                    dispatch({ type: 'SET_LAST_RUN_ANALYSIS', payload: currentAnalysis });
                    break;
                }
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));
                for (const line of lines) {
                    try {
                        const json = JSON.parse(line.replace('data: ', ''));
                        const { type, message, data } = json;
                        if (type === 'log') {
                            if (message.startsWith('BOUGHT') || message.startsWith('SOLD')) {
                                toast.success(message);
                            }
                            dispatch({ type: 'ADD_LOG', payload: message });
                        } else if (type === 'analysis') {
                            dispatch({ type: 'SET_ANALYSIS', payload: data });
                        } else if (type === 'aiChat' && data) {
                            dispatch({ type: 'ADD_AI_CHAT', payload: data });
                            if (data.agent.startsWith('PortfolioAllocator')) {
                                currentAnalysis.PortfolioAllocator = data;
                            }
                        }
                    } catch {
                        dispatch({ type: 'ADD_LOG', payload: 'Failed to parse stream data.' });
                    }
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            dispatch({ type: 'ADD_LOG', payload: `[CYCLE ERROR] ${errorMessage}` });
        } finally {
            isCycleRunningRef.current = false;
            if (state.botStatus === 'active') {
                scheduleNextCycle();
            }
        }
    };

    const scheduleNextCycle = (immediate = false) => {
        if (timerIdRef.current) clearTimeout(timerIdRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        if (immediate) {
            runCycle();
            return;
        }

        let timeLeft = CYCLE_INTERVAL;
        const updateTimer = () => {
            if (timeLeft <= 0) {
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                return;
            }
            timeLeft -= 1000;
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.round((timeLeft % 60000) / 1000);
            dispatch({ type: 'SET_TIMER', payload: `${minutes}:${seconds < 10 ? '0' : ''}${seconds}` });
        };
        
        updateTimer();
        timerIntervalRef.current = setInterval(updateTimer, 1000);
        timerIdRef.current = setTimeout(runCycle, CYCLE_INTERVAL);
    };

    useEffect(() => {
        if (state.botStatus === 'active') {
            dispatch({ type: 'ADD_LOG', payload: "Bot activated. Starting first cycle immediately..." });
            scheduleNextCycle(true);
        } else {
            dispatch({ type: 'ADD_LOG', payload: "Bot stopped." });
            if (timerIdRef.current) clearTimeout(timerIdRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            dispatch({ type: 'SET_TIMER', payload: 'N/A' });
        }

        return () => {
            if (timerIdRef.current) clearTimeout(timerIdRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.botStatus]);

    return (
        <DashboardContext.Provider value={{ state, dispatch }}>
            {children}
        </DashboardContext.Provider>
    );
}

// --- HOOK ---
export function useDashboard() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}
