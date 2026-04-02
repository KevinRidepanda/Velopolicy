// public/js/app.js
// All UI logic. API calls go to /api/claude and /api/slack,
// which Netlify redirects to /.netlify/functions/claude and /slack.

// ── API helpers ───────────────────────────────────────────────

async function callClaude(body) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}

async function callSlack(payload) {
  const res = await fetch('/api/slack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Slack error ${res.status}`);
  return data;
}

// ── Toast ─────────────────────────────────────────────────────

function toast(msg, emoji = 'ℹ️') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${emoji}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ── Status dots ───────────────────────────────────────────────

function setSbDot(id, state) {
  const el = document.getElementById(id);
  if (el) el.className = 'sb-dot' + (state ? ' ' + state : '');
}

// ── Navigation ────────────────────────────────────────────────

function renderTopbar(id) {
  const meta = PAGE_META[id] || { title: id, sub: '' };
  document.getElementById('topbar').innerHTML = `
    <div class="topbar">
      <div>
        <div class="tb-title">${meta.title}</div>
        <div class="tb-sub">${meta.sub}</div>
      </div>
      <div class="tb-actions"></div>
    </div>`;
}

function nav(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');
  const ni = document.querySelector(`.ni[data-page="${id}"]`);
  if (ni) ni.classList.add('active');
  renderTopbar(id);
}

// ── Boot ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Sidebar links
  document.querySelectorAll('.ni[data-page]').forEach(el => {
    el.addEventListener('click', () => nav(el.dataset.page));
  });

  // data-goto buttons inside page content
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-goto]');
    if (el) nav(el.dataset.goto);
  });

  renderTopbar('dashboard');
  buildWatchlist();
  buildTopicGrid();
  buildDevelopments();
  buildSearchPage();
  buildLegTable();
  buildExportPage();
  buildSlackPage();
  buildAnalyzePage();

  setSbDot('sb-api', 'ok');
  setSbDot('sb-slack', 'ok');
});

// ── Dashboard ─────────────────────────────────────────────────

function buildWatchlist() {
  const el = document.getElementById('watchlist');
  if (!el) return;
  el.innerHTML = BILLS.filter(b => b.p === 'high').map(b => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);cursor:pointer"
         onmouseover="this.style.background='var(--surface)'"
         onmouseout="this.style.background=''"
         onclick="nav('legislation')">
      <span class="pd ph"></span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.title}</div>
        <div class="lid">${b.id}</div>
      </div>
      <span class="sb s-${b.s}">${STATUS_LABELS[b.s]}</span>
    </div>`).join('');
}

// ── Weekly Brief ──────────────────────────────────────────────

function buildTopicGrid() {
  const el = document.getElementById('topic-grid');
  if (!el) return;
  el.innerHTML = TOPICS.map(t => `
    <div class="tc" onclick="nav('legislation')">
      <div class="tc-icon">${t.icon}</div>
      <div class="tc-title">${t.title}</div>
      <div class="tc-desc">${t.desc}</div>
      <div class="tc-n">${t.n} tracked →</div>
    </div>`).join('');
}

function buildDevelopments() {
  const el = document.getElementById('key-developments');
  if (!el) return;
  el.innerHTML = DEVELOPMENTS.map((x, i) => `
    <div style="display:flex;gap:14px;padding:12px 16px;${i < DEVELOPMENTS.length - 1 ? 'border-bottom:1px solid var(--border)' : ''}">
      <div style="min-width:44px;font-size:11px;color:var(--muted);text-align:right;padding-top:2px">${x.d}</div>
      <div>
        <div style="font-size:13px;font-weight:600;margin-bottom:3px">${x.title}</div>
        <div style="font-size:12.5px;color:var(--muted);line-height:1.6">${x.body}</div>
      </div>
    </div>`).join('');

  document.getElementById('brief-slack-btn')?.addEventListener('click', () => {
    nav('slack');
    setTimeout(() => document.getElementById('slack-send-now')?.click(), 400);
  });
}

// ── Live Search ───────────────────────────────────────────────

function buildSearchPage() {
  // Quick topic chips
  const topicsEl = document.getElementById('search-topics');
  if (topicsEl) {
    topicsEl.innerHTML = SEARCH_TOPICS.map(t =>
      `<span class="stopic" data-q="${t}">${t}</span>`).join('');
    topicsEl.querySelectorAll('.stopic').forEach(el => {
      el.addEventListener('click', () => {
        topicsEl.querySelectorAll('.stopic').forEach(s => s.classList.remove('on'));
        el.classList.add('on');
        document.getElementById('search-q').value = el.dataset.q;
        doSearch();
      });
    });
  }

  document.getElementById('search-btn')?.addEventListener('click', doSearch);
  document.getElementById('search-q')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
  });
  document.getElementById('add-monitor-btn')?.addEventListener('click', () => {
    const q = document.getElementById('search-q')?.value.trim();
    if (!q) { toast('Enter a query first', '⚠️'); return; }
    toast('Monitor saved for: ' + q.substring(0, 40), '🔔');
  });

  // Saved monitors list
  const monEl = document.getElementById('monitor-list');
  if (monEl) {
    monEl.innerHTML = MONITORS.map(m => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border)">
        <span style="font-size:14px">🔔</span>
        <div style="flex:1">
          <div style="font-size:12.5px;font-weight:500">${m.q}</div>
          <div style="font-size:11px;color:var(--muted)">${m.freq} · Last run: ${m.last} · ${m.hits} new results</div>
        </div>
        <span class="sb s-enacted">${m.hits} new</span>
        <button class="btn sm" onclick="quickRunMonitor('${m.q}')">Run now</button>
      </div>`).join('');
  }
}

