'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Clock, 
  Brain, 
  Activity, 
  TrendingUp, 
  Shield, 
  Target,
  Calculator,
  Eye,
  Cpu,
  Filter,
  Search,
  Calendar,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AgentDecision {
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
  executionPrice?: number;
  outcome?: 'success' | 'partial' | 'failed';
  apiResponse?: {
    model: string;
    tokens: number;
    processingTime: number;
    reasoning: string;
    confidence: number;
    factors: string[];
  };
}

interface AgentHistoryViewerProps {
  agentId: string;
  agentName: string;
  isOpen: boolean;
  onClose: () => void;
}

// Mock data generator for demo
const generateMockDecisions = (agentId: string, count: number = 50): AgentDecision[] => {
  const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT'];
  const types: AgentDecision['type'][] = ['BUY', 'SELL', 'HOLD', 'ANALYZE', 'RISK_CHECK'];
  const models = ['GPT-4 Turbo', 'Claude-3 Opus', 'Gemini Pro'];
  
  return Array.from({ length: count }, (_, i) => {
    const timestamp = Date.now() - (i * 1000 * 60 * Math.random() * 30); // Random times in last 30 minutes
    const type = types[Math.floor(Math.random() * types.length)];
    const status = Math.random() > 0.8 ? 'cancelled' : Math.random() > 0.1 ? 'executed' : 'processing';
    
    return {
      id: `${agentId}_${timestamp}_${i}`,
      timestamp,
      agent: agentId,
      type,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      confidence: 0.6 + Math.random() * 0.4,
      reasoning: getReasoningByAgent(agentId, type),
      amount: type === 'BUY' || type === 'SELL' ? Math.random() * 5000 + 1000 : undefined,
      price: 43000 + Math.random() * 2000 - 1000,
      status,
      executionTime: status === 'executed' ? timestamp + 1000 + Math.random() * 5000 : undefined,
      executionPrice: status === 'executed' ? 43000 + Math.random() * 2000 - 1000 : undefined,
      outcome: status === 'executed' ? (Math.random() > 0.2 ? 'success' : Math.random() > 0.5 ? 'partial' : 'failed') : undefined,
      apiResponse: {
        model: models[Math.floor(Math.random() * models.length)],
        tokens: Math.floor(Math.random() * 2000 + 500),
        processingTime: Math.random() * 3000 + 500,
        reasoning: getDetailedReasoning(agentId, type),
        confidence: 0.7 + Math.random() * 0.3,
        factors: getAnalysisFactors(agentId)
      }
    };
  }).sort((a, b) => b.timestamp - a.timestamp);
};

const getReasoningByAgent = (agentId: string, type: string): string => {
  const reasonings: Record<string, Record<string, string[]>> = {
    'macro': {
      'BUY': [
        'Global liquidity conditions favor risk assets',
        'Institutional flow patterns suggest accumulation',
        'Macro momentum indicators turning bullish'
      ],
      'SELL': [
        'Risk-off sentiment emerging globally',
        'Macro headwinds building pressure',
        'Institutional outflows detected'
      ]
    },
    'sentiment': {
      'BUY': [
        'Social sentiment reaching extreme optimism',
        'Institutional FOMO patterns detected',
        'Community engagement at monthly highs'
      ],
      'SELL': [
        'Sentiment euphoria signals contrarian opportunity',
        'Fear and greed index shows extreme levels',
        'Social buzz indicates retail distribution'
      ]
    },
    'technical': {
      'BUY': [
        'Golden cross formation confirmed on 4H',
        'Volume profile supports breakout',
        'RSI showing healthy pullback structure'
      ],
      'SELL': [
        'Bearish divergence on momentum indicators',
        'Price rejection at key fibonacci level',
        'Volume declining during advance'
      ]
    }
  };
  
  const agentReasons = reasonings[agentId] || reasonings['technical'];
  const typeReasons = agentReasons[type] || ['Standard analysis completed'];
  return typeReasons[Math.floor(Math.random() * typeReasons.length)];
};

