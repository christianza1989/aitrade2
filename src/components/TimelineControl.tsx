// PATH: src/components/TimelineControl.tsx
"use client";

import { Button } from "./ui/button";
import { Play, Pause, Rewind } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface TimelineControlProps {
    cycleIds: string[];
    onCycleSelect: (cycleId: string) => void;
    onPlayPause: () => void;
    onReset: () => void;
    isPlaying: boolean;
    contextualLog: string[];
}

export const TimelineControl = ({ cycleIds, onCycleSelect, onPlayPause, onReset, isPlaying, contextualLog }: TimelineControlProps) => {
    return (
        <div className="bg-gray-900/50 p-4 border-t-2 border-gray-700 grid grid-cols-3 gap-6">
            <div className="col-span-1 space-y-2">
                <h3 className="font-semibold">Cycle Replay</h3>
                <select
                    onChange={(e) => onCycleSelect(e.target.value)}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                >
                    <option value="">Select a cycle to replay...</option>
                    {cycleIds.map(id => (
                        <option key={id} value={id}>
                            {id.substring(0, 8)}... ({new Date().toLocaleTimeString()})
                        </option>
                    ))}
                </select>
                <div className="flex gap-2">
                    <Button onClick={onPlayPause} size="icon">
                        {isPlaying ? <Pause /> : <Play />}
                    </Button>
                    <Button onClick={onReset} size="icon" variant="outline">
                        <Rewind />
                    </Button>
                </div>
            </div>
            <div className="col-span-2">
                <h3 className="font-semibold mb-2">Contextual Log</h3>
                <ScrollArea className="h-24 bg-gray-800 rounded-md p-2">
                    <div className="font-mono text-xs space-y-1">
                        {contextualLog.map((log, index) => <p key={index}>{log}</p>)}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};
