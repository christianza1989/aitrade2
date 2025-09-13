// src/components/market-table.tsx
"use client";

import { useDashboard } from '@/context/DashboardContext';
import { Ticker } from '@/core/binance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

// Funkcija, kuri formatuoja kainą priklausomai nuo jos dydžio
const formatPrice = (price: string) => {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) return 'N/A';

    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    };

    if (priceNum < 0.01) {
        options.maximumFractionDigits = 6;
    } else if (priceNum < 10) {
        options.maximumFractionDigits = 4;
    } else {
        options.maximumFractionDigits = 2;
    }
    
    return priceNum.toLocaleString('en-US', options);
}

export function MarketTable() {
    const { state, dispatch } = useDashboard();

    const handleRowClick = (symbol: string) => {
        dispatch({ type: 'SET_SELECTED_SYMBOL', payload: symbol });
    };

    return (
        <Card id="market-scanner-card">
            <CardHeader>
                <CardTitle>Market Scanner</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[70vh]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Symbol</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Change (24h)</TableHead>
                                <TableHead className="text-right">Volume (24h)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {state.marketData.map((ticker: Ticker) => (
                                <TableRow
                                    key={ticker.symbol}
                                    className={`cursor-pointer ${state.selectedSymbol === ticker.symbol ? 'bg-muted/50' : ''}`}
                                    onClick={() => handleRowClick(ticker.symbol)}
                                >
                                    <TableCell className="font-medium">{ticker.symbol}</TableCell>
                                    <TableCell className="text-right font-mono">{formatPrice(ticker.lastPrice)}</TableCell>
                                    <TableCell className={`text-right font-mono ${parseFloat(ticker.priceChangePercent) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {parseFloat(ticker.priceChangePercent).toFixed(2)}%
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-muted-foreground">${(parseFloat(ticker.quoteVolume) / 1_000_000).toFixed(2)}M</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
