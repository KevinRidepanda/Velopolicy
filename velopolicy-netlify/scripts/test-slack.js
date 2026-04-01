#!/usr/bin/env node
// scripts/test-slack.js
// Sends a test message to verify your Slack webhook is working.
// Run: node scripts/test-slack.js
// Requires SLACK_WEBHOOK_URL in .env.local or your environment.

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.local if present
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && !key.startsWith('#')) process.env[key.trim()] = vals.join('=').trim();
  });
}

const webhookUrl = process.env.SLACK_WEBHOOK_URL;
if (!webhookUrl) {
  console.error('Error: SLACK_WEBHOOK_URL is not set in .env.local');
  process.exit(1);
}

const payload = {
  text: '🧪 VeloPolicy — integration test',
  blocks: [
    { type:'header', text:{ type:'plain_text', text:'🚲 VeloPolicy — Slack Test', emoji:true }},
    { type:'section', text:{ type:'mrkdwn', text:'✅ Your Slack webhook is working.\nVeloPolicy can deliver weekly briefs to this channel.' }},
    { type:'context', elements:[{ type:'mrkdwn', text:`Sent from scripts/test-slack.js · ${new Date().toISOString()}` }]},
  ],
};

console.log('Sending test message to Slack...');
const res = await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const body = await res.text();
if (res.ok) {
  console.log('✓ Message sent! Check your Slack channel.');
} else {
  console.error(`✗ Slack returned ${res.status}: ${body}`);
  process.exit(1);
}
