"use client";

import { useDashboard } from '@/context/DashboardContext';
import { Power, Timer, Wallet } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Header() {
    const { state, dispatch } = useDashboard();

    const toggleBotStatus = async () => {
        const newStatus = state.botStatus === 'active' ? 'inactive' : 'active';
        try {
            const response = await fetch('/api/bot/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (response.ok) {
                dispatch({ type: 'SET_BOT_STATUS', payload: newStatus });
                dispatch({ type: 'ADD_LOG', payload: `Bot status set to ${newStatus}` });
            } else {
                dispatch({ type: 'ADD_LOG', payload: 'Error updating bot status' });
            }
        } catch (error) {
            dispatch({ type: 'ADD_LOG', payload: 'Error updating bot status' });
        }
    };

    return (
        <header className="flex justify-between items-center p-4 bg-gray-900 text-white border-b border-gray-700">
            <h1 className="text-xl font-semibold">CryptoBot Dashboard</h1>
            <div className="flex items-center space-x-6">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <div className="flex items-center text-sm">
                                <Timer size={16} className="mr-2 text-gray-400" />
                                <span>Next cycle in: <strong>{state.nextCycleIn}</strong></span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Time until the next automated trading cycle begins.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <div className="flex items-center text-sm">
                                <Wallet size={16} className="mr-2 text-gray-400" />
                                <span>Sandbox Balance: <strong>€{state.portfolio.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Your current virtual balance for simulated trading.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <button
                    onClick={toggleBotStatus}
                    className={`flex items-center px-4 py-2 rounded-md font-semibold text-sm transition-colors ${state.botStatus === 'active' 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'}`}
                >
                    <Power size={16} className="mr-2" />
                    {state.botStatus === 'active' ? 'Stop Bot' : 'Start Bot'}
                </button>
            </div>
        </header>
    );
}
