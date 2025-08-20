// src/components/CatalystCalendarCard.tsx

import { IntelCard } from './IntelCard';
import { Calendar, Droplets } from 'lucide-react';
import { Badge } from './ui/badge';

interface Airdrop {
    project_name: string;
    start_date: string;
    status: string;
}

interface CatalystCalendarCardProps {
    airdrops: Airdrop[] | null;
}

export function CatalystCalendarCard({ airdrops }: CatalystCalendarCardProps) {
    return (
        <IntelCard title="Catalyst Calendar" icon={Calendar}>
             <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {!airdrops || airdrops.length === 0 ? (
                     <p className="text-gray-500 text-sm">No upcoming airdrops found.</p>
                ) : (
                    airdrops.map((airdrop) => (
                        <div key={airdrop.project_name} className="flex items-center justify-between text-sm bg-gray-800 p-2 rounded-md">
                            <div className="flex items-center">
                               <Droplets size={16} className="text-gray-500 mr-3" />
                               <div>
                                    <p className="font-semibold">{airdrop.project_name}</p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(airdrop.start_date).toLocaleDateString()}
                                    </p>
                               </div>
                            </div>
                            <Badge variant={airdrop.status === 'UPCOMING' ? 'success' : 'secondary'}>
                                {airdrop.status}
                            </Badge>
                        </div>
                    ))
                )}
            </div>
        </IntelCard>
    );
}