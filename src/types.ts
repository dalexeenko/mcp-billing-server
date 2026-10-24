import type { z } from "zod";

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: unknown) => Promise<unknown>;
}

export function defineTool<S extends z.ZodType>(definition: {
  name: string;
  description: string;
  inputSchema: S;
  handler: (input: z.output<S>) => Promise<unknown>;
}): ToolDef {
  return {
    ...definition,
    handler: async (input: unknown) => definition.handler(definition.inputSchema.parse(input)),
  };
}
