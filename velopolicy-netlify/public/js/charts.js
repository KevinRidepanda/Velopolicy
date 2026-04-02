// public/js/charts.js
// Chart.js initializations — all charts are driven by live tracked bill data.
// Charts rebuild whenever bills are added, removed, or updated.
// Exports: initCharts(), rebuildCharts(), refreshCharts()

// ── Color palette ─────────────────────────────────────────────
var C = {
  green:     '#1a4731',
  greenMid:  '#2d6a4f',
  greenL:    '#52b788',
  greenPale: '#d8f3dc',
  amber:     '#e9a000',
  amberPale: '#fff3cd',
  blue:      '#1565c0',
  bluePale:  '#e3f0ff',
  red:       '#e74c3c',
  redPale:   '#fdecea',
  purple:    '#6d28d9',
  gray:      '#94a3b8',
  grayPale:  '#f1f5f9',
  border:    '#e5e7eb',
};

// Track chart instances so we can destroy and rebuild cleanly
var chartInstances = {};

function destroyChart(key) {
  if (chartInstances[key]) {
    chartInstances[key].destroy();
    delete chartInstances[key];
  }
}

// ── Data helpers — read from live BILLS array ─────────────────

function getStatusCounts() {
  const counts = { intro:0, committee:0, floor:0, passed:0, enacted:0, failed:0 };
  (window.BILLS || []).forEach(b => { if (counts[b.s] !== undefined) counts[b.s]++; });
  return counts;
}

function getTopicCounts() {
  const counts = {};
  (window.BILLS || []).forEach(b => {
    counts[b.topic] = (counts[b.topic] || 0) + 1;
  });
  return counts;
}

function getScopeCounts() {
  const counts = { federal:0, state:0, local:0, intl:0 };
  (window.BILLS || []).forEach(b => { if (counts[b.scope] !== undefined) counts[b.scope]++; });
  return counts;
}

function getPriorityCounts() {
  const counts = { high:0, med:0, low:0 };
  (window.BILLS || []).forEach(b => { if (counts[b.p] !== undefined) counts[b.p]++; });
  return counts;
}

// ── Placeholder chart for empty state ─────────────────────────

function emptyChart(ctx, type, labels) {
  const data = labels.map(() => type === 'doughnut' ? 0 : 0);
  // Show a single grey segment for doughnut, or flat bars
  return new Chart(ctx, {
    type,
    data: {
      labels: type === 'doughnut' ? ['Add bills via Live Search'] : labels,
      datasets: [{
        data: type === 'doughnut' ? [1] : labels.map(() => 0),
        backgroundColor: type === 'doughnut' ? [C.border] : C.border,
        borderWidth: 0,
        borderRadius: type !== 'doughnut' ? 6 : 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: () => 'Track bills via Live Search' } },
      },
      cutout: type === 'doughnut' ? '62%' : undefined,
      scales: type !== 'doughnut' ? {
        x: { grid:{ display:false }, ticks:{ font:{ size:11 } } },
        y: { grid:{ color:C.grayPale }, ticks:{ font:{ size:11 }, stepSize:1 }, min:0, max:5 },
      } : undefined,
    },
  });
}

