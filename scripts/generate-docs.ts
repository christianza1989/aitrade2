import fs from 'fs/promises';
import path from 'path';
import { ToolRegistry } from '../src/core/tools';
// Import all tools
import { getMarketRegimeTool } from '../src/core/tools/MarketTools';
import { getPortfolioStatusTool } from '../src/core/tools/PortfolioTools';
import { analyzeSymbolTool } from '../src/core/tools/AnalysisTools';
import { categorizeSymbolsTool } from '../src/core/tools/CategorizationTools';
import { proposeRiskAdjustmentTool } from '../src/core/tools/RiskTools';
import { updatePositionRiskTool } from '../src/core/tools/PositionTools';
import { confirmActionWithUserTool } from '../src/core/tools/ConfirmationTools';
import { setRiskAppetiteTool, modifyStrategyParameterTool } from '../src/core/tools/ConfigTools';

async function generateDocs() {
    const toolRegistry = new ToolRegistry();
    // Register all tools
    toolRegistry.register(getMarketRegimeTool);
    toolRegistry.register(getPortfolioStatusTool);
    toolRegistry.register(analyzeSymbolTool);
    toolRegistry.register(categorizeSymbolsTool);
    toolRegistry.register(proposeRiskAdjustmentTool);
    toolRegistry.register(updatePositionRiskTool);
    toolRegistry.register(confirmActionWithUserTool);
    toolRegistry.register(setRiskAppetiteTool);
    toolRegistry.register(modifyStrategyParameterTool);

    const allTools = toolRegistry.getAllTools();
    let markdownContent = `# Lucid Hive Tool Reference\n\nThis document is auto-generated. Do not edit manually.\n\n`;

    for (const tool of allTools) {
        markdownContent += `## \`${tool.name}\`\n\n`;
        markdownContent += `**Permission Level:** \`${tool.permission_level.toUpperCase()}\`\n\n`;
        markdownContent += `**Description:** ${tool.description}\n\n`;
        markdownContent += `**Parameters (Zod Schema):**\n\`\`\`json\n${JSON.stringify(tool.schema.shape, null, 2)}\n\`\`\`\n\n---\n\n`;
    }

    await fs.writeFile(path.join(process.cwd(), 'TOOLS.md'), markdownContent);
    console.log('✅ Tool documentation generated successfully in TOOLS.md');
}

generateDocs().catch(console.error);
