'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassmorphCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'premium' | 'luxury' | 'neon';
  hover?: boolean;
  glow?: boolean;
  border?: boolean;
}

export function GlassmorphCard({ 
  children, 
  className = '', 
  variant = 'default',
  hover = true,
  glow = true,
  border = true
}: GlassmorphCardProps) {
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'premium':
        return {
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: border ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          boxShadow: glow ? `
            0 8px 32px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 0 60px rgba(6, 182, 212, 0.1)
          ` : '0 8px 32px rgba(0, 0, 0, 0.3)'
        };
      
      case 'luxury':
        return {
          background: `
            linear-gradient(135deg, 
              rgba(255, 255, 255, 0.05) 0%, 
              rgba(255, 255, 255, 0.01) 100%
            ),
            radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.05) 0%, transparent 50%)
          `,
          backdropFilter: 'blur(25px) saturate(200%) brightness(110%)',
          border: border ? `1px solid transparent` : 'none',
          borderImage: border ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(139, 92, 246, 0.3)) 1' : 'none',
          boxShadow: glow ? `
            0 12px 40px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            0 0 80px rgba(6, 182, 212, 0.15),
            0 0 120px rgba(139, 92, 246, 0.1)
          ` : '0 12px 40px rgba(0, 0, 0, 0.4)'
        };
      
      case 'neon':
        return {
          background: `
            linear-gradient(135deg, 
              rgba(6, 182, 212, 0.08) 0%, 
              rgba(139, 92, 246, 0.08) 100%
            ),
            rgba(0, 0, 0, 0.2)
          `,
          backdropFilter: 'blur(30px) saturate(150%) contrast(120%)',
          border: border ? '2px solid transparent' : 'none',
          borderImage: border ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.5), rgba(139, 92, 246, 0.5), rgba(245, 158, 11, 0.5)) 1' : 'none',
          boxShadow: glow ? `
            0 0 30px rgba(6, 182, 212, 0.3),
            0 0 60px rgba(139, 92, 246, 0.2),
            0 8px 32px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          ` : '0 8px 32px rgba(0, 0, 0, 0.5)'
        };
      
      default:
        return {
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(15px) saturate(150%)',
          border: border ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
          boxShadow: glow ? `
            0 4px 24px rgba(0, 0, 0, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.08)
          ` : '0 4px 24px rgba(0, 0, 0, 0.25)'
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <motion.div
      className={cn("rounded-2xl overflow-hidden", className)}
      style={variantStyles}
      whileHover={hover ? {
        scale: 1.02,
        y: -4,
        boxShadow: variant === 'neon' 
          ? `
            0 0 40px rgba(6, 182, 212, 0.4),
            0 0 80px rgba(139, 92, 246, 0.3),
            0 12px 40px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.3)
          `
          : variant === 'luxury'
          ? `
            0 16px 50px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            0 0 100px rgba(6, 182, 212, 0.2),
            0 0 140px rgba(139, 92, 246, 0.15)
          `
          : `
            0 8px 35px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 0 80px rgba(6, 182, 212, 0.15)
          `
      } : {}}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        mass: 0.8 
      }}
    >
      {/* Inner glow effect */}
      {glow && variant !== 'default' && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}