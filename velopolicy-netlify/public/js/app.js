// public/js/app.js
// VeloPolicy — complete application logic.
// All API calls go to /api/claude and /api/slack (Netlify function proxies).
// Bills are stored in localStorage and managed through the dashboard.

// ─────────────────────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// BILL STORAGE (localStorage)
// ─────────────────────────────────────────────────────────────

function loadTrackedBills() {
  try {
    const stored = localStorage.getItem('velopolicy_bills');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

function saveTrackedBills(bills) {
  try {
    localStorage.setItem('velopolicy_bills', JSON.stringify(bills));
  } catch (e) {
    console.error('Could not save bills:', e);
  }
}

// Keep window.BILLS in sync — charts.js reads this
function syncBills() {
  window.BILLS = loadTrackedBills();
  return window.BILLS;
}

// ─────────────────────────────────────────────────────────────
// TOAST & STATUS DOTS
// ─────────────────────────────────────────────────────────────

function toast(msg, emoji) {
  emoji = emoji || 'i';
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = '<span>' + emoji + '</span><span>' + msg + '</span>';
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 4000);
}

function setSbDot(id, state) {
  const el = document.getElementById(id);
  if (el) el.className = 'sb-dot' + (state ? ' ' + state : '');
}

// ─────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────

function renderTopbar(id) {
  const meta = PAGE_META[id] || { title: id, sub: '' };
  const topbar = document.getElementById('topbar');
  if (!topbar) return;
  topbar.innerHTML =
    '<div class="topbar">' +
    '<div>' +
    '<div class="tb-title">' + meta.title + '</div>' +
    '<div class="tb-sub">' + meta.sub + '</div>' +
    '</div>' +
    '<div class="tb-actions" id="topbar-actions"></div>' +
    '</div>';
}

function nav(id) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.ni').forEach(function(n) { n.classList.remove('active'); });
  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');
  const ni = document.querySelector('.ni[data-page="' + id + '"]');
  if (ni) ni.classList.add('active');
  renderTopbar(id);
  if (id === 'dashboard') refreshDashboard();
  if (id === 'brief') buildDevelopments();
  if (id === 'legislation') renderLegTable();
  if (id === 'export') { buildBillCheckboxes(); updatePreview(); }
}

// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  syncBills();

  document.querySelectorAll('.ni[data-page]').forEach(function(el) {
    el.addEventListener('click', function() { nav(el.dataset.page); });
  });

  document.addEventListener('click', function(e) {
    const el = e.target.closest('[data-goto]');
    if (el) nav(el.dataset.goto);
  });

  renderTopbar('dashboard');
  refreshDashboard();
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

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────

function refreshDashboard() {
  const bills     = syncBills();
  const total     = bills.length;
  const high      = bills.filter(function(b) { return b.p === 'high'; }).length;
  const committee = bills.filter(function(b) { return b.s === 'committee'; }).length;
  const enacted   = bills.filter(function(b) { return b.s === 'enacted'; }).length;

  setText('m-total',     total);
  setText('m-high',      high);
  setText('m-committee', committee);
  setText('m-enacted',   enacted);

  const emptyEl   = document.getElementById('empty-state');
  const contentEl = document.getElementById('dashboard-content');
  if (emptyEl)   emptyEl.style.display   = total === 0 ? 'block' : 'none';
  if (contentEl) contentEl.style.display = total === 0 ? 'none'  : 'block';

  buildWatchlist();
  buildManageBills();
  if (typeof rebuildCharts === 'function') rebuildCharts();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function buildWatchlist() {
  const el    = document.getElementById('watchlist');
  if (!el) return;
  const bills = window.BILLS || [];
  const high  = bills.filter(function(b) { return b.p === 'high'; });

  if (!high.length) {
    el.innerHTML = '<div style="padding:20px 16px;font-size:13px;color:var(--muted)">No high-priority bills yet. Use <strong>Live Search</strong> to find and track legislation.</div>';
    return;
  }

  el.innerHTML = high.map(function(b) {
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);cursor:pointer"' +
      ' onmouseover="this.style.background=\'var(--surface)\'"' +
      ' onmouseout="this.style.background=\'\'"' +
      ' onclick="openBillDetail(\'' + escId(b.id) + '\')">' +
      '<span class="pd ph"></span>' +
      '<div style="flex:1;min-width:0">' +
      '<div style="font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + b.title + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:2px">' +
      '<span class="lid">' + b.id + '</span>' +
      '<span style="font-size:11px;color:var(--muted)">' + (b.jur || '') + '</span>' +
      '</div></div>' +
      '<span class="sb s-' + b.s + '">' + STATUS_LABELS[b.s] + '</span>' +
      '</div>';
  }).join('');
}

function buildManageBills() {
  const el    = document.getElementById('manage-bills-list');
  if (!el) return;
  const bills = window.BILLS || [];

  if (!bills.length) {
    el.innerHTML = '<div style="padding:16px;font-size:13px;color:var(--muted)">No bills tracked yet. Use <strong>Live Search</strong> to find real legislation.</div>';
    return;
  }

  el.innerHTML = bills.map(function(b) {
    const statusOpts = STATUS_OPTIONS.map(function(s) {
      return '<option value="' + s + '"' + (b.s === s ? ' selected' : '') + '>' + STATUS_LABELS[s] + '</option>';
    }).join('');

    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);flex-wrap:wrap">' +
      '<span class="pd p' + b.p[0] + '" style="flex-shrink:0"></span>' +
      '<div style="flex:1;min-width:180px">' +
      '<div style="font-size:12.5px;font-weight:500;line-height:1.4">' + b.title + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:3px;flex-wrap:wrap">' +
      '<span class="lid">' + b.id + '</span>' +
      '<span style="font-size:11px;color:var(--muted)">' + (b.jur || '') + '</span>' +
      (b.url ? '<a href="' + b.url + '" target="_blank" rel="noopener" style="font-size:11px;color:var(--green-mid)">Source ↗</a>' : '') +
      '</div></div>' +
      '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
      '<select class="form-input" style="font-size:11px;padding:3px 6px;width:auto" onchange="updateBillStatus(\'' + escId(b.id) + '\',this.value)">' + statusOpts + '</select>' +
      '<select class="form-input" style="font-size:11px;padding:3px 6px;width:auto" onchange="updateBillPriority(\'' + escId(b.id) + '\',this.value)">' +
      '<option value="high"' + (b.p === 'high' ? ' selected' : '') + '>🔴 High</option>' +
      '<option value="med"'  + (b.p === 'med'  ? ' selected' : '') + '>🟡 Med</option>'  +
      '<option value="low"'  + (b.p === 'low'  ? ' selected' : '') + '>⚪ Low</option>'  +
      '</select>' +
      '<button class="btn sm" onclick="openBillDetail(\'' + escId(b.id) + '\')">Detail</button>' +
      '<button class="btn sm" onclick="removeBill(\'' + escId(b.id) + '\')" style="background:var(--red-pale);color:var(--red);border-color:#f5b8b1">Remove</button>' +
      '</div></div>';
  }).join('');
}

// ─────────────────────────────────────────────────────────────
// BILL CRUD
// ─────────────────────────────────────────────────────────────

function addTrackedBill(bill) {
  const bills = loadTrackedBills();
  if (bills.find(function(b) { return b.id === bill.id; })) {
    toast('Already tracking: ' + bill.id, 'i');
    return false;
  }
  bills.push(bill);
  saveTrackedBills(bills);
  syncBills();
  refreshDashboard();
  renderLegTable();
  toast('Now tracking: ' + bill.title.substring(0, 45) + '...', '+');
  return true;
}

function removeBill(id) {
  const bills = loadTrackedBills().filter(function(b) { return b.id !== id; });
  saveTrackedBills(bills);
  syncBills();
  refreshDashboard();
  renderLegTable();
  toast('Removed from tracker', 'x');
}

function updateBillStatus(id, newStatus) {
  const bills = loadTrackedBills();
  const bill  = bills.find(function(b) { return b.id === id; });
  if (!bill) return;
  bill.s   = newStatus;
  bill.upd = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  saveTrackedBills(bills);
  syncBills();
  renderLegTable();
  buildWatchlist();
  if (typeof rebuildCharts === 'function') rebuildCharts();
  toast('Status updated: ' + STATUS_LABELS[newStatus], 'ok');
}

function updateBillPriority(id, newPriority) {
  const bills = loadTrackedBills();
  const bill  = bills.find(function(b) { return b.id === id; });
  if (!bill) return;
  bill.p = newPriority;
  saveTrackedBills(bills);
  syncBills();
  buildWatchlist();
  buildManageBills();
  if (typeof rebuildCharts === 'function') rebuildCharts();
  toast('Priority updated', 'ok');
}

