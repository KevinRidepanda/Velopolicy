// public/js/charts.js
// Chart.js initializations. Runs after Chart.js CDN loads.

document.addEventListener('DOMContentLoaded', () => {
  const green  = '#1a4731';
  const gMid   = '#2d6a4f';
  const gLight = '#52b788';
  const amber  = '#e9a000';
  const blue   = '#1565c0';
  const red    = '#e74c3c';
  const purple = '#6d28d9';

  const statusCtx = document.getElementById('statusChart');
  if (statusCtx) {
    new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Introduced','In Committee','Floor Vote','Passed','Enacted','Failed'],
        datasets: [{
          data: [38, 52, 12, 14, 18, 8],
          backgroundColor: [blue, amber, purple, gMid, gLight, red],
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} bills` } },
        },
        cutout: '62%',
      },
    });
  }

  const actCtx = document.getElementById('activityChart');
  if (actCtx) {
    new Chart(actCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr (est)'],
        datasets: [
          {
            label: 'New Bills',
            data: [22, 34, 41, 45],
            borderColor: green,
            backgroundColor: 'rgba(26,71,49,.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: green,
          },
          {
            label: 'Enacted',
            data: [3, 5, 7, 3],
            borderColor: gLight,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: gLight,
            borderDash: [5, 3],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
        },
      },
    });
  }
});
