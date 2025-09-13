// src/context/DashboardContext.tsx
"use client";

import { createContext, useContext, useReducer, ReactNode, useEffect, useRef, useState, useCallback } from 'react';
import { Ticker } from '../core/binance';
import { ISharedContext } from '../core/context';
import { Opportunity } from '../core/opportunity-scanner';
import { Trade } from '../core/optimizer';
import toast from 'react-hot-toast';

// ... (sąsajos lieka tos pačios) ...
interface Position { symbol: string; amount: number; entryPrice: number; type?: 'long' | 'short'; }
interface Portfolio { balance: number; positions: Position[]; }
export interface AiChat { agent: string; prompt: string; response: Record<string, unknown>; }
interface Analysis { [key: string]: unknown; }
interface Config { general?: { cycleIntervalMinutes?: number }; [key: string]: unknown; }
interface ApiKey { id: string; name: string; key: string; isActive: boolean; }

interface DashboardState {
    logs: string[];
    marketData: Ticker[];
    portfolio: Portfolio;
    isLoading: boolean;
    selectedSymbol: string;
    botStatus: 'active' | 'inactive';
    aiChat: AiChat[];
    nextCycleIn: string;
    lastRunAnalysis: AiChat | null;
    sharedContext: ISharedContext | null;
    opportunities: Opportunity[];
    error: string | null;
    agentActivity: Record<string, { status: string; timestamp: number }>;
    activeApiKeyName: string;
    tradeHistory: Trade[];
    sidebarOpen: boolean;
}

type Action =
    | { type: 'ADD_LOG'; payload: string }
    | { type: 'ADD_AI_CHAT'; payload: AiChat }
    | { type: 'SET_MARKET_DATA'; payload: Ticker[] }
    | { type: 'UPDATE_TICKER_DATA'; payload: Ticker[] }
    | { type: 'SET_PORTFOLIO'; payload: Portfolio }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_SELECTED_SYMBOL'; payload: string }
    | { type: 'SET_BOT_STATUS'; payload: 'active' | 'inactive' }
    | { type: 'SET_TIMER'; payload: string }
    | { type: 'SET_LAST_RUN_ANALYSIS'; payload: AiChat | null }
    | { type: 'SET_SHARED_CONTEXT'; payload: ISharedContext | null }
    | { type: 'SET_OPPORTUNITIES'; payload: Opportunity[] }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_AGENT_ACTIVITY'; payload: { agentName: string; status: string } }
    | { type: 'SET_ACTIVE_API_KEY_NAME'; payload: string }
    | { type: 'SET_TRADE_HISTORY'; payload: Trade[] }
    | { type: 'TOGGLE_SIDEBAR' }
    | { type: 'SET_SIDEBAR_OPEN'; payload: boolean };

const initialState: DashboardState = {
    logs: [],
    aiChat: [],
    marketData: [],
    portfolio: { balance: 0, positions: [] },
    isLoading: true,
    selectedSymbol: 'BTCUSDT',
    botStatus: 'inactive',
    nextCycleIn: 'N/A',
    lastRunAnalysis: null,
    sharedContext: null,
    opportunities: [],
    error: null,
    agentActivity: {},
    activeApiKeyName: 'Loading...',
    tradeHistory: [],
    sidebarOpen: false,
};

