export class NewsService {
    private apiKey: string;
    private baseUrl: string = 'https://newsapi.org/v2/everything';

    constructor() {
        this.apiKey = process.env.NEWS_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('NEWS_API_KEY is not defined in the environment variables.');
        }
    }

    async getCryptoNews(query: string = 'crypto', pageSize: number = 10): Promise<any[]> {
        try {
            const url = `${this.baseUrl}?q=${query}&apiKey=${this.apiKey}&pageSize=${pageSize}&sortBy=publishedAt&language=en`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch news: ${response.statusText}`);
            }
            const data = await response.json();
            return data.articles || [];
        } catch (error) {
            console.error('Error fetching crypto news:', error);
            return [];
        }
    }
}