// ── Chart 1: Status doughnut ──────────────────────────────────
function buildStatusChart() {
  destroyChart('status');
  const ctx = document.getElementById('statusChart');
  if (!ctx) return;

  const counts = getStatusCounts();
  const total  = Object.values(counts).reduce((a,b) => a+b, 0);

  if (total === 0) {
    chartInstances['status'] = emptyChart(ctx, 'doughnut', []);
    return;
  }

  const allLabels = ['Introduced','In Committee','Floor Vote','Passed','Enacted','Failed'];
  const allValues = [counts.intro, counts.committee, counts.floor, counts.passed, counts.enacted, counts.failed];
  const allColors = [C.blue, C.amber, C.purple, C.greenMid, C.greenL, C.red];
  const allKeys   = ['intro','committee','floor','passed','enacted','failed'];

  // Only show slices with at least 1 bill
  const active = allLabels
    .map((l,i) => ({ label:l, value:allValues[i], color:allColors[i], key:allKeys[i] }))
    .filter(x => x.value > 0);

  chartInstances['status'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: active.map(x => x.label),
      datasets: [{
        data:            active.map(x => x.value),
        backgroundColor: active.map(x => x.color),
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed} bill${ctx.parsed !== 1 ? 's' : ''} (${Math.round(ctx.parsed / total * 100)}%)`,
          },
        },
      },
      cutout: '62%',
      onClick: (e, elements) => {
        if (!elements.length) return;
        const key = active[elements[0].index]?.key;
        if (!key) return;
        nav('legislation');
        setTimeout(() => {
          const btn = document.querySelector(`[data-filter="${key}"]`);
          if (btn) btn.click();
        }, 200);
      },
    },
    plugins: [{
      // Draw total count in the center hole
      id: 'centerText',
      afterDraw(chart) {
        const { ctx: c, chartArea: { width, height, left, top } } = chart;
        const cx = left + width / 2;
        const cy = top  + height / 2;
        c.save();
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `600 ${Math.min(22, width * 0.18)}px DM Sans, sans-serif`;
        c.fillStyle = C.green;
        c.fillText(total, cx, cy - 8);
        c.font = `400 11px DM Sans, sans-serif`;
        c.fillStyle = C.gray;
        c.fillText('bills', cx, cy + 10);
        c.restore();
      },
    }],
  });
}

// ── Chart 2: Topic horizontal bar ────────────────────────────
function buildTopicChart() {
  destroyChart('topic');
  const ctx = document.getElementById('topicChart');
  if (!ctx) return;

  const counts = getTopicCounts();

  if (Object.keys(counts).length === 0) {
    chartInstances['topic'] = emptyChart(ctx, 'bar',
      ['E-Bike Incentives','Infrastructure','Safety','Parking','Data','International']);
    return;
  }

  const topicColors = {
    'E-Bike Incentives':  C.green,
    'Infrastructure':     C.greenMid,
    'Safety & Liability': C.amber,
    'Parking & Zoning':   C.blue,
    'Data & Privacy':     C.purple,
    'International':      C.greenL,
  };

  // Sort by count descending
  const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
  const labels = sorted.map(x => x[0]);
  const values = sorted.map(x => x[1]);
  const colors = labels.map(l => topicColors[l] || C.gray);

  chartInstances['topic'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: colors.map(c => c + 'bb'),
      }],
    },
    options: {
      indexAxis: 'y',   // horizontal bars — easier to read topic names
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.x} bill${ctx.parsed.x !== 1 ? 's' : ''}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: C.grayPale },
          ticks: { font:{ size:10 }, stepSize:1, precision:0 },
          min: 0,
        },
        y: {
          grid: { display: false },
          ticks: { font:{ size:11 } },
        },
      },
      onClick: (e, elements) => {
        if (!elements.length) return;
        window._topicFilter = labels[elements[0].index];
        nav('legislation');
        setTimeout(() => renderLegTable(), 200);
      },
    },
  });
}

// ── Chart 3: Scope breakdown bar ─────────────────────────────
function buildScopeChart() {
  destroyChart('scope');
  const ctx = document.getElementById('activityChart');
  if (!ctx) return;

  const counts = getScopeCounts();
  const total  = Object.values(counts).reduce((a,b) => a+b, 0);

  if (total === 0) {
    chartInstances['scope'] = emptyChart(ctx, 'bar', ['Federal','State','Local','International']);
    return;
  }

  const labels = ['Federal', 'State', 'Local', 'International'];
  const values = [counts.federal, counts.state, counts.local, counts.intl];
  const colors = [C.blue, C.green, C.amber, C.purple];
  const keys   = ['federal', 'state', 'local', 'intl'];

  chartInstances['scope'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Bills by scope',
        data: values,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: colors.map(c => c + 'bb'),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} bill${ctx.parsed.y !== 1 ? 's' : ''} (${Math.round(ctx.parsed.y / total * 100)}%)`,
            title: ctx => ctx[0].label + ' scope',
          },
        },
      },
      scales: {
        x: { grid:{ display:false }, ticks:{ font:{ size:11 } } },
        y: {
          grid: { color: C.grayPale },
          ticks: { font:{ size:11 }, stepSize:1, precision:0 },
          min: 0,
        },
      },
      onClick: (e, elements) => {
        if (!elements.length) return;
        const scope = keys[elements[0].index];
        nav('legislation');
        setTimeout(() => {
          const btn = document.querySelector(`[data-filter="${scope}"]`);
          if (btn) btn.click();
        }, 200);
      },
    },
  });
}

