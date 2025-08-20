// src/components/how-it-works/FeatureCard.tsx

import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    isNextGen?: boolean;
}

export function FeatureCard({ icon: Icon, title, description, isNextGen = false }: FeatureCardProps) {
    return (
        <div className={`bg-gray-900 p-6 rounded-lg border-l-4 ${isNextGen ? 'border-purple-500' : 'border-blue-500'}`}>
            <div className="flex items-center mb-3">
                <Icon className={`mr-4 ${isNextGen ? 'text-purple-400' : 'text-blue-400'}`} size={28} />
                <h3 className="text-xl font-bold">{title}</h3>
            </div>
            <p className="text-gray-400 text-sm">
                {description}
            </p>
        </div>
    );
}