// src/components/GainersLosersCard.tsx

import { IntelCard } from './IntelCard';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Mover {
    symbol: string;
    quote: {
        USD: {
            percent_change_24h: number;
        }
    }
}

interface GainersLosersCardProps {
    movers: {
        gainers: Mover[] | null;
        losers: Mover[] | null;
    } | null;
}

const TickerList = ({ title, data, icon: Icon, colorClass }: { title: string, data: Mover[], icon: any, colorClass: string }) => (
    <div>
        <h3 className="font-semibold mb-2 flex items-center">
            <Icon size={18} className={`mr-2 ${colorClass}`} />
            {title}
        </h3>
        <ul className="space-y-2 text-sm">
            {data.map(item => (
                <li key={item.symbol} className="flex justify-between bg-gray-800 p-1.5 rounded">
                    <span className="font-bold">{item.symbol}</span>
                    <span className={colorClass}>{item.quote.USD.percent_change_24h.toFixed(1)}%</span>
                </li>
            ))}
        </ul>
    </div>
);

export function GainersLosersCard({ movers }: GainersLosersCardProps) {
    const hasData = movers && movers.gainers && movers.losers;

    return (
        <IntelCard title="Daily Movers" icon={ArrowUpRight} className="col-span-1 md:col-span-2">
            {!hasData ? (
                 <p className="text-gray-500 text-sm">Could not load daily movers data.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <TickerList title="Top Gainers" data={movers.gainers!} icon={ArrowUpRight} colorClass="text-green-400" />
                    <TickerList title="Top Losers" data={movers.losers!} icon={ArrowDownRight} colorClass="text-red-400" />
                </div>
            )}
        </IntelCard>
    );
}