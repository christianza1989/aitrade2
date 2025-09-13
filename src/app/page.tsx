'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Brain, BarChart3, Play, Activity, Zap, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl w-full"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center"
            >
              <Brain className="w-10 h-10 text-white" />
            </motion.div>
            
            <h1 className="text-5xl lg:text-7xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
              LUCID HIVE
            </h1>
            
            <p className="text-xl lg:text-2xl text-gray-300 mb-4 leading-relaxed">
              Advanced AI Trading Platform
            </p>
            
            <p className="text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Experience the future of algorithmic trading with our sophisticated AI agents. 
              Choose your entry point into the world of intelligent market analysis.
            </p>
          </div>

          {/* Mode Selection Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Dashboard Mode */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              whileHover={{ scale: 1.02 }}
              className="group cursor-pointer"
              onClick={() => router.push('/dashboard')}
            >
              <Card className="bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center"
                      >
                        <BarChart3 className="w-8 h-8 text-white" />
                      </motion.div>
                      <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-white text-center mb-4">
                    Production Dashboard
                  </h2>
                  
                  <p className="text-gray-300 text-center mb-6 leading-relaxed">
                    Access the full trading platform with real portfolio management, 
                    live market data integration, and production-ready AI agents.
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span>Live portfolio management</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                      <Activity className="w-4 h-4 text-blue-400" />
                      <span>Real market data feeds</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                      <Zap className="w-4 h-4 text-blue-400" />
                      <span>Advanced analytics & reporting</span>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                  >
                    Enter Dashboard
                  </motion.button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Simulation Mode */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              whileHover={{ scale: 1.02 }}
              className="group cursor-pointer"
              onClick={() => router.push('/simulate')}
            >
              <Card className="bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 border-green-500/30 hover:border-green-400/50 transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          rotate: [0, 180, 360]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center"
                      >
                        <Play className="w-8 h-8 text-white ml-1" />
                      </motion.div>
                      <div className="absolute inset-0 bg-green-400/30 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-white text-center mb-4">
                    Live Simulation
                  </h2>
                  
                  <p className="text-gray-300 text-center mb-6 leading-relaxed">
                    Experience 10 minutes of live AI trading action. Perfect for demonstrations, 
                    investor meetings, and showcasing AI capabilities.
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                      <Brain className="w-4 h-4 text-green-400" />
                      <span>Real-time AI agent decisions</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                      <Activity className="w-4 h-4 text-green-400" />
                      <span>Live market simulation</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                      <Zap className="w-4 h-4 text-green-400" />
                      <span>No API connections needed</span>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                  >
                    Start Simulation
                  </motion.button>

                  <div className="mt-4 text-center">
                    <motion.span
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full"
                    >
                      🔥 INVESTOR FAVORITE
                    </motion.span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-12"
          >
            <p className="text-gray-500 text-sm">
              Powered by advanced machine learning algorithms • Built with TypeScript & React
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}