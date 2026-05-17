# mcp-billing-server

**A safe, read-only way for an AI assistant (like Claude) to look at your Cloudflare and Stripe billing data and help you make sense of it.**

If a Cloudflare invoice confuses you, or you can't tell why you're on a Pro plan instead of Free, or you think you've been double-charged — this tool lets you ask Claude in plain English and get a clear answer.

It can only **read** your billing — it cannot change anything, cancel anything, or pay anything.

---

## What you can ask

After setup, you can ask Claude things like:

- *"Walk me through my Cloudflare billing — what am I paying for and why?"*
- *"Do I have any outstanding invoices?"*
- *"Why was I charged $11.56 in February?"*
- *"Am I being double-charged for anything?"*
- *"What plan is my `example.com` domain on?"*
- *"Show me my Stripe balance"* (if you set up Stripe too)

Claude will run the right queries, group everything sensibly, and explain it in plain language — translating Cloudflare's IDs into the actual domain names and plan names you recognize.

---

## Setup for Cloudflare customers (≈10 minutes)

You'll need three things:
1. **Claude Desktop** (free) — the chat app that runs the tool for you
2. **Node.js** installed on your computer — the runtime that powers the tool
3. **A Cloudflare API token** with read-only billing permission

### 1. Install Claude Desktop

