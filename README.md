# AI Trading Bot - Project Chimera

This is an advanced, multi-agent AI trading system built on the Next.js framework. The system is designed to operate as a unified, adaptive organism ("Project Chimera") that analyzes cryptocurrency markets, manages a portfolio, and autonomously optimizes its own strategies by learning from past performance, including missed opportunities.

## Core Philosophy

The system is not a simple bot executing predefined rules. It simulates a sophisticated team of financial analysts and portfolio managers, where each AI agent has a distinct role. These agents collaborate through a shared consciousness (`SharedContext`) to make informed, data-driven trading decisions.

## System Architecture

The system is composed of several core modules and a multi-layered AI agent architecture.

### Core Services

-   **`BinanceService`**: The system's eyes and ears on the market. It connects to the Binance API to fetch real-time price data, historical candlestick data, and trading volumes.
-   **`NewsService`**: Scans the web for the latest crypto news headlines to gauge market sentiment.
-   **`PortfolioService`**: The system's accountant. It manages the virtual portfolio (`portfolio.json`), tracks the balance, executes buy/sell orders, and logs all completed trades (`trades_log.json`). It uses a file-based locking mechanism to prevent race conditions.
-   **`OpportunityLogger`**: The system's memory of what could have been. It logs trading opportunities that were identified but ultimately avoided, allowing the system to learn from inaction.

### The AI Agents: A Multi-Agent "Super Team"

The heart of the system is a collection of specialized AI agents that work in concert.

1.  **`MacroAnalyst`**: The Chief Economist. It analyzes high-level data (Bitcoin price, news headlines) to determine the overall **Market Regime** (`Risk-On` or `Risk-Off`) and assigns a quantitative score.
2.  **`SentimentAnalyst`**: The Media Analyst. It reads news headlines to determine the prevailing market **Sentiment** (`Bullish`, `Bearish`, or `Neutral`) and identifies key trending topics.
3.  **`TechnicalAnalyst`**: The "Quant". It performs quantitative analysis on a large batch of cryptocurrencies, calculating key technical indicators (RSI, MACD, SMA) to score each asset's technical strength.
4.  **`RiskManager`**: The Portfolio Manager. This crucial agent synthesizes the analyses from all other agents.
    -   It makes the final `BUY`, `HOLD`, or `AVOID` decision for each potential trade.
    -   **Dynamic Risk Management**: Based on the `SharedContext`, it can dynamically adjust risk parameters for the current trading cycle, becoming more aggressive in "Risk-On" markets and more defensive in "Risk-Off" markets.
5.  **`PortfolioAllocator`**: The Chief Investment Officer. Given a list of "BUY" signals from the `RiskManager`, this agent decides how to allocate the available capital, prioritizing the highest-conviction trades.
6.  **`PositionManager`**: The Active Trader. This agent monitors open positions. When a position hits its take-profit or stop-loss level, it is invoked to decide whether to `SELL_NOW` or `HOLD_AND_INCREASE_TP` to let profits run.
7.  **`StrategyOptimizer`**: The Self-Improvement Engine. This is the most advanced agent. It analyzes the history of both executed trades and missed opportunities to find patterns of success and failure. Based on this analysis, it proposes a new, fully optimized configuration (`config.json`) for the entire system, allowing it to evolve and improve its profitability over time.

### The "Hive Mind": `SharedContext`

To enable seamless collaboration, all agents are connected to a `SharedContext`. This central in-memory state is created at the start of each trading cycle and allows agents to share real-time insights. For example, when the `MacroAnalyst` determines the market is "Risk-Off", this state is immediately available to the `RiskManager`, influencing its decisions for the rest of the cycle.

## Getting Started

### 1. Environment Variables

Create a `.env.local` file in the root directory and add your API keys:

```
# For fetching news (e.g., from NewsAPI.org)
NEWS_API_KEY=YOUR_NEWS_API_KEY

# For AI models (e.g., Google Gemini)
# Can be a single key or a comma-separated list for key rotation
GEMINI_API_KEYS=YOUR_GEMINI_API_KEY_1,YOUR_GEMINI_API_KEY_2

# Mock admin credentials for the dashboard
ADMIN_USER=admin
ADMIN_PASS=password
```

