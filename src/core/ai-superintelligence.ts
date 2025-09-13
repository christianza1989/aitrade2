// src/core/ai-superintelligence.ts - V2.5 AI Evolution

import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentService } from './agent-service';

/**
 * V2.5 AI SUPERINTELLIGENCE SYSTEM
 * 
 * Multi-Model Ensemble AI with Advanced Reasoning Capabilities
 * - GPT-4 Turbo (128k context) for strategic analysis
 * - Claude-3 for risk assessment and contrarian thinking  
 * - Gemini Pro for technical pattern recognition
 * - Cross-model consensus for decision making
 * - Real-time learning and adaptation
 */

export interface AIModel {
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  maxTokens: number;
  strengths: string[];
  cost: number; // per 1k tokens
}

export interface ConsensusDecision {
  decision: string;
  confidence: number; // 0-1
  reasoning: string[];
  dissenting_opinions: string[];
  model_votes: Record<string, any>;
  execution_priority: 'immediate' | 'strategic' | 'monitor';
}

export interface AgentEvolution {
  performance_trend: 'improving' | 'stable' | 'declining';
  learning_rate: number;
  adaptation_suggestions: string[];
  strategy_modifications: Record<string, any>;
  confidence_adjustment: number; // -0.5 to +0.5
}

export class SuperIntelligenceOrchestrator {
  private openai: OpenAI;
  private googleAI: GoogleGenerativeAI;
  private agentService: AgentService;
  private models: AIModel[];
  private performanceHistory: Map<string, number[]> = new Map();
  private learningEnabled: boolean = true;