// ─────────────────────────────────────────────────────────────
// BILL DETAIL MODAL
// ─────────────────────────────────────────────────────────────

function openBillDetail(id) {
  const bills = window.BILLS || [];
  const bill  = bills.find(function(b) { return b.id === id; });
  if (!bill) return;

  document.getElementById('bill-modal') && document.getElementById('bill-modal').remove();

  const modal = document.createElement('div');
  modal.id = 'bill-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px';

  const statusBtns = STATUS_OPTIONS.map(function(s) {
    return '<button onclick="updateBillStatus(\'' + escId(bill.id) + '\',\'' + s + '\');document.getElementById(\'bill-modal\').remove()" class="btn sm' + (bill.s === s ? ' primary' : '') + '">' + STATUS_LABELS[s] + '</button>';
  }).join('');

  modal.innerHTML =
    '<div style="background:#fff;border-radius:14px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)">' +
    '<div style="padding:20px 22px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:12px">' +
    '<div><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:4px">' + bill.id + '</div>' +
    '<div style="font-size:15px;font-weight:600;color:var(--text);line-height:1.4">' + bill.title + '</div></div>' +
    '<button onclick="document.getElementById(\'bill-modal\').remove()" style="background:none;border:none;font-size:22px;color:var(--muted);cursor:pointer;flex-shrink:0;padding:0;line-height:1">x</button>' +
    '</div>' +
    '<div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
    '<div style="background:var(--surface);border-radius:8px;padding:12px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:4px">Status</div><span class="sb s-' + bill.s + '">' + STATUS_LABELS[bill.s] + '</span></div>' +
    '<div style="background:var(--surface);border-radius:8px;padding:12px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:4px">Priority</div><span style="font-size:13px;font-weight:500">' + ({ high: 'High', med: 'Medium', low: 'Low' }[bill.p] || bill.p) + '</span></div>' +
    '<div style="background:var(--surface);border-radius:8px;padding:12px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:4px">Jurisdiction</div><div style="font-size:13px">' + (bill.jur || 'Unknown') + '</div></div>' +
    '<div style="background:var(--surface);border-radius:8px;padding:12px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:4px">Topic</div><div style="font-size:13px">' + (bill.topic || 'Unknown') + '</div></div>' +
    '</div>' +
    (bill.url ? '<a href="' + bill.url + '" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--green-mid);text-decoration:none;padding:10px 14px;background:var(--green-pale);border-radius:8px">Source: ' + (bill.source || bill.url.substring(0, 50)) + '... Link</a>' : '') +
    '<div><div style="font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:8px">Update status</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap">' + statusBtns + '</div></div>' +
    '<div style="display:flex;gap:8px;padding-top:4px;border-top:1px solid var(--border)">' +
    '<button class="btn primary sm" onclick="prefillAnalysis(\'' + escId(bill.id) + '\');document.getElementById(\'bill-modal\').remove()">Analyze this bill</button>' +
    '<button class="btn sm" style="background:var(--red-pale);color:var(--red);border-color:#f5b8b1" onclick="removeBill(\'' + escId(bill.id) + '\');document.getElementById(\'bill-modal\').remove()">Remove</button>' +
    '</div></div></div>';

  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
}

function prefillAnalysis(id) {
  const bills = window.BILLS || [];
  const bill  = bills.find(function(b) { return b.id === id; });
  if (!bill) return;
  nav('analyze');
  const ta = document.getElementById('bill-text');
  if (ta) ta.value = bill.id + ': ' + bill.title + '\nJurisdiction: ' + (bill.jur || 'Unknown') + '\nStatus: ' + STATUS_LABELS[bill.s] + '\nTopic: ' + (bill.topic || 'Unknown') + '\n\nPlease analyze this micromobility legislation.';
}

// ─────────────────────────────────────────────────────────────
// WEEKLY BRIEF PAGE
// ─────────────────────────────────────────────────────────────

function buildTopicGrid() {
  const el = document.getElementById('topic-grid');
  if (!el) return;
  el.innerHTML = TOPICS.map(function(t) {
    const count = (window.BILLS || []).filter(function(b) { return b.topic === t.title; }).length;
    return '<div class="tc" onclick="filterByTopic(\'' + t.title.replace(/'/g, '') + '\')">' +
      '<div class="tc-icon">' + t.icon + '</div>' +
      '<div class="tc-title">' + t.title + '</div>' +
      '<div class="tc-desc">' + t.desc + '</div>' +
      '<div class="tc-n">' + (count > 0 ? count + ' tracked' : 'Search to find bills') + ' &rarr;</div>' +
      '</div>';
  }).join('');
}

function filterByTopic(topic) {
  window._topicFilter = topic;
  nav('legislation');
  setTimeout(renderLegTable, 150);
}

function buildDevelopments() {
  const el    = document.getElementById('key-developments');
  if (!el) return;
  const bills  = window.BILLS || [];
  const recent = bills.slice().sort(function(a, b) { return (b.upd || '').localeCompare(a.upd || ''); }).slice(0, 3);
  const devs   = recent.length > 0
    ? recent.map(function(b) { return { d: b.upd, title: b.title, body: (b.jur || '') + ' · ' + STATUS_LABELS[b.s] + ' · ' + (b.topic || '') }; })
    : DEVELOPMENTS;

  el.innerHTML = devs.map(function(x, i) {
    return '<div style="display:flex;gap:14px;padding:12px 16px;' + (i < devs.length - 1 ? 'border-bottom:1px solid var(--border)' : '') + '">' +
      '<div style="min-width:52px;font-size:11px;color:var(--muted);text-align:right;padding-top:2px;flex-shrink:0">' + x.d + '</div>' +
      '<div><div style="font-size:13px;font-weight:600;margin-bottom:3px">' + x.title + '</div>' +
      '<div style="font-size:12.5px;color:var(--muted);line-height:1.6">' + x.body + '</div></div>' +
      '</div>';
  }).join('');

  const slackBtn = document.getElementById('brief-slack-btn');
  if (slackBtn && !slackBtn._bound) {
    slackBtn._bound = true;
    slackBtn.addEventListener('click', function() {
      nav('slack');
      setTimeout(function() { document.getElementById('slack-send-now') && document.getElementById('slack-send-now').click(); }, 400);
    });
  }
}

// ─────────────────────────────────────────────────────────────
// LIVE SEARCH
// ─────────────────────────────────────────────────────────────

function buildSearchPage() {
  const topicsEl = document.getElementById('search-topics');
  if (topicsEl) {
    topicsEl.innerHTML = SEARCH_TOPICS.map(function(t) {
      return '<span class="stopic" data-q="' + t + '">' + t + '</span>';
    }).join('');
    topicsEl.querySelectorAll('.stopic').forEach(function(el) {
      el.addEventListener('click', function() {
        topicsEl.querySelectorAll('.stopic').forEach(function(s) { s.classList.remove('on'); });
        el.classList.add('on');
        const input = document.getElementById('search-q');
        if (input) input.value = el.dataset.q;
        doSearch();
      });
    });
  }

  document.getElementById('search-btn') && document.getElementById('search-btn').addEventListener('click', doSearch);
  const searchQ = document.getElementById('search-q');
  if (searchQ) searchQ.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSearch(); });

  const addMonBtn = document.getElementById('add-monitor-btn');
  if (addMonBtn) addMonBtn.addEventListener('click', function() {
    const q = document.getElementById('search-q') && document.getElementById('search-q').value.trim();
    if (!q) { toast('Enter a query first', '!'); return; }
    saveMonitor(q);
  });

  renderMonitorList();
}

function loadMonitors() {
  try { return JSON.parse(localStorage.getItem('velopolicy_monitors') || '[]'); }
  catch (e) { return []; }
}

function saveMonitor(q) {
  const monitors = loadMonitors();
  if (monitors.find(function(m) { return m.q === q; })) { toast('Monitor already exists', 'i'); return; }
  monitors.push({ q: q, freq: 'Weekly', last: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), hits: 0 });
  localStorage.setItem('velopolicy_monitors', JSON.stringify(monitors));
  renderMonitorList();
  toast('Monitor saved: ' + q.substring(0, 40), '+');
}

function removeMonitor(q) {
  const monitors = loadMonitors().filter(function(m) { return m.q !== q; });
  localStorage.setItem('velopolicy_monitors', JSON.stringify(monitors));
  renderMonitorList();
  toast('Monitor removed', 'x');
}