function dashboardReducer(state: DashboardState, action: Action): DashboardState {
    // ... (reducer logika lieka ta pati) ...
    switch (action.type) {
        case 'ADD_LOG':
            return { ...state, logs: [`[${new Date().toLocaleTimeString()}] ${action.payload}`, ...state.logs].slice(0, 100) };
        case 'ADD_AI_CHAT':
            const newChatState = { ...state, aiChat: [action.payload, ...state.aiChat].slice(0, 50) };
            if (action.payload.agent === 'PortfolioAllocator') {
                newChatState.lastRunAnalysis = action.payload;
            }
            return newChatState;
        case 'SET_MARKET_DATA':
            return { ...state, marketData: action.payload };
        case 'UPDATE_TICKER_DATA': {
            const newMarketData = [...state.marketData];
            const updates = new Map(action.payload.map(ticker => [ticker.symbol, ticker]));
            for (let i = 0; i < newMarketData.length; i++) {
                const update = updates.get(newMarketData[i].symbol);
                if (update) {
                    newMarketData[i] = {
                        ...newMarketData[i],
                        lastPrice: update.lastPrice,
                        priceChangePercent: update.priceChangePercent,
                        quoteVolume: update.quoteVolume,
                    };
                }
            }
            return { ...state, marketData: newMarketData };
        }
        case 'SET_PORTFOLIO':
            return { ...state, portfolio: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_SELECTED_SYMBOL':
            return { ...state, selectedSymbol: action.payload };
        case 'SET_BOT_STATUS':
            return { ...state, botStatus: action.payload };
        case 'SET_TIMER':
            return { ...state, nextCycleIn: action.payload };
        case 'SET_LAST_RUN_ANALYSIS':
            return { ...state, lastRunAnalysis: action.payload };
        case 'SET_SHARED_CONTEXT':
            return { ...state, sharedContext: action.payload };
        case 'SET_OPPORTUNITIES':
            if (JSON.stringify(state.opportunities) !== JSON.stringify(action.payload)) {
                return { ...state, opportunities: action.payload };
            }
            return state;
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SET_AGENT_ACTIVITY':
            return {
                ...state,
                agentActivity: {
                    ...state.agentActivity,
                    [action.payload.agentName]: {
                        status: action.payload.status,
                        timestamp: Date.now(),
                    },
                },
            };
        case 'SET_ACTIVE_API_KEY_NAME':
            return { ...state, activeApiKeyName: action.payload };
        case 'SET_TRADE_HISTORY':
            return { ...state, tradeHistory: action.payload };
        case 'TOGGLE_SIDEBAR':
            return { ...state, sidebarOpen: !state.sidebarOpen };
        case 'SET_SIDEBAR_OPEN':
            return { ...state, sidebarOpen: action.payload };
        default:
            return state;
    }
}

const DashboardContext = createContext<{ state: DashboardState; dispatch: React.Dispatch<Action>; } | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(dashboardReducer, initialState);
    const [config, setConfig] = useState<Config | null>(null);
    const timerIdRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isCycleRunningRef = useRef(false);

    // NAUJA FUNKCIJA
    const fetchPortfolio = useCallback(async () => {
        try {
            const response = await fetch('/api/portfolio');
            if (response.ok) {
                const portfolioData = await response.json();
                dispatch({ type: 'SET_PORTFOLIO', payload: portfolioData });
            }
        } catch (error) {
            console.error("Failed to fetch portfolio:", error);
        }
    }, []);

    useEffect(() => {
        // ... (fetchInitialData lieka toks pat) ...
        const fetchInitialData = async () => {
             dispatch({ type: 'SET_ERROR', payload: null });
            try {
                const initialResponse = await fetch('/api/initial-data');
                if (!initialResponse.ok) throw new Error(`Initial data fetch failed`);
                
                const data = await initialResponse.json();
                dispatch({ type: 'SET_MARKET_DATA', payload: data.marketData });
                dispatch({ type: 'SET_PORTFOLIO', payload: data.portfolio });
                dispatch({ type: 'SET_BOT_STATUS', payload: data.botStatus });

                const settingsResponse = await fetch('/api/settings');
                if(settingsResponse.ok) setConfig(await settingsResponse.json());

            } catch (error) {
                const errorMessage = "Could not load initial dashboard data.";
                dispatch({ type: 'SET_ERROR', payload: errorMessage });
                toast.error("Dashboard failed to load.");
            } finally {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };
        const fetchActiveKey = async () => {
            try {
                const response = await fetch('/api/settings/api-keys');
                if (response.ok) {
                    const keys: ApiKey[] = await response.json();
                    const activeKey = keys.find(k => k.isActive);
                    dispatch({ type: 'SET_ACTIVE_API_KEY_NAME', payload: activeKey ? activeKey.name : 'No active key' });
                } else {
                    dispatch({ type: 'SET_ACTIVE_API_KEY_NAME', payload: 'Default' });
                }
            } catch {
                dispatch({ type: 'SET_ACTIVE_API_KEY_NAME', payload: 'Error' });
            }
        };

        fetchInitialData();
        fetchActiveKey();

        // ... (priceEventSource ir opportunityInterval lieka tokie patys) ...
         const priceEventSource = new EventSource('/api/ticker-stream');
        priceEventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'TICKER_UPDATE') {
                dispatch({ type: 'UPDATE_TICKER_DATA', payload: data.payload });
            }
        };
        priceEventSource.onerror = () => priceEventSource.close();
        
        const opportunityInterval = setInterval(async () => {
            const response = await fetch('/api/opportunities');
            if (response.ok) dispatch({ type: 'SET_OPPORTUNITIES', payload: await response.json() });
        }, 5000);

        return () => {
            priceEventSource.close();
            clearInterval(opportunityInterval);
        };
    }, []);

    // NAUJAS useEffect PREKYBOS ISTORIJAI
    useEffect(() => {
        const fetchTradeHistory = async () => {
            try {
                const response = await fetch('/api/history');
                if (response.ok) {
                    const data = await response.json();
                    dispatch({ type: 'SET_TRADE_HISTORY', payload: data });
                }
            } catch (error) {
                console.error("DashboardContext: Failed to fetch trade history:", error);
            }
        };

        fetchTradeHistory(); // Pirmas gavimas iškart
        const interval = setInterval(fetchTradeHistory, 15000); // Vėliau kas 15 sekundžių

        return () => clearInterval(interval);
    }, []); // Tuščias masyvas reiškia, kad šis efektas pasileis tik vieną kartą

    const runCycle = useCallback(async () => {
        if (isCycleRunningRef.current) return;
        isCycleRunningRef.current = true;
        dispatch({ type: 'ADD_LOG', payload: 'Bot cycle started...' });
        try {
            const res = await fetch('/api/bot/run');
            if (!res.ok || !res.body) throw new Error(`API request failed with status ${res.status}`);
            
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                
                let boundary = buffer.indexOf('\n\n');
                while (boundary !== -1) {
                    const message = buffer.substring(0, boundary);
                    buffer = buffer.substring(boundary + 2);

                    if (message.startsWith('data: ')) {
                        try {
                            const json = JSON.parse(message.replace('data: ', ''));
                            const { type, message: logMessage, data, payload } = json;

                            if (type === 'log' && logMessage) dispatch({ type: 'ADD_LOG', payload: logMessage });
                            else if (type === 'aiChat' && data) dispatch({ type: 'ADD_AI_CHAT', payload: data });
                            else if (type === 'context' && data) dispatch({ type: 'SET_SHARED_CONTEXT', payload: data });
                            else if (type === 'agent_activity' && payload) {
                                dispatch({ type: 'SET_AGENT_ACTIVITY', payload: payload });
                            } 
                            else if (type === 'PORTFOLIO_UPDATED') {
                                fetchPortfolio();
                            }
                        } catch (e) {
                            console.error("Error parsing stream chunk:", e, "Chunk:", message);
                        }
                    }
                    boundary = buffer.indexOf('\n\n');
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            dispatch({ type: 'ADD_LOG', payload: `Bot cycle failed: ${errorMessage}` });
            toast.error("Bot cycle failed.");
        } finally {
            isCycleRunningRef.current = false;
        }
    }, [dispatch, fetchPortfolio]);
    
    // ... (paskutinis useEffect lieka toks pat) ...
    useEffect(() => {
        if (!config) return;

        const scheduleNextCycle = (immediate = false) => {
            if (timerIdRef.current) clearTimeout(timerIdRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

            const cycleInterval = (config?.general?.cycleIntervalMinutes || 20) * 60 * 1000;
            const startCountdown = (duration: number) => {
                let timeLeft = duration;
                const update = () => {
                    const minutes = Math.floor(timeLeft / (60 * 1000));
                    const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
                    dispatch({ type: 'SET_TIMER', payload: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` });
                    timeLeft -= 1000;
                };
                update();
                countdownIntervalRef.current = setInterval(update, 1000);
            };
            
            if (immediate) {
                runCycle().then(() => {
                    startCountdown(cycleInterval);
                    timerIdRef.current = setTimeout(() => scheduleNextCycle(true), cycleInterval);
                });
            } else {
                startCountdown(cycleInterval);
                timerIdRef.current = setTimeout(() => scheduleNextCycle(true), cycleInterval);
            }
        };

        const fetchContextData = async () => {
            toast.loading('Fetching AI market analysis...', { id: 'context-toast' });
            const response = await fetch('/api/context-data');
            if (response.ok) {
                const data = await response.json();
                dispatch({ type: 'SET_SHARED_CONTEXT', payload: data.context });
                toast.success('AI analysis loaded!', { id: 'context-toast' });
            } else {
                toast.error('Failed to load AI analysis.', { id: 'context-toast' });
            }
        };

        if (state.botStatus === 'active') {
            fetchContextData();
            scheduleNextCycle(true);
        } else {
            dispatch({ type: 'SET_SHARED_CONTEXT', payload: null });
            if (timerIdRef.current) clearTimeout(timerIdRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            dispatch({ type: 'SET_TIMER', payload: 'N/A' });
        }

        return () => {
            if (timerIdRef.current) clearTimeout(timerIdRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, [state.botStatus, config, runCycle, dispatch]);

    
    return (
        <DashboardContext.Provider value={{ state, dispatch }}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}
