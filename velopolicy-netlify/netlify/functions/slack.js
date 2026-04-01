/**
 * netlify/functions/slack.js
 * Sends a Slack message via Incoming Webhook.
 * Keeps SLACK_WEBHOOK_URL out of the browser.
 */

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error:
          "SLACK_WEBHOOK_URL is not set. Add it in Netlify → Site configuration → Environment variables.",
      }),
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");

    const slackRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await slackRes.text();

    if (!slackRes.ok) {
      console.error("Slack webhook error:", slackRes.status, text);
      return {
        statusCode: slackRes.status,
        headers: corsHeaders(),
        body: JSON.stringify({ error: `Slack returned ${slackRes.status}: ${text}` }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("Slack proxy error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}
