"use client";

import { useEffect, useState } from 'react';
import { Rss } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

interface Article {
    title: string;
    url: string;
    source: { name: string };
    publishedAt: string;
}

export function NewsFeed() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchNews() {
            setIsLoading(true);
            try {
                const response = await fetch('/api/news');
                const data = await response.json();
                setArticles(data.articles || []);
            } catch (error) {
                console.error("Failed to fetch news", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchNews();
    }, []);

    if (isLoading) {
        return <div className="text-center p-4">Loading news...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Rss size={20} className="mr-2" />
                    Latest Crypto News
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                    <div className="space-y-4">
                        {articles.map((article, index) => (
                            <a
                                key={index}
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                <p className="font-semibold">{article.title}</p>
                                <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                                    <span>{article.source.name}</span>
                                    <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                                </div>
                            </a>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
