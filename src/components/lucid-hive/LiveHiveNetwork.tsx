'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Eye, 
  TrendingUp, 
  Shield, 
  Calculator, 
  Target, 
  Zap, 
  Activity,
  Cpu,
  Network,
  Radio,
  History
} from 'lucide-react';
import { AgentHistoryViewer } from '@/components/agents/AgentHistoryViewer';

interface AgentStatus {
  id: string;
  name: string;
  status: 'idle' | 'analyzing' | 'active' | 'communicating' | 'error';
  icon: React.ReactNode;
  position: { x: number; y: number };
  lastActivity?: string;
  currentTask?: string;
  connections: string[];
}

interface DataFlow {
  id: string;
  from: string;
  to: string;
  type: 'analysis' | 'decision' | 'data' | 'alert';
  timestamp: number;
}

const AGENTS: AgentStatus[] = [
  {
    id: 'macro',
    name: 'Macro Analyst',
    status: 'active',
    icon: <TrendingUp className="w-6 h-6" />,
    position: { x: 20, y: 20 },
    currentTask: 'Analyzing market regime...',
    connections: ['sentiment', 'risk']
  },
  {
    id: 'sentiment',
    name: 'Sentiment Analyst', 
    status: 'analyzing',
    icon: <Brain className="w-6 h-6" />,
    position: { x: 80, y: 20 },
    currentTask: 'Processing news sentiment...',
    connections: ['macro', 'technical', 'risk']
  },
  {
    id: 'technical',
    name: 'Technical Analyst',
    status: 'active',
    icon: <Activity className="w-6 h-6" />,
    position: { x: 50, y: 45 },
    currentTask: 'Calculating RSI & MACD...',
    connections: ['sentiment', 'risk', 'portfolio']
  },
  {
    id: 'risk',
    name: 'Risk Manager',
    status: 'communicating',
    icon: <Shield className="w-6 h-6" />,
    position: { x: 20, y: 70 },
    currentTask: 'Evaluating portfolio risk...',
    connections: ['macro', 'sentiment', 'technical', 'portfolio', 'position']
  },
  {
    id: 'portfolio',
    name: 'Portfolio Allocator',
    status: 'idle',
    icon: <Target className="w-6 h-6" />,
    position: { x: 80, y: 70 },
    currentTask: 'Waiting for signals...',
    connections: ['technical', 'risk', 'position']
  },
  {
    id: 'position',
    name: 'Position Manager',
    status: 'analyzing',
    icon: <Calculator className="w-6 h-6" />,
    position: { x: 50, y: 90 },
    currentTask: 'Managing open positions...',
    connections: ['risk', 'portfolio']
  },
  {
    id: 'optimizer',
    name: 'Strategy Optimizer',
    status: 'active',
    icon: <Cpu className="w-6 h-6" />,
    position: { x: 50, y: 20 },
    currentTask: 'Learning from history...',
    connections: ['macro', 'sentiment', 'technical']
  }
];