### 2. Installation

Install the dependencies:

```bash
npm install
```

### 3. Running the Development Server

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How to Use the Dashboard

1.  **Login**: Use the credentials from your `.env.local` file (e.g., `admin`/`password`).
2.  **Start the Bot**: On the main dashboard, click the "Start Bot" button. This will activate the trading cycles.
3.  **Monitor**:
    -   **Hive Mind Context**: See the real-time market analysis from the `MacroAnalyst` and `SentimentAnalyst`.
    -   **Dynamic Risk Display**: If the `RiskManager` adjusts risk parameters for a cycle, a notification will appear here.
    -   **AI Communication Log**: Read the detailed prompts and responses for each AI agent during a cycle.
    -   **AI Analysis Cycle**: View the final allocation decisions from the `PortfolioAllocator`, including both executed buys and passed opportunities.
4.  **Optimize**:
    -   Navigate to the **Optimization** page.
    -   Click "Run AI Optimization Analysis" to have the `StrategyOptimizer` analyze past performance.
    -   Review the AI's analysis and its proposed new settings.
    -   If you agree, click "Apply AI Learned Settings" to allow the bot to autonomously update its own configuration for future cycles.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Future Improvements

This project is built with modularity and scalability in mind. Here are some potential directions for future development:

-   **Deeper Learning Cycles**: Enhance the `StrategyOptimizer` to analyze not just executed trades and missed buys, but also the performance of `HOLD_AND_INCREASE_TP` decisions to refine profit-taking strategies.
-   **Full Inter-Agent Consultation**: Fully implement the `consult` mechanism, allowing agents to dynamically query each other for deeper insights during a cycle. For example, the `RiskManager` could request a second opinion from the `TechnicalAnalyst` on a different timeframe before committing to a trade.
-   **Expanded Data Sources**: Integrate additional data sources to enrich the agents' decision-making context, such as:
    -   Real-time social media sentiment analysis (e.g., Twitter/X).
    -   On-chain data (e.g., from Glassnode or Dune Analytics).
    -   Order book depth and liquidity analysis.
-   **Advanced Risk Models**: Implement more sophisticated risk models in the `RiskManager`, such as Value at Risk (VaR) calculations or position sizing based on asset volatility.

---
---

# AI Prekybos Botas - Projektas "Chimera" (Lietuvių k.)

Tai pažangi, daugelio agentų dirbtinio intelekto prekybos sistema, sukurta naudojant Next.js. Sistema sukurta veikti kaip vieningas, adaptyvus organizmas ("Projektas Chimera"), kuris analizuoja kriptovaliutų rinkas, valdo portfelį ir savarankiškai optimizuoja savo strategijas, mokydamasis iš praeities rezultatų, įskaitant praleistas galimybes.

## Pagrindinė Filosofija

Ši sistema nėra paprastas botas, vykdantis iš anksto nustatytas taisykles. Ji imituoja sudėtingą finansų analitikų ir portfelio valdytojų komandą, kurioje kiekvienas AI agentas turi skirtingą vaidmenį. Šie agentai bendradarbiauja per bendrą sąmonę (`SharedContext`), kad priimtų pagrįstus, duomenimis paremtus prekybos sprendimus.

## Sistemos Architektūra

Sistemą sudaro keli pagrindiniai moduliai ir daugiasluoksnė AI agentų architektūra.

### Pagrindiniai Servisai

-   **`BinanceService`**: Sistemos akys ir ausys rinkoje. Ji jungiasi prie Binance API, kad gautų realaus laiko kainų duomenis, istorinius žvakių grafikus ir prekybos apimtis.
-   **`NewsService`**: Nuskaito internetą ieškodama naujausių kriptovaliutų naujienų antraščių, kad įvertintų rinkos nuotaikas.
-   **`PortfolioService`**: Sistemos buhalteris. Ji valdo virtualų portfelį (`portfolio.json`), seka balansą, vykdo pirkimo/pardavimo pavedimus ir registruoja visus įvykdytus sandorius (`trades_log.json`). Ji naudoja failų užrakinimo mechanizmą, kad išvengtų lenktynių sąlygų.
-   **`OpportunityLogger`**: Sistemos atmintis apie tai, kas galėjo būti. Ji registruoja prekybos galimybes, kurios buvo nustatytos, bet galiausiai jų buvo atsisakyta, leisdama sistemai mokytis iš neveiklumo.

