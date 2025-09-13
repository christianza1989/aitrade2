// src/core/risk-adapter.ts

export interface AdaptedConfig {
    risk_management: {
        capital_per_trade_percent: number;
        stop_loss_percentage: number;
        take_profit_percentage: number;
    };
    market_scanning?: {
        symbolsToAnalyze?: number;
        batchSize?: number;
        top_candidates_for_analysis?: number;
    };
    entry_criteria?: {
        minMacroSentimentScore?: number;
    };
    // Include other strategy properties you might want to adapt in the future
    [key: string]: any;
}

export interface BaseStrategyConfig extends AdaptedConfig {}

export class RiskAdapter {
    /**
     * Adapts the base strategy configuration based on the market regime score.
     * @param baseConfig The original configuration from the strategy file.
     * @param regimeScore A number from 0.0 (extreme risk-off) to 10.0 (extreme risk-on).
     * @returns A new configuration object with adjusted parameters.
     */
    public static adaptConfig(baseConfig: BaseStrategyConfig, regimeScore: number): AdaptedConfig {
        // Create a deep copy to avoid modifying the original config object
        const adaptedConfig = JSON.parse(JSON.stringify(baseConfig));

        // --- NAUJA LOGIKA PRASIDEDA ČIA ---

        // 1. Nustatome numatytąsias reikšmes iš bazinės konfigūracijos,
        // tikriname ir standartinę, ir "šešėlinę" struktūrą.
        const capital_per_trade_percent = baseConfig.risk_management?.capital_per_trade_percent || baseConfig.risk_per_trade_capital_percentage || 1.0;
        const stop_loss_percentage = baseConfig.risk_management?.stop_loss_percentage || baseConfig.stop_loss?.value || 2.0;
        const take_profit_percentage = baseConfig.risk_management?.take_profit_percentage || baseConfig.take_profit?.fixed_percentage_target || 1.5;

        // 2. Apskaičiuojame rizikos daugiklį
        let riskMultiplier = 1.0;
        if (regimeScore > 7.5) { // Strong Risk-On
            riskMultiplier = 1.25;
        } else if (regimeScore > 6.0) { // Mild Risk-On
            riskMultiplier = 1.1;
        } else if (regimeScore < 2.5) { // Strong Risk-Off
            riskMultiplier = 0.5;
        } else if (regimeScore < 4.0) { // Mild Risk-Off
            riskMultiplier = 0.75;
        }

        // 3. Užtikriname, kad 'risk_management' objektas egzistuoja adaptuotoje konfigūracijoje
        if (!adaptedConfig.risk_management) {
            adaptedConfig.risk_management = {
                capital_per_trade_percent: 0, // laikinos reikšmės
                stop_loss_percentage: 0,
                take_profit_percentage: 0,
            };
        }
        
        // 4. Pritaikome daugiklį ir išsaugome adaptuotas reikšmes
        adaptedConfig.risk_management.capital_per_trade_percent = capital_per_trade_percent * riskMultiplier;

        // Paliekame stop-loss ir take-profit nekeistus, nes juos vėliau nustato RiskManager'is
        // Bet užtikriname, kad jie turi pradinę reikšmę.
        adaptedConfig.risk_management.stop_loss_percentage = stop_loss_percentage;
        adaptedConfig.risk_management.take_profit_percentage = take_profit_percentage;
        
        // --- NAUJA LOGIKA BAIGIASI ČIA ---

        return adaptedConfig;
    }
}
