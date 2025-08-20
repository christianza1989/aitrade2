// src/components/how-it-works/TimelineStep.tsx

import { LucideIcon } from 'lucide-react';

interface TimelineStepProps {
    icon: LucideIcon;
    title: string;
    description: string;
    isLast?: boolean;
}

export function TimelineStep({ icon: Icon, title, description, isLast = false }: TimelineStepProps) {
    return (
        <div className="relative flex items-start">
            {!isLast && <div className="absolute left-6 top-12 -bottom-6 w-px bg-gray-700"></div>}
            <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                    <Icon className="text-blue-400" size={24} />
                </div>
            </div>
            <div className="ml-6">
                <h4 className="text-lg font-semibold">{title}</h4>
                <p className="mt-1 text-gray-400 text-sm">{description}</p>
            </div>
        </div>
    );
}