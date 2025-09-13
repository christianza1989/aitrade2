// src/components/how-it-works/SelfImprovementModule.tsx
"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Crown, ArrowRight, TrendingUp } from 'lucide-react';

export function SelfImprovementModule() {
    const [simState, setSimState] = useState<'idle' | 'comparing' | 'promoting' | 'promoted'>('idle');
    const [mainBotPnl, setMainBotPnl] = useState("+8%");

    const handleSimulate = () => {
        setSimState('comparing');
        setTimeout(() => setSimState('promoting'), 1500);
        setTimeout(() => {
            setSimState('promoted');
            setMainBotPnl("+15%"); // Atnaujiname pagrindinio boto P/L
        }, 3000);
        setTimeout(() => setSimState('idle'), 5000); // Grįžtame į pradinę būseną
    };
    
    const isSimulationRunning = simState !== 'idle';

    return (
        <div className="bg-gray-900 p-8 rounded-lg mt-8">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold">The Self-Improvement Loop</h2>
                <p className="mt-2 text-gray-400">
                    The MasterAgent tests new strategies in a 'Shadow Mode'. If a new strategy is superior, it's automatically promoted.
                </p>
            </div>
            
            <div className="relative flex justify-around items-center h-48">
                {/* Main Bot */}
                <AnimatePresence>
                    <BotCard 
                        key={mainBotPnl} 
                        name="Main Bot" 
                        pnl={mainBotPnl} 
                        isShadow={false} 
                        simState={simState} 
                    />
                </AnimatePresence>
                
                {/* Master Agent & Arrow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-40">
                    <motion.div animate={{ scale: simState === 'comparing' ? 1.2 : 1 }}>
                        <Crown size={32} className="mx-auto text-yellow-400 mb-2" />
                    </motion.div>
                    <p className="text-xs font-semibold">MasterAgent</p>
                    <p className="text-xs text-gray-400">
                        {simState === 'promoting' ? 'PROMOTING...' : 'Compares Performance'}
                    </p>
                    <AnimatePresence>
                        {simState === 'comparing' && (
                            <motion.div initial={{ opacity: 0}} animate={{ opacity: 1}} exit={{ opacity: 0 }}>
                                <TrendingUp size={24} className="mx-auto mt-2 text-green-400" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Shadow Bot */}
                <AnimatePresence>
                    {simState !== 'promoted' && (
                         <BotCard 
                            key="shadow"
                            name="Shadow Bot" 
                            pnl="+15%" 
                            isShadow={true} 
                            simState={simState} 
                        />
                    )}
                </AnimatePresence>
            </div>

            <div className="text-center mt-8">
                <button
                    onClick={handleSimulate}
                    disabled={isSimulationRunning}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-md disabled:opacity-50 transition-opacity"
                >
                    {isSimulationRunning ? "Simulation in Progress..." : "Simulate Promotion"}
                </button>
            </div>
        </div>
    );
}

interface BotCardProps {
    name: string;
    pnl: string;
    isShadow: boolean;
    simState: 'idle' | 'comparing' | 'promoting' | 'promoted';
}

const BotCard = ({ name, pnl, isShadow, simState }: BotCardProps) => {
    const isPromoting = simState === 'promoting';
    const isPromoted = simState === 'promoted';

    return (
        <motion.div
            layout
            key={name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
                opacity: 1, y: 0,
                borderColor: isShadow ? "#a855f7" : "#3b82f6",
                x: isPromoting && isShadow ? '-125%' : 0,
                scale: isPromoting && isShadow ? 1.1 : 1,
                zIndex: isShadow ? 10 : 5,
            }}
            exit={{ opacity: 0, scale: 0.8, transition: {duration: 0.5}}}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-48 text-center bg-gray-800 p-4 rounded-lg border-2"
        >
            <Bot size={28} className="mx-auto mb-2" />
            <h3 className="font-bold">{name}</h3>
            <p className={`text-2xl font-mono mt-2 transition-colors duration-500 ${pnl === '+15%' ? 'text-green-400' : 'text-green-500/60'}`}>
                {pnl}
            </p>
            <p className="text-xs text-gray-400">Simulated P/L</p>
        </motion.div>
    );
};