export function LiveHiveNetwork() {
  const [agents, setAgents] = useState<AgentStatus[]>(AGENTS);
  const [dataFlows, setDataFlows] = useState<DataFlow[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [historyAgent, setHistoryAgent] = useState<{ id: string; name: string } | null>(null);
  const [hiveStatus, setHiveStatus] = useState<'dormant' | 'awakening' | 'active' | 'hyperactive'>('active');
  
  // Simulate real-time agent activity
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => ({
        ...agent,
        status: Math.random() > 0.7 ? 'active' : 
                Math.random() > 0.5 ? 'analyzing' : 
                Math.random() > 0.3 ? 'communicating' : 'idle',
        lastActivity: new Date().toLocaleTimeString()
      })));

      // Generate random data flows
      if (Math.random() > 0.6) {
        const fromAgent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
        const toAgent = fromAgent.connections[Math.floor(Math.random() * fromAgent.connections.length)];
        
        if (toAgent) {
          const newFlow: DataFlow = {
            id: Date.now().toString(),
            from: fromAgent.id,
            to: toAgent,
            type: ['analysis', 'decision', 'data', 'alert'][Math.floor(Math.random() * 4)] as any,
            timestamp: Date.now()
          };
          
          setDataFlows(prev => [...prev.slice(-10), newFlow]);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Clean old data flows
  useEffect(() => {
    const cleanup = setInterval(() => {
      setDataFlows(prev => prev.filter(flow => Date.now() - flow.timestamp < 10000));
    }, 1000);
    
    return () => clearInterval(cleanup);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'from-green-400 to-emerald-500';
      case 'analyzing': return 'from-blue-400 to-cyan-500';
      case 'communicating': return 'from-purple-400 to-pink-500';
      case 'error': return 'from-red-400 to-rose-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getFlowColor = (type: string) => {
    switch (type) {
      case 'analysis': return '#06b6d4'; // cyan
      case 'decision': return '#8b5cf6'; // purple
      case 'data': return '#10b981'; // emerald
      case 'alert': return '#f59e0b'; // amber
      default: return '#6b7280'; // gray
    }
  };

  return (
    <div className="relative w-full h-[600px] bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl border border-gray-700/50 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_70%)]" />
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(6,182,212,0.2) 2px, transparent 2px),
            radial-gradient(circle at 75% 75%, rgba(139,92,246,0.2) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Hive Status Indicator */}
      <div className="absolute top-6 left-6 z-20">
        <div className="flex items-center space-x-3">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative"
          >
            <Network className="w-8 h-8 text-cyan-400" />
            <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-lg" />
          </motion.div>
          <div>
            <h3 className="text-white font-bold text-lg">LUCID HIVE</h3>
            <p className="text-cyan-400 text-sm font-medium capitalize">
              Status: {hiveStatus}
            </p>
          </div>
        </div>
      </div>

      {/* Real-time Activity Feed */}
      <div className="absolute top-6 right-6 z-20 w-80">
        <div className="bg-black/40 backdrop-blur-md rounded-xl border border-gray-600/30 p-4">
          <h4 className="text-white font-semibold mb-3 flex items-center">
            <Radio className="w-4 h-4 mr-2 text-green-400" />
            Live Activity Feed
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            <AnimatePresence>
              {dataFlows.slice(-5).reverse().map((flow) => (
                <motion.div
                  key={flow.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-xs text-gray-300 bg-gray-800/50 rounded px-2 py-1"
                >
                  <span className="text-cyan-400">
                    {agents.find(a => a.id === flow.from)?.name}
                  </span>
                  <span className="mx-1">→</span>
                  <span className="text-purple-400">
                    {agents.find(a => a.id === flow.to)?.name}
                  </span>
                  <div className="text-gray-500 text-xs">
                    {flow.type} • {new Date(flow.timestamp).toLocaleTimeString()}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* AI Agent Nodes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Connection Lines */}
        {agents.flatMap(agent => 
          agent.connections.map(connectionId => {
            const targetAgent = agents.find(a => a.id === connectionId);
            if (!targetAgent) return null;
            
            const x1 = (agent.position.x / 100) * window.innerWidth * 0.8;
            const y1 = (agent.position.y / 100) * 500;
            const x2 = (targetAgent.position.x / 100) * window.innerWidth * 0.8;
            const y2 = (targetAgent.position.y / 100) * 500;
            
            return (
              <motion.line
                key={`${agent.id}-${connectionId}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(6,182,212,0.3)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ 
                  pathLength: 1,
                  stroke: agent.status === 'communicating' ? 'rgba(139,92,246,0.8)' : 'rgba(6,182,212,0.3)'
                }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            );
          })
        )}

        {/* Data Flow Animations */}
        <AnimatePresence>
          {dataFlows.map(flow => {
            const fromAgent = agents.find(a => a.id === flow.from);
            const toAgent = agents.find(a => a.id === flow.to);
            if (!fromAgent || !toAgent) return null;

            const x1 = (fromAgent.position.x / 100) * window.innerWidth * 0.8;
            const y1 = (fromAgent.position.y / 100) * 500;
            const x2 = (toAgent.position.x / 100) * window.innerWidth * 0.8;
            const y2 = (toAgent.position.y / 100) * 500;

            return (
              <motion.circle
                key={flow.id}
                r="3"
                fill={getFlowColor(flow.type)}
                initial={{ cx: x1, cy: y1, opacity: 1 }}
                animate={{ 
                  cx: x2, 
                  cy: y2, 
                  opacity: [1, 0.8, 0] 
                }}
                transition={{ 
                  duration: 3, 
                  ease: "easeInOut",
                  opacity: { duration: 3 }
                }}
                style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
              />
            );
          })}
        </AnimatePresence>
      </svg>

      {/* Agent Nodes */}
      {agents.map((agent) => (
        <motion.div
          key={agent.id}
          className="absolute pointer-events-auto cursor-pointer"
          style={{
            left: `${agent.position.x}%`,
            top: `${agent.position.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
        >
          <motion.div
            className={`relative w-16 h-16 rounded-full bg-gradient-to-r ${getStatusColor(agent.status)} p-0.5`}
            animate={{ 
              scale: agent.status === 'active' ? [1, 1.05, 1] : 1,
              rotate: agent.status === 'analyzing' ? 360 : 0
            }}
            transition={{ 
              scale: { duration: 2, repeat: Infinity },
              rotate: { duration: 4, repeat: Infinity, ease: "linear" }
            }}
          >
            <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center relative overflow-hidden">
              {/* Pulsing background effect */}
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  background: [
                    'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
                    'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)',
                    'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)'
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              
              <div className="relative text-white z-10">
                {agent.icon}
              </div>
            </div>
            
            {/* Status indicator dot */}
            <motion.div
              className={`absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r ${getStatusColor(agent.status)}`}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>

          {/* Agent Info Popup */}
          <AnimatePresence>
            {selectedAgent === agent.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30"
              >
                <div className="bg-black/80 backdrop-blur-xl rounded-xl border border-gray-600/50 p-4 min-w-64 shadow-2xl">
                  <h4 className="text-white font-semibold mb-2">{agent.name}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className={`capitalize font-medium ${
                        agent.status === 'active' ? 'text-green-400' :
                        agent.status === 'analyzing' ? 'text-blue-400' :
                        agent.status === 'communicating' ? 'text-purple-400' :
                        'text-gray-400'
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Task:</span>
                      <span className="text-white text-right max-w-32">
                        {agent.currentTask}
                      </span>
                    </div>
                    {agent.lastActivity && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Last Activity:</span>
                        <span className="text-cyan-400">{agent.lastActivity}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-gray-600 space-y-2">
                      <div className="text-gray-400 text-xs">
                        Connected to: {agent.connections.length} agents
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryAgent({ id: agent.id, name: agent.name });
                          setSelectedAgent(null);
                        }}
                        className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-cyan-300 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 border border-cyan-500/30"
                      >
                        <History className="w-3 h-3" />
                        <span>View History</span>
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Agent Label */}
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1 border border-gray-600/30">
              <p className="text-white text-xs font-medium text-center whitespace-nowrap">
                {agent.name}
              </p>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/60 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * 600,
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * 600,
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "linear"
            }}
          />
        ))}
      </div>
      
      {/* Agent History Viewer */}
      {historyAgent && (
        <AgentHistoryViewer
          agentId={historyAgent.id}
          agentName={historyAgent.name}
          isOpen={true}
          onClose={() => setHistoryAgent(null)}
        />
      )}
    </div>
  );
}