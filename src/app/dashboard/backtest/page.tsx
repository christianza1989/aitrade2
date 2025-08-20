"use client";

import { useState, useEffect } from 'react';
import { KpiCard } from '@/components/kpi-card';
import { AnalysisPanel, Analysis } from '@/components/analysis-panel'; // Assuming this can be reused

// Define interfaces for our state
interface Trade {
    date: string;
    action: 'BUY' | 'SELL';
    price: number;
}

export default function BacktestPage() {
    const [symbol, setSymbol] = useState('BTCUSDT');
    const [startDate, setStartDate] = useState('2023-01-01');
    const [endDate, setEndDate] = useState('2023-01-31');
    const [interval, setInterval] = useState('1h');
    const [isLoading, setIsLoading] = useState(false);
    
    const [logs, setLogs] = useState<string[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null);
    const [pnl, setPnl] = useState(0);

    const runBacktest = async () => {
        setIsLoading(true);
        setLogs([]);
        setTrades([]);
        setCurrentAnalysis(null);
        setPnl(0);

        const response = await fetch('/api/bot/backtest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, startDate, endDate, interval }),
        });

        if (!response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                setIsLoading(false);
                break;
            }
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));
            
            for (const line of lines) {
                const json = JSON.parse(line.replace('data: ', ''));
                if (json.type === 'log') {
                    setLogs(prev => [...prev, json.message]);
                } else if (json.type === 'analysis') {
                    setCurrentAnalysis(json.data);
                } else if (json.type === 'trade') {
                    setTrades(prev => [...prev, json.data]);
                }
            }
        }
    };
    
    useEffect(() => {
        let calculatedPnl = 0;
        for (let i = 0; i < trades.length; i += 2) {
            if (trades[i+1]) {
                calculatedPnl += trades[i+1].price - trades[i].price;
            }
        }
        setPnl(calculatedPnl);
    }, [trades]);

    return (
        <div className="text-white">
            <h1 className="text-2xl font-bold mb-4">Strategy Backtesting</h1>
            
            <div className="bg-gray-800 p-4 rounded-lg mb-8">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Symbol</label>
                        <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} className="bg-gray-700 rounded p-2 w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Start Date</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-gray-700 rounded p-2 w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">End Date</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-gray-700 rounded p-2 w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Interval</label>
                        <select value={interval} onChange={(e) => setInterval(e.target.value)} className="bg-gray-700 rounded p-2 w-full">
                            <option value="1m">1m</option>
                            <option value="5m">5m</option>
                            <option value="15m">15m</option>
                            <option value="1h">1h</option>
                            <option value="4h">4h</option>
                            <option value="1d">1d</option>
                        </select>
                    </div>
                    <button onClick={runBacktest} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
                        {isLoading ? 'Running...' : 'Run Backtest'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    {currentAnalysis ? <AnalysisPanel analysis={currentAnalysis} /> : <div className="bg-gray-800 p-4 rounded-lg h-full"><h2 className="font-bold text-lg">AI Analysis</h2><p>Waiting for data...</p></div>}
                </div>
                <div className="lg:col-span-1">
                    <div className="bg-gray-800 p-4 rounded-lg mb-4">
                        <h2 className="text-xl font-bold mb-4">Backtest Results</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <KpiCard title="Initial Balance" value={`€10000.00`} icon={<div />} />
                            <KpiCard title="Total P/L" value={`€${pnl.toFixed(2)}`} color={pnl > 0 ? 'text-green-400' : 'text-red-400'} icon={<div />} />
                            <KpiCard title="Total Trades" value={trades.length} icon={<div />} />
                        </div>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="font-bold mb-2">Live Trades</h3>
                        <div className="h-48 overflow-y-auto">
                            {trades.map((trade, index) => (
                                <div key={index} className={`p-2 rounded mb-2 text-sm ${trade.action === 'BUY' ? 'bg-green-900' : 'bg-red-900'}`}>
                                    {trade.date}: {trade.action} @ {trade.price.toFixed(2)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-8 bg-gray-800 text-white p-4 rounded-lg h-[30vh] overflow-y-auto">
                <h2 className="font-bold text-lg mb-2">Live Logs</h2>
                <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                    {logs.map((log, index) => (
                        <p key={index} className="font-mono">{log}</p>
                    ))}
                </pre>
            </div>
        </div>
    );
}
