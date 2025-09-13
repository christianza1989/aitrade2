// Simulation Engine - Core system for live AI trading demonstration
export interface MarketDataPoint {
    timestamp: number;
    symbol: string;
    price: number;
    volume: number;
    change: number;
    changePercent: number;
    bid: number;
    ask: number;
    high24h: number;
    low24h: number;
}

export interface AIDecision {
    id: string;
    timestamp: number;
    agent: string;
    type: 'BUY' | 'SELL' | 'HOLD' | 'ANALYZE' | 'RISK_CHECK';
    symbol: string;
    confidence: number;
    reasoning: string;
    amount?: number;
    price?: number;
    status: 'processing' | 'executed' | 'cancelled';
    executionTime?: number;
}

export interface TradeExecution {
    id: string;
    timestamp: number;
    symbol: string;
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    value: number;
    fees: number;
    agent: string;
    reasoning: string;
}

export interface PortfolioState {
    timestamp: number;
    totalValue: number;
    cash: number;
    positions: Record<string, {
        symbol: string;
        amount: number;
        avgPrice: number;
        currentPrice: number;
        value: number;
        pnl: number;
        pnlPercent: number;
    }>;
    dailyPnL: number;
    totalPnL: number;
    winRate: number;
    totalTrades: number;
}

export interface MarketEvent {
    id: string;
    timestamp: number;
    type: 'news' | 'technical' | 'volume_spike' | 'trend_change' | 'volatility';
    severity: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    affectedSymbols: string[];
    priceImpact: number; // percentage
    duration: number; // seconds
}

export interface SimulationScenario {
    id: string;
    name: string;
    description: string;
    duration: number; // seconds
    startingCapital: number;
    symbols: string[];
    events: MarketEvent[];
    marketCondition: 'bull' | 'bear' | 'sideways' | 'volatile';
}

export class SimulationEngine {
    private isRunning: boolean = false;
    private isPaused: boolean = false;
    private speed: number = 1; // 1x = real time, 2x = 2x speed
    private startTime: number = 0;
    private currentTime: number = 0;
    
    private marketData: Map<string, MarketDataPoint> = new Map();
    private decisions: AIDecision[] = [];
    private trades: TradeExecution[] = [];
    private portfolioHistory: PortfolioState[] = [];
    private events: MarketEvent[] = [];
    
    private subscribers: Map<string, Set<(data: any) => void>> = new Map();
    
    // Market simulation parameters
    private symbols = [
        'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 
        'SOL/USDT', 'MATIC/USDT', 'DOT/USDT', 'LINK/USDT'
    ];
    
    private agents = [
        'MacroAnalyst', 'SentimentAnalyst', 'TechnicalAnalyst', 
        'RiskManager', 'PositionManager', 'StrategyOptimizer'
    ];
    
    // Starting prices for realistic simulation
    private basePrices: Record<string, number> = {
        'BTC/USDT': 43250,
        'ETH/USDT': 2650,
        'BNB/USDT': 315,
        'ADA/USDT': 0.485,
        'SOL/USDT': 98.5,
        'MATIC/USDT': 0.875,
        'DOT/USDT': 6.25,
        'LINK/USDT': 14.75
    };
    
    private currentPortfolio: PortfolioState;
    
    constructor() {
        this.initializeSimulation();
    }
    
    private initializeSimulation() {
        // Initialize market data
        this.symbols.forEach(symbol => {
            const basePrice = this.basePrices[symbol];
            this.marketData.set(symbol, {
                timestamp: Date.now(),
                symbol,
                price: basePrice,
                volume: Math.random() * 1000000 + 100000,
                change: 0,
                changePercent: 0,
                bid: basePrice * 0.999,
                ask: basePrice * 1.001,
                high24h: basePrice * 1.05,
                low24h: basePrice * 0.95
            });
        });
        
        // Initialize portfolio
        this.currentPortfolio = {
            timestamp: Date.now(),
            totalValue: 100000,
            cash: 100000,
            positions: {},
            dailyPnL: 0,
            totalPnL: 0,
            winRate: 0,
            totalTrades: 0
        };
        
        this.portfolioHistory.push({ ...this.currentPortfolio });
    }
    