function quickRunMonitor(q) {
  document.getElementById('search-q').value = q;
  nav('search');
  doSearch();
}

async function doSearch() {
  const q = document.getElementById('search-q')?.value.trim();
  if (!q) { toast('Enter a search query'); return; }

  const sr  = document.getElementById('search-results');
  const lbl = document.getElementById('search-status-label');
  const act = document.getElementById('search-hdr-actions');

  setSbDot('sb-search', 'busy');
  if (sr)  sr.innerHTML  = '<div class="loading-row"><div class="spin"></div>Searching live web for legislation…</div>';
  if (lbl) lbl.textContent = 'Searching…';
  if (act) act.innerHTML = '';

  const prompt = `You are a micromobility policy research assistant. Search the web for recent news, bills, and legislative developments about: "${q}". Focus on government sources, advocacy organizations, and reputable news outlets. Return ONLY a JSON array (no markdown fences, no extra text):
[{"title":"...","snippet":"...","source":"...","url":"...","date":"...","type":"bill|news|report|agency","relevance":"high|medium"}]
Return 4-6 items.`;

  try {
    const data = await callClaude({
      max_tokens: 600,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    });

    setSbDot('sb-search', 'ok');

    const textBlock = data.content?.find(c => c.type === 'text');
    let results = [];
    if (textBlock) {
      try {
        const clean = textBlock.text.replace(/```json|```/g, '').trim();
        const s = clean.indexOf('['), e = clean.lastIndexOf(']');
        if (s >= 0 && e > s) results = JSON.parse(clean.slice(s, e + 1));
      } catch (_) {}
    }

    if (!results.length) {
      const fallback = data.content?.filter(c => c.type === 'text').map(c => c.text).join('\n') || 'No results found.';
      if (sr)  sr.innerHTML  = `<div style="padding:16px;font-size:13px;line-height:1.75">${fallback.replace(/\n/g, '<br>')}</div>`;
      if (lbl) lbl.textContent = `Results for: ${q}`;
      return;
    }

    if (lbl) lbl.textContent = `${results.length} results for: ${q}`;
    if (act) act.innerHTML = `<button class="btn secondary sm" onclick="toast('Monitor saved','🔔')">+ Save as Monitor</button>`;

    if (sr) sr.innerHTML = results.map(r => `
      <div class="result-item">
        <div class="ri-meta">
          <span class="sb ${r.relevance === 'high' ? 's-enacted' : 's-committee'}">${r.relevance === 'high' ? 'High relevance' : 'Relevant'}</span>
          <span class="stag">${r.type || 'news'}</span>
          <span style="font-size:10.5px;color:var(--muted)">${r.date || ''}</span>
        </div>
        <div class="ri-title">${r.title}</div>
        <div class="ri-snippet">${r.snippet}</div>
        <div style="margin-top:6px;display:flex;align-items:center;gap:8px">
          <a class="ri-source" href="${r.url || '#'}" target="_blank" rel="noopener">${r.source || 'Source'} ↗</a>
          <button class="btn sm" onclick="toast('Added to tracker','📌')">+ Track</button>
        </div>
      </div>`).join('');

  } catch (err) {
    setSbDot('sb-search', '');
    if (sr)  sr.innerHTML  = `<div style="padding:16px;font-size:13px;color:var(--red)">Search failed: ${err.message}<br><small style="color:var(--muted)">Check that ANTHROPIC_API_KEY is set in Netlify environment variables.</small></div>`;
    if (lbl) lbl.textContent = 'Search failed';
  }
}

