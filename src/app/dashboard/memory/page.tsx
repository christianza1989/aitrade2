// src/app/dashboard/memory/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Search, BrainCircuit, UserSquare, Bot, X } from 'lucide-react'; // Pridėk ikonas
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge'; // TEISINGAI
import { Button } from '@/components/ui/button'; // Pridėk Button importą
import { Input } from '@/components/ui/input'; // Pridėk Input importą
import { cn, formatDateTime } from '@/lib/utils'; // Importuok cn ir formatDateTime

interface Memory {
    id: string;
    symbol: string;
    outcome: 'profit' | 'loss';
    pnl_percent: number;
    narrative: string;
    timestamp: string;
    similarity?: number;
    source: 'AI' | 'HUMAN'; // Pridėk source
}

export default function MemoryPage() {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSemanticSearch, setIsSemanticSearch] = useState(false);
    const [sourceFilter, setSourceFilter] = useState<'all' | 'AI' | 'HUMAN'>('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            let response;
            if (isSemanticSearch && searchQuery.trim()) {
                response = await fetch('/api/memory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: searchQuery, page: page.toString() }),
                });
            } else {
                const params = new URLSearchParams({ narrativeQuery: searchQuery, page: page.toString() });
                if (sourceFilter !== 'all') {
                    params.append('source', sourceFilter); // Pridėk filtrą
                }
                response = await fetch(`/api/memory?${params.toString()}`);
            }

            if (!response.ok) throw new Error('Failed to fetch data.');

            const result = await response.json();
            setMemories(result.data);
            setTotalPages(result.pagination.totalPages);
        } catch (error) {
            toast.error("Could not load trade memories.");
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, isSemanticSearch, sourceFilter, page]); // Pridėk sourceFilter ir page prie priklausomybių

    useEffect(() => {
        fetchData();
    }, [page, isSemanticSearch, sourceFilter, fetchData]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData();
    };

    const getOutcomeVariant = (outcome: string) => {
        if (outcome === 'profit') return 'default';
        if (outcome === 'loss') return 'destructive';
        return 'secondary';
    };

    return (
        <div className="text-white p-6 space-y-6">
            <h1 className="text-3xl font-bold flex items-center">
                <BrainCircuit className="mr-3 text-blue-400" size={32} />
                Trade Memory Explorer
            </h1>

            <div className="bg-gray-800 p-4 rounded-lg">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-grow">
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by narrative or ask a question for semantic search..."
                            className="pr-10"
                        />
                        {searchQuery && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                onClick={() => setSearchQuery('')}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                         <label className="flex items-center space-x-2 cursor-pointer text-sm">
                            <input
                                type="checkbox"
                                checked={isSemanticSearch}
                                onChange={() => setIsSemanticSearch(!isSemanticSearch)}
                                className="bg-gray-700 rounded h-5 w-5 text-blue-500 focus:ring-blue-500 border-gray-600"
                            />
                            <span>Semantic Search</span>
                        </label>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center">
                            <Search size={18} className="mr-2" />
                            Search
                        </button>
                    </div>
                </form>

                {/* NAUJI FILTRŲ MYGTUKAI */}
                <div className="flex items-center gap-2 border-t border-gray-700 pt-4">
                    <span className="text-sm font-medium text-gray-400">Filter by Source:</span>
                    <button onClick={() => setSourceFilter('all')} className={cn("px-3 py-1 text-xs rounded-full", sourceFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600')}>All</button>
                    <button onClick={() => setSourceFilter('AI')} className={cn("px-3 py-1 text-xs rounded-full", sourceFilter === 'AI' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600')}>AI Decisions</button>
                    <button onClick={() => setSourceFilter('HUMAN')} className={cn("px-3 py-1 text-xs rounded-full", sourceFilter === 'HUMAN' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600')}>Human Lessons</button>
                </div>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <p>Loading memories...</p>
                ) : memories.length === 0 ? (
                    <p>No memories found matching your criteria.</p>
                ) : (
                    memories.map(mem => (
                        <div key={mem.id} className={cn(
                            "bg-gray-800 p-4 rounded-lg border-l-4",
                            mem.source === 'HUMAN' ? 'border-purple-500' : 'border-gray-600'
                        )}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="font-bold text-lg text-blue-400 flex items-center">
                                        {mem.source === 'HUMAN'
                                            ? <UserSquare size={20} className="mr-2 text-purple-400" />
                                            : <Bot size={20} className="mr-2 text-gray-500" />}
                                        {mem.symbol}
                                    </span>
                                    <Badge variant={getOutcomeVariant(mem.outcome)} className="ml-3">
                                        {mem.outcome.charAt(0).toUpperCase() + mem.outcome.slice(1)} ({mem.pnl_percent.toFixed(2)}%)
                                    </Badge>
                                </div>
                                <div className="text-right">
                                    {mem.similarity && (
                                        <p className="text-xs text-green-400">Similarity: {mem.similarity.toFixed(2)}</p>
                                    )}
                                    <p className="text-xs text-gray-400">{formatDateTime(mem.timestamp)}</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{mem.narrative}</p>
                        </div>
                    ))
                )}
            </div>

            <div className="flex justify-center items-center gap-4 mt-6">
                <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    Previous
                </Button>
                <span className="text-sm">Page {page} of {totalPages}</span>
                <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Next
                </Button>
            </div>
        </div>
    );
}