    // Event subscription system
    subscribe(event: string, callback: (data: any) => void) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, new Set());
        }
        this.subscribers.get(event)!.add(callback);
        
        return () => {
            this.subscribers.get(event)?.delete(callback);
        };
    }
    
    private emit(event: string, data: any) {
        this.subscribers.get(event)?.forEach(callback => callback(data));
    }
    
    // Simulation control methods
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now();
        this.currentTime = 0;
        
        this.emit('simulation:started', { timestamp: Date.now() });
        this.simulationLoop();
    }
    
    pause() {
        this.isPaused = !this.isPaused;
        this.emit('simulation:paused', { paused: this.isPaused, timestamp: Date.now() });
    }
    
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        this.emit('simulation:stopped', { timestamp: Date.now() });
    }
    
    reset() {
        this.stop();
        this.decisions = [];
        this.trades = [];
        this.portfolioHistory = [];
        this.events = [];
        this.initializeSimulation();
        this.emit('simulation:reset', { timestamp: Date.now() });
    }
    
    setSpeed(speed: number) {
        this.speed = Math.max(0.1, Math.min(5, speed));
        this.emit('simulation:speed_changed', { speed: this.speed });
    }
    
    // Main simulation loop
    private async simulationLoop() {
        while (this.isRunning) {
            if (!this.isPaused) {
                this.currentTime = Date.now() - this.startTime;
                
                // Update market data every 100ms
                this.updateMarketData();
                
                // Generate AI decisions based on simulation speed (every 5-15 seconds at x1 speed)
                const decisionInterval = 5000 / this.speed; // Base 5 second interval
                if (Math.random() < (1000 / decisionInterval)) {
                    this.generateAIDecision();
                }
                
                // Execute pending decisions
                this.executePendingDecisions();
                
                // Generate market events occasionally (every 30-60 seconds at x1 speed)
                const eventInterval = 30000 / this.speed; // Base 30 second interval
                if (Math.random() < (1000 / eventInterval)) {
                    this.generateMarketEvent();
                }
                
                // Update portfolio
                this.updatePortfolio();
                
                // Stop after 10 hours (36000 seconds) at x1 speed
                if (this.currentTime > 36000000) {
                    this.stop();
                    this.emit('simulation:completed', { 
                        duration: this.currentTime,
                        finalPortfolio: this.currentPortfolio 
                    });
                    break;
                }
            }
            
            // Wait based on speed (1000ms base for real-time x1, adjusted by speed)
            await new Promise(resolve => setTimeout(resolve, 1000 / this.speed));
        }
    }
    
    private updateMarketData() {
        this.symbols.forEach(symbol => {
            const current = this.marketData.get(symbol)!;
            const basePrice = this.basePrices[symbol];
            
            // Generate realistic price movement
            const volatility = this.getVolatilityForSymbol(symbol);
            const trendFactor = this.getTrendFactor(symbol);
            const randomWalk = (Math.random() - 0.5) * 2;
            
            // Calculate new price with trend and volatility
            const priceChange = (trendFactor * 0.1 + randomWalk * volatility) * current.price * 0.001;
            const newPrice = Math.max(current.price + priceChange, basePrice * 0.5);
            
            const change = newPrice - current.price;
            const changePercent = (change / current.price) * 100;
            
            const updated: MarketDataPoint = {
                ...current,
                timestamp: Date.now(),
                price: newPrice,
                change: change,
                changePercent: changePercent,
                bid: newPrice * 0.999,
                ask: newPrice * 1.001,
                volume: current.volume + Math.random() * 10000,
                high24h: Math.max(current.high24h, newPrice),
                low24h: Math.min(current.low24h, newPrice)
            };
            
            this.marketData.set(symbol, updated);
        });
        
        // Emit market data update
        this.emit('market:update', Array.from(this.marketData.values()));
    }
    
    private getVolatilityForSymbol(symbol: string): number {
        // Different volatilities for different assets
        const volatilities: Record<string, number> = {
            'BTC/USDT': 2.0,
            'ETH/USDT': 2.5,
            'BNB/USDT': 3.0,
            'ADA/USDT': 4.0,
            'SOL/USDT': 3.5,
            'MATIC/USDT': 4.5,
            'DOT/USDT': 3.8,
            'LINK/USDT': 3.2
        };
        return volatilities[symbol] || 3.0;
    }
    
    private getTrendFactor(symbol: string): number {
        // Simulate market trends over time
        const timeMinutes = this.currentTime / 60000;
        const cycleLength = 3; // 3-minute cycles
        const phase = (timeMinutes / cycleLength) * 2 * Math.PI;
        
        // Different symbols can have different trend phases
        const phaseShift = this.symbols.indexOf(symbol) * 0.5;
        return Math.sin(phase + phaseShift);
    }
    
    private generateAIDecision() {
        const agent = this.agents[Math.floor(Math.random() * this.agents.length)];
        const symbol = this.symbols[Math.floor(Math.random() * this.symbols.length)];
        const marketData = this.marketData.get(symbol)!;
        
        const decisionTypes: AIDecision['type'][] = ['BUY', 'SELL', 'HOLD', 'ANALYZE', 'RISK_CHECK'];
        const type = decisionTypes[Math.floor(Math.random() * decisionTypes.length)];
        
        const reasonings = this.getReasoningForAgent(agent, type, marketData);
        
        const decision: AIDecision = {
            id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            agent,
            type,
            symbol,
            confidence: 0.6 + Math.random() * 0.4, // 60-100%
            reasoning: reasonings[Math.floor(Math.random() * reasonings.length)],
            amount: type === 'BUY' || type === 'SELL' ? Math.random() * 5000 + 1000 : undefined,
            price: marketData.price,
            status: 'processing'
        };
        
        this.decisions.unshift(decision);
        this.emit('ai:decision', decision);
        
        // Schedule execution for trading decisions
        if ((type === 'BUY' || type === 'SELL') && decision.confidence > 0.75) {
            setTimeout(() => this.executeDecision(decision.id), 1000 + Math.random() * 3000);
        }
    }
    
    private getReasoningForAgent(agent: string, type: AIDecision['type'], marketData: MarketDataPoint): string[] {
        const reasoningMap: Record<string, Record<string, string[]>> = {
            'MacroAnalyst': {
                'BUY': [
                    'Strong bullish momentum detected across multiple timeframes',
                    'Macro indicators suggest continued upward trend',
                    'Market structure showing signs of accumulation phase',
                    'Global liquidity conditions favorable for risk assets'
                ],
                'SELL': [
                    'Overbought conditions detected on macro timeframes',
                    'Risk-off sentiment emerging in traditional markets',
                    'Technical resistance levels approaching',
                    'Profit-taking opportunity at current levels'
                ],
                'HOLD': [
                    'Consolidation phase expected to continue',
                    'Waiting for clearer directional signals',
                    'Current range-bound market conditions'
                ],
                'ANALYZE': [
                    'Analyzing correlation with traditional market indices',
                    'Monitoring global economic indicators impact',
                    'Evaluating institutional flow patterns'
                ]
            },
            'SentimentAnalyst': {
                'BUY': [
                    'Social sentiment indicators showing extreme optimism',
                    'Institutional FOMO patterns detected',
                    'News sentiment analysis suggests bullish continuation',
                    'Community engagement metrics at monthly highs'
                ],
                'SELL': [
                    'Sentiment reaching euphoric levels - contrarian signal',
                    'Fear and greed index indicates extreme greed',
                    'Social media buzz suggests retail top formation',
                    'Negative news sentiment building momentum'
                ]
            },
            'TechnicalAnalyst': {
                'BUY': [
                    'Bullish breakout above key resistance level',
                    'Golden cross formation on 4H timeframe',
                    'Volume profile supports upward price action',
                    'RSI showing healthy pullback to support'
                ],
                'SELL': [
                    'Bearish divergence detected on momentum indicators',
                    'Price rejection at significant fibonacci level',
                    'Volume declining during recent price advance',
                    'Death cross formation imminent on daily chart'
                ]
            },
            'RiskManager': {
                'RISK_CHECK': [
                    'Portfolio exposure exceeds risk tolerance threshold',
                    'Correlation between positions increasing risk',
                    'Volatility metrics suggest position sizing adjustment',
                    'Stop-loss levels require immediate attention'
                ],
                'SELL': [
                    'Risk metrics suggest immediate position reduction',
                    'Portfolio heat approaching maximum tolerance',
                    'Correlation risk management protocol activated'
                ]
            }
        };
        
        return reasoningMap[agent]?.[type] || ['Standard analysis completed'];
    }
    
    private executePendingDecisions() {
        const pending = this.decisions.filter(d => d.status === 'processing');
        
        pending.forEach(decision => {
            if ((decision.type === 'BUY' || decision.type === 'SELL') && decision.confidence > 0.7) {
                // Simulate execution delay
                if (Math.random() < 0.3) {
                    this.executeDecision(decision.id);
                }
            } else {
                // Mark non-trading decisions as executed quickly
                decision.status = 'executed';
                decision.executionTime = Date.now();
                this.emit('ai:decision_updated', decision);
            }
        });
    }
    
    private executeDecision(decisionId: string) {
        const decision = this.decisions.find(d => d.id === decisionId);
        if (!decision || decision.status !== 'processing') return;
        
        const marketData = this.marketData.get(decision.symbol)!;
        const executionPrice = marketData.price * (1 + (Math.random() - 0.5) * 0.002); // Small slippage
        
        const trade: TradeExecution = {
            id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            symbol: decision.symbol,
            side: decision.type.toLowerCase() as 'buy' | 'sell',
            amount: decision.amount!,
            price: executionPrice,
            value: decision.amount! * executionPrice,
            fees: decision.amount! * executionPrice * 0.001, // 0.1% fees
            agent: decision.agent,
            reasoning: decision.reasoning
        };
        
        this.trades.unshift(trade);
        
        decision.status = 'executed';
        decision.executionTime = Date.now();
        
        this.emit('trade:executed', trade);
        this.emit('ai:decision_updated', decision);
        
        this.updatePortfolioWithTrade(trade);
    }
    
    private updatePortfolioWithTrade(trade: TradeExecution) {
        const symbol = trade.symbol;
        
        if (!this.currentPortfolio.positions[symbol]) {
            this.currentPortfolio.positions[symbol] = {
                symbol,
                amount: 0,
                avgPrice: 0,
                currentPrice: trade.price,
                value: 0,
                pnl: 0,
                pnlPercent: 0
            };
        }
        
        const position = this.currentPortfolio.positions[symbol];
        
        if (trade.side === 'buy') {
            const newAmount = position.amount + trade.amount;
            const newAvgPrice = newAmount > 0 
                ? (position.avgPrice * position.amount + trade.value) / newAmount
                : trade.price;
            
            position.amount = newAmount;
            position.avgPrice = newAvgPrice;
            this.currentPortfolio.cash -= trade.value + trade.fees;
        } else {
            position.amount -= trade.amount;
            this.currentPortfolio.cash += trade.value - trade.fees;
            
            if (position.amount <= 0) {
                delete this.currentPortfolio.positions[symbol];
            }
        }
        
        this.currentPortfolio.totalTrades++;
    }
    
    private updatePortfolio() {
        let totalValue = this.currentPortfolio.cash;
        
        // Update all positions with current market prices
        Object.values(this.currentPortfolio.positions).forEach(position => {
            const marketData = this.marketData.get(position.symbol)!;
            position.currentPrice = marketData.price;
            position.value = position.amount * position.currentPrice;
            position.pnl = position.value - (position.amount * position.avgPrice);
            position.pnlPercent = (position.pnl / (position.amount * position.avgPrice)) * 100;
            
            totalValue += position.value;
        });
        
        this.currentPortfolio.totalValue = totalValue;
        this.currentPortfolio.dailyPnL = totalValue - 100000;
        this.currentPortfolio.totalPnL = this.currentPortfolio.dailyPnL;
        this.currentPortfolio.timestamp = Date.now();
        
        // Calculate win rate
        const winningTrades = this.trades.filter(t => {
            const position = this.currentPortfolio.positions[t.symbol];
            return position && position.pnl > 0;
        }).length;
        this.currentPortfolio.winRate = this.trades.length > 0 ? (winningTrades / this.trades.length) * 100 : 0;
        
        this.portfolioHistory.push({ ...this.currentPortfolio });
        this.emit('portfolio:update', this.currentPortfolio);
    }
    
    private generateMarketEvent() {
        const eventTypes: MarketEvent['type'][] = ['news', 'technical', 'volume_spike', 'trend_change', 'volatility'];
        const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const severity: MarketEvent['severity'] = Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low';
        
        const events = this.getMarketEventsByType(type, severity);
        const eventData = events[Math.floor(Math.random() * events.length)];
        
        const event: MarketEvent = {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            type,
            severity,
            ...eventData,
            affectedSymbols: this.symbols.slice(0, Math.floor(Math.random() * 4) + 1),
            duration: 30 + Math.random() * 120 // 30-150 seconds
        };
        
        this.events.unshift(event);
        this.emit('market:event', event);
    }
    
    private getMarketEventsByType(type: MarketEvent['type'], severity: MarketEvent['severity']) {
        const eventMap: Record<MarketEvent['type'], Record<MarketEvent['severity'], Array<{title: string, description: string, priceImpact: number}>>> = {
            'news': {
                'low': [
                    { title: 'Minor Exchange Update', description: 'Exchange announces minor system upgrade', priceImpact: 0.5 },
                    { title: 'Community Proposal', description: 'New governance proposal submitted', priceImpact: 0.3 }
                ],
                'medium': [
                    { title: 'Partnership Announcement', description: 'Major partnership with traditional finance firm', priceImpact: 2.5 },
                    { title: 'Regulatory Clarification', description: 'Government provides crypto regulation clarity', priceImpact: 1.8 }
                ],
                'high': [
                    { title: 'Institution Adoption', description: 'Fortune 500 company adds crypto to treasury', priceImpact: 5.2 },
                    { title: 'Regulatory Crackdown', description: 'Major regulatory action announced', priceImpact: -4.8 }
                ]
            },
            'technical': {
                'low': [
                    { title: 'Support Test', description: 'Price testing key support level', priceImpact: -0.8 },
                    { title: 'Resistance Touch', description: 'Approaching significant resistance', priceImpact: 0.6 }
                ],
                'medium': [
                    { title: 'Breakout Confirmed', description: 'Technical breakout above resistance', priceImpact: 3.2 },
                    { title: 'Support Breakdown', description: 'Key support level broken', priceImpact: -2.8 }
                ],
                'high': [
                    { title: 'Major Breakout', description: 'Significant technical level breached with volume', priceImpact: 6.5 },
                    { title: 'Flash Crash', description: 'Rapid price decline across markets', priceImpact: -8.2 }
                ]
            },
            'volume_spike': {
                'low': [
                    { title: 'Volume Increase', description: 'Trading volume above average', priceImpact: 0.4 }
                ],
                'medium': [
                    { title: 'High Volume Alert', description: 'Unusual trading volume detected', priceImpact: 1.2 }
                ],
                'high': [
                    { title: 'Volume Explosion', description: 'Extreme volume spike indicates major move', priceImpact: 4.8 }
                ]
            },
            'trend_change': {
                'low': [
                    { title: 'Trend Weakness', description: 'Current trend showing signs of exhaustion', priceImpact: -0.6 }
                ],
                'medium': [
                    { title: 'Trend Reversal Signal', description: 'Multiple indicators suggest trend change', priceImpact: -2.1 }
                ],
                'high': [
                    { title: 'Major Trend Shift', description: 'Confirmed trend reversal across timeframes', priceImpact: -5.5 }
                ]
            },
            'volatility': {
                'low': [
                    { title: 'Volatility Rise', description: 'Market volatility increasing', priceImpact: 0.8 }
                ],
                'medium': [
                    { title: 'High Volatility Warning', description: 'Significant price swings expected', priceImpact: 2.2 }
                ],
                'high': [
                    { title: 'Extreme Volatility', description: 'Market in extreme volatility condition', priceImpact: 7.1 }
                ]
            }
        };
        
        return eventMap[type][severity] || [];
    }
    
    // Getter methods for current state
    getCurrentMarketData(): MarketDataPoint[] {
        return Array.from(this.marketData.values());
    }
    
    getRecentDecisions(limit: number = 20): AIDecision[] {
        return this.decisions.slice(0, limit);
    }
    
    getRecentTrades(limit: number = 20): TradeExecution[] {
        return this.trades.slice(0, limit);
    }
    
    getCurrentPortfolio(): PortfolioState {
        return this.currentPortfolio;
    }
    
    getPortfolioHistory(): PortfolioState[] {
        return this.portfolioHistory;
    }
    
    getRecentEvents(limit: number = 10): MarketEvent[] {
        return this.events.slice(0, limit);
    }
    
    getSimulationStatus() {
        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            speed: this.speed,
            elapsedTime: this.currentTime,
            remainingTime: Math.max(0, 36000000 - this.currentTime),
            progress: Math.min(1, this.currentTime / 36000000)
        };
    }
}

// Singleton instance
export const simulationEngine = new SimulationEngine();