function renderMonitorList() {
  const el = document.getElementById('monitor-list');
  if (!el) return;
  const monitors = loadMonitors();
  if (!monitors.length) {
    el.innerHTML = '<div style="padding:14px 16px;font-size:13px;color:var(--muted)">No monitors yet. Run a search and click "+ Save as Monitor" to track a topic automatically.</div>';
    return;
  }
  el.innerHTML = monitors.map(function(m) {
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border)">' +
      '<span style="font-size:14px">bell</span>' +
      '<div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + m.q + '</div>' +
      '<div style="font-size:11px;color:var(--muted)">' + m.freq + ' - Last run: ' + m.last + '</div></div>' +
      '<button class="btn sm" onclick="quickRunMonitor(\'' + m.q.replace(/'/g, '') + '\')">Run now</button>' +
      '<button class="btn sm" onclick="removeMonitor(\'' + m.q.replace(/'/g, '') + '\')" style="color:var(--red);border-color:#f5b8b1">Remove</button>' +
      '</div>';
  }).join('');
}

function quickRunMonitor(q) {
  const input = document.getElementById('search-q');
  if (input) input.value = q;
  nav('search');
  setTimeout(doSearch, 100);
}

async function doSearch() {
  const q = document.getElementById('search-q') && document.getElementById('search-q').value.trim();
  if (!q) { toast('Enter a search query'); return; }

  const sr  = document.getElementById('search-results');
  const lbl = document.getElementById('search-status-label');
  const act = document.getElementById('search-hdr-actions');

  setSbDot('sb-search', 'busy');
  if (sr)  sr.innerHTML    = '<div class="loading-row"><div class="spin"></div>Searching live web for legislation...</div>';
  if (lbl) lbl.textContent = 'Searching...';
  if (act) act.innerHTML   = '';

  const prompt = 'You are a micromobility policy research assistant. Search the web for recent news, bills, and legislative developments about: "' + q + '".\n\nFocus on government websites, advocacy organizations, and reputable news sources.\n\nReturn ONLY a JSON array, no markdown:\n[{"title":"Full title","snippet":"2-3 sentence description","source":"Publication name","url":"full URL","date":"Month Year","type":"bill|news|report|agency","relevance":"high|medium","jurisdiction":"state or body","billId":"bill number or empty string"}]\n\nReturn 4-6 items. Prioritize actual bills.';

  try {
    const data = await callClaude({
      max_tokens: 1800,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    });

    setSbDot('sb-search', 'ok');

    const textBlock = data.content && data.content.find(function(c) { return c.type === 'text'; });
    let results = [];
    if (textBlock) {
      try {
        const clean = textBlock.text.replace(/```json|```/g, '').trim();
        const s = clean.indexOf('[');
        const e = clean.lastIndexOf(']');
        if (s >= 0 && e > s) results = JSON.parse(clean.slice(s, e + 1));
      } catch (_) {}
    }

    if (!results.length) {
      const fallback = data.content
        ? data.content.filter(function(c) { return c.type === 'text'; }).map(function(c) { return c.text; }).join('\n')
        : 'No results found.';
      if (sr)  sr.innerHTML    = '<div style="padding:16px;font-size:13px;line-height:1.75">' + fallback.replace(/\n/g, '<br>') + '</div>';
      if (lbl) lbl.textContent = 'Results for: ' + q;
      return;
    }

    if (lbl) lbl.textContent = results.length + ' result' + (results.length !== 1 ? 's' : '') + ' for: ' + q;
    if (act) act.innerHTML   = '<button class="btn secondary sm" onclick="saveMonitor(\'' + q.replace(/'/g, '').substring(0, 60) + '\')">+ Save as Monitor</button>';

    const bills = window.BILLS || [];
    if (sr) sr.innerHTML = results.map(function(r) {
      const tracked = r.billId && bills.find(function(b) { return b.id === r.billId; });
      const rJson   = JSON.stringify(r).replace(/"/g, '&quot;');
      return '<div class="result-item">' +
        '<div class="ri-meta">' +
        '<span class="sb ' + (r.relevance === 'high' ? 's-enacted' : 's-committee') + '">' + (r.relevance === 'high' ? 'High relevance' : 'Relevant') + '</span>' +
        '<span class="stag">' + (r.type || 'news') + '</span>' +
        (r.jurisdiction ? '<span class="stag">' + r.jurisdiction + '</span>' : '') +
        '<span style="font-size:10.5px;color:var(--muted)">' + (r.date || '') + '</span>' +
        '</div>' +
        '<div class="ri-title">' + r.title + '</div>' +
        '<div class="ri-snippet">' + r.snippet + '</div>' +
        '<div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<a class="ri-source" href="' + (r.url || '#') + '" target="_blank" rel="noopener">' + (r.source || 'Source') + ' Link</a>' +
        (tracked
          ? '<span class="btn sm" style="background:var(--green-pale);color:var(--green);border-color:var(--green-light);cursor:default">Tracked</span>'
          : '<button class="btn primary sm" onclick=\'trackFromSearch(' + rJson + ')\'>+ Track Bill</button>') +
        '<button class="btn sm" onclick="nav(\'analyze\');document.getElementById(\'bill-text\').value=\'' + (r.title + ': ' + r.snippet).replace(/'/g, '').replace(/\n/g, ' ').substring(0, 200) + '\'">Analyze</button>' +
        '</div></div>';
    }).join('');

  } catch (err) {
    setSbDot('sb-search', '');
    if (sr)  sr.innerHTML    = '<div style="padding:16px;font-size:13px;color:var(--red)">Search failed: ' + err.message + '<br><small style="color:var(--muted)">Check that ANTHROPIC_API_KEY is set in Netlify environment variables.</small></div>';
    if (lbl) lbl.textContent = 'Search failed';
  }
}

// ─────────────────────────────────────────────────────────────
// TRACK FROM SEARCH
// ─────────────────────────────────────────────────────────────

function trackFromSearch(result) {
  const bill = {
    id:     (result.billId && result.billId.trim()) ||
            (result.title.match(/\b([HS]\.?\s*\d+|[A-Z]{2,3}\s+[A-Z]+\s+\d+|Local\s+Law\s+\d+)\b/i) || [])[0] ||
            'REF-' + Date.now().toString().slice(-6),
    title:  result.title.replace(/\s*[--]\s*[^--]+$/, '').trim(),
    topic:  guessTopic(result.title + ' ' + result.snippet),
    scope:  guessScope(result.title + ' ' + result.snippet + ' ' + (result.jurisdiction || '')),
    jur:    result.jurisdiction || guessJurisdiction(result.title + ' ' + result.snippet),
    s:      'intro',
    p:      result.relevance === 'high' ? 'high' : 'med',
    upd:    result.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    url:    result.url || '',
    source: result.source || '',
  };

  const confirmed = confirm(
    'Add to your tracker?\n\n' +
    'ID: ' + bill.id + '\n' +
    'Title: ' + bill.title.substring(0, 70) + (bill.title.length > 70 ? '...' : '') + '\n' +
    'Topic: ' + bill.topic + '\n' +
    'Jurisdiction: ' + bill.jur + '\n\n' +
    'Click OK to track this bill.'
  );

  if (confirmed) {
    addTrackedBill(bill);
    doSearch(); // refresh to show tracked state
  }
}

function guessTopic(text) {
  const t = text.toLowerCase();
  if (/tax credit|rebate|incentive|subsidy|purchase program/.test(t))          return 'E-Bike Incentives';
  if (/lane|infrastructure|path|trail|network|intersection|corridor/.test(t))  return 'Infrastructure';
  if (/helmet|safety|speed limit|liability|injury|crash/.test(t))              return 'Safety & Liability';
  if (/parking|sidewalk|permit|dock|fleet|zoning|ban/.test(t))                 return 'Parking & Zoning';
  if (/data|privacy|gps|tracking|surveillance|location/.test(t))               return 'Data & Privacy';
  if (/eu |european|uk |united kingdom|canada|international/.test(t))          return 'International';
  return 'E-Bike Incentives';
}

function guessScope(text) {
  const t = text.toLowerCase();
  if (/federal|congress|senate|house of rep|u\.s\. |national/.test(t))             return 'federal';
  if (/city|municipal|local|county|ordinance|nyc|chicago|seattle|denver/.test(t)) return 'local';
  if (/eu |european union|uk |united kingdom|canada|international/.test(t))        return 'intl';
  return 'state';
}

function guessJurisdiction(text) {
  const t = text.toLowerCase();
  const states = {
    'california':'California','texas':'Texas','new york':'New York','florida':'Florida',
    'washington':'Washington','oregon':'Oregon','colorado':'Colorado','illinois':'Illinois',
    'massachusetts':'Massachusetts','minnesota':'Minnesota','michigan':'Michigan',
    'pennsylvania':'Pennsylvania','georgia':'Georgia','arizona':'Arizona','nevada':'Nevada',
    'ohio':'Ohio','virginia':'Virginia','maryland':'Maryland','new jersey':'New Jersey',
    'utah':'Utah','north carolina':'North Carolina','indiana':'Indiana','tennessee':'Tennessee',
  };
  for (var key in states) {
    if (t.indexOf(key) >= 0) return states[key];
  }
  if (/federal|congress|u\.s\. |national/.test(t)) return 'U.S. Federal';
  if (/european union|eu directive/.test(t))        return 'European Union';
  if (/united kingdom|uk /.test(t))                 return 'United Kingdom';
  if (/canada|canadian/.test(t))                    return 'Canada';
  if (/nyc|new york city/.test(t))                  return 'New York City';
  return 'United States';
}

// ─────────────────────────────────────────────────────────────
// BILL TRACKER TABLE
// ─────────────────────────────────────────────────────────────

var legFilter = 'all';

function buildLegTable() {
  const filtersEl = document.getElementById('leg-filters');
  if (!filtersEl) return;

  const leftFilters = [
    { f: 'all',     label: 'All'           },
    { f: 'federal', label: 'Federal'       },
    { f: 'state',   label: 'State'         },
    { f: 'local',   label: 'Local'         },
    { f: 'intl',    label: 'International' },
  ];
  const rightFilters = [
    { f: 'high',    label: 'High Priority' },
    { f: 'floor',   label: 'Floor Vote'    },
    { f: 'enacted', label: 'Enacted'       },
  ];

  filtersEl.innerHTML =
    leftFilters.map(function(f) {
      return '<button class="fb' + (f.f === 'all' ? ' active' : '') + '" data-filter="' + f.f + '">' + f.label + '</button>';
    }).join('') +
    '<span style="margin-left:auto;display:flex;gap:6px">' +
    rightFilters.map(function(f) {
      return '<button class="fb" data-filter="' + f.f + '">' + f.label + '</button>';
    }).join('') +
    '</span>';

  filtersEl.querySelectorAll('.fb').forEach(function(btn) {
    btn.addEventListener('click', function() {
      filtersEl.querySelectorAll('.fb').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      legFilter = btn.dataset.filter;
      window._topicFilter = null;
      var banner = document.getElementById('topic-filter-banner');
      if (banner) banner.remove();
      renderLegTable();
    });
  });

  renderLegTable();
}

function renderLegTable() {
  const el    = document.getElementById('leg-body');
  if (!el) return;
  const bills = window.BILLS || [];

  if (!bills.length) {
    el.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--muted);font-size:13px">No bills tracked yet &mdash; <span style="color:var(--green);cursor:pointer;text-decoration:underline" onclick="nav(\'search\')">use Live Search to find and track legislation</span></td></tr>';
    return;
  }

  const allBtn = document.querySelector('[data-filter="all"]');
  if (allBtn) allBtn.textContent = 'All (' + bills.length + ')';

  var filtered = bills.filter(function(b) {
    if (window._topicFilter && b.topic !== window._topicFilter) return false;
    if (legFilter === 'all')     return true;
    if (legFilter === 'high')    return b.p === 'high';
    if (legFilter === 'enacted') return b.s === 'enacted';
    if (legFilter === 'floor')   return b.s === 'floor';
    return b.scope === legFilter;
  });

  // Topic filter banner
  var bannerEl = document.getElementById('topic-filter-banner');
  if (window._topicFilter) {
    if (!bannerEl) {
      var banner = document.createElement('div');
      banner.id = 'topic-filter-banner';
      banner.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--green-pale);border-radius:8px;font-size:12.5px;color:var(--green);margin-bottom:12px';
      banner.innerHTML = '<span>Topic: <strong>' + window._topicFilter + '</strong></span><button onclick="window._topicFilter=null;document.getElementById(\'topic-filter-banner\').remove();renderLegTable()" class="btn sm" style="font-size:11px;padding:2px 8px;margin-left:auto">Clear x</button>';
      var filtersEl = document.getElementById('leg-filters');
      if (filtersEl) filtersEl.insertAdjacentElement('afterend', banner);
    }
  } else {
    if (bannerEl) bannerEl.remove();
  }

  if (!filtered.length) {
    el.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted);font-size:13px">No bills match this filter.</td></tr>';
    return;
  }

  el.innerHTML = filtered.map(function(b) {
    return '<tr onclick="openBillDetail(\'' + escId(b.id) + '\')" style="cursor:pointer">' +
      '<td><span class="pd p' + b.p[0] + '"></span></td>' +
      '<td class="lid">' + b.id + '</td>' +
      '<td class="ltitle">' + b.title + '</td>' +
      '<td><span class="stag">' + (b.topic || '-') + '</span></td>' +
      '<td><span class="scope-pill sp-' + (b.scope || 'state') + '">' + (b.scope || 'state').toUpperCase() + '</span></td>' +
      '<td style="font-size:12px;color:var(--muted)">' + (b.jur || '-') + '</td>' +
      '<td><span class="sb s-' + b.s + '">' + STATUS_LABELS[b.s] + '</span></td>' +
      '<td style="font-size:11px;color:var(--muted);white-space:nowrap">' + (b.upd || '-') + '</td>' +
      '</tr>';
  }).join('');
}

// ─────────────────────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────────────────────

var exportType      = 'weekly';
var selectedTopic   = '';
var selectedBillIds = new Set();

function buildExportPage() {
  const optEl = document.getElementById('export-options');
  if (optEl) {
    optEl.innerHTML = EXPORT_OPTIONS.map(function(o, i) {
      return '<div class="export-option' + (i === 0 ? ' selected' : '') + '" data-export="' + o.id + '">' +
        '<div class="eo-icon">' + o.icon + '</div>' +
        '<div class="eo-title">' + o.title + '</div>' +
        '<div class="eo-desc">' + o.desc + '</div></div>';
    }).join('');
    optEl.querySelectorAll('.export-option').forEach(function(el) {
      el.addEventListener('click', function() {
        optEl.querySelectorAll('.export-option').forEach(function(e) { e.classList.remove('selected'); });
        el.classList.add('selected');
        exportType = el.dataset.export;
        updateExportUI();
      });
    });
  }

  const secEl = document.getElementById('export-sections');
  if (secEl) {
    secEl.innerHTML = EXPORT_SECTIONS.map(function(s) {
      return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="' + s.id + '"' + (s.def ? ' checked' : '') + '> ' + s.label + '</label>';
    }).join('');
    secEl.querySelectorAll('input').forEach(function(el) { el.addEventListener('change', updatePreview); });
  }

  selectedTopic = TOPIC_OPTIONS[0] || '';
  const topicChips = document.getElementById('topic-filter-chips');
  if (topicChips) {
    topicChips.innerHTML = TOPIC_OPTIONS.map(function(t, i) {
      return '<span class="stopic' + (i === 0 ? ' on' : '') + '" data-topic="' + t + '">' + t + '</span>';
    }).join('');
    topicChips.querySelectorAll('.stopic').forEach(function(el) {
      el.addEventListener('click', function() {
        topicChips.querySelectorAll('.stopic').forEach(function(s) { s.classList.remove('on'); });
        el.classList.add('on');
        selectedTopic = el.dataset.topic;
        updatePreview();
      });
    });
  }

  buildBillCheckboxes();

  var priEl  = document.getElementById('export-priority');
  var sorEl  = document.getElementById('export-sort');
  if (priEl) priEl.addEventListener('change', updatePreview);
  if (sorEl) sorEl.addEventListener('change', updatePreview);

  var genBtn = document.getElementById('generate-pdf-btn');
  if (genBtn) genBtn.addEventListener('click', generatePDF);

  updateExportUI();
}

function buildBillCheckboxes() {
  const billList = document.getElementById('bill-filter-list');
  if (!billList) return;
  const bills = window.BILLS || [];
  selectedBillIds = new Set(bills.map(function(b) { return b.id; }));

  if (!bills.length) {
    billList.innerHTML = '<div style="font-size:13px;color:var(--muted)">No bills tracked yet.</div>';
    return;
  }

  billList.innerHTML = bills.map(function(b) {
    return '<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer">' +
      '<input type="checkbox" data-bill-id="' + escId(b.id) + '" checked>' +
      '<span class="pd p' + b.p[0] + '" style="flex-shrink:0"></span>' +
      '<span style="flex:1">' + b.title + '</span>' +
      '<span class="sb s-' + b.s + '" style="flex-shrink:0">' + STATUS_LABELS[b.s] + '</span>' +
      '</label>';
  }).join('');

  billList.querySelectorAll('input[type=checkbox]').forEach(function(el) {
    el.addEventListener('change', function() {
      if (el.checked) selectedBillIds.add(el.dataset.billId);
      else            selectedBillIds.delete(el.dataset.billId);
      updatePreview();
    });
  });
}

function updateExportUI() {
  var topicRow = document.getElementById('topic-filter-row');
  var billRow  = document.getElementById('bill-filter-row');
  if (topicRow) topicRow.style.display = exportType === 'topic'  ? 'block' : 'none';
  if (billRow)  billRow.style.display  = exportType === 'custom' ? 'block' : 'none';
  if (exportType === 'custom') buildBillCheckboxes();
  updatePreview();
}

function getExportBills() {
  const bills    = window.BILLS || [];
  const priority = (document.getElementById('export-priority') && document.getElementById('export-priority').value) || 'all';
  const sort     = (document.getElementById('export-sort')     && document.getElementById('export-sort').value)     || 'priority';

  var result = bills.slice();
  if (exportType === 'highpri')  result = result.filter(function(b) { return b.p === 'high'; });
  if (exportType === 'topic')    result = result.filter(function(b) { return b.topic === selectedTopic; });
  if (exportType === 'custom')   result = result.filter(function(b) { return selectedBillIds.has(b.id); });
  if (priority === 'high')       result = result.filter(function(b) { return b.p === 'high'; });
  if (priority === 'highmed')    result = result.filter(function(b) { return b.p === 'high' || b.p === 'med'; });

  var priOrd = { high: 0, med: 1, low: 2 };
  var staOrd = { floor: 0, committee: 1, intro: 2, passed: 3, enacted: 4, failed: 5 };
  if (sort === 'priority')     result.sort(function(a,b){ return (priOrd[a.p]||0)-(priOrd[b.p]||0); });
  if (sort === 'status')       result.sort(function(a,b){ return (staOrd[a.s]||0)-(staOrd[b.s]||0); });
  if (sort === 'updated')      result.sort(function(a,b){ return (b.upd||'').localeCompare(a.upd||''); });
  if (sort === 'jurisdiction') result.sort(function(a,b){ return (a.jur||'').localeCompare(b.jur||''); });
  return result;
}

function updatePreview() {
  const bills    = getExportBills();
  const countEl  = document.getElementById('preview-bill-count');
  const titleEl  = document.getElementById('preview-title');
  const subEl    = document.getElementById('preview-subtitle');
  const descEl   = document.getElementById('preview-desc');
  const tableEl  = document.getElementById('preview-table-wrap');

  if (countEl) countEl.textContent = bills.length + ' bill' + (bills.length !== 1 ? 's' : '') + ' selected';

  var titles = { weekly:'Weekly Policy Brief', tracker:'Full Bill Tracker', topic:'Topic Brief - ' + selectedTopic, highpri:'High Priority Bills', custom:'Custom Report' };
  var today  = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  var subs   = { weekly:'Weekly Brief - ' + today, tracker:'Full Tracker - ' + bills.length + ' bills - ' + today, topic:selectedTopic + ' - ' + today, highpri:'High Priority - ' + today, custom:'Custom Report - ' + today };

  if (titleEl) titleEl.textContent = titles[exportType] || '';
  if (subEl)   subEl.textContent   = subs[exportType]   || '';
  if (descEl)  descEl.textContent  = bills.length + ' bill' + (bills.length !== 1 ? 's' : '') + ' included.';

  if (tableEl && bills.length > 0) {
    tableEl.innerHTML =
      '<table class="preview-table" style="margin-top:10px"><tr><th>Bill ID</th><th>Title</th><th>Status</th></tr>' +
      bills.slice(0, 5).map(function(b) {
        return '<tr><td>' + b.id + '</td><td>' + b.title.substring(0, 38) + (b.title.length > 38 ? '...' : '') + '</td><td>' + STATUS_LABELS[b.s] + '</td></tr>';
      }).join('') +
      (bills.length > 5 ? '<tr><td colspan="3" style="color:#999;font-style:italic;font-size:10px">...and ' + (bills.length - 5) + ' more</td></tr>' : '') +
      '</table>';
  } else if (tableEl) {
    tableEl.innerHTML = '';
  }
}

function generatePDF() {
  const statusEl = document.getElementById('pdf-status');
  const bills    = getExportBills();
  const include  = {
    summary:      document.getElementById('cb-summary')      && document.getElementById('cb-summary').checked,
    developments: document.getElementById('cb-developments') && document.getElementById('cb-developments').checked,
    table:        document.getElementById('cb-table')        && document.getElementById('cb-table').checked,
    highpri:      document.getElementById('cb-highpri')      && document.getElementById('cb-highpri').checked,
    stats:        document.getElementById('cb-stats')        && document.getElementById('cb-stats').checked,
  };

  var titles   = { weekly:'Weekly Policy Brief', tracker:'Full Bill Tracker', topic:'Topic Brief - ' + selectedTopic, highpri:'High Priority Bills', custom:'Custom Report' };
  var reportTitle = titles[exportType] || 'VeloPolicy Report';
  var today    = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  var billRows = bills.map(function(b) {
    return '<tr><td>' + b.id + '</td><td>' + b.title + '</td><td>' + (b.jur||'-') + '</td><td>' + (b.topic||'-') + '</td><td>' + STATUS_LABELS[b.s] + '</td><td style="color:' + (b.p==='high'?'#c0392b':b.p==='med'?'#e9a000':'#94a3b8') + ';font-weight:600">' + b.p.charAt(0).toUpperCase() + b.p.slice(1) + '</td></tr>';
  }).join('');

  var statsSection = include.stats
    ? '<h2>Statistics</h2><p><strong>Total:</strong> ' + bills.length + ' bills &nbsp;|&nbsp; <strong>High priority:</strong> ' + bills.filter(function(b){return b.p==='high';}).length + ' &nbsp;|&nbsp; <strong>In committee:</strong> ' + bills.filter(function(b){return b.s==='committee';}).length + ' &nbsp;|&nbsp; <strong>Enacted:</strong> ' + bills.filter(function(b){return b.s==='enacted';}).length + '</p>'
    : '';

  var highPriSection = include.highpri
    ? '<h2>High Priority Detail</h2>' + bills.filter(function(b){return b.p==='high';}).map(function(b){
        return '<div class="dev"><div class="dev-date">' + b.id + ' &middot; ' + (b.jur||'') + ' &middot; ' + STATUS_LABELS[b.s] + '</div><div class="dev-title">' + b.title + '</div><p>Topic: ' + (b.topic||'-') + ' &middot; Updated: ' + (b.upd||'-') + '</p>' + (b.url?'<p><a href="'+b.url+'" style="color:#1a4731">'+b.url+'</a></p>':'') + '</div>';
      }).join('')
    : '';

  var devsSection = include.developments
    ? '<h2>Recent Developments</h2>' + (window.BILLS||[]).slice().sort(function(a,b){return (b.upd||'').localeCompare(a.upd||'');}).slice(0,5).map(function(b){
        return '<div class="dev"><div class="dev-date">' + (b.upd||'') + '</div><div class="dev-title">' + b.title + '</div><p>' + (b.jur||'') + ' &middot; ' + STATUS_LABELS[b.s] + ' &middot; ' + (b.topic||'') + '</p></div>';
      }).join('')
    : '';

  var html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>VeloPolicy - ' + reportTitle + '</title><style>' +
    'body{font-family:Georgia,serif;margin:48px;color:#111;font-size:13px;line-height:1.7;max-width:760px}' +
    '.header{border-bottom:3px solid #1a4731;padding-bottom:14px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-end}' +
    '.logo{font-size:20px;font-weight:700;color:#1a4731}.logo-sub{font-size:11px;color:#666;margin-top:2px}' +
    '.meta{text-align:right;font-size:11px;color:#666}' +
    'h1{font-size:22px;color:#111;margin:0 0 24px;font-weight:700}' +
    'h2{font-size:11px;color:#1a4731;margin:28px 0 8px;text-transform:uppercase;letter-spacing:.8px;font-family:Arial,sans-serif;border-bottom:1px solid #d8f3dc;padding-bottom:4px}' +
    'p{margin-bottom:10px;color:#333;font-family:Arial,sans-serif;font-size:13px}' +
    '.dev{margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #eee}' +
    '.dev-date{font-size:10px;color:#999;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:.5px}' +
    '.dev-title{font-size:14px;font-weight:700;margin:3px 0 6px}' +
    'table{width:100%;border-collapse:collapse;margin:12px 0;font-size:11px;font-family:Arial,sans-serif}' +
    'th{text-align:left;padding:7px 8px;border-bottom:2px solid #1a4731;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#666;background:#f9fafb}' +
    'td{padding:7px 8px;border-bottom:1px solid #eee;color:#333;vertical-align:top}' +
    'tr:nth-child(even) td{background:#fafafa}' +
    '.footer{margin-top:52px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#999;text-align:center;font-family:Arial,sans-serif}' +
    '@media print{body{margin:24px}h2{page-break-after:avoid}.dev{page-break-inside:avoid}}' +
    '</style></head><body>' +
    '<div class="header"><div><div class="logo">VeloPolicy</div><div class="logo-sub">Micromobility Policy Intelligence</div></div><div class="meta">' + reportTitle + '<br>Generated ' + today + '</div></div>' +
    '<h1>' + reportTitle + '</h1>' +
    (include.summary ? '<h2>Summary</h2><p>This report covers <strong>' + bills.length + ' tracked bill' + (bills.length!==1?'s':'') + '</strong>. High priority: <strong>' + bills.filter(function(b){return b.p==='high';}).length + '</strong> &middot; In committee: <strong>' + bills.filter(function(b){return b.s==='committee';}).length + '</strong> &middot; Enacted: <strong>' + bills.filter(function(b){return b.s==='enacted';}).length + '</strong>. Generated ' + today + '.</p>' : '') +
    statsSection + devsSection +
    (include.table && bills.length > 0 ? '<h2>Legislation - ' + bills.length + ' Bill' + (bills.length!==1?'s':'') + '</h2><table><thead><tr><th>Bill ID</th><th>Title</th><th>Jurisdiction</th><th>Topic</th><th>Status</th><th>Priority</th></tr></thead><tbody>' + billRows + '</tbody></table>' : '') +
    highPriSection +
    '<div class="footer">VeloPolicy &middot; velopolicy.io &middot; ' + today + ' &middot; ' + reportTitle + '</div>' +
    '</body></html>';

  var filename = 'VeloPolicy_' + exportType + '_' + new Date().toISOString().slice(0,10) + '.html';
  var blob     = new Blob([html], { type: 'text/html' });
  var url      = URL.createObjectURL(blob);
  var a        = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);

  if (statusEl) {
    statusEl.textContent = 'Downloaded ' + filename + ' - open in browser then File > Print > Save as PDF';
    setTimeout(function() { statusEl.textContent = ''; }, 10000);
  }
  toast('Report downloaded!', '+');
}

// ─────────────────────────────────────────────────────────────
// SLACK AUTOMATION
// ─────────────────────────────────────────────────────────────

function buildSlackPage() {
  const daysEl = document.getElementById('schedule-days');
  if (daysEl) {
    daysEl.innerHTML = ['Monday','Tuesday','Wednesday','Thursday','Friday'].map(function(d,i) {
      return '<span class="sch-opt' + (i===0?' on':'') + '">' + d + '</span>';
    }).join('');
    daysEl.querySelectorAll('.sch-opt').forEach(function(el) {
      el.addEventListener('click', function() { el.classList.toggle('on'); });
    });
  }

  const checksEl = document.getElementById('slack-content-checks');
  if (checksEl) {
    checksEl.innerHTML = [
      ['sl-summary',      'Weekly headline and summary',    true ],
      ['sl-developments', 'Recent bill status changes',     true ],
      ['sl-highpri',      'High-priority bill updates',     true ],
      ['sl-monitors',     'New search monitor results',     false],
      ['sl-count',        'Bill count statistics',          false],
    ].map(function(x) {
      return '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="' + x[0] + '"' + (x[2]?' checked':'') + '> ' + x[1] + '</label>';
    }).join('');
  }

  const chanEl = document.getElementById('slack-channel');
  const botEl  = document.getElementById('slack-botname');
  if (chanEl) chanEl.addEventListener('input', function() {
    var el = document.getElementById('slack-preview-channel');
    if (el) el.textContent = this.value || '#channel';
  });
  if (botEl) botEl.addEventListener('input', function() {
    var el = document.getElementById('slack-preview-botname');
    if (el) el.textContent = this.value || 'Bot';
  });

  var stored  = JSON.parse(localStorage.getItem('velopolicy_slack_history') || '[]');
  var history = stored.concat(SLACK_HISTORY).slice(0, 8);
  var histEl  = document.getElementById('slack-history');
  if (histEl) {
    histEl.innerHTML = history.length
      ? history.map(function(h) {
          return '<div class="hist-item"><span class="hist-icon">' + (h.icon||'msg') + '</span><div class="hist-detail"><div style="font-size:12px;font-weight:500">' + h.d + '</div><div class="hist-time">' + h.t + '</div></div><span class="hist-status hs-' + h.s + '">' + ({ok:'Sent',fail:'Failed',pending:'Pending'}[h.s]||h.s) + '</span></div>';
        }).join('')
      : '<div style="font-size:13px;color:var(--muted);padding:8px 0">No sends yet.</div>';
  }

  var sendBtn = document.getElementById('slack-send-now');
  var saveBtn = document.getElementById('slack-save-schedule');
  if (sendBtn && !sendBtn._bound) { sendBtn._bound = true; sendBtn.addEventListener('click', sendSlackNow); }
  if (saveBtn && !saveBtn._bound) { saveBtn._bound = true; saveBtn.addEventListener('click', saveSchedule); }
}

async function sendSlackNow() {
  const btn = document.getElementById('slack-send-now');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  setSbDot('sb-slack', 'busy');

  const bills   = window.BILLS || [];
  const highPri = bills.filter(function(b) { return b.p === 'high'; });
  const recent  = bills.slice().sort(function(a,b){ return (b.upd||'').localeCompare(a.upd||''); }).slice(0,3);

  var billContext = bills.length > 0
    ? 'You are tracking ' + bills.length + ' bills. High priority: ' + highPri.length + '. Recent: ' + recent.map(function(b){ return b.id + ' (' + b.title.substring(0,40) + ', ' + STATUS_LABELS[b.s] + ')'; }).join('; ') + '.'
    : 'No bills are currently tracked.';

  var prompt = 'You are VeloPolicy, a micromobility policy intelligence assistant. Write a concise Slack message for this week\'s brief.\n\nContext: ' + billContext + '\n\nInclude:\n1. A short headline (1 sentence)\n2. Top 3 bill updates as bullet points with bullet\n3. A brief closing line\n\nUse Slack markdown: *bold*. Under 200 words. Be direct and informative.';

  try {
    const data = await callClaude({
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const msgText = (data.content && data.content.find(function(c){ return c.type==='text'; }) || {}).text || 'Brief generated.';

    var previewEl = document.getElementById('slack-preview-body');
    if (previewEl) {
      previewEl.innerHTML = msgText.replace(/\n/g,'<br>').replace(/\*(.*?)\*/g,'<strong>$1</strong>');
    }

    var payload = {
      text: 'VeloPolicy Weekly Brief',
      blocks: [
        { type:'header', text:{ type:'plain_text', text:'VeloPolicy Weekly Brief', emoji:true } },
        { type:'section', text:{ type:'mrkdwn', text:msgText } },
        { type:'divider' },
      ],
    };

    if (highPri.length > 0) {
      payload.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*High-Priority Bills*\n\n' + highPri.slice(0,4).map(function(b){
            return '- *' + b.id + '* - ' + b.title.substring(0,50) + (b.title.length>50?'...':'') + ' _(' + STATUS_LABELS[b.s] + ')_';
          }).join('\n'),
        },
      });
      payload.blocks.push({ type:'divider' });
    }

    var showCount = document.getElementById('sl-count') && document.getElementById('sl-count').checked;
    if (showCount && bills.length > 0) {
      payload.blocks.push({
        type:'section',
        fields:[
          { type:'mrkdwn', text:'*Tracked Bills*\n' + bills.length },
          { type:'mrkdwn', text:'*High Priority*\n' + highPri.length },
          { type:'mrkdwn', text:'*In Committee*\n' + bills.filter(function(b){return b.s==='committee';}).length },
          { type:'mrkdwn', text:'*Floor Vote*\n'   + bills.filter(function(b){return b.s==='floor';}).length },
        ],
      });
    }

    payload.blocks.push({
      type:'context',
      elements:[{ type:'mrkdwn', text:'Generated by VeloPolicy - Powered by Claude - ' + new Date().toLocaleDateString() }],
    });

    await callSlack(payload);
    setSbDot('sb-slack', 'ok');

    var entry   = { icon:'msg', d:'Brief - ' + new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}), t:new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}), s:'ok' };
    var history = JSON.parse(localStorage.getItem('velopolicy_slack_history') || '[]');
    history.unshift(entry);
    localStorage.setItem('velopolicy_slack_history', JSON.stringify(history.slice(0,10)));

    var histEl = document.getElementById('slack-history');
    if (histEl) histEl.insertAdjacentHTML('afterbegin', '<div class="hist-item"><span class="hist-icon">msg</span><div class="hist-detail"><div style="font-size:12px;font-weight:500">' + entry.d + ' (AI-generated)</div><div class="hist-time">' + entry.t + '</div></div><span class="hist-status hs-ok">Sent</span></div>');

    toast('Brief sent to Slack!', 'ok');

  } catch (err) {
    setSbDot('sb-slack', '');
    toast('Slack send failed: ' + err.message, 'x');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = 'Send Now (Test)'; }
  }
}

