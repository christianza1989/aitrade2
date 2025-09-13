'use client';

import React, { useCallback } from 'react';
import Particles from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Container, Engine } from '@tsparticles/engine';

interface ParticlesBackgroundProps {
  className?: string;
  density?: number;
  speed?: number;
  theme?: 'default' | 'crypto' | 'ai';
}

export function ParticlesBackground({ 
  className = '',
  density = 80,
  speed = 0.5,
  theme = 'crypto'
}: ParticlesBackgroundProps) {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  const particlesLoaded = useCallback(async (container: Container | undefined) => {
    // Particles loaded callback
  }, []);

  const getThemeConfig = () => {
    switch (theme) {
      case 'ai':
        return {
          primary: '#06b6d4', // cyan
          secondary: '#8b5cf6', // purple
          tertiary: '#f59e0b', // amber
          background: 'radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.3) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(245, 158, 11, 0.2) 0%, transparent 50%)'
        };
      case 'crypto':
        return {
          primary: '#10b981', // emerald
          secondary: '#f59e0b', // amber
          tertiary: '#ef4444', // red
          background: 'radial-gradient(circle at 25% 25%, rgba(16, 185, 129, 0.2) 0%, transparent 70%), radial-gradient(circle at 75% 75%, rgba(245, 158, 11, 0.2) 0%, transparent 70%)'
        };
      default:
        return {
          primary: '#06b6d4',
          secondary: '#8b5cf6', 
          tertiary: '#f59e0b',
          background: 'radial-gradient(circle at 30% 70%, rgba(6, 182, 212, 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(139, 92, 246, 0.3) 0%, transparent 50%)'
        };
    }
  };

  const themeConfig = getThemeConfig();

  return (
    <div className={`fixed inset-0 ${className}`} style={{ background: themeConfig.background }}>
      <Particles
        id="tsparticles"
        init={particlesInit}
        loaded={particlesLoaded}
        options={{
          background: {
            color: {
              value: "transparent",
            },
          },
          fpsLimit: 60,
          interactivity: {
            events: {
              onClick: {
                enable: true,
                mode: "push",
              },
              onHover: {
                enable: true,
                mode: "repulse",
              },
              resize: true,
            },
            modes: {
              push: {
                quantity: 4,
              },
              repulse: {
                distance: 100,
                duration: 0.4,
              },
            },
          },
          particles: {
            color: {
              value: [themeConfig.primary, themeConfig.secondary, themeConfig.tertiary],
            },
            links: {
              color: themeConfig.primary,
              distance: 150,
              enable: true,
              opacity: 0.3,
              width: 1,
              triangles: {
                enable: true,
                opacity: 0.05
              }
            },
            collisions: {
              enable: false,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: {
                default: "bounce",
              },
              random: true,
              speed: speed,
              straight: false,
            },
            number: {
              density: {
                enable: true,
                area: 1000,
              },
              value: density,
            },
            opacity: {
              value: { min: 0.1, max: 0.6 },
              animation: {
                enable: true,
                speed: 1,
                minimumValue: 0.1,
                sync: false
              }
            },
            shape: {
              type: ["circle", "triangle", "polygon"],
              options: {
                polygon: {
                  nb_sides: 6
                }
              }
            },
            size: {
              value: { min: 1, max: 3 },
              animation: {
                enable: true,
                speed: 2,
                minimumValue: 0.5,
                sync: false
              }
            },
            twinkle: {
              particles: {
                enable: true,
                frequency: 0.05,
                opacity: 1,
                color: {
                  value: themeConfig.tertiary
                }
              }
            }
          },
          detectRetina: true,
        }}
        className="absolute inset-0 z-0"
      />
      
      {/* Additional gradient overlay for depth */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(0, 0, 0, 0.7) 0%, 
              rgba(0, 0, 0, 0.4) 40%, 
              rgba(0, 0, 0, 0.6) 100%
            ),
            radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)
          `
        }}
      />
    </div>
  );
}