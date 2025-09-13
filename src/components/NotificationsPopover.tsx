"use client";

import { Button } from './ui/button';
import { Bell, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Notification } from '@prisma/client';
import Link from 'next/link';
import { useState } from 'react';
import { formatDateTime } from '@/lib/utils';

interface NotificationsPopoverProps {
    notifications: Notification[];
    unreadCount: number;
    onOpen: () => void;
}

const PriorityIcon = ({ priority }: { priority: string }) => {
    switch (priority) {
        case 'SUCCESS': return <CheckCircle className="text-green-500" />;
        case 'CRITICAL': return <AlertTriangle className="text-red-500" />;
        case 'WARNING': return <XCircle className="text-yellow-500" />;
        default: return <Info className="text-blue-500" />;
    }
};

export const NotificationsPopover = ({ notifications, unreadCount, onOpen }: NotificationsPopoverProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleClick = () => {
        if (!isOpen) {
            onOpen();
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative">
            <Button variant="outline" size="icon" onClick={handleClick} className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center rounded-full p-0">
                        {unreadCount}
                    </Badge>
                )}
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                    <div className="p-3 font-semibold border-b border-gray-200 dark:border-gray-700">Notifications</div>
                    <ScrollArea className="h-96">
                        <div className="p-2 space-y-2">
                            {notifications.length === 0 && <p className="text-sm text-gray-500 text-center">No notifications yet.</p>}
                            {notifications.map((n) => (
                                 <Link key={n.id} href={n.link || '#'} passHref>
                                    <a className={`flex items-start gap-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${!n.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                        <PriorityIcon priority={n.priority} />
                                        <div>
                                            <p className="text-sm text-gray-900 dark:text-gray-100">{n.message}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(n.createdAt)}</p>
                                        </div>
                                    </a>
                                </Link>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    );
};
