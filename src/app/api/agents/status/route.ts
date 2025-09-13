// src/app/api/agents/status/route.ts
import { NextResponse } from 'next/server';
import { agentMetricsService } from '@/core/metrics-service'; // Corrected path

// Statinė informacija apie agentus
const agentInfo = {
    // Center - The Brain
    RiskManager: { 
        description: "Sintetina visų agentų duomenis, analizuoja praeities sandorių atmintį (Vector Memory) ir priima galutinį sprendimą 'BUY', 'SELL_SHORT' arba 'AVOID', apskaičiuodamas rizikos parametrus.",
        icon: 'Shield',
        position: { x: 50, y: 50 },
        connections: ['PortfolioAllocator', 'MacroAnalyst', 'SentimentAnalyst', 'TechnicalAnalyst', 'OnChainAnalyst', 'DEX_ScoutAgent', 'SocialMediaAnalyst']
    },

    // Inner Circle - Core Intelligence
    MacroAnalyst: { 
        description: "Įvertina bendrą rinkos aplinką ('Risk-On'/'Risk-Off'), nustato rizikos balą (0-10) ir trumpalaikę tendenciją ('Improving'/'Deteriorating'/'Stable').",
        icon: 'Activity',
        position: { x: 50, y: 22 },
        connections: ['RiskManager']
    },
    TechnicalAnalyst: { 
        description: "Atlieka kiekybinę kainos, apimties ir volatilumo analizę šimtams kriptovaliutų, nustatydamas techninį balą ir identifikuodamas prekybos signalus.",
        icon: 'Spline',
        position: { x: 74, y: 36 },
        connections: ['RiskManager']
    },
    SentimentAnalyst: { 
        description: "Analizuoja naujienas ir socialinę mediją, kad nustatytų rinkos nuotaiką ('Bullish'/'Bearish') ir identifikuotų dominuojančius naratyvus.",
        icon: 'MessageSquare',
        position: { x: 26, y: 36 },
        connections: ['RiskManager']
    },

    // Execution & Data
    PortfolioAllocator: {
        description: "Veikia kaip 'grynas matematikas'. Gavęs patvirtintą signalą iš RiskManager, apskaičiuoja tikslų pozicijos dydį pagal nustatytas rizikos taisykles.",
        icon: 'Coins',
        position: { x: 74, y: 64 },
        connections: []
    },
    PositionManager: {
        description: "Aktyviai valdo jau atidarytas pozicijas, stebėdamas rinkos pokyčius ir priimdamas sprendimus, kada fiksuoti pelną arba uždaryti poziciją.",
        icon: 'Briefcase',
        position: { x: 92, y: 25 },
        connections: []
    },

    // Data Layer - The Foundation
    MarketFeed: {
        description: "Tiekia realaus laiko rinkos duomenų srautą iš biržos, kuris yra pagrindas visoms realaus laiko analizėms.",
        icon: 'Activity',
        position: { x: 50, y: 85 }, // PAKEISTA POZICIJA
        connections: ['TechnicalAnalyst', 'RiskManager'] // Galima pridėti jungtis, jei norima
    },

    // Outer Circle - Specialized Intelligence
    OnChainAnalyst: { 
        description: "Analizuoja blockchain duomenis: 'banginių' aktyvumą, lėšų judėjimą į/iš biržų ir kaupimo signalus.",
        icon: 'Blocks',
        position: { x: 26, y: 64 },
        connections: ['RiskManager']
    },
    SocialMediaAnalyst: { 
        description: "Matuoja specifinių kriptovaliutų 'hype' lygį ir nuotaikas socialiniuose tinkluose, nustatydamas socialinį balą.",
        icon: 'Users',
        position: { x: 8, y: 25 },
        connections: ['RiskManager']
    },
    DEX_ScoutAgent: { 
        description: "Skenuoja decentralizuotas biržas (DEX), ieškodamas naujų, aukštos rizikos ir aukšto pelno potencialo galimybių.",
        icon: 'Radar',
        position: { x: 8, y: 75 },
        connections: ['RiskManager']
    },
    ScalperAgent: { 
        description: "Valdo 'Velocity' strategiją: identifikuoja 'fast mover' signalus, valdo 'scout' pozicijas ir naudoja AI valdomą išėjimo strategiją.",
        icon: 'Zap',
        position: { x: 92, y: 75 },
        connections: []
    },
    
    // Self-Improvement Loop
    StrategyOptimizer: { 
        description: "Analizuoja istorinius prekybos rezultatus ir siūlo naujas, optimizuotas strategijos konfigūracijas 'Shadow' režimui.",
        icon: 'BrainCircuit',
        position: { x: 35, y: 95 },
        connections: ['MasterAgent']
    },
    MasterAgent: { 
        description: "Prižiūri savęs tobulinimo ciklą. Palygina 'Main' ir 'Shadow' bot'ų rezultatus ir, esant reikalui, automatiškai 'paaukština' sėkmingesnę strategiją.",
        icon: 'Crown',
        position: { x: 65, y: 95 },
        connections: []
    },
};

export async function GET() { // Make function async
    try {
        const metrics = await agentMetricsService.getMetrics(); // Await the result

        const responseData = Object.entries(agentInfo).map(([name, info]) => {
            const agentMetrics = metrics[name];

            const successCount = agentMetrics?.successCount ?? 0;
            const errorCount = agentMetrics?.errorCount ?? 0;
            const totalResponseTime = agentMetrics ? Number(agentMetrics.totalResponseTime) : 0;
            const lastActivity = agentMetrics?.lastActivity.toISOString() ?? 'N/A';

            return {
                name,
                description: info.description,
                icon: info.icon,
                position: info.position,
                connections: info.connections,
                status: errorCount > 0 ? 'Error' : 'Online',
                metrics: {
                    successCount,
                    errorCount,
                    totalResponseTime,
                    lastActivity,
                    avgResponseTime: successCount > 0
                        ? (totalResponseTime / successCount / 1000).toFixed(2) + 's'
                        : 'N/A',
                },
            };
        });

        return NextResponse.json(responseData);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
