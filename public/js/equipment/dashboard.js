function barGradient(ctx, chartArea) {
  if (!chartArea) return '#0ea5e9';
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradient.addColorStop(0, '#c026d3');
  gradient.addColorStop(0.33, '#8b5cf6');
  gradient.addColorStop(0.66, '#0ea5e9');
  gradient.addColorStop(1, '#17275c');
  return gradient;
}

function hbarGradient(ctx, chartArea) {
  if (!chartArea) return '#0ea5e9';
  const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
  gradient.addColorStop(0, '#17275c');
  gradient.addColorStop(0.33, '#0ea5e9');
  gradient.addColorStop(0.66, '#8b5cf6');
  gradient.addColorStop(1, '#c026d3');
  return gradient;
}

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

function chartColors() {
  const dark = isDarkMode();
  return {
    grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    tick: dark ? '#cbd5e1' : '#475569',
    title: dark ? '#e2e8f0' : '#334155',
    label: dark ? '#f1f5f9' : '#1e293b',
  };
}

let dashboardCharts = [];

function destroyCharts() {
  dashboardCharts.forEach((c) => c.destroy());
  dashboardCharts = [];
}

async function initEquipamentDashboard() {
  destroyCharts();

  document.querySelector('[data-action="generate-report"]')
    ?.addEventListener('click', generateReport);

  try {
    const response = await fetch('/app/api/index.php?route=dashboard');
    const json = await response.json();

    if (!json.success) return;

    renderStatusCards(json);
    renderParetoChart(json.topSites);
    renderMachinesChart(json.topMachines);
    renderTechniciansChart(json.topTechnicians);
    renderResolutionByMachine(json.resolutionByMachine);
    renderResolutionByMonth(json.resolutionByMonth);
    renderResolutionByTechnician(json.resolutionByTechnician);
  } catch (err) {
    console.error(err);
  }
}

function renderStatusCards(data) {
  const total = data.totalTickets || 1;
  const counts = data.statusCounts || {};

  const statuses = [
    { id: 'pending', el: 'cardPending', countEl: 'pendingCount', pctEl: 'pendingPct' },
    { id: 'planned', el: 'cardPlanned', countEl: 'plannedCount', pctEl: 'plannedPct' },
    { id: 'completed', el: 'cardCompleted', countEl: 'completedCount', pctEl: 'completedPct' },
  ];

  statuses.forEach((s) => {
    const val = counts[s.id] || 0;
    const pct = ((val / total) * 100).toFixed(1);

    document.getElementById(s.countEl).textContent = val;
    document.getElementById(s.pctEl).textContent = pct;
    document.getElementById(s.el).classList.remove('hidden');
  });
}

function renderParetoChart(data) {
  const ctx = document.getElementById('paretoChart');
  if (!ctx || !data || data.length === 0) return;

  const labels = data.map((d) => d.local);
  const values = data.map((d) => parseInt(d.problemas, 10) || 0);
  const total = values.reduce((a, b) => a + b, 0);

  if (total === 0) return;

  let acc = 0;
  const cumulative = values.map((v) => {
    acc += v;
    return Math.round((acc / total) * 1000) / 10;
  });

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Ocorrências',
          data: values,
          backgroundColor: function(context) {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            return barGradient(ctx, chartArea);
          },
          borderColor: '#0ea5e9',
          borderWidth: 1,
          order: 2,
        },
        {
          label: '% Acumulado',
          data: cumulative,
          type: 'line',
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          clip: false,
          pointBackgroundColor: 'rgb(239, 68, 68)',
          pointRadius: 3,
          fill: false,
          tension: 0,
          yAxisID: 'y1',
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.datasetIndex === 0) return `Ocorrências: ${ctx.parsed.y}`;
              return `% Acumulado: ${ctx.parsed.y}%`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Ocorrências', color: chartColors().title },
          grid: { color: chartColors().grid },
          ticks: { color: chartColors().tick },
        },
        y1: {
          beginAtZero: true,
          max: 100,
          position: 'right',
          title: { display: true, text: '% Acumulado', color: chartColors().title },
          grid: { drawOnChartArea: false },
          ticks: {
            callback: (v) => v + '%',
            color: chartColors().tick,
          },
        },
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45, color: chartColors().tick },
        },
      },
      layout: {
        padding: { right: 10 },
      },
    },
  });

  dashboardCharts.push(chart);
}

function renderHorizontalBarChart(ctxId, data, getLabel, getValue, xTitle, tooltipFormatter) {
  const ctx = document.getElementById(ctxId);
  if (!ctx || !data || data.length === 0) return;

  const labels = data.map(getLabel).reverse();
  const values = data.map(getValue).reverse();

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: xTitle,
        data: values,
        backgroundColor: function(context) {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          return hbarGradient(ctx, chartArea);
        },
        borderColor: '#0ea5e9',
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: tooltipFormatter ? {
          callbacks: {
            label: tooltipFormatter,
          },
        } : undefined,
      },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: xTitle, color: chartColors().title },
          grid: { color: chartColors().grid },
          ticks: { color: chartColors().tick },
        },
        y: {
          grid: { display: false },
          ticks: { color: chartColors().tick },
        },
      },
    },
  });

  dashboardCharts.push(chart);
}

function renderMachinesChart(data) {
  renderHorizontalBarChart(
    'machinesChart', data,
    (d) => `${d.equipamento} - ${d.local}`,
    (d) => d.total_registros,
    'Total de Registros',
    (ctx) => {
      const item = data[data.length - 1 - ctx.dataIndex];
      const loc = item.localidade || '';
      return `${item.equipamento}: ${ctx.parsed.x} ocorrências\n${loc}`;
    },
  );
}

function renderTechniciansChart(data) {
  renderHorizontalBarChart(
    'techniciansChart', data,
    (d) => d.equipe,
    (d) => d.atendimentos,
    'Atendimentos',
    null,
  );
}

function renderResolutionByMachine(data) {
  renderHorizontalBarChart(
    'resolutionMachineChart', data,
    (d) => `${d.equipamento} - ${d.local}`,
    (d) => parseFloat(d.dias_medio),
    'Dias',
    (ctx) => `${ctx.parsed.x.toFixed(1)} dias`,
  );
}

function renderResolutionByTechnician(data) {
  renderHorizontalBarChart(
    'resolutionTechnicianChart', data,
    (d) => d.equipe,
    (d) => parseFloat(d.dias_medio),
    'Dias',
    (ctx) => `${ctx.parsed.x.toFixed(1)} dias`,
  );
}

function renderResolutionByMonth(data) {
  const ctx = document.getElementById('resolutionMonthChart');
  if (!ctx || !data || data.length === 0) return;

  const labels = data.map((d) => {
    const [year, month] = d.mes.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toLowerCase() + '-' + year.slice(-2);
  });
  const values = data.map((d) => parseFloat(d.dias_medio));

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Dias',
        data: values,
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#0ea5e9',
        pointRadius: 4,
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.parsed.y.toFixed(1)} dias`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Dias', color: chartColors().title },
          grid: { color: chartColors().grid },
          ticks: { color: chartColors().tick },
        },
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45, color: chartColors().tick },
        },
      },
    },
  });

  dashboardCharts.push(chart);
}
