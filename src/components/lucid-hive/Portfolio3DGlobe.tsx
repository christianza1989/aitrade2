'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Satellite, Zap, TrendingUp, MapPin, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Position {
    id: string;
    symbol: string;
    size: number;
    pnl: number;
    lat: number;
    lng: number;
    region: string;
    exchange: string;
}

interface GlobalMetric {
    region: string;
    exposure: number;
    pnl: number;
    positions: number;
    color: string;
}

export const Portfolio3DGlobe: React.FC = () => {
    const [positions, setPositions] = useState<Position[]>([]);
    const [globalMetrics, setGlobalMetrics] = useState<GlobalMetric[]>([]);
    const [rotation, setRotation] = useState(0);
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Sample trading positions across global exchanges
    const generatePositions = (): Position[] => {
        const exchanges = [
            { name: 'BINANCE', lat: 35.6762, lng: 139.6503, region: 'Asia-Pacific' }, // Tokyo
            { name: 'COINBASE', lat: 37.7749, lng: -122.4194, region: 'North America' }, // San Francisco
            { name: 'KRAKEN', lat: 51.5074, lng: -0.1278, region: 'Europe' }, // London
            { name: 'BITFINEX', lat: 22.3193, lng: 114.1694, region: 'Asia-Pacific' }, // Hong Kong
            { name: 'GEMINI', lat: 40.7128, lng: -74.0060, region: 'North America' }, // New York
            { name: 'BITSTAMP', lat: 46.0569, lng: 14.5058, region: 'Europe' }, // Ljubljana
        ];

        const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT', 'MATIC/USDT'];

        return exchanges.flatMap(exchange =>
            symbols.slice(0, Math.floor(Math.random() * 3) + 2).map((symbol, index) => ({
                id: `${exchange.name}_${symbol}_${index}`,
                symbol,
                size: Math.random() * 100000 + 10000,
                pnl: (Math.random() - 0.4) * 5000, // Slight positive bias
                lat: exchange.lat + (Math.random() - 0.5) * 2, // Add some noise
                lng: exchange.lng + (Math.random() - 0.5) * 2,
                region: exchange.region,
                exchange: exchange.name
            }))
        );
    };

    // Calculate regional metrics
    const calculateGlobalMetrics = (positions: Position[]): GlobalMetric[] => {
        const regions = ['North America', 'Europe', 'Asia-Pacific'];
        const colors = ['#10B981', '#3B82F6', '#8B5CF6'];

        return regions.map((region, index) => {
            const regionPositions = positions.filter(p => p.region === region);
            const exposure = regionPositions.reduce((sum, p) => sum + p.size, 0);
            const pnl = regionPositions.reduce((sum, p) => sum + p.pnl, 0);

            return {
                region,
                exposure,
                pnl,
                positions: regionPositions.length,
                color: colors[index]
            };
        });
    };

    // 3D Globe rendering with WebGL-like effects using Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrame: number;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = 120;

            // Draw globe base
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            gradient.addColorStop(0, '#1F2937');
            gradient.addColorStop(0.7, '#111827');
            gradient.addColorStop(1, '#000000');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fill();

            // Draw latitude lines
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 1;
            for (let lat = -60; lat <= 60; lat += 30) {
                const y = centerY + (lat / 90) * radius * 0.8;
                const width = Math.cos((lat * Math.PI) / 180) * radius * 0.9;
                
                ctx.beginPath();
                ctx.ellipse(centerX, y, width, 8, 0, 0, 2 * Math.PI);
                ctx.stroke();
            }

            // Draw longitude lines
            for (let lng = 0; lng < 360; lng += 60) {
                const angle = (lng + rotation) * Math.PI / 180;
                const x1 = centerX + Math.sin(angle) * radius * 0.9;
                const x2 = centerX - Math.sin(angle) * radius * 0.9;
                
                ctx.beginPath();
                ctx.ellipse(centerX, centerY, Math.abs(x1 - centerX), radius * 0.9, angle, 0, 2 * Math.PI);
                ctx.stroke();
            }

            // Draw positions as glowing dots
            positions.forEach(position => {
                const posAngle = ((position.lng + rotation) * Math.PI) / 180;
                const latRad = (position.lat * Math.PI) / 180;
                
                // 3D projection
                const x = centerX + Math.cos(latRad) * Math.sin(posAngle) * radius * 0.85;
                const y = centerY - Math.sin(latRad) * radius * 0.85;
                const z = Math.cos(latRad) * Math.cos(posAngle);
                
                // Only show positions on visible side
                if (z > -0.3) {
                    const size = Math.max(2, Math.abs(position.pnl) / 1000 + 3);
                    const color = position.pnl >= 0 ? '#10B981' : '#EF4444';
                    const alpha = Math.max(0.3, (z + 0.3) / 1.3);

                    // Outer glow
                    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
                    glowGradient.addColorStop(0, color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
                    glowGradient.addColorStop(1, color + '00');
                    
                    ctx.fillStyle = glowGradient;
                    ctx.beginPath();
                    ctx.arc(x, y, size * 3, 0, 2 * Math.PI);
                    ctx.fill();

                    // Inner dot
                    ctx.fillStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, 2 * Math.PI);
                    ctx.fill();

                    // Pulse effect
                    const pulseSize = size + Math.sin(Date.now() * 0.005 + position.lat) * 2;
                    ctx.strokeStyle = color + Math.floor(alpha * 100).toString(16).padStart(2, '0');
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(x, y, pulseSize, 0, 2 * Math.PI);
                    ctx.stroke();
                }
            });

            // Draw orbital rings
            ctx.strokeStyle = '#22D3EE20';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const ringRadius = radius + 30 + i * 15;
                const ringAngle = (Date.now() * 0.001 + i * Math.PI / 3) % (2 * Math.PI);
                
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(ringAngle);
                ctx.beginPath();
                ctx.ellipse(0, 0, ringRadius, ringRadius * 0.2, 0, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.restore();
            }

            setRotation(prev => prev + 0.5);
            animationFrame = requestAnimationFrame(animate);
        };

        animate();

        return () => cancelAnimationFrame(animationFrame);
    }, [positions]);

    // Update data periodically
    useEffect(() => {
        const updateData = () => {
            const newPositions = generatePositions();
            setPositions(newPositions);
            setGlobalMetrics(calculateGlobalMetrics(newPositions));
        };

        updateData();
        const interval = setInterval(updateData, 8000);
        return () => clearInterval(interval);
    }, []);

    const totalExposure = globalMetrics.reduce((sum, metric) => sum + metric.exposure, 0);
    const totalPnL = globalMetrics.reduce((sum, metric) => sum + metric.pnl, 0);

    return (
        <Card className="bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-black/90 border-gray-700/50 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <motion.div
                            animate={{ 
                                rotate: [0, 360],
                                scale: [1, 1.2, 1]
                            }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Globe className="w-6 h-6 text-blue-400" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-white">Global Portfolio Distribution</h3>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <div className="text-lg font-bold text-white">
                                ${totalExposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-xs text-gray-400">Total Exposure</div>
                        </div>
                        <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex items-center space-x-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-3 py-1"
                        >
                            <Satellite className="w-3 h-3 text-blue-400" />
                            <span className="text-blue-300 text-sm font-semibold">TRACKING</span>
                        </motion.div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 3D Globe Visualization */}
                    <div className="lg:col-span-2 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-purple-500/10 rounded-xl blur-2xl" />
                        <div className="relative bg-black/40 border border-gray-600/30 rounded-xl p-6 backdrop-blur-sm">
                            <div className="flex items-center justify-center">
                                <canvas
                                    ref={canvasRef}
                                    width={400}
                                    height={400}
                                    className="w-full h-auto max-w-md"
                                />
                            </div>
                            
                            {/* Legend */}
                            <div className="mt-4 flex items-center justify-center space-x-6">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-400/50" />
                                    <span className="text-xs text-gray-400">Profitable</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-red-400 rounded-full shadow-lg shadow-red-400/50" />
                                    <span className="text-xs text-gray-400">Loss</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-1 bg-gray-500 rounded" />
                                    <span className="text-xs text-gray-400">Orbital Tracking</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Regional Breakdown */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <MapPin className="w-5 h-5 text-cyan-400 mr-2" />
                            Regional Analysis
                        </h4>
                        
                        {/* Total P&L Summary */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-4 backdrop-blur-sm mb-4"
                        >
                            <div className="text-center">
                                <div className={`text-2xl font-bold mb-1 ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-sm text-gray-400">Global P&L</div>
                                <div className="flex items-center justify-center mt-2">
                                    {totalPnL >= 0 ? (
                                        <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                                    ) : (
                                        <TrendingUp className="w-4 h-4 text-red-400 mr-1 rotate-180" />
                                    )}
                                    <span className={`text-sm font-medium ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {((totalPnL / totalExposure) * 100).toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </motion.div>

                        <AnimatePresence>
                            {globalMetrics.map((metric, index) => (
                                <motion.div
                                    key={metric.region}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="relative group cursor-pointer"
                                    onClick={() => setSelectedRegion(selectedRegion === metric.region ? null : metric.region)}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-800/30 to-gray-700/30 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className={`relative border rounded-lg p-3 backdrop-blur-sm transition-all duration-300 ${
                                        selectedRegion === metric.region
                                            ? 'bg-gray-700/60 border-gray-500/50'
                                            : 'bg-gray-800/50 border-gray-600/30 hover:border-gray-500/50'
                                    }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                <div 
                                                    className="w-3 h-3 rounded-full shadow-lg"
                                                    style={{ backgroundColor: metric.color, boxShadow: `0 0 10px ${metric.color}50` }}
                                                />
                                                <span className="font-semibold text-white text-sm">{metric.region}</span>
                                            </div>
                                            <Activity className="w-4 h-4 text-gray-400" />
                                        </div>
                                        
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Exposure:</span>
                                                <span className="text-white font-medium">
                                                    ${metric.exposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">P&L:</span>
                                                <span className={`font-medium ${metric.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {metric.pnl >= 0 ? '+' : ''}${metric.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Positions:</span>
                                                <span className="text-white font-medium">{metric.positions}</span>
                                            </div>
                                        </div>

                                        {/* Exposure percentage bar */}
                                        <div className="mt-2">
                                            <div className="w-full bg-gray-700 rounded-full h-1">
                                                <motion.div
                                                    className="h-1 rounded-full"
                                                    style={{ backgroundColor: metric.color }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(metric.exposure / totalExposure) * 100}%` }}
                                                    transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};