import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { ContextualHelp } from './ContextualHelp';
import { ReactNode } from 'react';

interface MetricCardProps {
    title: string;
    value: string;
    icon: ReactNode;
    helpTopicId: string;
    color?: string;
}

export const MetricCard = ({ title, value, icon, helpTopicId, color = 'text-white' }: MetricCardProps) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <ContextualHelp topicId={helpTopicId} />
            </div>
            <div className="text-muted-foreground">{icon}</div>
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
        </CardContent>
    </Card>
);
