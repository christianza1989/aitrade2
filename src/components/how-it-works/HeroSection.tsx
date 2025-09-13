"use client";

import { motion } from 'framer-motion';
import { Brain, Zap, TrendingUp, Shield, Sparkles, ArrowDown, Play } from 'lucide-react';

export function HeroSection() {
    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen flex items-center">
            {/* Enhanced Background Pattern */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.08'%3E%3Ccircle cx='40' cy='40' r='3'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />
            </div>

            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        x: [0, -80, 0],
                        y: [0, 60, 0],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        x: [0, 120, 0],
                        y: [0, -40, 0],
                    }}
                    transition={{
                        duration: 30,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"
                />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="mb-10"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-8 backdrop-blur-sm"
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            >
                                <Sparkles className="w-5 h-5 text-purple-400 mr-3" />
                            </motion.div>
                            <span className="text-purple-300 text-sm font-semibold tracking-wide">NEXT-GENERATION AI TRADING</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="text-6xl md:text-8xl font-black text-white mb-8 leading-tight"
                        >
                            Meet the{" "}
                            <motion.span
                                initial={{ opacity: 0, backgroundPosition: "0% 50%" }}
                                animate={{ opacity: 1, backgroundPosition: "100% 50%" }}
                                transition={{ duration: 2, delay: 0.6 }}
                                className="block bg-gradient-to-r from-purple-400 via-pink-400 via-cyan-400 to-purple-600 bg-clip-text text-transparent bg-[length:200%_200%]"
                            >
                                Lucid Hive
                            </motion.span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.8 }}
                            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-5xl mx-auto leading-relaxed font-light"
                        >
                            Experience the future of autonomous trading where{" "}
                            <span className="text-purple-400 font-semibold">specialized AI agents</span>{" "}
                            collaborate in perfect harmony, continuously learning and evolving to maximize your returns through intelligent market adaptation.
                        </motion.p>
                    </motion.div>

                    {/* Enhanced Key Features */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
                    >
                        {[
                            {
                                icon: Zap,
                                title: "Real-time Analysis",
                                description: "Continuous market monitoring with instant signal processing",
                                color: "from-yellow-400 to-orange-500",
                                delay: 0.1
                            },
                            {
                                icon: Brain,
                                title: "Multi-Agent Intelligence",
                                description: "Specialized AI agents collaborating for superior decisions",
                                color: "from-blue-400 to-cyan-500",
                                delay: 0.2
                            },
                            {
                                icon: TrendingUp,
                                title: "Adaptive Learning",
                                description: "Self-improving algorithms that evolve with market conditions",
                                color: "from-green-400 to-emerald-500",
                                delay: 0.3
                            },
                            {
                                icon: Shield,
                                title: "Risk Management",
                                description: "Intelligent risk assessment and dynamic position sizing",
                                color: "from-red-400 to-pink-500",
                                delay: 0.4
                            }
                        ].map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 1.2 + feature.delay }}
                                whileHover={{ y: -5, scale: 1.02 }}
                                className="group relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                                <div className="relative bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 group-hover:border-white/20 transition-all duration-300 h-full">
                                    <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                        <feature.icon className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors duration-300">
                                        {feature.title}
                                    </h3>
                                    <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                                        {feature.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Enhanced CTA Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 1.8 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-6"
                    >
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="group relative px-10 py-5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:from-purple-500 hover:via-pink-500 hover:to-purple-600 text-white font-bold text-lg rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-purple-500/50 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative flex items-center">
                                <Play className="w-6 h-6 mr-3" />
                                Explore Live System
                            </div>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-8 py-5 border-2 border-white/20 hover:border-white/40 text-white font-semibold text-lg rounded-2xl backdrop-blur-sm transition-all duration-300 hover:bg-white/10"
                        >
                            View Performance
                        </motion.button>
                    </motion.div>

                    {/* Trust Indicators */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 2.2 }}
                        className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-400"
                    >
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                            <span>System Online</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
                            <span>12 Active Agents</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-purple-400 rounded-full mr-3"></div>
                            <span>Continuous Learning</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Enhanced Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 2.5 }}
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="flex flex-col items-center cursor-pointer group"
                >
                    <span className="text-gray-400 text-sm mb-2 group-hover:text-white transition-colors duration-300">
                        Scroll to explore
                    </span>
                    <div className="w-8 h-12 border-2 border-white/30 rounded-full flex justify-center group-hover:border-white/50 transition-colors duration-300">
                        <motion.div
                            animate={{ y: [0, 16, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="w-1 h-3 bg-white/60 rounded-full mt-2"
                        />
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
