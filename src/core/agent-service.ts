// src/core/agent-service.ts

import { AIAgent } from './agents';

/**
 * AgentService veikia kaip centrinis registras ir komunikacijos tarpininkas visiems DI agentams.
 * Tai leidžia agentams dinamiškai atrasti vienas kitą ir bendradarbiauti.
 */
export class AgentService {
    // Privatus registras, saugantis visas agentų instancijas pagal jų vardus.
    private agents: Map<string, AIAgent> = new Map();

    /**
     * Užregistruoja agento instanciją tarnyboje, kad kiti agentai galėtų ją rasti.
     * @param agent Agentas, kurį reikia užregistruoti.
     */
    public register(agent: AIAgent): void {
        console.log(`[AgentService] Registering agent: ${agent.name}`);
        this.agents.set(agent.name, agent);
    }

    /**
     * Suranda ir grąžina agento instanciją pagal vardą.
     * @param name Agento vardas.
     * @returns Agento instancija arba undefined, jei nerasta.
     */
    public getAgent(name: string): AIAgent | undefined {
        return this.agents.get(name);
    }

    /**
     * Pagrindinis komunikacijos metodas, leidžiantis vienam agentui konsultuotis su kitu.
     * @param targetAgentName Agento, su kuriuo norima konsultuotis, vardas.
     * @param query Užklausa tekstiniu formatu.
     * @param callingAgentName Agento, kuris inicijuoja konsultaciją, vardas.
     * @returns Atsakymas iš pasikonsultuoto agento.
     */
    public async consult(targetAgentName: string, query: string, callingAgentName: string): Promise<any> {
        const agent = this.getAgent(targetAgentName);
        if (!agent) {
            const errorMessage = `[AgentService] Consultation failed: Agent '${targetAgentName}' not found.`;
            console.error(errorMessage);
            return { error: errorMessage };
        }

        console.log(`[AgentService] Agent '${callingAgentName}' is consulting '${targetAgentName}' with query: "${query}"`);
        // Iškviečiame specialų tikslinio agento metodą, skirtą atsakyti į užklausas.
        return agent.handleConsultation(query, callingAgentName);
    }
}