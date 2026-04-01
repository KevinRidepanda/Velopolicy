#!/usr/bin/env node
// scripts/test-claude.js
// Verifies your Anthropic API key is valid.
// Run: node scripts/test-claude.js
// Requires ANTHROPIC_API_KEY in .env.local or your environment.

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && !key.startsWith('#')) process.env[key.trim()] = vals.join('=').trim();
  });
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('Error: ANTHROPIC_API_KEY is not set in .env.local');
  process.exit(1);
}

console.log('Testing Anthropic API key...');
const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 30,
    messages: [{ role: 'user', content: 'Reply with exactly: VeloPolicy API test OK' }],
  }),
});

const data = await res.json();
if (!res.ok) {
  console.error('✗ API error:', data);
  process.exit(1);
}

const text = data.content?.find(c => c.type === 'text')?.text || '';
console.log('✓ API key valid. Response:', text);
console.log('✓ Ready to deploy.');
