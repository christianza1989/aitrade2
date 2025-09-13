"use client";
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { HelpCircle, LoaderCircle } from 'lucide-react';

export function ContextualHelp({ topicId }: { topicId: string }) {
    const [explanation, setExplanation] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchExplanation = async () => {
        if (explanation) return; // Jau užkrauta
        setIsLoading(true);
        try {
            const res = await fetch(`/api/help/${topicId}`);
            const data = await res.json();
            setExplanation(data.explanation || "No explanation found.");
        } catch {
            setExplanation("Could not load help content.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Popover onOpenChange={(open) => open && fetchExplanation()}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-1">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
                {isLoading ? <LoaderCircle className="animate-spin" /> : <p className="text-sm">{explanation}</p>}
            </PopoverContent>
        </Popover>
    );
}
