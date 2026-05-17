import Stripe from "stripe";
import { z } from "zod";
import type { ToolDef } from "../types.js";

let client: Stripe | null = null;

function getClient(): Stripe {
  const key = process.env.STRIPE_API_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_API_KEY is not set. Use a restricted key (rk_...) with read-only permissions."
    );
  }
  if (!client) {
    client = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return client;
}

const limitSchema = z.number().int().min(1).max(100).default(20);

export const stripeTools: ToolDef[] = [
  {
    name: "stripe_list_customers",
    description: "List Stripe customers. Optionally filter by email.",
    inputSchema: z.object({
      email: z.string().email().optional(),
      limit: limitSchema,
    }),
    handler: async ({ email, limit }) => {
      const res = await getClient().customers.list({ email, limit });
      return res.data;
    },
  },
  {
    name: "stripe_get_customer",
    description: "Get a single Stripe customer by ID.",
    inputSchema: z.object({ id: z.string().startsWith("cus_") }),
    handler: async ({ id }) => getClient().customers.retrieve(id),
  },
  {
    name: "stripe_list_invoices",
    description: "List Stripe invoices. Filter by customer and/or status.",
    inputSchema: z.object({
      customer: z.string().startsWith("cus_").optional(),
      status: z
        .enum(["draft", "open", "paid", "uncollectible", "void"])
        .optional(),
      limit: limitSchema,
    }),
    handler: async ({ customer, status, limit }) => {
      const res = await getClient().invoices.list({ customer, status, limit });
      return res.data;
    },
  },
  {
    name: "stripe_get_invoice",
    description: "Get a single Stripe invoice by ID.",
    inputSchema: z.object({ id: z.string().startsWith("in_") }),
    handler: async ({ id }) => getClient().invoices.retrieve(id),
  },
  {
    name: "stripe_list_subscriptions",
    description: "List Stripe subscriptions. Filter by customer and/or status.",
    inputSchema: z.object({
      customer: z.string().startsWith("cus_").optional(),
      status: z
        .enum([
          "active",
          "past_due",
          "unpaid",
          "canceled",
          "incomplete",
          "incomplete_expired",
          "trialing",
          "all",
        ])
        .optional(),
      limit: limitSchema,
    }),
    handler: async ({ customer, status, limit }) => {
      const res = await getClient().subscriptions.list({
        customer,
        status,
        limit,
      });
      return res.data;
    },
  },
  {
    name: "stripe_list_charges",
    description: "List Stripe charges. Filter by customer.",
    inputSchema: z.object({
      customer: z.string().startsWith("cus_").optional(),
      limit: limitSchema,
    }),
    handler: async ({ customer, limit }) => {
      const res = await getClient().charges.list({ customer, limit });
      return res.data;
    },
  },
  {
    name: "stripe_get_balance",
    description:
      "Get the current Stripe account balance (available + pending per currency).",
    inputSchema: z.object({}),
    handler: async () => getClient().balance.retrieve(),
  },
];
