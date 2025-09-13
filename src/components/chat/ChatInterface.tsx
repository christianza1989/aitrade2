// PATH: src/components/chat/ChatInterface.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Send, Bot, User, BellRing } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { InsightModal } from '../InsightModal';
import { BookOpen } from 'lucide-react';

type Message = {
    sender: 'user' | 'ai';
    text: string;
    responseType?: 'text' | 'confirmation_required';
    actionPlanId?: string;
    isProactive?: boolean;
    suggested_tool_chain?: any[] | null; // <-- NAUJAS
    insightId?: string | null; // <-- NAUJAS
};

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Automatiškai slinkti žemyn, kai atsiranda nauja žinutė
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        const eventSource = new EventSource('/api/notifications/stream');

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'proactive_insight') {
                    const proactiveMessage: Message = {
                        sender: 'ai',
                        text: data.message,
                        isProactive: true,
                        suggested_tool_chain: data.data?.suggested_tool_chain, // <-- NAUJAS
                        insightId: data.data?.insightId // <-- NAUJAS
                    };
                    setMessages(prev => [...prev, proactiveMessage]);
                    toast.success('You have a new AI insight!', { icon: '💡' });
                }
            } catch (e) {
                console.error("Failed to parse SSE message:", e);
            }
        };

        eventSource.onerror = (err) => {
            console.error("EventSource failed:", err);
            eventSource.close();
        };

        // Cleanup funkcija
        return () => {
            eventSource.close();
        };
    }, []); // Tuščias masyvas užtikrina, kad pasileis tik vieną kartą

    // Pridėti naują funkciją mygtuko paspaudimui
    const handleConfirmAction = async (planId: string) => {
        setPendingAction(null); // Paslėpti mygtukus iškart
        setMessages(prev => [...prev, { sender: 'ai', text: "Executing your request..." }]);
        try {
            const res = await fetch('/api/chat/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actionPlanId: planId }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Execution failed.");

            setMessages(prev => [...prev, { sender: 'ai', text: result.message }]);
        } catch (error) {
            setMessages(prev => [...prev, { sender: 'ai', text: `Execution Error: ${(error as Error).message}` }]);
        }
    };

    const handleTakeAction = async (toolChain: any[]) => {
        toast.loading('Executing AI suggestion...');
        // Ši logika ateityje kvies API, kuris įvykdys `tool_chain`
        // Kol kas, mes tiesiog parodysime patvirtinimą
        console.log("Executing tool chain:", toolChain);
        setTimeout(() => {
            toast.success('AI suggestion has been executed!');
            const executionMessage: Message = {
                sender: 'ai',
                text: `I have successfully executed the following action: ${toolChain[0].tool_name} with parameters ${JSON.stringify(toolChain[0].parameters)}.`
            };
            setMessages(prev => [...prev, executionMessage]);
        }, 1500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input, conversationId }),
            });

            if (res.status !== 202) {
                throw new Error("Failed to submit command.");
            }

            const { jobId, conversationId: newConvId } = await res.json();
            if (!conversationId) setConversationId(newConvId);

            // Pradedame periodiškai tikrinti būseną
            const interval = setInterval(async () => {
                const statusRes = await fetch(`/api/chat/status/${jobId}`);
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    if (statusData.status === 'COMPLETED') {
                        clearInterval(interval);
                        const { response, responseType, actionPlanId } = statusData.data;
                        const aiMessage: Message = { sender: 'ai', text: response, responseType, actionPlanId };
                        if (responseType === 'confirmation_required') {
                            setPendingAction(actionPlanId);
                        }
                        setMessages(prev => [...prev, aiMessage]);
                        setIsLoading(false);
                    } else if (statusData.status === 'FAILED') {
                        clearInterval(interval);
                        const aiMessage: Message = { sender: 'ai', text: `Sorry, an error occurred: ${statusData.error}` };
                        setMessages(prev => [...prev, aiMessage]);
                        setIsLoading(false);
                    }
                } else {
                    clearInterval(interval);
                    throw new Error("Failed to get job status.");
                }
            }, 2000); // Tikriname kas 2 sekundes

        } catch (error) {
            const errorMessage = (error as Error).message;
            setMessages(prev => [...prev, { sender: 'ai', text: `Error: ${errorMessage}` }]);
            setIsLoading(false);
        }
    };

    return (
        <Card className="flex flex-col h-[80vh]">
            <CardHeader>
                <CardTitle>AI Assistant</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
                <ScrollArea className="h-full" ref={scrollAreaRef}>
                    <div className="space-y-4 pr-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={cn("flex flex-col items-start gap-3", msg.sender === 'user' ? "items-end" : "")}>
                                <div className={cn("flex items-start gap-3", msg.sender === 'user' ? "justify-end" : "")}>
                                    {msg.sender === 'ai' && <Bot className="h-6 w-6 text-blue-400 flex-shrink-0" />}
                                    <div className={cn("rounded-lg px-4 py-2 max-w-sm",
                                        msg.sender === 'ai' ? (msg.isProactive ? "bg-yellow-900/50 border border-yellow-700" : "bg-gray-700") : "bg-blue-600 text-white"
                                    )}>
                                        {msg.isProactive && (
                                            <div className="flex items-center gap-2 text-xs text-yellow-400 mb-2">
                                                <BellRing className="h-4 w-4" />
                                                <span>Proactive Insight</span>
                                            </div>
                                        )}
                                        <p className="text-sm">{msg.text}</p>
                                    </div>
                                    {msg.sender === 'user' && <User className="h-6 w-6 text-gray-400 flex-shrink-0" />}
                                </div>
                                {msg.responseType === 'confirmation_required' && msg.actionPlanId === pendingAction && (
                                    <div className="mt-2 flex gap-2">
                                        <Button size="sm" onClick={() => handleConfirmAction(msg.actionPlanId!)}>Confirm</Button>
                                        <Button size="sm" variant="outline" onClick={() => setPendingAction(null)}>Cancel</Button>
                                    </div>
                                )}

                                {/* NAUJAS BLOKAS MYGTUKUI */}
                                {msg.suggested_tool_chain && (
                                    <div className="mt-2">
                                        <Button size="sm" onClick={() => handleTakeAction(msg.suggested_tool_chain!)}>
                                            Take Action
                                        </Button>
                                    </div>
                                )}

                                {/* NAUJAS BLOKAS MYGTUKUI */}
                                {msg.insightId && (
                                    <div className="mt-2">
                                        <Button size="sm" variant="outline" onClick={() => setSelectedInsightId(msg.insightId!)}>
                                            <BookOpen className="h-4 w-4 mr-2"/>
                                            Show Evidence
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                         {isLoading && (
                            <div className="flex items-start gap-3">
                                <Bot className="h-6 w-6 text-blue-400 flex-shrink-0" />
                                <div className="rounded-lg px-4 py-2 bg-gray-700">
                                    <div className="flex items-center space-x-2">
                                        <span className="h-2 w-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                        <span className="h-2 w-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                        <span className="h-2 w-2 bg-blue-400 rounded-full animate-pulse"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            <div className="p-4 border-t">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me to analyze a symbol..."
                        disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
            <InsightModal insightId={selectedInsightId} onClose={() => setSelectedInsightId(null)} />
        </Card>
    );
}
