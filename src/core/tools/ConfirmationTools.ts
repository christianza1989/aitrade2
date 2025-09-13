// PATH: src/core/tools/ConfirmationTools.ts
import { z } from 'zod';
import { Tool, ToolResult } from './index';

export const confirmActionWithUserTool: Tool = {
    name: "confirm_action_with_user",
    description: "[CONFIRMATION] Asks the user for final confirmation before executing a plan that involves state-changing actions. This must be the final tool in any such plan.",
    permission_level: 'confirmation',
    schema: z.object({
        summary: z.string().describe("A brief, human-readable summary of the actions that will be taken upon confirmation."),
    }),
    async execute(params: Record<string, unknown>, username: string): Promise<ToolResult> {
        // Šis įrankis realiai nieko nevykdo, tik grąžina specialų atsakymą procesoriui.
        const summary = params.summary as string;
        return Promise.resolve({
            success: true,
            data: {
                confirmation_required: true,
                summary: summary,
            },
            error: null,
        });
    }
};
