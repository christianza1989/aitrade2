"use client";
import { useState, useEffect, useMemo } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { LoaderCircle, X } from 'lucide-react';

const ChartComponent = ({ type, data }: any) => {
    if (!data) return <p>No chart data available.</p>;
    switch (type) {
        case 'bar': return <Bar data={data} options={{ responsive: true }} />;
        case 'line': return <Line data={data} options={{ responsive: true }} />;
        case 'pie': return <Pie data={data} options={{ responsive: true }} />;
        default: return <p>Unsupported chart type.</p>;
    }
};

export function InsightModal({ insightId, onClose }: { insightId: string | null; onClose: () => void; }) {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        if (insightId) {
            setIsLoading(true);
            fetch(`/api/insights/${insightId}`)
                .then(res => res.json())
                .then(setData)
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [insightId]);

    const filteredTrades = useMemo(() => {
        if (!data?.analyzed_trades) return [];
        if (activeFilter === 'all') return data.analyzed_trades;
        if (activeFilter === 'profit') return data.analyzed_trades.filter((t: any) => t.outcome === 'profit');
        if (activeFilter === 'loss') return data.analyzed_trades.filter((t: any) => t.outcome === 'loss');
        // Ateityje galima pridėti filtravimą pagal kategorijas, jei jos bus duomenyse
        return data.analyzed_trades.filter((t: any) => t.narrative.includes(activeFilter));
    }, [data, activeFilter]);

    if (!insightId) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Insight Evidence</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
                </div>
                {isLoading ? (
                    <div className="flex-grow flex items-center justify-center"><LoaderCircle className="animate-spin" /></div>
                ) : (
                    <div className="flex-grow p-4 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-gray-800 p-4 rounded-md">
                            <h3 className="font-semibold mb-4">Visual Data</h3>
                            <ChartComponent type={data.chart_data?.chart_type} data={data.chart_data?.chart_data} />
                        </div>
                        <div className="bg-gray-800 p-4 rounded-md flex flex-col">
                            <h3 className="font-semibold mb-4">Analyzed Trades</h3>
                            <div className="mb-2 flex gap-2">
                                <Button size="sm" variant={activeFilter === 'all' ? 'default' : 'secondary'} onClick={() => setActiveFilter('all')}>All</Button>
                                <Button size="sm" variant={activeFilter === 'profit' ? 'default' : 'secondary'} onClick={() => setActiveFilter('profit')}>Profitable</Button>
                                <Button size="sm" variant={activeFilter === 'loss' ? 'default' : 'secondary'} onClick={() => setActiveFilter('loss')}>Losses</Button>
                            </div>
                            <div className="flex-grow overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Symbol</TableHead>
                                            <TableHead>Outcome</TableHead>
                                            <TableHead>P/L %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTrades.map((trade: any) => (
                                            <TableRow key={trade.id}>
                                                <TableCell>{trade.symbol}</TableCell>
                                                <TableCell className={trade.outcome === 'profit' ? 'text-green-400' : 'text-red-400'}>{trade.outcome}</TableCell>
                                                <TableCell>{trade.pnl_percent.toFixed(2)}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
