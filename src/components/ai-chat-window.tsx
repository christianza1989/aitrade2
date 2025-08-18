"use client";

import { useDashboard } from '@/context/DashboardContext';

export function AiChatWindow() {
    const { state } = useDashboard();

    return (
        <div className="bg-gray-900 text-white p-4 rounded-lg h-[40vh] overflow-y-auto">
            <h2 className="font-bold text-lg mb-4">AI Communication Log</h2>
            {state.aiChat.map((chat, index) => (
                <div key={index} className="mb-4">
                    <div className="p-2 rounded bg-gray-700">
                        <p className="font-bold text-blue-400">{chat.agent} Prompt:</p>
                        <pre className="text-sm whitespace-pre-wrap font-mono">{chat.prompt}</pre>
                    </div>
                    <div className="p-2 rounded bg-gray-600 mt-2">
                        <p className="font-bold text-green-400">{chat.agent} Response:</p>
                        <pre className="text-sm whitespace-pre-wrap font-mono">{JSON.stringify(chat.response, null, 2)}</pre>
                    </div>
                </div>
            ))}
        </div>
    );
}