function saveSchedule() {
  var days = Array.from(document.querySelectorAll('.sch-opt.on')).map(function(e){ return e.textContent; }).join(', ');
  var time = (document.getElementById('slack-time') && document.getElementById('slack-time').value) || '8:00 AM';
  if (!days) { toast('Select at least one send day', '!'); return; }
  localStorage.setItem('velopolicy_schedule', JSON.stringify({ days:days, time:time }));
  toast('Schedule saved - every ' + days + ' at ' + time, 'ok');
}

// ─────────────────────────────────────────────────────────────
// AI ANALYSIS
// ─────────────────────────────────────────────────────────────

function buildAnalyzePage() {
  const chipsEl = document.getElementById('analysis-chips');
  if (!chipsEl) return;

  chipsEl.innerHTML = ANALYSIS_CHIPS.map(function(c, i) {
    return '<span class="stopic' + (i===0?' on':'') + '">' + c + '</span>';
  }).join('');

  chipsEl.querySelectorAll('.stopic').forEach(function(el) {
    el.addEventListener('click', function() { el.classList.toggle('on'); });
  });

  var btn       = document.createElement('button');
  btn.className = 'btn primary';
  btn.style.marginLeft = 'auto';
  btn.textContent = 'Analyze';
  btn.addEventListener('click', runAnalysis);
  chipsEl.appendChild(btn);

  var copyBtn = document.getElementById('copy-result-btn');
  if (copyBtn) copyBtn.addEventListener('click', function() {
    var text = document.getElementById('result-area') && document.getElementById('result-area').innerText || '';
    navigator.clipboard && navigator.clipboard.writeText(text).then(function() { toast('Copied to clipboard!', 'ok'); });
  });
}

