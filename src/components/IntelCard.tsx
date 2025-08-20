// src/components/IntelCard.tsx

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface IntelCardProps {
    title: string;
    icon: LucideIcon;
    children: ReactNode;
    className?: string;
}

export function IntelCard({ title, icon: Icon, children, className = '' }: IntelCardProps) {
    return (
        <div className={`bg-gray-900 text-white p-4 rounded-lg ${className}`}>
            <div className="flex items-center mb-4">
                <Icon size={20} className="text-blue-400 mr-3" />
                <h2 className="font-bold text-lg">{title}</h2>
            </div>
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );
}