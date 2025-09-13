// src/components/header.tsx
"use client";

import { useDashboard } from '@/context/DashboardContext';
import { Power, Timer, Wallet, Menu, ShieldAlert, KeyRound, Bot, Sparkles, Activity, Zap, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dispatch, SetStateAction, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { NotificationsPopover } from './NotificationsPopover';
import { Notification } from '@prisma/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { motion } from 'framer-motion';

export function Header() {
    const { state, dispatch } = useDashboard();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        const res = await fetch('/api/notifications');
        if (res.ok) {
            const data = await res.json();
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Atnaujinti kas 30s
        return () => clearInterval(interval);
    }, []);

    const handleMarkAsRead = async () => {
        if (unreadCount === 0) return;
        await fetch('/api/notifications/mark-as-read', { method: 'POST' });
        setUnreadCount(0); // Atnaujinti UI iškart
    };

    const toggleBotStatus = async () => {
        const newStatus = state.botStatus === 'active' ? 'inactive' : 'active';
        const toastId = toast.loading(`${newStatus === 'active' ? 'Starting' : 'Stopping'} bot...`);

        try {
            const response = await fetch('/api/bot/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                // Svarbiausias pakeitimas: atnaujiname būseną iš karto!
                dispatch({ type: 'SET_BOT_STATUS', payload: newStatus });
                dispatch({ type: 'ADD_LOG', payload: `Bot status changed to ${newStatus}` });
                toast.success(`Bot is now ${newStatus}.`, { id: toastId });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update bot status.');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            dispatch({ type: 'ADD_LOG', payload: `Error updating bot status: ${errorMessage}` });
            toast.error(`Could not change bot status.`, { id: toastId });
        }
    };

    const handlePanicSell = async () => {
        const toastId = toast.loading('Initiating Panic Sell All...');
        try {
            const response = await fetch('/api/portfolio/sell-all', {
                method: 'POST',
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Panic sell request failed.');
            }

            dispatch({ type: 'ADD_LOG', payload: 'PANIC SELL ALL triggered successfully from UI.' });
            // The dashboard context will automatically update the portfolio display.
            toast.success(result.message, { id: toastId, duration: 5000 });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            dispatch({ type: 'ADD_LOG', payload: `Error during Panic Sell: ${errorMessage}` });
            toast.error(`Panic Sell Failed: ${errorMessage}`, { id: toastId });
        }
    };

    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 text-white border-b border-gray-700/50 backdrop-blur-xl bg-opacity-95"
        >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.02%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

            <div className="relative flex justify-between items-center p-6">
                {/* Left Section */}
                <div className="flex items-center space-x-6">
                    {/* Mobile Menu Button */}
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => dispatch({ type: 'SET_SIDEBAR_OPEN', payload: true })}
                        className="md:hidden p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 transition-all duration-300"
                    >
                        <Menu className="w-5 h-5 text-gray-400" />
                    </motion.button>

                    {/* Logo/Title */}
                    <motion.div
                        className="hidden md:flex items-center space-x-3"
                        whileHover={{ scale: 1.02 }}
                    >
                        <motion.div
                            whileHover={{ rotate: 5 }}
                            className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/25"
                        >
                            <Sparkles className="w-5 h-5 text-white" />
                        </motion.div>
                        <div>
                            <h1 className="text-xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                                Lucid Hive Control
                            </h1>
                            <p className="text-xs text-gray-400 font-medium">AI Trading Dashboard</p>
                        </div>
                    </motion.div>

                    {/* Live System Button */}
                    <Link href="/dashboard/how-it-works" passHref>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button
                                variant="outline"
                                className="hidden lg:flex items-center gap-3 relative bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 hover:border-purple-500/50 text-white backdrop-blur-sm"
                            >
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="relative flex h-3 w-3"
                                >
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400 shadow-lg shadow-green-400/50"></span>
                                </motion.div>
                                <Bot className="h-4 w-4 text-purple-400" />
                                <span className="font-semibold">Live System</span>
                                <Activity className="w-4 h-4 text-green-400" />
                            </Button>
                        </motion.div>
                    </Link>
                </div>

                {/* Right Section */}
                <div className="flex items-center space-x-4">
                    {/* System Status Indicators */}
                    <div className="hidden xl:flex items-center space-x-6">
                        {/* Next Cycle Timer */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        className="flex items-center p-3 rounded-xl bg-gray-800/50 border border-gray-700/30 backdrop-blur-sm"
                                    >
                                        <Timer className="w-4 h-4 text-blue-400 mr-2" />
                                        <div className="text-sm">
                                            <span className="text-gray-400">Next cycle:</span>
                                            <span className="text-white font-semibold ml-1">{state.nextCycleIn}</span>
                                        </div>
                                    </motion.div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 border-gray-700">
                                    <p>Time until the next automated trading cycle begins.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* Active API Key */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        className="flex items-center p-3 rounded-xl bg-gray-800/50 border border-gray-700/30 backdrop-blur-sm"
                                    >
                                        <KeyRound className="w-4 h-4 text-green-400 mr-2" />
                                        <div className="text-sm">
                                            <span className="text-gray-400">API Key:</span>
                                            <span className="text-white font-semibold ml-1">{state.activeApiKeyName}</span>
                                        </div>
                                    </motion.div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 border-gray-700">
                                    <p>The Gemini API key currently being used by the AI agents.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* Portfolio Balance */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        className="flex items-center p-3 rounded-xl bg-gray-800/50 border border-gray-700/30 backdrop-blur-sm"
                                    >
                                        <Wallet className="w-4 h-4 text-yellow-400 mr-2" />
                                        <div className="text-sm">
                                            <span className="text-gray-400">Balance:</span>
                                            <span className="text-white font-semibold ml-1">
                                                €{state.portfolio.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </motion.div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 border-gray-700">
                                    <p>Your current virtual balance for simulated trading.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    {/* Notifications */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="relative"
                    >
                        <NotificationsPopover notifications={notifications} unreadCount={unreadCount} onOpen={handleMarkAsRead} />
                    </motion.div>

                    {/* Panic Sell Button */}
                    <AlertDialog>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            whileTap={{ scale: 0.9 }}
                                            className="p-3 rounded-xl bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-500/25 transition-all duration-300"
                                        >
                                            <ShieldAlert className="w-5 h-5" />
                                        </motion.button>
                                    </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 border-gray-700">
                                    <p className="max-w-xs">Panic Sell: Immediately sell all open positions at market price.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <AlertDialogContent className="bg-gray-900 border-gray-700">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-white flex items-center">
                                    <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                                    ARE YOU ABSOLUTELY SURE?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-300">
                                    This action will immediately sell ALL your open positions at the current market price. This cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handlePanicSell}
                                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600"
                                >
                                    Yes, Sell Everything
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Sandbox Mode Indicator */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="hidden md:flex items-center space-x-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700/30 backdrop-blur-sm"
                    >
                        <div className="flex items-center space-x-2">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-3 h-3 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50"
                            />
                            <Label htmlFor="sandbox-mode" className="text-sm text-gray-300 font-medium">Sandbox Mode</Label>
                        </div>
                        <Switch id="sandbox-mode" disabled />
                    </motion.div>

                    {/* Bot Status Button */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    id="bot-status-button"
                                    onClick={toggleBotStatus}
                                    className={`flex items-center px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 shadow-lg ${
                                        state.botStatus === 'active'
                                            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-red-500/25'
                                            : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 shadow-green-500/25'
                                    } text-white`}
                                >
                                    <motion.div
                                        animate={state.botStatus === 'active' ? { rotate: 360 } : {}}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                        className="mr-2"
                                    >
                                        <Power className="w-4 h-4" />
                                    </motion.div>
                                    {state.botStatus === 'active' ? 'Stop Bot' : 'Start Bot'}
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="ml-2"
                                    >
                                        <Zap className="w-4 h-4" />
                                    </motion.div>
                                </motion.button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 border-gray-700">
                                <p>Starts or stops the autonomous trading cycles. Market analysis will run only when the bot is active.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </motion.header>
    );
}
