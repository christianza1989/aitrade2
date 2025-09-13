// src/components/ApiKeyManagerModal.tsx
"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Plus, Trash2, KeyRound } from 'lucide-react';

interface ApiKey {
    id: string;
    name: string;
    key: string;
    isActive: boolean;
}

interface ApiKeyManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ApiKeyManagerModal({ isOpen, onClose }: ApiKeyManagerModalProps) {
    const [keys, setKeys] = useState<Partial<ApiKey>[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchKeys = async () => {
                setIsLoading(true);
                try {
                    const response = await fetch('/api/settings/api-keys');
                    if (response.ok) {
                        const data = await response.json();
                        setKeys(data);
                    } else {
                        toast.error('Could not load API keys.');
                    }
                } catch (error) {
                    toast.error('Failed to fetch API keys.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchKeys();
        }
    }, [isOpen]);

    const handleSave = async () => {
        setIsLoading(true);
        const toastId = toast.loading('Saving API keys...');
        try {
            // Filtruojame tuščius raktus prieš siunčiant
            const validKeys = keys.filter(k => k.name && k.key && k.key.length > 4); // Patikriname ir ilgesnį nei "..."
            
            const response = await fetch('/api/settings/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validKeys),
            });

            if (response.ok) {
                toast.success('API keys saved successfully!', { id: toastId });
                onClose();
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save API keys.');
            }
        } catch (error) {
            toast.error((error as Error).message, { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyChange = (index: number, field: 'name' | 'key', value: string) => {
        const newKeys = [...keys];
        newKeys[index] = { ...newKeys[index], [field]: value };
        setKeys(newKeys);
    };

    const addKey = () => {
        setKeys([...keys, { name: '', key: '' }]);
    };

    const removeKey = (index: number) => {
        const newKeys = keys.filter((_, i) => i !== index);
        setKeys(newKeys);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold flex items-center"><KeyRound className="mr-3 text-blue-400" /> Manage API Keys</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto">
                    {isLoading ? <p>Loading...</p> : (
                        keys.map((key, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <input
                                    type="text"
                                    placeholder="Key Name (e.g., 'Main Key')"
                                    value={key.name || ''}
                                    onChange={(e) => handleKeyChange(index, 'name', e.target.value)}
                                    className="bg-gray-800 rounded p-2 w-1/3 border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="API Key Value"
                                    value={key.key || ''}
                                    onChange={(e) => handleKeyChange(index, 'key', e.target.value)}
                                    className="bg-gray-800 rounded p-2 w-2/3 border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button onClick={() => removeKey(index)} className="p-2 text-red-400 hover:text-red-300">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))
                    )}
                    <button onClick={addKey} className="flex items-center text-sm text-blue-400 hover:text-blue-300">
                        <Plus size={16} className="mr-2" /> Add New Key
                    </button>
                </div>

                <div className="p-4 border-t border-gray-700 mt-auto flex justify-end">
                    <button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md disabled:opacity-50">
                        {isLoading ? 'Saving...' : 'Save Keys'}
                    </button>
                </div>
            </div>
        </div>
    );
}
