# AI Prekybos Botas - Projektas "Chimera"

Tai pažangi, daugelio agentų dirbtinio intelekto prekybos sistema, sukurta naudojant Next.js. Sistema sukurta veikti kaip vieningas, adaptyvus organizmas ("Projektas Chimera"), kuris analizuoja kriptovaliutų rinkas, valdo portfelį ir savarankiškai optimizuoja savo strategijas, mokydamasis iš visapusiškos savo veiklos istorijos.

## Pagrindinė Filosofija

Ši sistema nėra paprastas botas, vykdantis iš anksto nustatytas taisykles. Ji imituoja sudėtingą finansų analitikų ir portfelio valdytojų komandą, kurioje kiekvienas DI agentas turi skirtingą vaidmenį. Šie agentai bendradarbiauja per bendrą sąmonę (`SharedContext`), kad priimtų pagrįstus, duomenimis paremtus prekybos sprendimus.

## Sistemos Architektūra

Sistemą sudaro keli pagrindiniai moduliai ir daugiasluoksnė DI agentų architektūra.

### Pagrindiniai Servisai

-   **`BinanceService`**: Sistemos akys ir ausys rinkoje. Ji jungiasi prie Binance API, kad gautų realaus laiko kainų duomenis, istorinius žvakių grafikus ir prekybos apimtis.
-   **`NewsService`**: Nuskaito internetą ieškodama naujausių kriptovaliutų naujienų antraščių, kad įvertintų rinkos nuotaikas.
-   **`PortfolioService`**: Sistemos buhalteris. Ji valdo virtualų portfelį (`portfolio.json`), seka balansą, vykdo pirkimo/pardavimo pavedimus ir registruoja visus įvykdytus sandorius (`trades_log.json`). Ji naudoja failų užrakinimo mechanizmą, kad išvengtų lenktynių sąlygų.
-   **`OpportunityLogger`**: Sistemos atmintis apie tai, kas galėjo būti. Ji registruoja prekybos galimybes, kurios buvo nustatytos, bet galiausiai jų buvo atsisakyta (`AVOID` sprendimas), leisdama sistemai mokytis iš neveiklumo.
-   **`DecisionLogger`**: Sistemos sprendimų archyvas. Ji registruoja kiekvieną `PositionManager` agento sprendimą (`SELL_NOW` arba `HOLD_AND_INCREASE_TP`), leisdama `StrategyOptimizer` analizuoti pelno fiksavimo strategijų efektyvumą.
-   **`OpportunityScanner`**: Realaus laiko rinkos pulsas. Šis servisas naudoja nuolatinį WebSocket ryšį su Binance, kad stebėtų visų kriptovaliutų kainas ir akimirksniu aptiktų staigius kainų šuolius, apie kuriuos praneša valdymo skydelyje.

### DI Agentai: Daugiaagentė "Super Komanda"

Sistemos širdis yra specializuotų DI agentų rinkinys, kurie veikia kartu.

1.  **`MacroAnalyst`**: Vyriausiasis ekonomistas. Jis analizuoja aukšto lygio duomenis (Bitcoin kaina, naujienų antraštės), kad nustatytų bendrą **Rinkos Režimą** (`Risk-On` arba `Risk-Off`) ir pagrįstų savo sprendimą.
2.  **`SentimentAnalyst`**: Žiniasklaidos analitikas. Jis skaito naujienų antraštes, kad nustatytų vyraujančią rinkos **Nuotaiką** (`Bullish`, `Bearish`, ar `Neutral`) ir identifikuotų dominuojantį naratyvą.
3.  **`TechnicalAnalyst`**: "Kvantas". Jis atlieka kiekybinę daugelio kriptovaliutų analizę, apskaičiuodamas pagrindinius techninius rodiklius (RSI, MACD, SMA), kad įvertintų kiekvieno turto techninę stiprybę ir perspėtų apie galimus trendo išsekimo ženklus.
4.  **`RiskManager`**: Portfelio valdytojas. Šis lemiamas agentas sintezuoja visų kitų agentų analizes. Jis priima galutinį `BUY`, `HOLD`, arba `AVOID` sprendimą, remdamasis visų trijų analizės sluoksnių (makro, sentimento, techninio) suderinamumu.
5.  **`PortfolioAllocator`**: Vyriausiasis investicijų pareigūnas. Gavęs "BUY" signalus, šis agentas nusprendžia, kaip paskirstyti turimą kapitalą, laikydamasis griežtų rizikos valdymo ir diversifikacijos taisyklių.
6.  **`PositionManager`**: Aktyvus prekiautojas. Pagrindinio prekybos ciklo metu šis agentas stebi atidarytas pozicijas. Kai pozicija pasiekia pelno arba nuostolio lygį, jis yra iškviečiamas nuspręsti, ar `SELL_NOW` (parduoti dabar), ar `HOLD_AND_INCREASE_TP` (laikyti ir padidinti pelno tikslą).
7.  **`StrategyOptimizer`**: Savęs tobulinimo variklis. Tai pats pažangiausias agentas. Jis analizuoja **visus tris duomenų šaltinius**: įvykdytus sandorius, praleistas galimybes ir pozicijų valdymo sprendimus. Remdamasis šia holistine analize, jis pasiūlo naują, visiškai optimizuotą konfigūraciją (`config.json`) visai sistemai, leisdamas jai evoliucionuoti ir laikui bėgant didinti savo pelningumą.

### "Avilio Protas": `SharedContext`

Siekdami užtikrinti sklandų bendradarbiavimą, visi agentai yra prijungti prie `SharedContext`. Ši centrinė atmintyje esanti būsena sukuriama kiekvieno prekybos ciklo pradžioje ir leidžia agentams dalintis įžvalgomis realiu laiku.

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
    -   **Opportunity Log**: Stebėkite realiu laiku atsirandančias prekybos galimybes, kurias aptinka "Greitų Galimybių Skeneris".
    -   **Hive Mind Context**: Matykite realaus laiko rinkos analizę iš `MacroAnalyst` ir `SentimentAnalyst`.
    -   **AI Communication Log**: Skaitykite išsamius kiekvieno DI agento `prompt`us ir atsakymus ciklo metu.
4.  **Optimizavimas**:
    -   Eikite į **Optimization** puslapį.
    -   Paspauskite "Run AI Optimization Analysis", kad `StrategyOptimizer` išanalizuotų visą praeities veiklos istoriją.
    -   Peržiūrėkite DI analizę ir jo siūlomus naujus nustatymus.
    -   Jei sutinkate, paspauskite "Apply AI Learned Settings", kad leistumėte botui savarankiškai atnaujinti savo konfigūraciją ateities ciklams.

## Diegimas Vercel

Lengviausias būdas įdiegti jūsų Next.js aplikaciją yra naudojant [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) nuo Next.js kūrėjų.

Daugiau informacijos rasite [Next.js diegimo dokumentacijoje](https://nextjs.org/docs/app/building-your-application/deploying).