async function runAnalysis() {
  const text = document.getElementById('bill-text') && document.getElementById('bill-text').value.trim();
  if (!text) { toast('Enter bill text or a topic first', '!'); return; }

  var chips = Array.from(document.querySelectorAll('#analysis-chips .stopic.on')).map(function(c){ return c.textContent; }).join(', ');
  var ra    = document.getElementById('result-area');
  var rc    = document.getElementById('result-card');
  if (rc) rc.style.display = 'block';
  if (ra) ra.innerHTML = '<div class="loading-row"><div class="spin"></div>Analyzing with Claude...</div>';
  setSbDot('sb-api', 'busy');

  var prompt = 'You are a policy analyst specializing in cycling, e-bikes, and micromobility legislation. Analyze the following and provide a structured brief.\n\nAnalysis focus areas: ' + (chips || 'Policy Summary') + '\n\nContent:\n' + text + '\n\nWrite each section under a ## header. Be specific and practical.\n## Policy Summary\n## Key Provisions\n## Stakeholder Impact\n## Equity Considerations\n## Advocacy Notes';

  try {
    const data = await callClaude({
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    var raw = (data.content && data.content.find(function(c){ return c.type==='text'; }) || {}).text || 'No response.';

    if (ra) {
      ra.innerHTML = raw.split(/\n## /).map(function(s, i) {
        if (i === 0 && !s.startsWith('#')) {
          return s ? '<p style="margin-bottom:12px;font-size:13px;line-height:1.75">' + s.replace(/\n/g,'<br>') + '</p>' : '';
        }
        var parts = s.replace(/^## /,'').split('\n');
        var title = parts[0];
        var body  = parts.slice(1).join('\n').trim()
          .replace(/\n[*-] /g,'<br>- ')
          .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
          .replace(/\*(.*?)\*/g,'<em>$1</em>')
          .replace(/\n/g,'<br>');
        return '<div style="margin-bottom:20px"><div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:var(--green);margin-bottom:7px;padding-bottom:5px;border-bottom:1px solid var(--green-pale)">' + title + '</div><div style="font-size:13px;line-height:1.78;color:var(--text)">' + body + '</div></div>';
      }).join('');
    }
    setSbDot('sb-api', 'ok');

  } catch (err) {
    if (ra) ra.innerHTML = '<div style="color:var(--red);font-size:13px;line-height:1.6">Analysis failed: ' + err.message + '<br><small style="color:var(--muted)">Check that ANTHROPIC_API_KEY is set in Netlify environment variables.</small></div>';
    setSbDot('sb-api', '');
  }
}

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

function escId(id) {
  return (id || '').replace(/['"\\<>&]/g, '_');
}  });

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

// ── PDF Export ────────────────────────────────────────────────

let exportType = 'weekly';
let selectedTopic = 'E-Bike Incentives';
let selectedBillIds = new Set(BILLS.map(b => b.id));

function buildExportPage() {
  // Report type options
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
        updateExportUI();
      });
    });
  }

  // Section checkboxes
  const secEl = document.getElementById('export-sections');
  if (secEl) {
    secEl.innerHTML = EXPORT_SECTIONS.map(s => `
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
        <input type="checkbox" id="${s.id}" ${s.def ? 'checked' : ''}> ${s.label}
      </label>`).join('');
  }

  // Topic chips
  const topicChips = document.getElementById('topic-filter-chips');
  if (topicChips) {
    topicChips.innerHTML = TOPIC_OPTIONS.map((t, i) =>
      `<span class="stopic${i === 0 ? ' on' : ''}" data-topic="${t}">${t}</span>`
    ).join('');
    topicChips.querySelectorAll('.stopic').forEach(el => {
      el.addEventListener('click', () => {
        topicChips.querySelectorAll('.stopic').forEach(s => s.classList.remove('on'));
        el.classList.add('on');
        selectedTopic = el.dataset.topic;
        updatePreview();
      });
    });
  }

  // Bill checkboxes for custom mode
  const billList = document.getElementById('bill-filter-list');
  if (billList) {
    billList.innerHTML = BILLS.map(b => `
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer">
        <input type="checkbox" data-bill-id="${b.id}" checked>
        <span class="pd p${b.p[0]}" style="flex-shrink:0"></span>
        <span style="flex:1">${b.title}</span>
        <span class="sb s-${b.s}" style="flex-shrink:0">${STATUS_LABELS[b.s]}</span>
      </label>`).join('');
    billList.querySelectorAll('input[type=checkbox]').forEach(el => {
      el.addEventListener('change', () => {
        if (el.checked) selectedBillIds.add(el.dataset.billId);
        else selectedBillIds.delete(el.dataset.billId);
        updatePreview();
      });
    });
  }

  // Priority and sort filters update preview
  document.getElementById('export-priority')?.addEventListener('change', updatePreview);
  document.getElementById('export-sort')?.addEventListener('change', updatePreview);

  document.getElementById('generate-pdf-btn')?.addEventListener('click', generatePDF);

  updateExportUI();
}

