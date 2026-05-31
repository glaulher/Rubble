function pvBarGradient(ctx, chartArea) {
  if (!chartArea) return '#0ea5e9';
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradient.addColorStop(0, '#17275c');
  gradient.addColorStop(0.33, '#0ea5e9');
  gradient.addColorStop(0.66, '#8b5cf6');
  gradient.addColorStop(1, '#c026d3');
  return gradient;
}

function pvHbarGradient(ctx, chartArea) {
  if (!chartArea) return '#0ea5e9';
  const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
  gradient.addColorStop(0, '#c026d3');
  gradient.addColorStop(0.33, '#8b5cf6');
  gradient.addColorStop(0.66, '#0ea5e9');
  gradient.addColorStop(1, '#17275c');
  return gradient;
}

let pvCharts = [];
let pvMiniCharts = [];

function destroyPvCharts() {
  pvCharts.forEach((c) => c.destroy());
  pvCharts = [];
  pvMiniCharts.forEach((c) => c.destroy());
  pvMiniCharts = [];
}

function pvFormatCurrency(value) {
  const num = Number(value) || 0;
  const fixed = num.toFixed(2);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts[0] + ',' + parts[1];
}

function pvToTitleCase(str) {
  if (!str) return '';
  const abbreviations = ['TR', 'BTU', 'HP', 'R-134A', 'R-22', 'R-410A', 'R-32', 'AC', 'DC', 'HZ', 'KW', 'KVA', 'KV', 'V', 'A'];
  return str.replace(/\w+/g, (word) => {
    const upper = word.toUpperCase();
    if (abbreviations.includes(upper)) return upper;
    return upper.charAt(0) + upper.slice(1).toLowerCase();
  });
}

function getPvFilters() {
  return {
    period_start: document.getElementById('filterPeriodStart')?.value || '',
    period_end: document.getElementById('filterPeriodEnd')?.value || '',
    location: document.getElementById('filterLocation')?.value || '',
    status_group: document.getElementById('filterStatusGroup')?.value || 'all',
  };
}

async function initPvDashboard() {
  destroyPvCharts();

  try {
    const filters = getPvFilters();
    const params = new URLSearchParams();
    if (filters.period_start) params.set('period_start', filters.period_start);
    if (filters.period_end) params.set('period_end', filters.period_end);
    if (filters.location) params.set('location', filters.location);
    if (filters.status_group && filters.status_group !== 'all') params.set('status_group', filters.status_group);

    const response = await fetch('/app/api/index.php?route=pv-dashboard&' + params.toString());
    const json = await response.json();

    if (!json.success) return;

    renderPvStatusCards(json);
    renderPvFinancialChart(json.financialByMonth);
    renderPvParetoChart(json.topLocations);
    renderPvHorizontalChart('pvMaterialsChart', json.topMaterials, (d) => d.descricao_lpu || d.descricao, (d) => parseFloat(d.valorTotal), 'Valor Total (R$)', (d) => d.quantidade);
    renderPvHorizontalChart('pvServicesChart', json.topServices, (d) => d.descricao_lpu || d.descricao, (d) => parseFloat(d.valorTotal), 'Valor Total (R$)', (d) => d.quantidade);
    renderPvHorizontalChart('pvEquipmentChart', json.topEquipment, (d) => d.equipamento + ' - ' + d.local, (d) => parseFloat(d.totalValue), 'Valor Total (R$)');

    const locationList = document.getElementById('locationList');
    if (json.locations && locationList.options.length === 0) {
      json.locations.forEach((loc) => {
        const opt = document.createElement('option');
        opt.value = loc;
        locationList.appendChild(opt);
      });
    }

    setupFilterListeners();
  } catch (err) {
    console.error(err);
  }
}

function setupFilterListeners() {
  ['filterPeriodStart', 'filterPeriodEnd', 'filterLocation'].forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el.dataset.listenerAttached) {
      el.addEventListener('change', initPvDashboard);
      el.dataset.listenerAttached = '1';
    }
  });
}

function renderPvStatusCards(data) {
  const breakdown = data.statusBreakdown || [];
  const totalValue = data.statusTotalValue || 1;

  const cardConfig = {
    cancelados_negados: { el: 'pvCardCanceladosNegados', valueEl: 'pvCanceladosNegadosVal', sparkEl: 'pvSparkCanceladosNegados', color: '#6b7280', type: 'value' },
    scm_aprovado: { el: 'pvCardScmAprovado', valueEl: 'pvScmAprovado', sparkEl: 'pvSparkScmAprovado', color: '#06b6d4', type: 'value' },
    sem_aprovacao: { el: 'pvCardSemAprovacao', valueEl: 'pvSemAprovacao', sparkEl: 'pvSparkSemAprovacao', color: '#d97706', type: 'value' },
    aprovado_exec_aquisicao: { el: 'pvCardAprovadoExec', valueEl: 'pvAprovadoExecVal', sparkEl: 'pvSparkAprovadoExec', color: '#16a34a', type: 'value' },
    total_geral: { el: 'pvCardTotalGeral', valueEl: 'pvTotalGeral', sparkEl: 'pvSparkTotalGeral', color: '#6366f1', type: 'value' },
  };

  breakdown.forEach((b) => {
    const cfg = cardConfig[b.key];
    if (!cfg) return;

    const card = document.getElementById(cfg.el);
    if (!card) return;

    if (b.type === 'count') {
      document.getElementById(cfg.valueEl).textContent = b.count;
    } else {
      document.getElementById(cfg.valueEl).textContent = pvFormatCurrency(b.value);
    }

    card.classList.remove('hidden');

    renderMiniBar(cfg.sparkEl, b.type === 'count' ? b.count : b.value, totalValue, cfg.color);

    if (b.key === 'cancelados_negados') {
      const el = document.getElementById('pvCanceladosNegados');
      if (el) el.textContent = b.count;
    }

    if (b.key === 'scm_aprovado') {
      const el = document.getElementById('pvScmAprovadoCount');
      if (el) el.textContent = b.count;
    }
    if (b.key === 'sem_aprovacao') {
      const el = document.getElementById('pvSemAprovacaoCount');
      if (el) el.textContent = b.count;
    }
    if (b.key === 'aprovado_exec_aquisicao') {
      const el = document.getElementById('pvAprovadoExecCount');
      if (el) el.textContent = b.count;
    }
    if (b.key === 'total_geral') {
      const el = document.getElementById('pvTotalGeralCount');
      if (el) el.textContent = b.count;
    }
  });
}

