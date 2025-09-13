// src/components/AgentIcon.tsx
"use client";

import React from 'react';
import {
    Activity, MessageSquare, Spline, Shield, Coins, Briefcase,
    Blocks, Users, Radar, BrainCircuit, Crown, Zap, HelpCircle, LucideProps
} from 'lucide-react';
import { cn } from '../lib/utils'; // Assuming cn utility is available

export type IconName = 'Activity' | 'MessageSquare' | 'Spline' | 'Shield' | 'Coins' | 'Briefcase' | 'Blocks' | 'Users' | 'Radar' | 'BrainCircuit' | 'Crown' | 'Zap';

const IconMap: Record<IconName, React.ElementType> = {
    Activity, MessageSquare, Spline, Shield, Coins, Briefcase, Blocks, Users, Radar, BrainCircuit, Crown, Zap
};

interface AgentIconProps extends LucideProps {
    name: IconName;
}

export const AgentIcon = ({ name, ...props }: AgentIconProps) => {
    const IconComponent = IconMap[name] || HelpCircle;
    return <IconComponent {...props} />;
};