function updateExportUI() {
  const topicRow = document.getElementById('topic-filter-row');
  const billRow  = document.getElementById('bill-filter-row');

  if (topicRow) topicRow.style.display  = (exportType === 'topic') ? 'block' : 'none';
  if (billRow)  billRow.style.display   = (exportType === 'custom') ? 'block' : 'none';

  updatePreview();
}

function getFilteredBills() {
  const priority = document.getElementById('export-priority')?.value || 'all';
  const sort     = document.getElementById('export-sort')?.value || 'priority';

  let bills = [...BILLS];

  // Filter by type
  if (exportType === 'highpri')  bills = bills.filter(b => b.p === 'high');
  if (exportType === 'topic')    bills = bills.filter(b => b.topic === selectedTopic);
  if (exportType === 'custom')   bills = bills.filter(b => selectedBillIds.has(b.id));

  // Filter by priority dropdown
  if (priority === 'high')       bills = bills.filter(b => b.p === 'high');
  if (priority === 'highmed')    bills = bills.filter(b => b.p === 'high' || b.p === 'med');

  // Sort
  const sortOrder = { high:0, med:1, low:2 };
  const statusOrder = { floor:0, committee:1, intro:2, passed:3, enacted:4, failed:5 };
  if (sort === 'priority')    bills.sort((a,b) => (sortOrder[a.p]||0) - (sortOrder[b.p]||0));
  if (sort === 'status')      bills.sort((a,b) => (statusOrder[a.s]||0) - (statusOrder[b.s]||0));
  if (sort === 'updated')     bills.sort((a,b) => b.upd.localeCompare(a.upd));
  if (sort === 'jurisdiction') bills.sort((a,b) => a.jur.localeCompare(b.jur));

  return bills;
}

