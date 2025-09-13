'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, Zap, DollarSign, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { GlassmorphCard } from '@/components/ui/GlassmorphCard';

interface MarketData {
    symbol: string;
    price: number;
    change: number;
    volume: number;
    trend: 'up' | 'down' | 'neutral';
    intensity: number;
}

interface PulseNode {
    id: string;
    x: number;
    y: number;
    size: number;
    color: string;
    intensity: number;
    symbol: string;
    price: number;
    change: number;
}

export const MarketPulse: React.FC = () => {
    const [pulseNodes, setPulseNodes] = useState<PulseNode[]>([]);
    const [marketData, setMarketData] = useState<MarketData[]>([]);
    const [globalPulse, setGlobalPulse] = useState(0.5);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Simulated market symbols
    const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT', 'MATIC/USDT', 'DOT/USDT', 'LINK/USDT'];

    // Generate realistic market data
    const generateMarketData = (): MarketData[] => {
        return symbols.map(symbol => {
            const basePrice = Math.random() * 50000 + 1000;
            const change = (Math.random() - 0.5) * 10;
            const volume = Math.random() * 1000000 + 100000;
            const intensity = Math.abs(change) / 5;
            
            return {
                symbol,
                price: basePrice,
                change,
                volume,
                trend: change > 1 ? 'up' : change < -1 ? 'down' : 'neutral',
                intensity: Math.min(intensity, 1)
            };
        });
    };

    // Generate pulse nodes for canvas
    const generatePulseNodes = (data: MarketData[]): PulseNode[] => {
        return data.map((market, index) => {
            const angle = (index / data.length) * 2 * Math.PI;
            const radius = 120 + Math.sin(Date.now() * 0.001 + index) * 20;
            
            return {
                id: market.symbol,
                x: 200 + Math.cos(angle) * radius,
                y: 200 + Math.sin(angle) * radius,
                size: 8 + market.intensity * 12,
                color: market.trend === 'up' ? '#10B981' : market.trend === 'down' ? '#EF4444' : '#6B7280',
                intensity: market.intensity,
                symbol: market.symbol,
                price: market.price,
                change: market.change
            };
        });
    };

    // Canvas animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrame: number;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw connection lines
            pulseNodes.forEach((node, index) => {
                pulseNodes.forEach((otherNode, otherIndex) => {
                    if (index < otherIndex) {
                        const distance = Math.sqrt(
                            Math.pow(node.x - otherNode.x, 2) + Math.pow(node.y - otherNode.y, 2)
                        );
                        
                        if (distance < 150) {
                            const opacity = (150 - distance) / 150 * 0.3;
                            ctx.strokeStyle = `rgba(34, 211, 238, ${opacity})`;
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.moveTo(node.x, node.y);
                            ctx.lineTo(otherNode.x, otherNode.y);
                            ctx.stroke();
                        }
                    }
                });
            });

            // Draw pulse nodes
            pulseNodes.forEach(node => {
                // Outer glow
                const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 2);
                gradient.addColorStop(0, node.color + '40');
                gradient.addColorStop(1, node.color + '00');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size * 2, 0, 2 * Math.PI);
                ctx.fill();

                // Inner node
                ctx.fillStyle = node.color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
                ctx.fill();

                // Pulse ring
                const pulseSize = node.size + Math.sin(Date.now() * 0.005 + node.intensity * 10) * 5;
                ctx.strokeStyle = node.color + '60';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(node.x, node.y, pulseSize, 0, 2 * Math.PI);
                ctx.stroke();
            });

            animationFrame = requestAnimationFrame(animate);
        };

        animate();

        return () => cancelAnimationFrame(animationFrame);
    }, [pulseNodes]);

    // Update data periodically
    useEffect(() => {
        const updateData = () => {
            const newData = generateMarketData();
            setMarketData(newData);
            setPulseNodes(generatePulseNodes(newData));
            
            // Calculate global pulse based on overall market movement
            const avgChange = newData.reduce((sum, item) => sum + Math.abs(item.change), 0) / newData.length;
            setGlobalPulse(Math.min(avgChange / 5, 1));
        };

        updateData();
        const interval = setInterval(updateData, 3000);
        return () => clearInterval(interval);
    }, []);

    const topMovers = marketData
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 4);

    return (
        <GlassmorphCard variant="luxury" className="overflow-hidden">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <motion.div
                            animate={{ 
                                scale: [1, 1.2, 1],
                                rotate: [0, 180, 360]
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Activity className="w-6 h-6 text-cyan-400" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-white">Market Pulse</h3>
                    </div>
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center space-x-2 bg-cyan-500/20 border border-cyan-500/30 rounded-full px-3 py-1"
                    >
                        <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                        <span className="text-cyan-300 text-sm font-semibold">LIVE</span>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Market Pulse Visualization */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-xl blur-2xl" />
                        <div className="relative bg-black/40 border border-gray-600/30 rounded-xl p-4 backdrop-blur-sm">
                            <canvas
                                ref={canvasRef}
                                width={400}
                                height={400}
                                className="w-full h-auto max-w-sm mx-auto"
                            />
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            >
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white mb-1">
                                        {(globalPulse * 100).toFixed(0)}%
                                    </div>
                                    <div className="text-xs text-gray-400">Market Activity</div>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Top Movers */}
                    <div className="space-y-3">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <Zap className="w-5 h-5 text-yellow-400 mr-2" />
                            Top Market Movers
                        </h4>
                        <AnimatePresence>
                            {topMovers.map((mover, index) => (
                                <motion.div
                                    key={mover.symbol}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="relative group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative bg-gray-800/60 border border-gray-600/30 rounded-lg p-3 backdrop-blur-sm hover:border-gray-500/50 transition-colors duration-300">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-3 h-3 rounded-full ${
                                                    mover.trend === 'up' ? 'bg-green-400' : 
                                                    mover.trend === 'down' ? 'bg-red-400' : 'bg-gray-400'
                                                } shadow-lg shadow-current/50`} />
                                                <div>
                                                    <div className="font-semibold text-white text-sm">{mover.symbol}</div>
                                                    <div className="text-xs text-gray-400">
                                                        ${mover.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`flex items-center space-x-1 font-semibold text-sm ${
                                                    mover.change > 0 ? 'text-green-400' : 
                                                    mover.change < 0 ? 'text-red-400' : 'text-gray-400'
                                                }`}>
                                                    {mover.change > 0 ? (
                                                        <TrendingUp className="w-4 h-4" />
                                                    ) : mover.change < 0 ? (
                                                        <TrendingDown className="w-4 h-4" />
                                                    ) : (
                                                        <BarChart3 className="w-4 h-4" />
                                                    )}
                                                    <span>{mover.change > 0 ? '+' : ''}{mover.change.toFixed(2)}%</span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Vol: {(mover.volume / 1000).toFixed(0)}K
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </CardContent>
        </GlassmorphCard>
    );
};