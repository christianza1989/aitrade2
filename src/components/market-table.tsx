"use client";

import { useDashboard } from '@/context/DashboardContext';
import { Ticker } from '@/core/binance';

export function MarketTable() {
    const { state, dispatch } = useDashboard();

    const handleRowClick = (symbol: string) => {
        dispatch({ type: 'SET_SELECTED_SYMBOL', payload: symbol });
    };

    return (
        <div className="bg-gray-900 text-white p-4 rounded-lg">
            <h2 className="font-bold text-lg mb-2">Market Scanner</h2>
            <div className="overflow-y-auto h-[70vh]">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-700">
                            <th className="p-2">Symbol</th>
                            <th className="p-2">Price</th>
                            <th className="p-2">Change (24h)</th>
                            <th className="p-2">Volume (24h)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {state.marketData.map((ticker: Ticker) => (
                            <tr 
                                key={ticker.symbol} 
                                className={`border-b border-gray-800 hover:bg-gray-700 cursor-pointer ${state.selectedSymbol === ticker.symbol ? 'bg-gray-700' : ''}`}
                                onClick={() => handleRowClick(ticker.symbol)}
                            >
                                <td className="p-2 font-bold">{ticker.symbol}</td>
                                <td className="p-2">${parseFloat(ticker.lastPrice).toFixed(2)}</td>
                                <td className={`p-2 ${parseFloat(ticker.priceChangePercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {parseFloat(ticker.priceChangePercent).toFixed(2)}%
                                </td>
                                <td className="p-2">${(parseFloat(ticker.quoteVolume) / 1_000_000).toFixed(2)}M</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
