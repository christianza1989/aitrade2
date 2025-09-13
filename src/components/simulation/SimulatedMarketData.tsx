'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, BarChart3, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { simulationEngine, MarketDataPoint } from '@/lib/simulation/SimulationEngine';

export const SimulatedMarketData: React.FC = () => {
    const [marketData, setMarketData] = useState<MarketDataPoint[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

    useEffect(() => {
        // Subscribe to market data updates from simulation
        const unsubscribe = simulationEngine.subscribe('market:update', (data: MarketDataPoint[]) => {
            setMarketData(data);
        });

        // Get initial data
        const initialData = simulationEngine.getCurrentMarketData();
        setMarketData(initialData);

        return unsubscribe;
    }, []);

    const formatPrice = (price: number) => {
        if (price >= 1000) {
            return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
        } else if (price >= 10) {
            return price.toFixed(2);
        } else {
            return price.toFixed(4);
        }
    };

    const getChangeColor = (change: number) => {
        if (change > 0) return 'text-green-400';
        if (change < 0) return 'text-red-400';
        return 'text-gray-400';
    };

    const getChangeIcon = (change: number) => {
        if (change > 0) return <TrendingUp className="w-4 h-4" />;
        if (change < 0) return <TrendingDown className="w-4 h-4" />;
        return <Activity className="w-4 h-4" />;
    };

    const topMovers = [...marketData]
        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
        .slice(0, 3);

    return (
        <Card className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-black/90 border-gray-700/50 backdrop-blur-xl">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <motion.div
                            animate={{ 
                                scale: [1, 1.1, 1],
                                rotate: [0, 180, 360]
                            }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <BarChart3 className="w-6 h-6 text-green-400" />
                        </motion.div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Live Market Data</h3>
                            <p className="text-sm text-gray-400">Real-time price movements & volume</p>
                        </div>
                    </div>
                    
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1"
                    >
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                        <span className="text-green-300 text-sm font-semibold">LIVE</span>
                    </motion.div>
                </div>

                {/* Top Movers */}
                <div className="mb-6">
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                        <TrendingUp className="w-5 h-5 text-yellow-400 mr-2" />
                        Top Movers
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <AnimatePresence>
                            {topMovers.map((market, index) => (
                                <motion.div
                                    key={market.symbol}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="relative group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative bg-gray-800/60 border border-gray-600/30 rounded-lg p-3 backdrop-blur-sm hover:border-gray-500/50 transition-colors duration-300">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-white text-sm">{market.symbol}</span>
                                            <div className={`flex items-center ${getChangeColor(market.change)}`}>
                                                {getChangeIcon(market.change)}
                                            </div>
                                        </div>
                                        <div className="text-lg font-bold text-white mb-1">
                                            ${formatPrice(market.price)}
                                        </div>
                                        <div className={`text-sm font-semibold ${getChangeColor(market.change)}`}>
                                            {market.change > 0 ? '+' : ''}{market.changePercent.toFixed(2)}%
                                        </div>
                                        
                                        {/* Volume bar */}
                                        <div className="mt-2">
                                            <div className="text-xs text-gray-400 mb-1">
                                                Vol: {(market.volume / 1000).toFixed(0)}K
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-1">
                                                <motion.div
                                                    className="bg-gradient-to-r from-cyan-400 to-blue-400 h-1 rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min((market.volume / 1000000) * 100, 100)}%` }}
                                                    transition={{ delay: 0.5, duration: 1 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Full Market Table */}
                <div>
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                        <Activity className="w-5 h-5 text-blue-400 mr-2" />
                        All Markets
                    </h4>
                    <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg backdrop-blur-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-600/30">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            Symbol
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            Price
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            24h Change
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            Volume
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            High/Low
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {marketData.map((market, index) => (
                                            <motion.tr
                                                key={market.symbol}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className={`border-b border-gray-700/30 hover:bg-gray-700/30 transition-colors duration-200 cursor-pointer ${
                                                    selectedSymbol === market.symbol ? 'bg-gray-700/50' : ''
                                                }`}
                                                onClick={() => setSelectedSymbol(selectedSymbol === market.symbol ? null : market.symbol)}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-3 h-3 rounded-full ${
                                                            market.change > 0 ? 'bg-green-400' : 
                                                            market.change < 0 ? 'bg-red-400' : 'bg-gray-400'
                                                        } shadow-lg shadow-current/50`} />
                                                        <span className="font-medium text-white">{market.symbol}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="text-white font-semibold">
                                                        ${formatPrice(market.price)}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {market.bid.toFixed(4)}/{market.ask.toFixed(4)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className={`flex items-center justify-end space-x-1 ${getChangeColor(market.change)}`}>
                                                        {getChangeIcon(market.change)}
                                                        <span className="font-semibold">
                                                            {market.change > 0 ? '+' : ''}{market.changePercent.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {market.change > 0 ? '+' : ''}${market.change.toFixed(4)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="text-white font-medium">
                                                        {(market.volume / 1000).toFixed(0)}K
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="text-green-400 text-sm">
                                                        ${formatPrice(market.high24h)}
                                                    </div>
                                                    <div className="text-red-400 text-sm">
                                                        ${formatPrice(market.low24h)}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Selected Symbol Details */}
                <AnimatePresence>
                    {selectedSymbol && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4"
                        >
                            {(() => {
                                const selectedMarket = marketData.find(m => m.symbol === selectedSymbol);
                                if (!selectedMarket) return null;

                                return (
                                    <div className="bg-gray-800/30 border border-gray-600/30 rounded-lg p-4 backdrop-blur-sm">
                                        <h5 className="text-white font-semibold mb-3 flex items-center">
                                            <DollarSign className="w-4 h-4 mr-2 text-yellow-400" />
                                            {selectedMarket.symbol} Details
                                        </h5>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-400">Current Price:</span>
                                                <div className="text-white font-semibold">${formatPrice(selectedMarket.price)}</div>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">24h High:</span>
                                                <div className="text-green-400 font-semibold">${formatPrice(selectedMarket.high24h)}</div>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">24h Low:</span>
                                                <div className="text-red-400 font-semibold">${formatPrice(selectedMarket.low24h)}</div>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Volume:</span>
                                                <div className="text-blue-400 font-semibold">{selectedMarket.volume.toLocaleString()}</div>
                                            </div>
                                        </div>
                                        
                                        {/* Price change visualization */}
                                        <div className="mt-4">
                                            <div className="text-gray-400 text-xs mb-2">24h Price Range</div>
                                            <div className="relative w-full bg-gray-700 rounded-full h-2">
                                                <motion.div
                                                    className={`absolute top-0 h-2 rounded-full ${
                                                        selectedMarket.change > 0 ? 'bg-green-400' : 'bg-red-400'
                                                    }`}
                                                    initial={{ width: 0 }}
                                                    animate={{ 
                                                        width: `${((selectedMarket.price - selectedMarket.low24h) / 
                                                                (selectedMarket.high24h - selectedMarket.low24h)) * 100}%` 
                                                    }}
                                                    transition={{ delay: 0.5, duration: 1 }}
                                                />
                                                <div 
                                                    className="absolute top-0 w-1 h-2 bg-white border border-gray-400"
                                                    style={{ 
                                                        left: `${((selectedMarket.price - selectedMarket.low24h) / 
                                                                (selectedMarket.high24h - selectedMarket.low24h)) * 100}%` 
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
};