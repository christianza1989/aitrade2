// src/core/categorization-service.ts
import { CoinMarketCapService } from './coinmarketcap';
import categoryMap from './data/category-map.json';

// Naudojame 'Record' tipą griežtesniam tipizavimui
const internalMap: Record<string, string[]> = categoryMap as Record<string, string[]>;

/**
 * Servisas, atsakingas už kriptovaliutų kategorizavimą pagal sektorius.
 * Naudoja trijų sluoksnių hierarchiją: vidinis žemėlapis, API fallback, podėlis (cache).
 */
export class CategorizationService {
    private static instance: CategorizationService;
    private cmcService: CoinMarketCapService;
    // Paprastas podėlis (in-memory cache). Realiame projekte čia būtų Redis.
    private cache: Map<string, string[]> = new Map();

    private constructor() {
        this.cmcService = new CoinMarketCapService();
    }

    public static getInstance(): CategorizationService {
        if (!CategorizationService.instance) {
            CategorizationService.instance = new CategorizationService();
        }
        return CategorizationService.instance;
    }

    public async getCategory(symbol: string): Promise<string[]> {
        const cleanedSymbol = symbol.replace('USDT', '');

        // 1. Tikriname podėlį
        if (this.cache.has(cleanedSymbol)) {
            return this.cache.get(cleanedSymbol)!;
        }

        // 2. Tikriname vidinį žemėlapį
        if (internalMap[cleanedSymbol]) {
            this.cache.set(cleanedSymbol, internalMap[cleanedSymbol]);
            return internalMap[cleanedSymbol];
        }

        // 3. Kreipiamės į API kaip fallback
        try {
            const info = await this.cmcService.getCryptocurrencyInfo([cleanedSymbol]);
            const tags: string[] = [];

            // Type-safe access to the info object
            if (info && typeof info === 'object' && cleanedSymbol in info) {
                const symbolInfo = (info as Record<string, unknown>)[cleanedSymbol];
                if (symbolInfo && typeof symbolInfo === 'object' && symbolInfo !== null && 'tags' in symbolInfo) {
                    const rawTags = (symbolInfo as { tags?: unknown }).tags;
                    if (Array.isArray(rawTags)) {
                        tags.push(...rawTags);
                    }
                }
            }

            // Filtruojame ir normalizuojame "tags"
            const relevantTags = tags.filter((tag: string) =>
                !['mineable', 'pow', 'pos', 'stablecoin'].includes(tag)
            );

            const finalCategories = relevantTags.length > 0 ? relevantTags : ['Other'];
            this.cache.set(cleanedSymbol, finalCategories);
            return finalCategories;
        } catch (error) {
            console.warn(`[CategorizationService] Failed to fetch category for ${cleanedSymbol} from API.`, error);
            const defaultCategory = ['Other'];
            this.cache.set(cleanedSymbol, defaultCategory);
            return defaultCategory;
        }
    }
}