function updatePreview() {
  const bills = getFilteredBills();
  const countEl = document.getElementById('preview-bill-count');
  const titleEl = document.getElementById('preview-title');
  const subEl   = document.getElementById('preview-subtitle');
  const descEl  = document.getElementById('preview-desc');
  const tableEl = document.getElementById('preview-table-wrap');

  if (countEl) countEl.textContent = `${bills.length} bill${bills.length !== 1 ? 's' : ''} selected`;

  const titles = {
    weekly:  'Weekly Brief — Week of March 31 – April 6, 2026',
    tracker: 'Full Bill Tracker — All Active Legislation',
    topic:   `Topic Brief — ${selectedTopic}`,
    highpri: 'High Priority Bills — April 2026',
    custom:  'Custom Report — Selected Bills',
  };
  const subs = {
    weekly:  'Weekly Brief · Week of March 31 – April 6, 2026',
    tracker: 'Full Tracker · 142 active bills · April 2026',
    topic:   `Topic Brief · ${selectedTopic} · April 2026`,
    highpri: 'High Priority · April 2026',
    custom:  'Custom Report · April 2026',
  };

  if (titleEl) titleEl.textContent = titles[exportType] || '';
  if (subEl)   subEl.textContent   = subs[exportType] || '';
  if (descEl)  descEl.textContent  = `${bills.length} bills included in this report.`;

  if (tableEl) {
    tableEl.innerHTML = `
      <table class="preview-table" style="margin-top:10px">
        <tr><th>Bill ID</th><th>Title</th><th>Status</th></tr>
        ${bills.slice(0,5).map(b => `<tr><td>${b.id}</td><td>${b.title.substring(0,35)}…</td><td>${STATUS_LABELS[b.s]}</td></tr>`).join('')}
        ${bills.length > 5 ? `<tr><td colspan="3" style="color:#999;font-style:italic">…and ${bills.length - 5} more bills</td></tr>` : ''}
      </table>`;
  }
}