// ── Chart 4: Priority doughnut ────────────────────────────────
function buildPriorityChart() {
  destroyChart('priority');
  const ctx = document.getElementById('priorityChart');
  if (!ctx) return;

  const counts = getPriorityCounts();
  const total  = Object.values(counts).reduce((a,b) => a+b, 0);

  if (total === 0) {
    chartInstances['priority'] = emptyChart(ctx, 'doughnut', []);
    return;
  }

  const active = [
    { label:'High',   value:counts.high, color:C.red,   key:'high' },
    { label:'Medium', value:counts.med,  color:C.amber, key:'med'  },
    { label:'Low',    value:counts.low,  color:C.gray,  key:'low'  },
  ].filter(x => x.value > 0);

  chartInstances['priority'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: active.map(x => x.label),
      datasets: [{
        data:            active.map(x => x.value),
        backgroundColor: active.map(x => x.color),
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed / total * 100)}%)`,
          },
        },
      },
      cutout: '55%',
      onClick: (e, elements) => {
        if (!elements.length) return;
        const key = active[elements[0].index]?.key;
        nav('legislation');
        setTimeout(() => {
          const btn = key === 'high'
            ? document.querySelector('[data-filter="high"]')
            : document.querySelector('[data-filter="all"]');
          if (btn) btn.click();
        }, 200);
      },
    },
    plugins: [{
      id: 'priorityCenterText',
      afterDraw(chart) {
        const { ctx: c, chartArea: { width, height, left, top } } = chart;
        const cx = left + width / 2;
        const cy = top  + height / 2;
        c.save();
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `600 ${Math.min(18, width * 0.16)}px DM Sans, sans-serif`;
        c.fillStyle = counts.high > 0 ? C.red : C.green;
        c.fillText(counts.high, cx, cy - 7);
        c.font = '400 10px DM Sans, sans-serif';
        c.fillStyle = C.gray;
        c.fillText('high pri', cx, cy + 8);
        c.restore();
      },
    }],
  });
}

// ── Legend helper ─────────────────────────────────────────────

function buildLegend(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<span style="font-size:11px;color:var(--muted)">Track bills to see data</span>';
    return;
  }
  el.innerHTML = items.map(item => `
    <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);margin-right:10px;margin-bottom:4px">
      <span style="width:10px;height:10px;border-radius:2px;background:${item.color};flex-shrink:0;display:inline-block"></span>
      ${item.label}${item.count !== undefined ? ` <strong style="color:var(--text)">${item.count}</strong>` : ''}
    </span>`).join('');
}

function buildAllLegends() {
  const status   = getStatusCounts();
  const scope    = getScopeCounts();
  const priority = getPriorityCounts();

  buildLegend('status-legend', [
    { color:C.blue,     label:'Introduced',  count:status.intro     },
    { color:C.amber,    label:'Committee',   count:status.committee },
    { color:C.purple,   label:'Floor Vote',  count:status.floor     },
    { color:C.greenMid, label:'Passed',      count:status.passed    },
    { color:C.greenL,   label:'Enacted',     count:status.enacted   },
    { color:C.red,      label:'Failed',      count:status.failed    },
  ].filter(x => x.count > 0));

  buildLegend('scope-legend', [
    { color:C.blue,   label:'Federal', count:scope.federal },
    { color:C.green,  label:'State',   count:scope.state   },
    { color:C.amber,  label:'Local',   count:scope.local   },
    { color:C.purple, label:'Intl',    count:scope.intl    },
  ].filter(x => x.count > 0));

  buildLegend('priority-legend', [
    { color:C.red,   label:'High',   count:priority.high },
    { color:C.amber, label:'Medium', count:priority.med  },
    { color:C.gray,  label:'Low',    count:priority.low  },
  ].filter(x => x.count > 0));
}

// ── Public API ────────────────────────────────────────────────

function initCharts() {
  buildStatusChart();
  buildTopicChart();
  buildScopeChart();
  buildPriorityChart();
  buildAllLegends();
}

function rebuildCharts() {
  buildStatusChart();
  buildTopicChart();
  buildScopeChart();
  buildPriorityChart();
  buildAllLegends();
}

// Alias used by app.js refreshDashboard()
function refreshCharts() {
  rebuildCharts();
}

// Boot — small delay lets app.js load BILLS from localStorage first
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initCharts, 150);
});  }
});
