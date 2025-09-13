// src/components/how-it-works/DataFlowLine.tsx
import { motion } from 'framer-motion';

interface DataFlowLineProps {
    fromPos: { x: number; y: number };
    toPos: { x: number; y: number };
    isActive: boolean;
}

export function DataFlowLine({ fromPos, toPos, isActive }: DataFlowLineProps) {
    // Apskaičiuojame linijos kelią
    const path = `M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`;

    const pathVariants = {
      initial: { pathLength: 0, stroke: '#3b82f6' }, // blue-500
      animate: { pathLength: 1, stroke: '#60a5fa' }, // blue-400
      exit: { pathLength: 1, stroke: '#374151' },    // gray-700
    };

    return (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
            <path
                d={path}
                strokeWidth="2"
                stroke="#374151" // Fono linija
            />
            {isActive && (
                <motion.path
                    d={path}
                    strokeWidth="2.5"
                    variants={pathVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{
                        default: { duration: 1.5, ease: "easeInOut" },
                        stroke: { duration: 0.1 }
                    }}
                />
            )}
        </svg>
    );
}