Download from [claude.ai/download](https://claude.ai/download). Sign in with your Anthropic account.

### 2. Install Node.js

If you don't have it, go to [nodejs.org](https://nodejs.org) and install the **LTS** version. After installing, open Terminal (Mac) or PowerShell (Windows) and type `node --version` — you should see a number like `v20.12.0` or higher.

### 3. Create a Cloudflare API token

This is the most important step. You're creating a **scoped, read-only** key — it can see your bill but cannot change anything.

1. Go to [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Click **Get started** next to "Create Custom Token"
4. Name it something like `MCP billing read-only`
5. Under **Permissions**, add:
   - **Account** → **Billing** → **Read**
   - *(Optional)* **Zone** → **Zone** → **Read** — only if you want per-domain plan lookups
6. Under **Account Resources**, select **Include → All accounts** (or just the one you care about)
7. Click **Continue to summary** → **Create Token**
8. **Copy the token** — you only see it once. It looks like a long random string.

> ⚠️ **Treat this token like a password.** Don't paste it into chat, email, or screenshots. It only gives read access, but it can still see your billing details.

### 4. Connect the tool to Claude Desktop

Open Claude Desktop's settings file. On a Mac, open Terminal and run:

```sh
open -a TextEdit ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

On Windows:

```powershell
notepad $env:APPDATA\Claude\claude_desktop_config.json
```

If the file is empty or doesn't exist, paste this. If it already has content, merge the `mcpServers` block in.

```json
{
  "mcpServers": {
    "billing": {
      "command": "npx",
      "args": ["-y", "mcp-billing-server"],
      "env": {
        "CLOUDFLARE_API_TOKEN": "paste-your-token-here"
      }
    }
  }
}
```

Replace `paste-your-token-here` with the token you copied. Save the file.

### 5. Restart Claude Desktop

Fully quit (⌘Q on Mac, right-click tray icon on Windows) and reopen. You should see a small 🔌 plug icon at the bottom of the chat input. Click it — `billing` should appear.

### 6. Try it

Type:

> *"What Cloudflare subscriptions do I have? My account ID is `<paste-your-account-id>`."*

Your account ID is the 32-character string in the URL when you're in the Cloudflare dash (e.g. `dash.cloudflare.com/abc123…/...`).

Claude will ask for permission to run the tool — approve it. You'll get a list of every plan on your account.

---

## The "make sense of my bill" superprompt

For a full debugging session, paste this prompt:

> *"Walk me through my full Cloudflare billing. My account ID is `<id>`. I want to understand: every plan I'm on and why, all recent charges and what they were for, whether I have any outstanding balances, whether any charge looks like a possible duplicate, and what I should do next. Be plain-language — translate every ID into the actual domain or product name."*

This activates the `cloudflare-billing-debug` skill (bundled in this repo at `.claude/skills/`) which gives Claude a structured investigation playbook.

---

## What it can and can't see

**Can see** ✅
- All your active subscriptions (account-level and per-domain)
- Billing history: invoice dates, amounts, receipt numbers, paid/unpaid/pending status
- Stripe customers, invoices, subscriptions, charges, balance (if you set up the Stripe token)

**Can't see** ❌
- The Cloudflare dashboard's "Billable usage" tab (per-product unit usage like Workers CPU ms, R2 GB-months). That uses an internal Cloudflare API not in the public SDK. For now, [open that page in your browser](https://dash.cloudflare.com) and paste totals back to Claude if you want help interpreting them.
- Your saved payment method, card details, or billing address (deliberately excluded for safety — no PII)
- Anything that would require write access (refunds, plan changes, cancellations)

---

## Adding Stripe (optional)

If you also run a business on Stripe, add a **restricted key** (not a secret key) with read-only permissions:

1. Go to [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) → **Restricted keys** → **Create restricted key**
2. Grant only: Customers, Invoices, Subscriptions, Charges, Balance — all set to **Read**
3. Copy the key (`rk_live_...`)
4. Add it to your Claude Desktop config under `env`:

```json
"env": {
  "CLOUDFLARE_API_TOKEN": "...",
  "STRIPE_API_KEY": "rk_live_..."
}
```

Restart Claude Desktop. Then ask: *"What's my Stripe balance? List my last 10 customers."*

---

## Troubleshooting

**The 🔌 icon doesn't show up.**
Open Claude Desktop → **Settings** → **Developer** → **Open MCP Log** — that file shows what went wrong. Usually it's a typo in the config JSON. Run the file through [jsonlint.com](https://jsonlint.com) to check syntax.

**"Authentication failed" or "401" errors.**
Your token is missing the right scope. Recreate it with `Account → Billing → Read` selected.

**"undefined" or "404" errors when asking about a specific account/zone.**
Double-check the account/zone ID. It's the 32-character hex string in the dashboard URL, not the domain name.

**Claude says it doesn't have a billing tool.**
Make sure you fully quit and reopened Claude Desktop after editing the config.

**You want to rotate the token.**
Delete the old one at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens), create a new one, update the config, restart Claude Desktop.

---

## Safety model (the short version)

- **Read-only by construction.** No tool in this server calls anything that modifies data. Adding write access would require a code change you can audit.
- **Scoped credentials only.** It refuses to start tools whose token is missing.
- **No PII.** Your billing address, card last-4, and saved payment methods are intentionally not exposed.
- **No persistence.** The tool holds no state between calls — nothing is logged or cached.
- **Open source under MIT.** You can read every line of code at [github.com/dalexeenko/mcp-billing-server](https://github.com/dalexeenko/mcp-billing-server).

---

## Tools available

### Cloudflare
| Tool | What it does |
| --- | --- |
| `cloudflare_list_account_subscriptions` | Lists every plan on an account |
| `cloudflare_get_zone_subscription` | Gets the plan on a specific domain |
| `cloudflare_get_user_subscriptions` | Lists plans across all accounts your token can see |
| `cloudflare_list_billing_history` | Invoices, refunds, prorations — with amounts and status |

### Stripe
| Tool | What it does |
| --- | --- |
| `stripe_list_customers` | List customers (filter by email) |
| `stripe_get_customer` | Get one customer by ID |
| `stripe_list_invoices` | List invoices (filter by customer/status) |
| `stripe_get_invoice` | Get one invoice by ID |
| `stripe_list_subscriptions` | List subscriptions (filter by customer/status) |
| `stripe_list_charges` | List charges (optional customer filter) |
| `stripe_get_balance` | Current balance per currency |

---

## Roadmap

- [ ] Cloudflare per-product **Billable Usage** via GraphQL Analytics API (needs Analytics:Read scope + pricing math)
- [ ] AWS Cost Explorer provider
- [ ] GCP Billing provider
- [ ] Date-range filters on all `list_*` tools
- [ ] Optional remote deployment as a Cloudflare Worker

---

## For developers

Want to hack on it locally?

```sh
git clone https://github.com/dalexeenko/mcp-billing-server
cd mcp-billing-server
npm install
npm run build

# Run with .env file (auto-loaded)
echo 'CLOUDFLARE_API_TOKEN=...' > .env
node dist/index.js   # speaks MCP on stdio

# Or interactive UI for testing:
npx @modelcontextprotocol/inspector node dist/index.js
```

PRs welcome — especially for new providers and the GraphQL Analytics integration. The "read-only by construction" rule is non-negotiable.

## License

MIT — see [LICENSE](./LICENSE).
