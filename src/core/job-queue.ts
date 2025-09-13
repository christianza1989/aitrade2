// src/core/job-queue.ts

import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../lib/redis';
import { processUserForQueue } from '../../worker'; // Importuosime specialią funkciją
import { runOnDemandAnalysis } from './trading-cycles'; // Pridėk šį importą
import { processChatMessage } from './chat-processor'; // Pridėti šį naują importą
import { globalAgentService } from '../../worker'; // Import globalAgentService

// Use centralized Redis client for BullMQ connection
const connection = getRedisClient();

// 1. Eilė (Queue) - naudojama užduočių pridėjimui
export const tradingCycleQueue = new Queue('trading-cycles', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true, // Automatiškai išvalyti sėkmingas užduotis
        removeOnFail: 1000, // Laikyti 1000 nepavykusių užduočių istorijoje
    }
});

// 2. Darbininkas (Worker) - klauso eilės ir vykdo užduotis
export function initializeTradingWorker() {
    console.log('[BULLMQ WORKER] Initializing Trading Cycle Worker...');

    new Worker('trading-cycles', async (job: Job) => {
        const { username, macroAnalysis, sentimentAnalysis, marketRegime, regimeTimestamp } = job.data;
        console.log(`[BULLMQ WORKER] Starting job #${job.id} for user: ${username}`);
        await processUserForQueue(username, macroAnalysis, sentimentAnalysis, marketRegime, regimeTimestamp);
        console.log(`[BULLMQ WORKER] Completed job #${job.id} for user: ${username}`);
    }, {
        connection,
        concurrency: parseInt(process.env.BULLMQ_CONCURRENCY || '10'),
    });

    console.log('[BULLMQ WORKER] Worker is listening for jobs...');
}

// --- NAUJA EILĖ "ON-DEMAND" ANALIZĖMS ---
export const onDemandAnalysisQueue = new Queue('on-demand-analysis', { connection });

// --- NAUJAS DARBININKAS "ON-DEMAND" EILEI ---
export function initializeOnDemandWorker() {
    console.log('[BULLMQ WORKER] Initializing On-Demand Analysis Worker...');

    new Worker('on-demand-analysis', async (job: Job) => {
        const { username, symbol } = job.data;
        console.log(`[BULLMQ WORKER] Starting ON-DEMAND job #${job.id} for ${symbol}`);
        if (job.id) {
            await runOnDemandAnalysis(job.id, username, symbol, globalAgentService); // Perduodame job.id rezultatų susiejimui
        } else {
            console.error('[BULLMQ WORKER] Job ID is missing for on-demand analysis');
        }
        console.log(`[BULLMQ WORKER] Completed ON-DEMAND job #${job.id}`);
    }, {
        connection,
        concurrency: 5, // Mažesnis lygiagretumas nei pagrindiniam ciklui
    });
}

// --- NAUJA EILĖ POKALBIŲ KOMANDOMS ---
export const chatCommandsQueue = new Queue('chat-commands', { connection });

// --- NAUJAS DARBININKAS POKALBIŲ EILEI ---
export function initializeChatWorker() {
    console.log('[BULLMQ WORKER] Initializing Chat Command Worker...');

    new Worker('chat-commands', async (job: Job) => {
        const { conversationId, message, username } = job.data;
        console.log(`[BULLMQ WORKER] Starting chat job #${job.id} for user: ${username}`);
        // Perduodame job.id, kad būtų galima išsaugoti rezultatą
        if (job.id) {
            await processChatMessage(job.id, conversationId, message, username);
        } else {
            console.error('[BULLMQ WORKER] Job ID is missing for chat message processing');
        }
        console.log(`[BULLMQ WORKER] Completed chat job #${job.id}`);
    }, {
        connection,
        concurrency: 5, // Atskira konkurencija pokalbiams
    });
}

// --- NAUJA EILĖ ATMINTIES ANALIZEI ---
export const memoryAnalysisQueue = new Queue('memory-analysis', { connection });

// --- NAUJAS DARBININKAS ATMINTIES ANALIZĖS EILEI ---
export function initializeMemoryAnalysisWorker() {
    console.log('[BULLMQ WORKER] Initializing Memory Analysis Worker...');
    // Worker'io logika bus aprašyta atskirame faile, čia tik registracija
    new Worker('memory-analysis', __dirname + '/memory-worker.ts', {
        connection,
        concurrency: 2, // Mažas lygiagretumas, nes tai resursams imli užduotis
    });
}