// ── Bill Tracker ──────────────────────────────────────────────

let legFilter = 'all';

function buildLegTable() {
  const filtersEl = document.getElementById('leg-filters');
  if (!filtersEl) return;

  const leftFilters  = [
    { f:'all',     label:'All (142)' },
    { f:'federal', label:'Federal'   },
    { f:'state',   label:'State'     },
    { f:'local',   label:'Local'     },
    { f:'intl',    label:'International' },
  ];
  const rightFilters = [
    { f:'high',    label:'🔴 High Priority' },
    { f:'enacted', label:'✅ Enacted'       },
  ];

  filtersEl.innerHTML =
    leftFilters.map(f => `<button class="fb${f.f === 'all' ? ' active' : ''}" data-filter="${f.f}">${f.label}</button>`).join('') +
    `<span style="margin-left:auto;display:flex;gap:6px">` +
    rightFilters.map(f => `<button class="fb" data-filter="${f.f}">${f.label}</button>`).join('') +
    `</span>`;

  filtersEl.querySelectorAll('.fb').forEach(btn => {
    btn.addEventListener('click', () => {
      filtersEl.querySelectorAll('.fb').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      legFilter = btn.dataset.filter;
      renderLegTable();
    });
  });

  renderLegTable();
}

function renderLegTable() {
  const el = document.getElementById('leg-body');
  if (!el) return;
  const filtered = BILLS.filter(b => {
    if (legFilter === 'all')     return true;
    if (legFilter === 'high')    return b.p === 'high';
    if (legFilter === 'enacted') return b.s === 'enacted';
    return b.scope === legFilter;
  });
  el.innerHTML = filtered.map(b => `
    <tr onclick="nav('analyze')">
      <td><span class="pd p${b.p[0]}"></span></td>
      <td class="lid">${b.id}</td>
      <td class="ltitle">${b.title}</td>
      <td><span class="stag">${b.topic}</span></td>
      <td><span class="scope-pill sp-${b.scope}">${b.scope.toUpperCase()}</span></td>
      <td style="font-size:12px;color:var(--muted)">${b.jur}</td>
      <td><span class="sb s-${b.s}">${STATUS_LABELS[b.s]}</span></td>
      <td style="font-size:11px;color:var(--muted);white-space:nowrap">${b.upd}</td>
    </tr>`).join('');
}

// ── PDF Export ────────────────────────────────────────────────

let exportType = 'weekly';

function buildExportPage() {
  const optEl = document.getElementById('export-options');
  if (optEl) {
    optEl.innerHTML = EXPORT_OPTIONS.map((o, i) => `
      <div class="export-option${i === 0 ? ' selected' : ''}" data-export="${o.id}">
        <div class="eo-icon">${o.icon}</div>
        <div class="eo-title">${o.title}</div>
        <div class="eo-desc">${o.desc}</div>
      </div>`).join('');
    optEl.querySelectorAll('.export-option').forEach(el => {
      el.addEventListener('click', () => {
        optEl.querySelectorAll('.export-option').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        exportType = el.dataset.export;
      });
    });
  }

  const secEl = document.getElementById('export-sections');
  if (secEl) {
    secEl.innerHTML = EXPORT_SECTIONS.map(s => `
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
        <input type="checkbox" id="${s.id}" ${s.def ? 'checked' : ''}> ${s.label}
      </label>`).join('');
  }

  document.getElementById('generate-pdf-btn')?.addEventListener('click', generatePDF);
}