function renderMiniBar(canvasId, currentValue, totalValue, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const remainder = Math.max(totalValue - currentValue, 0);

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: [''],
      datasets: [{
        data: [currentValue, remainder],
        backgroundColor: [color, '#e2e8f0'],
        borderColor: [color, '#94a3b8'],
        borderWidth: 1,
        borderRadius: 2,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: false, tooltip: false },
      scales: {
        x: { display: false, stacked: true, max: totalValue },
        y: { display: false, stacked: true },
      },
    },
  });

  pvMiniCharts.push(chart);
}

function renderPvFinancialChart(data) {
  const ctx = document.getElementById('pvFinancialChart');
  if (!ctx || !data || data.length === 0) return;

  const labels = data.map((d) => d.mes);
  const faturado = data.map((d) => parseFloat(d.faturado));
  const previsao = data.map((d) => parseFloat(d.previsao));

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Faturado',
          data: faturado,
          backgroundColor: function(context) {
            const c = context.chart;
            if (!c.chartArea) return '#0ea5e9';
            const g = c.ctx.createLinearGradient(0, c.chartArea.bottom, 0, c.chartArea.top);
            g.addColorStop(0, '#17275c');
            g.addColorStop(1, '#0ea5e9');
            return g;
          },
          borderRadius: 4,
        },
        {
          label: 'Previsão',
          data: previsao,
          backgroundColor: function(context) {
            const c = context.chart;
            if (!c.chartArea) return '#8b5cf6';
            const g = c.ctx.createLinearGradient(0, c.chartArea.bottom, 0, c.chartArea.top);
            g.addColorStop(0, '#8b5cf6');
            g.addColorStop(1, '#c026d3');
            return g;
          },
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.dataset.label + ': R$ ' + pvFormatCurrency(ctx.parsed.y),
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Valor (R$)' },
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            callback: (v) => 'R$ ' + pvFormatCurrency(v),
          },
        },
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45 },
        },
      },
    },
  });

  pvCharts.push(chart);
}

function renderPvParetoChart(data) {
  const ctx = document.getElementById('pvParetoChart');
  if (!ctx || !data || data.length === 0) return;

  const labels = data.map((d) => d.local);
  const values = data.map((d) => parseFloat(d.totalValue));
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
          label: 'Valor',
          data: values,
          backgroundColor: function(context) {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            return pvBarGradient(ctx, chartArea);
          },
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
              if (ctx.datasetIndex === 0) return 'Valor: R$ ' + pvFormatCurrency(ctx.parsed.y);
              return '% Acumulado: ' + ctx.parsed.y + '%';
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Valor (R$)' },
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            callback: (v) => 'R$ ' + pvFormatCurrency(v),
          },
        },
        y1: {
          beginAtZero: true,
          max: 100,
          position: 'right',
          title: { display: true, text: '% Acumulado' },
          grid: { drawOnChartArea: false },
          ticks: {
            callback: (v) => v + '%',
          },
        },
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45 },
        },
      },
      layout: {
        padding: { right: 10 },
      },
    },
  });

  pvCharts.push(chart);
}

function pvTruncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '...' : str;
}

function renderPvHorizontalChart(ctxId, data, getLabel, getValue, xTitle, getQuantity) {
  const ctx = document.getElementById(ctxId);
  if (!ctx || !data || data.length === 0) return;

  const labels = data.map((d) => pvToTitleCase(pvTruncate(getLabel(d), 25))).reverse();
  const values = data.map(getValue).reverse();
  const quantities = getQuantity ? data.map(getQuantity).reverse() : null;
  const hasLabels = quantities && quantities.some((q) => q > 0);

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
          return pvHbarGradient(ctx, chartArea);
        },
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => 'R$ ' + pvFormatCurrency(ctx.parsed.x),
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: xTitle },
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            callback: (v) => 'R$ ' + pvFormatCurrency(v),
          },
        },
        y: {
          grid: { display: false },
        },
      },
    },
    plugins: hasLabels ? [{
      id: 'barLabels',
      afterDraw(chart) {
        const meta = chart.getDatasetMeta(0);
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        meta.data.forEach((bar, i) => {
          const q = quantities[i];
          if (q <= 0) return;
          ctx.fillStyle = '#1e293b';
          const x = bar.x + 12;
          const y = bar.y;
          ctx.fillText(parseInt(q), x, y);
        });
        ctx.restore();
      },
    }] : [],
  });

  pvCharts.push(chart);
}