  constructor(agentService: AgentService) {
    this.agentService = agentService;
    
    // Initialize AI Models
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    });
    
    this.googleAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS?.split(',')[0] || ''
    );

    this.models = [
      {
        name: 'gpt-4-turbo-preview',
        provider: 'openai',
        maxTokens: 128000,
        strengths: ['strategic_analysis', 'complex_reasoning', 'market_psychology'],
        cost: 0.01
      },
      {
        name: 'claude-3-opus',
        provider: 'anthropic', 
        maxTokens: 200000,
        strengths: ['risk_assessment', 'contrarian_analysis', 'ethical_constraints'],
        cost: 0.015
      },
      {
        name: 'gemini-pro',
        provider: 'google',
        maxTokens: 32000,
        strengths: ['pattern_recognition', 'technical_analysis', 'speed'],
        cost: 0.0005
      }
    ];

    console.log('[SuperIntelligence] Initialized with multi-model ensemble');
  }

  /**
   * CHAIN-OF-THOUGHT REASONING ENGINE
   * Advanced prompting with step-by-step logical analysis
   */
  private generateChainOfThoughtPrompt(basePrompt: string, context: Record<string, any>): string {
    return `
**ADVANCED REASONING PROTOCOL - CHAIN OF THOUGHT ANALYSIS**

**BASE ANALYSIS TASK:**
${basePrompt}

**CONTEXT DATA:**
${JSON.stringify(context, null, 2)}

**REASONING FRAMEWORK - FOLLOW THESE STEPS:**

**STEP 1: SITUATION ASSESSMENT**
- Analyze the current market situation objectively
- Identify key data points and their significance  
- Note any anomalies or unusual patterns

**STEP 2: MULTI-FACTOR ANALYSIS**
- Technical factors: What do the charts and indicators suggest?
- Fundamental factors: What are the underlying market drivers?
- Sentiment factors: What is the crowd psychology and positioning?
- Macro factors: How do broader economic conditions influence this decision?

**STEP 3: SCENARIO MODELING**  
- Bull case: What could drive prices higher? Probability and magnitude?
- Bear case: What could drive prices lower? Probability and magnitude?
- Base case: Most likely outcome with supporting evidence
- Black swan: Low probability, high impact scenarios to consider

**STEP 4: RISK/REWARD CALCULATION**
- Quantify potential upside and downside
- Calculate position sizing based on conviction level
- Identify key invalidation levels and stop placement
- Estimate holding period and exit strategy

**STEP 5: CONFIDENCE CALIBRATION**
- Rate confidence in analysis on 1-10 scale with justification
- Identify key assumptions that could be wrong
- Determine what new information would change the thesis
- Assess edge and expected value of this decision

**STEP 6: DECISION SYNTHESIS**
- Synthesize all analysis into clear recommendation
- Provide specific execution instructions
- Set monitoring criteria for position management
- Define success/failure metrics for learning

**CRITICAL REQUIREMENT:** Show your work for each step. Be explicit about your reasoning process. Quantify confidence levels and risk assessments.

**OUTPUT FORMAT:** Provide structured JSON response with your chain-of-thought reasoning clearly documented.
    `;
  }

  /**
   * MULTI-MODEL CONSENSUS DECISION ENGINE
   * Gets opinions from all models and synthesizes optimal decision
   */
  async getConsensusDecision(
    prompt: string,
    context: Record<string, any>,
    decisionType: 'trading' | 'risk' | 'strategy' = 'trading'
  ): Promise<ConsensusDecision> {
    console.log(`[SuperIntelligence] Getting consensus decision for: ${decisionType}`);
    
    const chainOfThoughtPrompt = this.generateChainOfThoughtPrompt(prompt, context);
    const modelResponses: Record<string, any> = {};
    
    try {
      // Get GPT-4 Turbo Analysis (Strategic Leadership)
      if (process.env.OPENAI_API_KEY) {
        const gptResponse = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are the lead strategist in an elite trading team. Provide sophisticated analysis with chain-of-thought reasoning.'
            },
            {
              role: 'user', 
              content: chainOfThoughtPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        });
        
        modelResponses.gpt4 = this.parseAIResponse(gptResponse.choices[0].message.content || '');
      }

      // Get Gemini Pro Analysis (Technical Specialist)  
      const geminiModel = this.googleAI.getGenerativeModel({ model: 'gemini-pro' });
      const geminiResponse = await geminiModel.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: chainOfThoughtPrompt }]
        }]
      });
      
      modelResponses.gemini = this.parseAIResponse(geminiResponse.response.text());

      // Synthesize Consensus Decision
      return this.synthesizeConsensus(modelResponses, decisionType);
      
    } catch (error) {
      console.error('[SuperIntelligence] Error in consensus decision:', error);
      
      // Fallback to single model decision
      return {
        decision: 'AVOID',
        confidence: 0.2,
        reasoning: ['Error in multi-model analysis, defaulting to conservative approach'],
        dissenting_opinions: [],
        model_votes: {},
        execution_priority: 'monitor'
      };
    }
  }

  /**
   * REAL-TIME LEARNING AND ADAPTATION ENGINE
   * Learns from trading performance and adapts strategies
   */
  async adaptAgentPerformance(
    agentName: string,
    recentTrades: any[],
    performanceMetrics: Record<string, number>
  ): Promise<AgentEvolution> {
    console.log(`[SuperIntelligence] Analyzing ${agentName} performance for adaptation`);
    
    // Track performance history
    const currentPerformance = performanceMetrics.winRate || 0;
    const history = this.performanceHistory.get(agentName) || [];
    history.push(currentPerformance);
    
    // Keep only recent history
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    this.performanceHistory.set(agentName, history);
    
    // Analyze performance trend
    let performance_trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (history.length >= 5) {
      const recent = history.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const older = history.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
      
      if (recent > older + 0.05) performance_trend = 'improving';
      else if (recent < older - 0.05) performance_trend = 'declining';
    }
    
    // Generate adaptation suggestions
    const adaptationPrompt = `
**AGENT PERFORMANCE ANALYSIS FOR: ${agentName}**

**Performance Metrics:**
${JSON.stringify(performanceMetrics, null, 2)}

**Recent Trading Results:**
${JSON.stringify(recentTrades.slice(-10), null, 2)}

**Performance Trend:** ${performance_trend}

**TASK:** Analyze the agent's performance and suggest specific improvements:

1. **Strategy Modifications:** What specific changes to prompts, parameters, or logic would improve performance?
2. **Risk Adjustments:** How should position sizing or risk management be modified?
3. **Market Adaptation:** What market conditions is this agent struggling with?
4. **Confidence Calibration:** Should the agent's confidence levels be adjusted up or down?

**OUTPUT:** JSON with specific, actionable recommendations for improving this agent's performance.
    `;

    try {
      const response = await this.getConsensusDecision(adaptationPrompt, {
        agent: agentName,
        metrics: performanceMetrics,
        trend: performance_trend
      }, 'strategy');

      return {
        performance_trend,
        learning_rate: this.calculateLearningRate(performance_trend),
        adaptation_suggestions: response.reasoning,
        strategy_modifications: response.model_votes,
        confidence_adjustment: this.calculateConfidenceAdjustment(performanceMetrics)
      };
      
    } catch (error) {
      console.error(`[SuperIntelligence] Error adapting ${agentName}:`, error);
      
      return {
        performance_trend,
        learning_rate: 0.1,
        adaptation_suggestions: [`Error in adaptation analysis for ${agentName}`],
        strategy_modifications: {},
        confidence_adjustment: 0
      };
    }
  }

  /**
   * CROSS-AGENT COMMUNICATION HUB
   * Enables agents to share insights and collaborate
   */
  async facilitateCrossAgentInsights(
    sourceAgent: string,
    targetAgents: string[],
    insight: string,
    context: Record<string, any>
  ): Promise<Record<string, string>> {
    console.log(`[SuperIntelligence] Sharing insight from ${sourceAgent} to ${targetAgents.join(', ')}`);
    
    const collaborationPrompt = `
**CROSS-AGENT COLLABORATION REQUEST**

**Source Agent:** ${sourceAgent}
**Target Agents:** ${targetAgents.join(', ')}

**Shared Insight:**
${insight}

**Context:**
${JSON.stringify(context, null, 2)}

**TASK:** As ${sourceAgent}, translate this insight into actionable intelligence for each target agent:

${targetAgents.map(agent => `
**For ${agent}:** How should this insight influence ${agent}'s decision-making process? What specific actions or considerations should ${agent} incorporate?
`).join('')}

**OUTPUT:** JSON object with personalized recommendations for each target agent.
    `;

    try {
      const response = await this.getConsensusDecision(collaborationPrompt, context, 'strategy');
      
      const insights: Record<string, string> = {};
      targetAgents.forEach(agent => {
        insights[agent] = response.reasoning.find(r => r.includes(agent)) || 
                         `Consider insight from ${sourceAgent}: ${insight}`;
      });
      
      return insights;
      
    } catch (error) {
      console.error('[SuperIntelligence] Error in cross-agent communication:', error);
      return {};
    }
  }

  // Helper Methods

  private parseAIResponse(response: string): any {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback to structured parsing
      return {
        analysis: response,
        decision: this.extractDecision(response),
        confidence: this.extractConfidence(response)
      };
    } catch (error) {
      console.warn('[SuperIntelligence] Failed to parse AI response:', error);
      return { analysis: response, decision: 'AVOID', confidence: 0.3 };
    }
  }

  private synthesizeConsensus(modelResponses: Record<string, any>, decisionType: string): ConsensusDecision {
    const decisions: string[] = [];
    const confidences: number[] = [];
    const reasonings: string[] = [];
    
    Object.entries(modelResponses).forEach(([model, response]) => {
      if (response.decision) decisions.push(response.decision);
      if (response.confidence) confidences.push(response.confidence);
      if (response.analysis) reasonings.push(`${model}: ${response.analysis}`);
    });
    
    // Determine consensus decision
    const decisionCounts: Record<string, number> = {};
    decisions.forEach(decision => {
      decisionCounts[decision] = (decisionCounts[decision] || 0) + 1;
    });
    
    const consensusDecision = Object.entries(decisionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'AVOID';
    
    const avgConfidence = confidences.length > 0 
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length 
      : 0.5;
    
    const dissenting = Object.keys(decisionCounts).filter(d => d !== consensusDecision);
    
    return {
      decision: consensusDecision,
      confidence: avgConfidence,
      reasoning: reasonings,
      dissenting_opinions: dissenting,
      model_votes: modelResponses,
      execution_priority: avgConfidence > 0.8 ? 'immediate' : 
                         avgConfidence > 0.6 ? 'strategic' : 'monitor'
    };
  }

  private calculateLearningRate(trend: 'improving' | 'stable' | 'declining'): number {
    switch (trend) {
      case 'improving': return 0.05; // Small adjustments when improving
      case 'declining': return 0.2;  // Larger adjustments when declining  
      default: return 0.1;           // Moderate adjustments when stable
    }
  }

  private calculateConfidenceAdjustment(metrics: Record<string, number>): number {
    const winRate = metrics.winRate || 0.5;
    const sharpeRatio = metrics.sharpeRatio || 1.0;
    
    // Increase confidence if performing well, decrease if performing poorly
    if (winRate > 0.65 && sharpeRatio > 1.5) return 0.1;
    if (winRate < 0.45 || sharpeRatio < 0.8) return -0.2;
    return 0;
  }

  private extractDecision(text: string): string {
    const decisions = ['BUY', 'SELL', 'HOLD', 'AVOID', 'AGGRESSIVE_BUY', 'CAUTIOUS_BUY'];
    for (const decision of decisions) {
      if (text.toUpperCase().includes(decision)) return decision;
    }
    return 'AVOID';
  }

  private extractConfidence(text: string): number {
    const confidenceMatch = text.match(/confidence[:\s]*([0-9.]+)/i);
    if (confidenceMatch) {
      return Math.min(Math.max(parseFloat(confidenceMatch[1]), 0), 1);
    }
    return 0.5;
  }
}

// Export singleton instance
export const superIntelligence = new SuperIntelligenceOrchestrator(new AgentService());