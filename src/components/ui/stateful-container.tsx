// src/components/ui/stateful-container.tsx
import { LoaderCircle, AlertTriangle } from 'lucide-react';
import { ReactNode } from 'react';

interface StatefulContainerProps {
    isLoading: boolean;
    error: string | null;
    data: unknown[] | object | null | undefined;
    emptyStateMessage: string;
    children: ReactNode;
}

export function StatefulContainer({ isLoading, error, data, emptyStateMessage, children }: StatefulContainerProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64 text-white">
                <LoaderCircle className="animate-spin mr-3" size={24} />
                <span>Loading Data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center text-red-400 p-6 bg-red-900 bg-opacity-20 rounded-lg">
                <AlertTriangle className="mx-auto mb-2" size={32} />
                <h2 className="text-lg font-bold">Failed to Load Data</h2>
                <p>{error}</p>
            </div>
        );
    }

    const isEmpty = !data || (Array.isArray(data) && data.length === 0);

    if (isEmpty) {
        return (
            <div className="text-center text-gray-400 p-6 bg-gray-800 rounded-lg">
                <p>{emptyStateMessage}</p>
            </div>
        );
    }

    return <>{children}</>;
}
