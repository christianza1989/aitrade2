// src/components/ai-chat-window.tsx

"use client";

import { useState } from 'react';
import { useDashboard, AiChat } from '@/context/DashboardContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils'; // Utility for conditional classes

export function AiChatWindow() {
    const { state } = useDashboard();
    const [activeTab, setActiveTab] = useState<'full' | 'consultations'>('full');

    const renderContent = (chat: AiChat) => {
        const response = chat.response as { summary?: string };
        if (chat.agent === 'System') {
            return (
                <div className="p-2 rounded bg-gray-700">
                    <p className="text-sm text-yellow-300">{response.summary}</p>
                </div>
            );
        }
        return (
            <>
                <div className="p-2 rounded bg-gray-700">
                    <p className="font-bold text-blue-400">{chat.agent} Prompt:</p>
                    <pre className="text-xs whitespace-pre-wrap font-mono overflow-x-auto">{chat.prompt}</pre>
                </div>
                <div className="p-2 rounded bg-gray-600 mt-2">
                    <p className="font-bold text-green-400">{chat.agent} Response:</p>
                    <pre className="text-xs whitespace-pre-wrap font-mono overflow-x-auto">{JSON.stringify(chat.response, null, 2)}</pre>
                </div>
            </>
        );
    };

    const filteredChats = state.aiChat.filter(chat => {
        if (activeTab === 'consultations') {
            // This logic directly supports the "Agent Debates" feature from the strategic plan.
            // It filters for prompts where one agent is consulting another.
            return chat.prompt && chat.prompt.toLowerCase().includes('consult(');
        }
        return true; // 'full' tab shows all chats
    });

    const TabButton = ({ tabName, label }: { tabName: 'full' | 'consultations', label: string }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={cn(
                "px-4 py-1.5 text-sm font-semibold rounded-md transition-colors",
                activeTab === tabName
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            )}
        >
            {label}
        </button>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">AI Communication Log</h2>
                <div className="flex items-center space-x-2">
                    <TabButton tabName="full" label="Full Log" />
                    <TabButton tabName="consultations" label="Consultations" />
                </div>
            </div>
            <ScrollArea className="bg-gray-900 text-white p-4 rounded-lg h-[40vh]">
                {filteredChats.length > 0 ? (
                    <div className="space-y-4">
                        {filteredChats.map((chat, index) => (
                            <div key={index}>
                                {renderContent(chat)}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">No consultations logged in this cycle yet.</p>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}