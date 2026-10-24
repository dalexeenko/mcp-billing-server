import Cloudflare from "cloudflare";
import { z } from "zod";
import { defineTool, type ToolDef } from "../types.js";

let client: Cloudflare | null = null;

function getClient(): Cloudflare {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    throw new Error(
      "CLOUDFLARE_API_TOKEN is not set. Create a scoped token with Billing:Read (and Zone:Read if you want zone subscriptions)."
    );
  }
  if (!client) {
    client = new Cloudflare({ apiToken: token });
  }
  return client;
}

export const cloudflareTools: ToolDef[] = [
  defineTool({
    name: "cloudflare_list_account_subscriptions",
    description: "List all subscriptions on a Cloudflare account.",
    inputSchema: z.object({
      account_id: z.string().min(1).describe("Cloudflare account ID"),
    }),
    handler: async ({ account_id }) => {
      const page = await getClient().accounts.subscriptions.get({ account_id });
      return page.result;
    },
  }),
  defineTool({
    name: "cloudflare_get_zone_subscription",
    description: "Get the subscription details for a specific zone.",
    inputSchema: z.object({
      zone_id: z.string().min(1).describe("Cloudflare zone ID"),
    }),
    handler: async ({ zone_id }) =>
      getClient().zones.subscriptions.get({ zone_id }),
  }),
  defineTool({
    name: "cloudflare_get_user_subscriptions",
    description:
      "Get user-level (legacy) subscriptions for the API token's user.",
    inputSchema: z.object({}),
    handler: async () => {
      const page = await getClient().user.subscriptions.get();
      return page.result;
    },
  }),
  defineTool({
    name: "cloudflare_list_billing_history",
    description:
      "List the user's billing history (charges, refunds, prorations, plan changes). Each item has amount, currency, description, type, action, occurred_at, and zone. Use this to answer 'why was I charged?', detect potential double charges, see outstanding balances over time, and reconcile against subscriptions. Note: backed by a deprecated Cloudflare API that remains live as of 2026; no replacement is currently exposed in the public SDK.",
    inputSchema: z.object({
      per_page: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe("Items per page (max 100)."),
      page: z.number().int().min(1).default(1),
      type: z
        .string()
        .optional()
        .describe("Filter by billing item type (e.g. 'charge', 'refund')."),
      action: z
        .string()
        .optional()
        .describe("Filter by billing item action."),
      order: z.enum(["type", "occurred_at", "action"]).optional(),
    }),
    handler: async ({ per_page, page, type, action, order }) => {
      const res = await getClient().user.billing.history.list({
        per_page,
        page,
        ...(type ? { type } : {}),
        ...(action ? { action } : {}),
        ...(order ? { order } : {}),
      });
      return res.result;
    },
  }),
];