function generatePDF() {
  const statusEl = document.getElementById('pdf-status');
  const include = {
    summary:      document.getElementById('cb-summary')?.checked,
    developments: document.getElementById('cb-developments')?.checked,
    table:        document.getElementById('cb-table')?.checked,
  };

  const billRows = BILLS
    .filter(b => b.p !== 'low')
    .map(b => `<tr><td>${b.id}</td><td>${b.title}</td><td>${b.jur}</td><td>${STATUS_LABELS[b.s]}</td></tr>`)
    .join('');

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>VeloPolicy Weekly Brief — Apr 6, 2026</title>
<style>
  body{font-family:Georgia,serif;margin:48px;color:#111;font-size:13px;line-height:1.7;max-width:720px}
  .header{border-bottom:3px solid #1a4731;padding-bottom:12px;margin-bottom:24px}
  .logo{font-size:22px;font-weight:700;color:#1a4731;margin-bottom:2px}
  .week{font-size:11px;color:#666}
  h1{font-size:20px;color:#111;margin:24px 0 8px;font-weight:700}
  h2{font-size:12px;color:#1a4731;margin:20px 0 6px;text-transform:uppercase;letter-spacing:.5px;font-family:Arial,sans-serif}
  p{margin-bottom:10px;color:#333;font-family:Arial,sans-serif;font-size:13px}
  .dev{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #eee}
  .dev-date{font-size:10px;color:#999;font-family:Arial,sans-serif}
  .dev-title{font-size:14px;font-weight:700;margin:2px 0}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:11px;font-family:Arial,sans-serif}
  th{text-align:left;padding:6px 8px;border-bottom:2px solid #1a4731;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#666}
  td{padding:7px 8px;border-bottom:1px solid #eee;color:#333}
  .footer{margin-top:48px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#999;text-align:center;font-family:Arial,sans-serif}
  @media print{body{margin:24px}}
</style></head><body>
<div class="header">
  <div class="logo">🚲 VeloPolicy — Micromobility Policy Intelligence</div>
  <div class="week">Weekly Brief · Week of March 31 – April 6, 2026 · Vol. 12</div>
</div>
<h1>E-Bike Tax Credits, Urban Lane Mandates &amp; EU Safety Harmonization</h1>
${include.summary ? `<h2>Executive Summary</h2><p>This week's legislative landscape shows accelerating momentum around e-bike incentive programs at the federal level, while several states move protected infrastructure bills toward floor votes. The EU's draft harmonization directive is reshaping international policy benchmarks. 142 bills are actively tracked across 41 jurisdictions.</p>` : ''}
${include.developments ? `<h2>Key Developments</h2>${DEVELOPMENTS.map(x => `<div class="dev"><div class="dev-date">${x.d}, 2026</div><div class="dev-title">${x.title}</div><p>${x.body}</p></div>`).join('')}` : ''}
${include.table ? `<h2>High-Priority Bill Tracker</h2><table><thead><tr><th>Bill ID</th><th>Title</th><th>Jurisdiction</th><th>Status</th></tr></thead><tbody>${billRows}</tbody></table>` : ''}
<div class="footer">Generated by VeloPolicy · velopolicy.io · ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'VeloPolicy_Brief_Apr6_2026.html';
  a.click();
  URL.revokeObjectURL(url);

  if (statusEl) {
    statusEl.textContent = '✓ Downloaded — open in browser, then File → Print → Save as PDF';
    setTimeout(() => statusEl.textContent = '', 8000);
  }
  toast('Report downloaded!', '📄');
}

// ── Slack Automation ──────────────────────────────────────────

function buildSlackPage() {
  // Day chips
  const daysEl = document.getElementById('schedule-days');
  if (daysEl) {
    daysEl.innerHTML = ['Monday','Tuesday','Wednesday','Thursday','Friday'].map((d, i) =>
      `<span class="sch-opt${i === 0 ? ' on' : ''}">${d}</span>`).join('');
    daysEl.querySelectorAll('.sch-opt').forEach(el => {
      el.addEventListener('click', () => el.classList.toggle('on'));
    });
  }

  // Content checkboxes
  const checksEl = document.getElementById('slack-content-checks');
  if (checksEl) {
    checksEl.innerHTML = [
      ['sl-summary',      'Weekly headline & summary',  true ],
      ['sl-developments', 'Key developments (top 3)',   true ],
      ['sl-highpri',      'High-priority bill updates', true ],
      ['sl-monitors',     'New search monitor results', false],
      ['sl-pdf',          'Attach PDF report',          false],
    ].map(([id, label, def]) => `
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
        <input type="checkbox" id="${id}" ${def ? 'checked' : ''}> ${label}
      </label>`).join('');
  }

  // Live preview sync
  document.getElementById('slack-channel')?.addEventListener('input', function () {
    const el = document.getElementById('slack-preview-channel');
    if (el) el.textContent = this.value || '#channel';
  });
  document.getElementById('slack-botname')?.addEventListener('input', function () {
    const el = document.getElementById('slack-preview-botname');
    if (el) el.textContent = this.value || 'Bot';
  });

  // Delivery history
  const histEl = document.getElementById('slack-history');
  if (histEl) {
    histEl.innerHTML = SLACK_HISTORY.map(h => `
      <div class="hist-item">
        <span class="hist-icon">${h.icon}</span>
        <div class="hist-detail">
          <div style="font-size:12px;font-weight:500">${h.d}</div>
          <div class="hist-time">${h.t}</div>
        </div>
        <span class="hist-status hs-${h.s}">${{ok:'Sent ✓', fail:'Failed ✗'}[h.s]}</span>
      </div>`).join('');
  }

  document.getElementById('slack-send-now')?.addEventListener('click', sendSlackNow);
  document.getElementById('slack-save-schedule')?.addEventListener('click', saveSchedule);
}

async function sendSlackNow() {
  const btn = document.getElementById('slack-send-now');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating…'; }
  setSbDot('sb-slack', 'busy');

  const prompt = `You are VeloPolicy, a micromobility policy intelligence tool. Write a concise Slack message for the weekly brief (week of March 31–April 6, 2026). Include: a short headline (1 sentence), top 3 developments as bullet points with •, and a closing line. Use Slack markdown: *bold*. Under 200 words. Be direct and informative.`;

  try {
    const data = await callClaude({
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const msgText = data.content?.find(c => c.type === 'text')?.text || 'Brief generated.';

    // Update preview
    const previewEl = document.getElementById('slack-preview-body');
    if (previewEl) {
      previewEl.innerHTML = msgText
        .replace(/\n/g, '<br>')
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    }

    // Build Slack payload
    const highPri = BILLS.filter(b => b.p === 'high');
    const payload = {
      text: '📋 VeloPolicy Weekly Brief — Week of Mar 31–Apr 6, 2026',
      blocks: [
        { type:'header', text:{ type:'plain_text', text:'🚲 VeloPolicy Weekly Brief — Mar 31–Apr 6, 2026', emoji:true }},
        { type:'section', text:{ type:'mrkdwn', text: msgText }},
        { type:'divider' },
        { type:'section', text:{ type:'mrkdwn', text: '*🔴 High-Priority Updates*\n\n' +
          highPri.slice(0,3).map(b => `• *${b.id}* — ${b.title} _(${STATUS_LABELS[b.s]})_`).join('\n')
        }},
        { type:'context', elements:[{ type:'mrkdwn', text:'Generated by VeloPolicy · Powered by Claude · velopolicy.io' }]},
      ],
    };

    await callSlack(payload);
    setSbDot('sb-slack', 'ok');

    // Add to history
    const histEl = document.getElementById('slack-history');
    if (histEl) {
      histEl.insertAdjacentHTML('afterbegin', `
        <div class="hist-item">
          <span class="hist-icon">💬</span>
          <div class="hist-detail">
            <div style="font-size:12px;font-weight:500">Test Send — Week of Mar 31 (AI-generated)</div>
            <div class="hist-time">Just now</div>
          </div>
          <span class="hist-status hs-ok">Sent ✓</span>
        </div>`);
    }
    toast('Brief sent to Slack!', '✅');

  } catch (err) {
    setSbDot('sb-slack', '');
    toast('Slack send failed: ' + err.message, '❌');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '💬 Send Now (Test)'; }
  }
}

function saveSchedule() {
  const days = [...document.querySelectorAll('.sch-opt.on')].map(e => e.textContent).join(', ');
  const time = document.getElementById('slack-time')?.value || '8:00 AM';
  if (!days) { toast('Select at least one send day', '⚠️'); return; }
  toast(`Schedule saved — every ${days} at ${time}`, '✅');
}

// ── AI Analysis ───────────────────────────────────────────────

function buildAnalyzePage() {
  const chipsEl = document.getElementById('analysis-chips');
  if (!chipsEl) return;

  chipsEl.innerHTML = ANALYSIS_CHIPS.map((c, i) =>
    `<span class="stopic${i === 0 ? ' on' : ''}">${c}</span>`).join('');

  chipsEl.querySelectorAll('.stopic').forEach(el => {
    el.addEventListener('click', () => el.classList.toggle('on'));
  });

  const btn = document.createElement('button');
  btn.className = 'btn primary';
  btn.style.marginLeft = 'auto';
  btn.textContent = 'Analyze →';
  btn.addEventListener('click', runAnalysis);
  chipsEl.appendChild(btn);

  document.getElementById('copy-result-btn')?.addEventListener('click', () => {
    const text = document.getElementById('result-area')?.innerText || '';
    navigator.clipboard?.writeText(text).then(() => toast('Copied!', '📋'));
  });
}

async function runAnalysis() {
  const text = document.getElementById('bill-text')?.value.trim();
  if (!text) { toast('Enter bill text or a topic first'); return; }

  const chips  = [...document.querySelectorAll('#analysis-chips .stopic.on')].map(c => c.textContent).join(', ');
  const ra     = document.getElementById('result-area');
  const rc     = document.getElementById('result-card');
  if (rc) rc.style.display = 'block';
  if (ra) ra.innerHTML = '<div class="loading-row"><div class="spin"></div>Analyzing with Claude…</div>';
  setSbDot('sb-api', 'busy');

  const prompt = `You are a policy analyst specializing in cycling, e-bikes, and micromobility legislation. Analyze the following and provide a structured policy brief.

Analysis focus areas: ${chips || 'Policy Summary'}

Content:
${text}

Use these ## section headers. Be specific and substantive.
## Policy Summary
## Key Provisions
## Stakeholder Impact
## Equity Considerations
## Advocacy Notes`;

  try {
    const data = await callClaude({
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = data.content?.find(c => c.type === 'text')?.text || 'No response.';
    if (ra) {
      ra.innerHTML = raw.split(/\n## /).map((s, i) => {
        if (i === 0 && !s.startsWith('#')) return s ? `<p style="margin-bottom:12px">${s}</p>` : '';
        const parts = s.replace(/^## /, '').split('\n');
        const title = parts[0];
        const body  = parts.slice(1).join('\n').trim()
          .replace(/\n[•\-] /g, '<br>• ')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>');
        return `<div style="margin-bottom:18px">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--green);margin-bottom:6px;padding-bottom:5px;border-bottom:1px solid var(--green-pale)">${title}</div>
          <div style="font-size:13px;line-height:1.75">${body}</div>
        </div>`;
      }).join('');
    }
    setSbDot('sb-api', 'ok');

  } catch (err) {
    if (ra) ra.innerHTML = `<div style="color:var(--red);font-size:13px">Analysis failed: ${err.message}<br><small style="color:var(--muted)">Check that ANTHROPIC_API_KEY is set in Netlify → Environment variables.</small></div>`;
    setSbDot('sb-api', '');
  }
}
