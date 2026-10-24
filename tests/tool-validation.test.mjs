import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { defineTool } from '../dist/types.js';
import { stripeTools } from '../dist/providers/stripe.js';
import { cloudflareTools } from '../dist/providers/cloudflare.js';

test('tool arguments are validated and defaults applied before the provider runs', async () => {
  const calls = [];
  const tool = defineTool({ name: 'test', description: 'test',
    inputSchema: z.object({ id: z.string().min(1), limit: z.number().int().min(1).default(10) }),
    handler: async (input) => { calls.push(input); return input; },
  });
  await assert.rejects(tool.handler({ id: '', limit: -1 }));
  assert.equal(calls.length, 0);
  assert.deepEqual(await tool.handler({ id: 'example' }), { id: 'example', limit: 10 });
});

test('all advertised provider tools produce object JSON schemas without credentials', () => {
  for (const tool of [...stripeTools, ...cloudflareTools]) {
    const schema = z.toJSONSchema(tool.inputSchema, { target: 'openapi-3.0', io: 'input' });
    assert.equal(schema.type, 'object', tool.name);
    assert.equal(typeof schema.properties, 'object', tool.name);
  }
});
