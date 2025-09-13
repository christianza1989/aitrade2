// src/components/FeedbackModal.tsx
"use client";

import { useState } from 'react';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    symbol: string;
}

export function FeedbackModal({ isOpen, onClose, onSubmit, symbol }: FeedbackModalProps) {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSubmit(reason);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md flex flex-col">
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Provide Feedback for {symbol}</h2>
                    <p className="text-sm text-gray-400 mt-1">Why are you closing this position? Your feedback helps the AI learn.</p>
                </div>
                <div className="p-6">
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g., 'Taking profits before CPI news', 'Project team seems unreliable', 'Spotted a bearish divergence on the 4h chart'..."
                        className="w-full bg-gray-800 rounded p-2 h-24 border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="p-4 border-t border-gray-700 flex justify-end gap-4">
                    <button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md">
                        Submit & Close Position
                    </button>
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
