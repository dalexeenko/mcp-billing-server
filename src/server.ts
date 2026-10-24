import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { stripeTools } from "./providers/stripe.js";
import { cloudflareTools } from "./providers/cloudflare.js";
import type { ToolDef } from "./types.js";

const allTools: ToolDef[] = [...stripeTools, ...cloudflareTools];
const toolMap = new Map(allTools.map((t) => [t.name, t]));

export function createServer(): Server {
  const server = new Server(
    { name: "mcp-billing-server", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: z.toJSONSchema(t.inputSchema, { target: "openapi-3.0", io: "input" }),
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = toolMap.get(req.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
      };
    }
    try {
      const result = await tool.handler(req.params.arguments ?? {});
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { isError: true, content: [{ type: "text", text: msg }] };
    }
  });

  return server;
}