function generatePDF() {
  const statusEl = document.getElementById('pdf-status');
  const bills    = getFilteredBills();
  const include  = {
    summary:      document.getElementById('cb-summary')?.checked,
    developments: document.getElementById('cb-developments')?.checked,
    table:        document.getElementById('cb-table')?.checked,
    highpri:      document.getElementById('cb-highpri')?.checked,
    stats:        document.getElementById('cb-stats')?.checked,
  };

  const reportTitle = {
    weekly:  'Weekly Brief — Week of March 31 – April 6, 2026',
    tracker: 'Full Bill Tracker — All Active Legislation',
    topic:   `Topic Brief — ${selectedTopic}`,
    highpri: 'High Priority Bills — April 2026',
    custom:  'Custom Report — Selected Bills',
  }[exportType] || 'VeloPolicy Report';

  const billRows = bills.map(b => `
    <tr>
      <td>${b.id}</td>
      <td>${b.title}</td>
      <td>${b.jur}</td>
      <td>${b.topic}</td>
      <td>${STATUS_LABELS[b.s]}</td>
      <td style="color:${b.p==='high'?'#c0392b':b.p==='med'?'#e9a000':'#94a3b8'};font-weight:600">${b.p.charAt(0).toUpperCase()+b.p.slice(1)}</td>
    </tr>`).join('');

  const statsBlock = include.stats ? `
    <h2>Statistics</h2>
    <p>Total bills in this report: <strong>${bills.length}</strong></p>
    <p>High priority: <strong>${bills.filter(b=>b.p==='high').length}</strong> &nbsp;|&nbsp;
       In committee: <strong>${bills.filter(b=>b.s==='committee').length}</strong> &nbsp;|&nbsp;
       Enacted: <strong>${bills.filter(b=>b.s==='enacted').length}</strong> &nbsp;|&nbsp;
       Floor vote: <strong>${bills.filter(b=>b.s==='floor').length}</strong></p>` : '';

  const highPriBlock = include.highpri ? `
    <h2>High Priority Detail</h2>
    ${bills.filter(b=>b.p==='high').map(b=>`
      <div class="dev">
        <div class="dev-date">${b.id} · ${b.jur} · ${STATUS_LABELS[b.s]}</div>
        <div class="dev-title">${b.title}</div>
        <p>Topic: ${b.topic} · Scope: ${b.scope.toUpperCase()} · Last updated: ${b.upd}</p>
      </div>`).join('')}` : '';

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>VeloPolicy — ${reportTitle}</title>
<style>
  body{font-family:Georgia,serif;margin:48px;color:#111;font-size:13px;line-height:1.7;max-width:760px}
  .header{border-bottom:3px solid #1a4731;padding-bottom:12px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-end}
  .logo{font-size:20px;font-weight:700;color:#1a4731}
  .week{font-size:11px;color:#666;text-align:right}
  h1{font-size:22px;color:#111;margin:0 0 20px;font-weight:700}
  h2{font-size:11px;color:#1a4731;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.8px;font-family:Arial,sans-serif;border-bottom:1px solid #d8f3dc;padding-bottom:4px}
  p{margin-bottom:10px;color:#333;font-family:Arial,sans-serif;font-size:13px}
  .dev{margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #eee}
  .dev-date{font-size:10px;color:#999;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:.5px}
  .dev-title{font-size:15px;font-weight:700;margin:3px 0 6px}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:11px;font-family:Arial,sans-serif}
  th{text-align:left;padding:7px 8px;border-bottom:2px solid #1a4731;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#666;background:#f9fafb}
  td{padding:7px 8px;border-bottom:1px solid #eee;color:#333;vertical-align:top}
  tr:nth-child(even) td{background:#fafafa}
  .footer{margin-top:48px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#999;text-align:center;font-family:Arial,sans-serif}
  @media print{body{margin:24px}h2{page-break-after:avoid}.dev{page-break-inside:avoid}}
</style></head><body>
<div class="header">
  <div>
    <div class="logo">🚲 VeloPolicy</div>
    <div style="font-size:12px;color:#666;margin-top:2px">Micromobility Policy Intelligence</div>
  </div>
  <div class="week">
    ${reportTitle}<br>
    Generated ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
  </div>
</div>
<h1>${reportTitle}</h1>

${include.summary && exportType === 'weekly' ? `
<h2>Executive Summary</h2>
<p>This week's legislative landscape shows accelerating momentum around e-bike incentive programs at the federal level, while several states move protected infrastructure bills toward floor votes. The EU's draft harmonization directive is reshaping international policy benchmarks. 142 bills are actively tracked across 41 jurisdictions.</p>` : ''}

${include.summary && exportType !== 'weekly' ? `
<h2>Report Summary</h2>
<p>This report covers <strong>${bills.length} bills</strong> matching your selected filters. 
High priority: ${bills.filter(b=>b.p==='high').length} · 
In committee: ${bills.filter(b=>b.s==='committee').length} · 
Enacted: ${bills.filter(b=>b.s==='enacted').length}.</p>` : ''}

${include.developments && exportType === 'weekly' ? `
<h2>Key Developments</h2>
${DEVELOPMENTS.map(x=>`<div class="dev"><div class="dev-date">${x.d}, 2026</div><div class="dev-title">${x.title}</div><p>${x.body}</p></div>`).join('')}` : ''}

${statsBlock}

${include.table ? `
<h2>Legislation — ${bills.length} Bill${bills.length!==1?'s':''}</h2>
<table>
  <thead><tr><th>Bill ID</th><th>Title</th><th>Jurisdiction</th><th>Topic</th><th>Status</th><th>Priority</th></tr></thead>
  <tbody>${billRows}</tbody>
</table>` : ''}

${highPriBlock}

<div class="footer">
  Generated by VeloPolicy · velopolicy.io · ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} · 
  Report type: ${reportTitle}
</div>
</body></html>`;

  const filename = `VeloPolicy_${exportType}_${new Date().toISOString().slice(0,10)}.html`;
  const blob = new Blob([html], { type:'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);

  if (statusEl) {
    statusEl.textContent = `✓ ${filename} downloaded — open in browser, then File → Print → Save as PDF`;
    setTimeout(() => statusEl.textContent = '', 10000);
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
