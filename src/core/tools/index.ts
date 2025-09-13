// PATH: src/core/tools/index.ts
import { z } from 'zod';

export interface ToolResult {
    success: boolean;
    data: unknown | null;
    error: string | null;
}

export interface Tool {
    name: string;
    description: string;
    permission_level: 'read_only' | 'state_changing' | 'confirmation';
    schema: z.ZodObject<Record<string, z.ZodTypeAny>>;
    execute: (params: Record<string, unknown>, username: string) => Promise<ToolResult>;
}

export class ToolRegistry {
    private tools: Map<string, Tool> = new Map();

    public register(tool: Tool): void {
        this.tools.set(tool.name, tool);
    }

    public getTool(name: string): Tool | undefined {
        return this.tools.get(name);
    }

    public getAllTools(): Tool[] {
        return Array.from(this.tools.values());
    }
}
