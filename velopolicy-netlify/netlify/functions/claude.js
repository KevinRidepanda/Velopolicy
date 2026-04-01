/**
 * netlify/functions/claude.js
 * Secure server-side proxy for all Anthropic API calls.
 * Keeps ANTHROPIC_API_KEY out of the browser entirely.
 *
 * Netlify Functions use exports.handler instead of export default.
 */

exports.handler = async function (event) {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error:
          "ANTHROPIC_API_KEY is not set. Add it in Netlify → Site configuration → Environment variables.",
      }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    // Always use the correct model
    body.model = "claude-sonnet-4-20250514";

    // Build upstream headers
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };

    // Enable web search beta header if the request includes web search tool
    const hasWebSearch = (body.tools || []).some(
      (t) => t.type === "web_search_20250305" || t.name === "web_search"
    );
    if (hasWebSearch) {
      headers["anthropic-beta"] = "web-search-2025-03-05";
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error("Anthropic API error:", data);
      return {
        statusCode: upstream.status,
        headers: corsHeaders(),
        body: JSON.stringify({ error: data }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("Proxy error:", err);
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