const getDetailedReasoning = (agentId: string, type: string): string => {
  return `Comprehensive ${agentId} analysis: Market structure analysis shows ${type.toLowerCase()} signal with multiple confluence factors. Technical indicators align with fundamental analysis. Risk-reward ratio favorable at current levels. Position sizing calculated based on volatility metrics and portfolio heat.`;
};

const getAnalysisFactors = (agentId: string): string[] => {
  const factors: Record<string, string[]> = {
    'macro': ['Global DXY trend', 'Fed policy outlook', 'Institutional flows', 'Currency correlations'],
    'sentiment': ['Social sentiment score', 'News sentiment', 'Fear & Greed index', 'Retail positioning'],
    'technical': ['Price action', 'Volume profile', 'RSI levels', 'Moving averages'],
    'risk': ['Portfolio heat', 'Correlation risk', 'VaR metrics', 'Drawdown limits'],
    'position': ['Position sizing', 'Entry levels', 'Stop losses', 'Profit targets']
  };
  
  return factors[agentId] || factors['technical'];
};

export function AgentHistoryViewer({ agentId, agentName, isOpen, onClose }: AgentHistoryViewerProps) {
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  const [filteredDecisions, setFilteredDecisions] = useState<AgentDecision[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<AgentDecision | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  useEffect(() => {
    if (isOpen && agentId) {
      // Load agent decision history
      const mockDecisions = generateMockDecisions(agentId);
      setDecisions(mockDecisions);
    }
  }, [isOpen, agentId]);
  
  useEffect(() => {
    let filtered = decisions;
    
    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.reasoning.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(d => d.type === filterType);
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(d => d.status === filterStatus);
    }
    
    setFilteredDecisions(filtered);
  }, [decisions, searchTerm, filterType, filterStatus]);

  const getAgentIcon = (agentId: string) => {
    const icons: Record<string, React.ReactNode> = {
      'macro': <TrendingUp className="w-5 h-5" />,
      'sentiment': <Brain className="w-5 h-5" />,
      'technical': <Activity className="w-5 h-5" />,
      'risk': <Shield className="w-5 h-5" />,
      'portfolio': <Target className="w-5 h-5" />,
      'position': <Calculator className="w-5 h-5" />,
      'optimizer': <Cpu className="w-5 h-5" />
    };
    
    return icons[agentId] || <Brain className="w-5 h-5" />;
  };

  const getStatusColor = (status: string, outcome?: string) => {
    if (status === 'executed') {
      switch (outcome) {
        case 'success': return 'text-green-400';
        case 'partial': return 'text-yellow-400';
        case 'failed': return 'text-red-400';
        default: return 'text-blue-400';
      }
    }
    switch (status) {
      case 'processing': return 'text-blue-400';
      case 'cancelled': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string, outcome?: string) => {
    if (status === 'executed') {
      switch (outcome) {
        case 'success': return <CheckCircle className="w-4 h-4" />;
        case 'partial': return <AlertTriangle className="w-4 h-4" />;
        case 'failed': return <XCircle className="w-4 h-4" />;
        default: return <CheckCircle className="w-4 h-4" />;
      }
    }
    switch (status) {
      case 'processing': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="w-full max-w-6xl h-[90vh] bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-black/95 backdrop-blur-xl rounded-3xl border border-gray-600/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl">
              {getAgentIcon(agentId)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{agentName} History</h2>
              <p className="text-gray-400">Complete decision and API response log</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex h-full">
          {/* Decisions List */}
          <div className="w-1/2 border-r border-gray-700/50 flex flex-col">
            {/* Search and Filters */}
            <div className="p-4 border-b border-gray-700/50 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search decisions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>
              
              <div className="flex space-x-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                  <option value="HOLD">Hold</option>
                  <option value="ANALYZE">Analyze</option>
                  <option value="RISK_CHECK">Risk Check</option>
                </select>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="executed">Executed</option>
                  <option value="processing">Processing</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Decisions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <AnimatePresence>
                {filteredDecisions.map((decision) => (
                  <motion.div
                    key={decision.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedDecision?.id === decision.id
                        ? 'bg-cyan-500/20 border-cyan-400/50'
                        : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-700/30'
                    }`}
                    onClick={() => setSelectedDecision(decision)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          decision.type === 'BUY' ? 'bg-green-500/20 text-green-400' :
                          decision.type === 'SELL' ? 'bg-red-500/20 text-red-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {decision.type}
                        </span>
                        <span className="text-white font-medium">{decision.symbol}</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${getStatusColor(decision.status, decision.outcome)}`}>
                        {getStatusIcon(decision.status, decision.outcome)}
                        <span className="text-xs capitalize">{decision.status}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-2 line-clamp-2">{decision.reasoning}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{new Date(decision.timestamp).toLocaleTimeString()}</span>
                      <span>Confidence: {(decision.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Decision Details */}
          <div className="flex-1 p-6">
            {selectedDecision ? (
              <div className="space-y-6">
                {/* Decision Header */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          selectedDecision.type === 'BUY' ? 'bg-green-500/20 text-green-400' :
                          selectedDecision.type === 'SELL' ? 'bg-red-500/20 text-red-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {selectedDecision.type}
                        </span>
                        <span className="text-white">{selectedDecision.symbol}</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${getStatusColor(selectedDecision.status, selectedDecision.outcome)}`}>
                        {getStatusIcon(selectedDecision.status, selectedDecision.outcome)}
                        <span className="capitalize">{selectedDecision.status}</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-sm">Timestamp</p>
                        <p className="text-white">{new Date(selectedDecision.timestamp).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Confidence</p>
                        <p className="text-white">{(selectedDecision.confidence * 100).toFixed(1)}%</p>
                      </div>
                      {selectedDecision.amount && (
                        <div>
                          <p className="text-gray-400 text-sm">Amount</p>
                          <p className="text-white">${selectedDecision.amount.toLocaleString()}</p>
                        </div>
                      )}
                      {selectedDecision.price && (
                        <div>
                          <p className="text-gray-400 text-sm">Price</p>
                          <p className="text-white">${selectedDecision.price.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm mb-2">Reasoning</p>
                      <p className="text-white">{selectedDecision.reasoning}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* API Response Details */}
                {selectedDecision.apiResponse && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2 text-purple-400" />
                        AI Model Response
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-gray-400 text-sm">Model</p>
                          <p className="text-white font-medium">{selectedDecision.apiResponse.model}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Tokens Used</p>
                          <p className="text-white">{selectedDecision.apiResponse.tokens.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Processing Time</p>
                          <p className="text-white">{(selectedDecision.apiResponse.processingTime / 1000).toFixed(2)}s</p>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-gray-400 text-sm mb-2">Detailed Reasoning</p>
                        <p className="text-white text-sm bg-gray-800/50 rounded-lg p-3">
                          {selectedDecision.apiResponse.reasoning}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-gray-400 text-sm mb-2">Analysis Factors</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedDecision.apiResponse.factors.map((factor, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs"
                            >
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Execution Details */}
                {selectedDecision.executionTime && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-green-400" />
                        Execution Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-400 text-sm">Execution Time</p>
                          <p className="text-white">{new Date(selectedDecision.executionTime).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Execution Price</p>
                          <p className="text-white">${selectedDecision.executionPrice?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Outcome</p>
                          <span className={`capitalize ${getStatusColor('executed', selectedDecision.outcome)}`}>
                            {selectedDecision.outcome}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Slippage</p>
                          <p className="text-white">
                            {selectedDecision.price && selectedDecision.executionPrice 
                              ? ((Math.abs(selectedDecision.executionPrice - selectedDecision.price) / selectedDecision.price) * 100).toFixed(3)
                              : '0.000'
                            }%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Eye className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">Select a Decision</h3>
                  <p className="text-gray-500">Choose a decision from the left to view detailed analysis</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}