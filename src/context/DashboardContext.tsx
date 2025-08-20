// src/context/DashboardContext.tsx

"use client";

import { createContext, useContext, useReducer, ReactNode, useEffect, useRef, useState } from 'react';
import { Ticker } from '@/core/binance';
import { ISharedContext } from '@/core/context';
import { Opportunity } from '@/core/opportunity-scanner';
import toast from 'react-hot-toast';

interface Position {
    symbol: string;
    amount: number;
    entryPrice: number;
}

interface Portfolio {
    balance: number;
    positions: Position[];
}

interface BinanceTickerEvent {
    s: string;
    c: string;
    P: string;
    q: string;
}

export interface AiChat {
    agent: string;
    prompt: string;
    response: Record<string, unknown>;
}

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
    sharedContext: ISharedContext | null;
    adjustedConfig: any | null;
    opportunities: Opportunity[];
}

type Action =
    | { type: 'ADD_LOG'; payload: string }
    | { type: 'ADD_AI_CHAT'; payload: AiChat }
    | { type: 'SET_MARKET_DATA'; payload: Ticker[] }
    | { type: 'UPDATE_MARKET_PRICES'; payload: Ticker[] }
    | { type: 'SET_PORTFOLIO'; payload: Portfolio }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_SELECTED_SYMBOL'; payload: string }
    | { type: 'SET_BOT_STATUS'; payload: 'active' | 'inactive' }
    | { type: 'SET_TIMER'; payload: string }
    | { type: 'SET_LAST_RUN_ANALYSIS'; payload: Analysis | null }
    | { type: 'SET_SHARED_CONTEXT'; payload: ISharedContext }
    | { type: 'SET_OPPORTUNITIES'; payload: Opportunity[] };

const initialState: DashboardState = {
    logs: [],
    aiChat: [],
    marketData: [],
    portfolio: { balance: 0, positions: [] },
    isLoading: true,
    selectedSymbol: 'BTCUSDT',
    analysis: null,
    botStatus: 'inactive',
    nextCycleIn: 'N/A',
    lastRunAnalysis: null,
    sharedContext: null,
    adjustedConfig: null,
    opportunities: [],
};

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
        case 'UPDATE_MARKET_PRICES':
            const updatedMarketData = state.marketData.map(ticker => {
                const update = action.payload.find(u => u.symbol === ticker.symbol);
                return update ? { ...ticker, ...update } : ticker;
            });
            return { ...state, marketData: updatedMarketData };
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
        default:
            return state;
    }
}

const DashboardContext = createContext<{ state: DashboardState; dispatch: React.Dispatch<Action>; } | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(dashboardReducer, initialState);
    const [config, setConfig] = useState<any | null>(null);
    const timerIdRef = useRef<NodeJS.Timeout | null>(null);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isCycleRunningRef = useRef(false);

    useEffect(() => {
        async function fetchInitialData() {
            try {
                const response = await fetch('/api/dashboard-data');
                if (!response.ok) throw new Error('Failed to fetch dashboard data');
                const data = await response.json();
                dispatch({ type: 'SET_MARKET_DATA', payload: data.marketData });
                dispatch({ type: 'SET_PORTFOLIO', payload: data.portfolio });
            } catch (error) {
                console.error("Failed to fetch initial dashboard data:", error);
            }
        }

        fetchInitialData();

        const eventSource = new EventSource('/api/market-stream');
        eventSource.onmessage = (event) => {
            try {
                const data: BinanceTickerEvent[] = JSON.parse(event.data);
                const transformedData: Ticker[] = data.map((item) => ({
                    symbol: item.s, lastPrice: item.c, priceChangePercent: item.P, quoteVolume: item.q,
                    priceChange: '', weightedAvgPrice: '', prevClosePrice: '', lastQty: '',
                    bidPrice: '', bidQty: '', askPrice: '', askQty: '', openPrice: '',
                    highPrice: '', lowPrice: '', volume: '', openTime: 0, closeTime: 0,
                    firstId: 0, lastId: 0, count: 0,
                }));
                dispatch({ type: 'UPDATE_MARKET_PRICES', payload: transformedData });
            } catch (error) {
                console.error("Failed to parse market stream data:", error);
            }
        };

        const portfolioInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/dashboard-data');
                if (!response.ok) throw new Error('Failed to fetch dashboard data');
                const data = await response.json();
                dispatch({ type: 'SET_PORTFOLIO', payload: data.portfolio });
            } catch (error) {
                console.error("Failed to fetch updated portfolio data:", error);
            }
        }, 15000); // THE FIX IS HERE: Changed from 1000 to 15000 (15 seconds)

        const opportunityInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/opportunities');
                if (response.ok) {
                    const data = await response.json();
                    dispatch({ type: 'SET_OPPORTUNITIES', payload: data });
                }
            } catch (error) {}
        }, 3000);

        return () => {
            eventSource.close();
            clearInterval(portfolioInterval);
            clearInterval(opportunityInterval);
        };
    }, []);

    const runCycle = async () => {
        if (isCycleRunningRef.current) return;
        isCycleRunningRef.current = true;
        dispatch({ type: 'ADD_LOG', payload: 'Bot cycle started...' });
        try {
            const res = await fetch('/api/bot/run');
            if (!res.ok || !res.body) throw new Error(`API request failed with status ${res.status}`);
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            const currentAnalysis: Analysis = {};
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));
                for (const line of lines) {
                    try {
                        const json = JSON.parse(line.replace('data: ', ''));
                        const { type, message, data } = json;
                        if (type === 'log') dispatch({ type: 'ADD_LOG', payload: message });
                        else if (type === 'aiChat' && data) {
                            dispatch({ type: 'ADD_AI_CHAT', payload: data });
                            if (data.agent.startsWith('PortfolioAllocator')) currentAnalysis.PortfolioAllocator = data;
                        } else if (type === 'context') dispatch({ type: 'SET_SHARED_CONTEXT', payload: data });
                    } catch {}
                }
            }
            dispatch({ type: 'SET_LAST_RUN_ANALYSIS', payload: currentAnalysis });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            dispatch({ type: 'ADD_LOG', payload: `[CYCLE ERROR] ${msg}` });
        } finally {
            isCycleRunningRef.current = false;
        }
    };
    
    // Logic for scheduling and running cycles remains the same...
    
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