### AI Agentai: Daugiaagentė "Super Komanda"

Sistemos širdis yra specializuotų AI agentų rinkinys, kurie veikia kartu.

1.  **`MacroAnalyst`**: Vyriausiasis ekonomistas. Jis analizuoja aukšto lygio duomenis (Bitcoin kaina, naujienų antraštės), kad nustatytų bendrą **Rinkos Režimą** (`Risk-On` arba `Risk-Off`) ir priskiria kiekybinį balą.
2.  **`SentimentAnalyst`**: Žiniasklaidos analitikas. Jis skaito naujienų antraštes, kad nustatytų vyraujančią rinkos **Nuotaiką** (`Bullish`, `Bearish`, ar `Neutral`) ir identifikuoja pagrindines populiarias temas.
3.  **`TechnicalAnalyst`**: "Kvantas". Jis atlieka kiekybinę daugelio kriptovaliutų analizę, apskaičiuodamas pagrindinius techninius rodiklius (RSI, MACD, SMA), kad įvertintų kiekvieno turto techninę stiprybę.
4.  **`RiskManager`**: Portfelio valdytojas. Šis lemiamas agentas sintezuoja visų kitų agentų analizes.
    -   Jis priima galutinį `BUY`, `HOLD`, arba `AVOID` sprendimą dėl kiekvieno potencialaus sandorio.
    -   **Dinaminis Rizikos Valdymas**: Remdamasis `SharedContext`, jis gali dinamiškai koreguoti rizikos parametrus dabartiniam prekybos ciklui, tapdamas agresyvesnis "Risk-On" rinkose ir gynybiškesnis "Risk-Off" rinkose.
5.  **`PortfolioAllocator`**: Vyriausiasis investicijų pareigūnas. Gavęs "BUY" signalus iš `RiskManager`, šis agentas nusprendžia, kaip paskirstyti turimą kapitalą, teikdamas pirmenybę didžiausio įsitikinimo sandoriams.
6.  **`PositionManager`**: Aktyvus prekiautojas. Šis agentas stebi atidarytas pozicijas. Kai pozicija pasiekia pelno arba nuostolio lygį, jis yra iškviečiamas nuspręsti, ar `SELL_NOW` (parduoti dabar), ar `HOLD_AND_INCREASE_TP` (laikyti ir padidinti pelno tikslą), kad pelnas galėtų toliau augti.
7.  **`StrategyOptimizer`**: Savęs tobulinimo variklis. Tai pats pažangiausias agentas. Jis analizuoja tiek įvykdytų sandorių, tiek praleistų galimybių istoriją, kad rastų sėkmės ir nesėkmės modelius. Remdamasis šia analize, jis pasiūlo naują, visiškai optimizuotą konfigūraciją (`config.json`) visai sistemai, leisdamas jai evoliucionuoti ir laikui bėgant didinti savo pelningumą.

### "Avilio Protas": `SharedContext`

Siekdami užtikrinti sklandų bendradarbiavimą, visi agentai yra prijungti prie `SharedContext`. Ši centrinė atmintyje esanti būsena sukuriama kiekvieno prekybos ciklo pradžioje ir leidžia agentams dalintis įžvalgomis realiu laiku. Pavyzdžiui, kai `MacroAnalyst` nustato, kad rinka yra "Risk-Off", ši būsena iš karto tampa prieinama `RiskManager`, paveikdama jo sprendimus likusioje ciklo dalyje.

## Darbo Pradžia

### 1. Aplinkos Kintamieji

Sukurkite `.env.local` failą pagrindiniame kataloge ir pridėkite savo API raktus:

```
# Naujienų gavimui (pvz., iš NewsAPI.org)
NEWS_API_KEY=JŪSŲ_NAUJIENŲ_API_RAKTAS

# AI modeliams (pvz., Google Gemini)
# Gali būti vienas raktas arba kableliais atskirtas sąrašas raktų rotacijai
GEMINI_API_KEYS=JŪSŲ_GEMINI_API_RAKTAS_1,JŪSŲ_GEMINI_API_RAKTAS_2

# Imitaciniai administratoriaus prisijungimo duomenys
ADMIN_USER=admin
ADMIN_PASS=password
```

### 2. Instaliacija

Įdiekite priklausomybes:

```bash
npm install
```

### 3. Vystymo Serverio Paleidimas

Paleiskite vystymo serverį:

```bash
npm run dev
```

Atidarykite [http://localhost:3000](http://localhost:3000) savo naršyklėje, kad pamatytumėte rezultatą.

## Kaip Naudotis Valdymo Skydeliu

1.  **Prisijungimas**: Naudokite prisijungimo duomenis iš savo `.env.local` failo (pvz., `admin`/`password`).
2.  **Boto Paleidimas**: Pagrindiniame valdymo skydelyje paspauskite "Start Bot" mygtuką. Tai aktyvuos prekybos ciklus.
3.  **Stebėjimas**:
    -   **Hive Mind Context**: Matykite realaus laiko rinkos analizę iš `MacroAnalyst` ir `SentimentAnalyst`.
    -   **Dynamic Risk Display**: Jei `RiskManager` pakoreguos rizikos parametrus ciklui, čia atsiras pranešimas.
    -   **AI Communication Log**: Skaitykite išsamius kiekvieno AI agento prompt'us ir atsakymus ciklo metu.
    -   **AI Analysis Cycle**: Peržiūrėkite galutinius `PortfolioAllocator` paskirstymo sprendimus, įskaitant tiek įvykdytus pirkimus, tiek praleistas galimybes.
4.  **Optimizavimas**:
    -   Eikite į **Optimization** puslapį.
    -   Paspauskite "Run AI Optimization Analysis", kad `StrategyOptimizer` išanalizuotų praeities rezultatus.
    -   Peržiūrėkite AI analizę ir jo siūlomus naujus nustatymus.
    -   Jei sutinkate, paspauskite "Apply AI Learned Settings", kad leistumėte botui savarankiškai atnaujinti savo konfigūraciją ateities ciklams.

## Diegimas Vercel

Lengviausias būdas įdiegti jūsų Next.js aplikaciją yra naudojant [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) nuo Next.js kūrėjų.

Daugiau informacijos rasite [Next.js diegimo dokumentacijoje](https://nextjs.org/docs/app/building-your-application/deploying).

---

## Ateities Patobulinimai

Šis projektas sukurtas atsižvelgiant į moduliškumą ir mastelį. Štai keletas galimų krypčių ateities plėtrai:

-   **Gilesni Mokymosi Ciklai**: Patobulinti `StrategyOptimizer`, kad jis analizuotų ne tik įvykdytus sandorius ir praleistus pirkimus, bet ir `HOLD_AND_INCREASE_TP` sprendimų sėkmę, siekiant patobulinti pelno fiksavimo strategijas.
-   **Pilna Tarpagentinė Konsultacija**: Pilnai įgyvendinti `consult` mechanizmą, leidžiantį agentams dinamiškai teirautis vienas kito gilesnių įžvalgų ciklo metu. Pavyzdžiui, `RiskManager` galėtų paprašyti `TechnicalAnalyst` antros nuomonės dėl kito laiko intervalo prieš įsipareigodamas sandoriui.
-   **Išplėstiniai Duomenų Šaltiniai**: Integruoti papildomus duomenų šaltinius, siekiant praturtinti agentų sprendimų priėmimo kontekstą, pavyzdžiui:
    -   Realaus laiko socialinių tinklų nuotaikų analizė (pvz., Twitter/X).
    -   On-chain duomenys (pvz., iš Glassnode ar Dune Analytics).
    -   Užsakymų knygos gylio ir likvidumo analizė.
-   **Pažangūs Rizikos Modeliai**: Įdiegti sudėtingesnius rizikos modelius `RiskManager`, tokius kaip "Value at Risk" (VaR) skaičiavimai ar pozicijos dydžio nustatymas pagal turto kintamumą.
