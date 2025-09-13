// src/components/sidebar.tsx

"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Settings, BarChart, Wallet, LineChart, FlaskConical, History, X, Radar, BookOpen, PieChart, MemoryStick, Server, TrendingUp, Sparkles, Activity, Cpu, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDashboard } from '@/context/DashboardContext';
import { motion } from 'framer-motion';

const navItems = [
    { href: '/dashboard', icon: BarChart, label: 'Dashboard', tooltip: 'View key performance indicators and market data.' },
    { href: '/dashboard/intel', icon: Radar, label: 'Market Intelligence', tooltip: 'The hub for deep market analysis and intel.' },
    { href: '/dashboard/portfolio', icon: Wallet, label: 'Portfolio', tooltip: 'Manage your open positions and view your balance.' },
    { href: '/dashboard/history', icon: History, label: 'History', tooltip: 'View your past trade history.' },
    { href: '/dashboard/backtest', icon: FlaskConical, label: 'Backtesting', tooltip: 'Test your strategies against historical data.' },
    { href: '/dashboard/optimization', icon: LineChart, label: 'Optimization', tooltip: 'Optimize your strategy parameters for better performance.' },
    { href: '/dashboard/performance', icon: TrendingUp, label: 'Performance', tooltip: 'Analyze portfolio performance and risk metrics.' },
    { href: '/dashboard/memory', icon: MemoryStick, label: 'Memory Explorer', tooltip: 'Analyze the AI\'s past trade memories and reasoning.' },
    { href: '/dashboard/agents', icon: Server, label: 'Agent Status', tooltip: 'Monitor the real-time status and metrics of all AI agents.' },
    { href: '/dashboard/how-it-works', icon: BookOpen, label: 'How It Works', tooltip: 'Understand the architecture of this AI trading system.' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings', tooltip: 'Configure your trading bot and strategies.' },
];

export function Sidebar() {
    const pathname = usePathname();
    const { state, dispatch } = useDashboard();

    const handleCloseSidebar = () => {
        dispatch({ type: 'SET_SIDEBAR_OPEN', payload: false });
    };

    const handleLinkClick = () => {
        // Close sidebar on mobile when link is clicked
        if (window.innerWidth < 768) {
            dispatch({ type: 'SET_SIDEBAR_OPEN', payload: false });
        }
    };

    return (
        <aside className={`
            fixed md:static top-0 left-0 z-40 h-screen w-72
            bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900
            text-white border-r border-gray-700/50 backdrop-blur-xl bg-opacity-95
            transform transition-transform duration-300 ease-in-out
            ${state.sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            md:flex md:flex-col
        `}>
            {/* Enhanced Header */}
            <div className="p-6 border-b border-gray-700/30">
                <div className="flex justify-between items-center">
                    <motion.div
                        className="flex items-center space-x-3"
                        whileHover={{ scale: 1.02 }}
                    >
                        <motion.div
                            whileHover={{ rotate: 5 }}
                            className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/25"
                        >
                            <Sparkles className="w-6 h-6 text-white" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                                Lucid Hive
                            </h1>
                            <p className="text-xs text-gray-400 font-medium">AI Trading System</p>
                        </div>
                    </motion.div>
                    {/* Close button - only visible on mobile */}
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCloseSidebar}
                        className="md:hidden p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 transition-all duration-300"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </motion.button>
                </div>
            </div>

            {/* Enhanced Navigation */}
            <nav className="flex-grow p-4 space-y-3 overflow-y-auto">
                <TooltipProvider>
                    {navItems.map((item, index) => (
                        <motion.div
                            key={item.href}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={item.href}
                                        onClick={handleLinkClick}
                                        className={`group relative flex items-center p-4 rounded-2xl transition-all duration-300 overflow-hidden ${
                                            pathname === item.href
                                                ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                                                : 'hover:bg-gray-800/30 border border-transparent hover:border-gray-600/30'
                                        }`}
                                    >
                                        {/* Background Glow */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                        <motion.div
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            className={`relative p-2 rounded-xl mr-4 transition-all duration-300 ${
                                                pathname === item.href
                                                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg'
                                                    : 'bg-gray-700/50 group-hover:bg-gray-600/50'
                                            }`}
                                        >
                                            <item.icon className={`w-5 h-5 ${
                                                pathname === item.href ? 'text-white' : 'text-gray-400 group-hover:text-white'
                                            }`} />
                                        </motion.div>

                                        <div className="flex-1 min-w-0">
                                            <span className={`font-semibold transition-colors duration-300 block truncate ${
                                                pathname === item.href
                                                    ? 'text-white'
                                                    : 'text-gray-300 group-hover:text-white'
                                            }`}>
                                                {item.label}
                                            </span>
                                            {/* Show tooltip text only on desktop */}
                                            <p className={`text-xs mt-1 transition-colors duration-300 hidden md:block ${
                                                pathname === item.href
                                                    ? 'text-purple-300'
                                                    : 'text-gray-500 group-hover:text-gray-400'
                                            }`}>
                                                {item.tooltip}
                                            </p>
                                        </div>

                                        {/* Active Indicator */}
                                        {pathname === item.href && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-2 h-2 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50 flex-shrink-0"
                                            />
                                        )}
                                    </Link>
                                </TooltipTrigger>
                                {/* Tooltip only on desktop */}
                                <TooltipContent side="right" className="bg-gray-900 border-gray-700 hidden md:block">
                                    <p className="text-white">{item.tooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </motion.div>
                    ))}
                </TooltipProvider>
            </nav>

            {/* System Status Footer */}
            <div className="p-4 border-t border-gray-700/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                        />
                        <span className="text-xs text-gray-400 font-medium">System Online</span>
                    </div>
                    <div className="text-xs text-gray-500">v2.1.0</div>
                </div>
            </div>
        </aside>
    );
}
