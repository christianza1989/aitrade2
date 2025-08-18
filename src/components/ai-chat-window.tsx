"use client";

import { useDashboard, AiChat } from '@/context/DashboardContext';
import { ScrollArea } from '@/components/ui/scroll-area';

export function AiChatWindow() {
    const { state } = useDashboard();

    const renderContent = (chat: AiChat) => {
        const response = chat.response as { summary?: string };
        if (chat.agent === 'System') {
            return (
                <div className="p-2 rounded bg-gray-700">
                    <p className="text-sm text-yellow-300">{response.summary}</p>
                </div>
            );
        }
        // Add more custom renderings for other agents or types if needed
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

    return (
        <div>
            <h2 className="font-bold text-lg mb-4">AI Communication Log</h2>
            <ScrollArea className="bg-gray-900 text-white p-4 rounded-lg h-[40vh]">
                <div className="space-y-4">
                    {state.aiChat.map((chat, index) => (
                        <div key={index}>
                            {renderContent(chat)}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
