# 🚲 VeloPolicy — Netlify Edition

Micromobility & cycling policy intelligence platform.
Hosted on Netlify (free) · AI powered by Claude · Automated via GitHub Actions.

---

## Project structure

```
velopolicy/
├── netlify/
│   └── functions/
│       ├── claude.js        ← Anthropic API proxy (key stays server-side)
│       ├── slack.js         ← Slack webhook proxy
│       └── weekly-send.js   ← Cron endpoint: generates + posts weekly brief
├── public/                  ← Everything Netlify serves to the browser
│   ├── index.html
│   ├── styles/
│   │   └── app.css
│   └── js/
│       ├── data.js          ← Bill data, topics, history
│       ├── app.js           ← All UI logic
│       └── charts.js        ← Chart.js setup
├── lib/
│   └── bills.js             ← Bill data for server-side functions
├── scripts/
│   ├── test-claude.js       ← Verify Anthropic API key
│   └── test-slack.js        ← Send a test Slack message
├── .github/
│   └── workflows/
│       └── weekly-brief.yml ← Free Monday cron via GitHub Actions
├── .env.example             ← Template — copy to .env.local, fill in keys
├── .gitignore               ← Prevents .env.local from going to GitHub
├── netlify.toml             ← Netlify build + redirect config
├── package.json
└── README.md
```

---

## Required environment variables

Add these in **Netlify → Site configuration → Environment variables**.
Never put them in GitHub.

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| `SLACK_WEBHOOK_URL` | [api.slack.com/apps](https://api.slack.com/apps) → Your app → Incoming Webhooks |
| `CRON_SECRET` | Any long random string you make up — also add to GitHub Secrets |

---

## GitHub Secrets (for the weekly cron)

Add these in **GitHub repo → Settings → Secrets and variables → Actions**.

| Secret | Value |
|---|---|
| `APP_URL` | Your Netlify URL, e.g. `https://velopolicy.netlify.app` |
| `CRON_SECRET` | Same value as in Netlify environment variables |

---

## Deploying

1. Upload all files to GitHub (see setup guide)
2. Connect repo to Netlify → Import from Git
3. Build settings: build command `echo 'no build'`, publish directory `public`
4. Add environment variables in Netlify dashboard
5. Deploy — done

## Testing the weekly send manually

Go to GitHub → Actions tab → Weekly Policy Brief → Run workflow.
Check your Slack channel after ~30 seconds.
