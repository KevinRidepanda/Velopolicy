/**
 * netlify/functions/weekly-send.js
 * Called every Monday at 13:00 UTC by GitHub Actions.
 * Generates a fresh weekly brief with Claude + web search,
 * then posts it to Slack.
 *
 * To trigger manually:
 *   curl -X GET https://your-app.netlify.app/api/weekly-send \
 *        -H "Authorization: Bearer YOUR_CRON_SECRET"
 */

exports.handler = async function (event) {
  // Only allow GET and POST
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Auth check — verify CRON_SECRET header
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = event.headers["authorization"] || "";
    if (auth !== `Bearer ${cronSecret}`) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }) };
  }
  if (!webhookUrl) {
    return { statusCode: 500, body: JSON.stringify({ error: "SLACK_WEBHOOK_URL not set" }) };
  }

  const weekLabel = getWeekLabel();
  console.log(`[weekly-send] Generating brief for ${weekLabel}`);

  try {
    // 1. Generate brief with Claude + web search
    const brief = await generateBrief(apiKey, weekLabel);
    console.log(`[weekly-send] Brief generated: ${brief.headline}`);

    // 2. Post to Slack
    const payload = buildSlackPayload(brief, weekLabel);
    const slackRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const slackText = await slackRes.text();
    if (!slackRes.ok) throw new Error(`Slack error ${slackRes.status}: ${slackText}`);

    console.log("[weekly-send] ✓ Brief sent to Slack");
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, week: weekLabel, headline: brief.headline }),
    };
  } catch (err) {
    console.error("[weekly-send] Error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

// ── Helpers ───────────────────────────────────────────────────

function getWeekLabel() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}

async function generateBrief(apiKey, weekLabel) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "web-search-2025-03-05",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `Search the web for the most recent micromobility, e-bike, and cycling legislation news for the week of ${weekLabel}. Return ONLY a raw JSON object (no markdown, no fences):
{
  "headline": "One-sentence summary of the biggest story",
  "summary": "2-3 sentence overview of the week",
  "developments": [
    { "title": "...", "detail": "..." },
    { "title": "...", "detail": "..." },
    { "title": "...", "detail": "..." }
  ],
  "stats": {
    "activeBills": "estimated number",
    "topJurisdiction": "most active body or state",
    "hotTopic": "most discussed policy area"
  }
}`,
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Claude error: ${JSON.stringify(data)}`);

  const textBlock = data.content?.find((c) => c.type === "text");
  if (!textBlock) throw new Error("No text in Claude response");

  const clean = textBlock.text.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{");
  const e = clean.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("No JSON found in response");

  return JSON.parse(clean.slice(s, e + 1));
}

function buildSlackPayload(brief, weekLabel) {
  const devText = (brief.developments || [])
    .map((d) => `• *${d.title}* — ${d.detail}`)
    .join("\n");

  return {
    text: `📋 VeloPolicy Weekly Brief — ${weekLabel}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `🚲 VeloPolicy Weekly Brief — ${weekLabel}`, emoji: true },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*${brief.headline}*\n\n${brief.summary}` },
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*📌 Key Developments*\n\n${devText}` },
      },
      { type: "divider" },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Active Bills*\n${brief.stats?.activeBills || "—"}` },
          { type: "mrkdwn", text: `*Most Active*\n${brief.stats?.topJurisdiction || "—"}` },
          { type: "mrkdwn", text: `*Hot Topic*\n${brief.stats?.hotTopic || "—"}` },
          { type: "mrkdwn", text: `*Period*\n${weekLabel}` },
        ],
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: "Generated by VeloPolicy · Powered by Claude" }],
      },
    ],
  };
}
