"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Settings, BarChart, Wallet, LineChart, FlaskConical, History, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dispatch, SetStateAction } from 'react';

const navItems = [
    { href: '/dashboard', icon: BarChart, label: 'Dashboard', tooltip: 'View key performance indicators and market data.' },
    { href: '/dashboard/portfolio', icon: Wallet, label: 'Portfolio', tooltip: 'Manage your open positions and view your balance.' },
    { href: '/dashboard/history', icon: History, label: 'History', tooltip: 'View your past trade history.' },
    { href: '/dashboard/backtest', icon: FlaskConical, label: 'Backtesting', tooltip: 'Test your strategies against historical data.' },
    { href: '/dashboard/optimization', icon: LineChart, label: 'Optimization', tooltip: 'Optimize your strategy parameters for better performance.' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings', tooltip: 'Configure your trading bot and strategies.' },
];

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: Dispatch<SetStateAction<boolean>>;
}

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {/* Mobile Sidebar */}
            <div className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
                <div className="w-64 bg-gray-900 text-white border-r border-gray-700 flex flex-col p-4">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center space-x-2">
                            <Bot size={28} className="text-blue-400" />
                            <h1 className="text-2xl font-bold">CryptoBot</h1>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                    <nav className="flex-grow space-y-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center p-3 rounded-lg transition-colors ${
                                    pathname === item.href
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                <item.icon className="mr-4" size={20} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </nav>
                    <div className="mt-auto">
                        <p className="text-xs text-gray-500">© 2025 CryptoBot Inc.</p>
                    </div>
                </div>
                <div className="flex-shrink-0 w-14" onClick={() => setSidebarOpen(false)}></div>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex md:flex-shrink-0">
                <div className="w-64 flex flex-col p-4 bg-gray-900 text-white border-r border-gray-700">
                    <div className="mb-8 flex items-center space-x-2">
                        <Bot size={28} className="text-blue-400" />
                        <h1 className="text-2xl font-bold">CryptoBot</h1>
                    </div>
                    <nav className="flex-grow space-y-2">
                        <TooltipProvider>
                            {navItems.map((item) => (
                                <Tooltip key={item.href}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={item.href}
                                            className={`flex items-center p-3 rounded-lg transition-colors ${
                                                pathname === item.href
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                            }`}
                                        >
                                            <item.icon className="mr-4" size={20} />
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p>{item.tooltip}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </TooltipProvider>
                    </nav>
                    <div className="mt-auto">
                        <p className="text-xs text-gray-500">© 2025 CryptoBot Inc.</p>
                    </div>
                </div>
            </div>
        </>
    );
}
