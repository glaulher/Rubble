let pvEmailBatchIds = null;
let pvEmailBatchUf = null;

function openDeleteModal(id, pvNumber) {
  document.getElementById('deletePvId').value = id;
  document.getElementById('deletePvNumber').textContent = pvNumber;
  showModal('deleteModal');
}

function closeDeleteModal() {
  hideModal('deleteModal');
}

async function confirmDelete() {
  const id = document.getElementById('deletePvId').value;
  closeDeleteModal();

  try {
    const response = await fetch('/app/api/index.php?route=pv', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    const result = await response.json();

    if (!result.success) {
      showToast(result.message, 'error');
      return;
    }

    showToast(result.message, 'success');
    resetPvState(pvSearch, pvStatusFilter, pvCycleFilter, true);
    await loadPvs();
  } catch (err) {
    console.error(err);
    showToast('Erro ao excluir PV', 'error');
  }
}

async function deletePv(id) {
  try {
    const response = await fetch('/app/api/index.php?route=pv&id=' + id);
    const result = await response.json();
    const numeroPv = result.success && result.data ? result.data.numero_pv : id;
    openDeleteModal(id, numeroPv);
  } catch {
    openDeleteModal(id, id);
  }
}

function openStatusModal(id, pvNumber) {
  document.getElementById('statusPvId').value = id;
  document.getElementById('statusPvNumber').textContent = pvNumber;
  populateStatusSelect('statusSelect', '');
  showModal('statusModal');
}

function closeStatusModal() {
  hideModal('statusModal');
}

async function confirmStatusChange() {
  const id = document.getElementById('statusPvId').value;
  const status = document.getElementById('statusSelect').value;

  if (!status) {
    showToast('Selecione um status', 'error');
    return;
  }

  try {
    const response = await fetch('/app/api/index.php?route=pv', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(id), status }),
    });

    const result = await response.json();

    if (!result.success) {
      showToast(result.message, 'error');
      return;
    }

    showToast(result.message, 'success');
    closeStatusModal();
    resetPvState(pvSearch, pvStatusFilter, pvCycleFilter, true);
    await loadPvs();
  } catch (err) {
    console.error(err);
    showToast('Erro ao alterar status', 'error');
  }
}

async function openPvItemModal(id) {
  try {
    const response = await fetch(`/app/api/index.php?route=pv&id=${id}`);
    const result = await response.json();

    if (!result.success || !result.data) {
      showToast('Erro ao carregar PV', 'error');
      return;
    }

    const pv = result.data;
    const itens = pv.itens || [];

    document.getElementById('pvItemModalNumero').textContent = pv.numero_pv || '';
    document.getElementById('pvItemModalSubtitle').textContent =
      `${escapeHtml(pv.local || '')}${pv.equipamento ? ' — ' + escapeHtml(pv.equipamento) : ''}`;

    const tbody = document.getElementById('pvItemModalBody');
    tbody.innerHTML = '';

    let totalGeral = 0;

    itens.forEach((item) => {
      const valor = parseFloat(item.valor) || 0;
      const quantidade = parseFloat(item.quantidade) || 0;
      const valorTotal = parseFloat(item.valor_total) || 0;
      totalGeral += valorTotal;

      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-100';
      const lpuLabel = item.lpu_origem
        ? item.lpu_origem.replace('lpu_', '').replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : '-';
      tr.innerHTML = `
        <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(lpuLabel)}</td>
        <td class="px-3 py-3 text-sm text-slate-700">${item.numero_item || '-'}</td>
        <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(item.descricao_lpu || '-')}</td>
        <td class="px-3 py-3 text-sm text-slate-700">${escapeHtml(item.descricao || '-')}</td>
        <td class="px-3 py-3 text-sm text-slate-700">${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        <td class="flpu-col px-3 py-3 text-sm text-slate-700">${item.valor_flpu != null ? parseFloat(item.valor_flpu).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
        <td class="flpu-col px-3 py-3 text-sm text-slate-700">${item.bdi != null ? item.bdi + '%' : '-'}</td>
        <td class="px-3 py-3 text-sm text-slate-700 laudo-col hidden">${escapeHtml(item.laudo || '-')}</td>
        <td class="px-3 py-3 text-sm text-slate-700">${quantidade}</td>
        <td class="px-3 py-3 text-sm text-right font-medium text-slate-900">${valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('pvItemModalTotal').textContent =
      totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const hasLaudo = itens.some(item => item.laudo && item.laudo !== 'N/A');
    document.querySelectorAll('.laudo-col').forEach((el) => {
      if (hasLaudo) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    const hasFlpu = itens.some(item => item.fatura === 'flpu');
    document.querySelectorAll('.flpu-col').forEach((el) => {
      if (hasFlpu) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    pvEmailPvId = pv.id;
    pvEmailPvData = pv;

    showModal('pvItemModal');
  } catch (err) {
    console.error(err);
    showToast('Erro ao carregar itens', 'error');
  }
}

function closePvItemModal() {
  hideModal('pvItemModal');
}

function formatCurrency(value) {
  if (value == null || isNaN(value)) return 'R$ 0,00';
  const fixed = value.toFixed(2);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'R$ ' + parts[0] + ',' + parts[1];
}

function downloadPvPdf() {
  const pv = pvEmailPvData;
  if (!pv || !pv.itens || pv.itens.length === 0) {
    showToast('Nenhum item para exportar', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 10;
  const usableW = pageW - margin * 2;
  const headerH = 8;
  const rowH = 6;

  const hasFlpu = pv.itens.some(item => item.fatura === 'flpu');
  const hasLaudo = pv.itens.some(item => item.laudo && item.laudo !== 'N/A');

  const columns = [
    { key: 'lpuLabel', label: 'LPU Origem', align: 'left', width: 20, visible: true },
    { key: 'numero_item', label: 'N\u00ba', align: 'center', width: 8, visible: true },
    { key: 'descricao_lpu', label: 'Descri\u00e7\u00e3o LPU', align: 'left', width: 26, visible: true },
    { key: 'descricao', label: 'Especifica\u00e7\u00e3o', align: 'left', width: 38, visible: true },
    { key: 'valor', label: 'Valor LPU', align: 'right', width: 18, visible: true },
    { key: 'valor_flpu', label: 'Valor s/ BDI', align: 'right', width: 18, visible: hasFlpu },
    { key: 'bdi', label: 'BDI (%)', align: 'right', width: 10, visible: hasFlpu },
    { key: 'laudo', label: 'Laudo', align: 'center', width: 16, visible: hasLaudo },
    { key: 'quantidade', label: 'Qtd', align: 'right', width: 8, visible: true },
    { key: 'valor_total', label: 'Valor Total', align: 'right', width: 20, visible: true },
  ];

  const visibleCols = columns.filter(c => c.visible);
  const totalVisibleW = visibleCols.reduce((sum, c) => sum + c.width, 0);
  const scale = usableW / totalVisibleW;
  visibleCols.forEach(c => { c.width = Math.round(c.width * scale); });

  let y = margin;

  function getLpuLabel(item) {
    if (!item.lpu_origem) return '-';
    return item.lpu_origem
      .replace('lpu_', '')
      .replace('_', ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function drawHeader(yPos, cols) {
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, yPos, usableW, headerH, 'F');
    let x = margin;
    cols.forEach(col => {
      pdf.setFont('Helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      const text = col.label;
      const textW = pdf.getTextWidth(text);
      let textX = x + 2;
      if (col.align === 'right') textX = x + col.width - textW - 2;
      if (col.align === 'center') textX = x + (col.width - textW) / 2;
      pdf.text(text, textX, yPos + headerH - 2.5);
      x += col.width;
    });
  }

  function drawRow(yPos, item, cols) {
    let x = margin;
    cols.forEach(col => {
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);

      let value;
      if (col.key === 'lpuLabel') {
        value = getLpuLabel(item);
      } else if (col.key === 'valor') {
        value = formatCurrency(parseFloat(item.valor) || 0);
      } else if (col.key === 'valor_flpu') {
        value = item.valor_flpu != null ? formatCurrency(parseFloat(item.valor_flpu)) : '-';
      } else if (col.key === 'bdi') {
        value = item.bdi != null ? item.bdi + '%' : '-';
      } else if (col.key === 'laudo') {
        value = item.laudo || '-';
      } else if (col.key === 'valor_total') {
        value = formatCurrency(parseFloat(item.valor_total) || 0);
      } else {
        value = item[col.key] != null ? String(item[col.key]) : '-';
      }

      const textW = pdf.getTextWidth(value);
      let textX = x + 2;
      if (col.align === 'right') textX = x + col.width - textW - 2;
      if (col.align === 'center') textX = x + (col.width - textW) / 2;
      pdf.text(value, textX, yPos + rowH - 1.5);
      x += col.width;
    });
  }

  function drawRowBorders(yPos, cols) {
    let x = margin;
    cols.forEach(col => {
      pdf.setDrawColor(221);
      pdf.rect(x, yPos, col.width, rowH);
      x += col.width;
    });
  }

  function drawWrappedRow(yPos, cols, valueGetter) {
    const lineH = 4;
    const cellLines = cols.map(col => {
      const text = String(valueGetter(col.key) ?? '-');
      return pdf.splitTextToSize(text, Math.max(col.width - 4, 1));
    });
    const cellH = Math.max(Math.max(...cellLines.map(l => l.length)) * lineH, 6);

    let x = margin;
    cols.forEach((col, i) => {
      const lines = cellLines[i];
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(51, 65, 85);
      pdf.setDrawColor(221);
      pdf.rect(x, yPos, col.width, cellH);
      lines.forEach((line, li) => {
        const tw = pdf.getTextWidth(line);
        let tx = x + 2;
        if (col.align === 'right') tx = x + col.width - tw - 2;
        if (col.align === 'center') tx = x + (col.width - tw) / 2;
        pdf.text(line, tx, yPos + lineH * (li + 1) - 1);
      });
      x += col.width;
    });

    return cellH;
  }

  // Title
  const localPart = pv.local || '';
  const equipPart = pv.equipamento || '';
  const capacityPart = pv.capacidade ? ' - ' + pv.capacidade + ' TR' : '';
  const title = 'PV: ' + (pv.numero_pv || '') + ' \u2014 ' + localPart + (equipPart ? ' \u2014 ' + equipPart : '') + capacityPart;

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(30, 41, 59);
  pdf.text(title, margin, y + 4);

  y += 8;
  pdf.setDrawColor(200);
  pdf.line(margin, y, margin + usableW, y);
  y += 4;

  // Memorial de Cálculo
  const hasFilterData = pv.itens.some(item => item.filtro_data);
  if (hasFilterData) {
    y += 4;
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(30, 41, 59);
    pdf.text('Memorial de Cálculo', margin, y + 4);
    y += 6;

    const memorialCols = [
      { key: 'numero_item', label: 'Nº', align: 'center', width: 10 },
      { key: 'descricao', label: 'Descrição', align: 'left', width: 36 },
      { key: 'tamanho', label: 'Tamanho', align: 'left', width: 22 },
      { key: 'qtd_pecas', label: 'Peças', align: 'right', width: 10 },
      { key: 'area_placa', label: 'Área placa', align: 'right', width: 22 },
      { key: 'area_plana_total', label: 'Área total', align: 'right', width: 22 },
      { key: 'qtd_cobrar', label: 'Qtd cobrar', align: 'right', width: 14 },
    ];

    const memorialTotal = memorialCols.reduce((s, c) => s + c.width, 0);
    const memorialScale = usableW / memorialTotal;
    memorialCols.forEach(c => { c.width = Math.round(c.width * memorialScale); });

    if (y + headerH + rowH > 280) {
      pdf.addPage();
      y = margin;
    }
    drawHeader(y, memorialCols);
    y += headerH;

    pv.itens.forEach((item) => {
      if (!item.filtro_data) return;
      const fd = JSON.parse(item.filtro_data);
      if (y + 20 > 280) {
        pdf.addPage();
        y = margin;
        drawHeader(y, memorialCols);
        y += headerH;
      }
      const rowHCalc = drawWrappedRow(y, memorialCols, (key) => {
        switch (key) {
          case 'numero_item': return item.numero_item ?? '-';
          case 'descricao': return item.descricao ?? '-';
          case 'tamanho': return fd.tamanho ?? '-';
          case 'qtd_pecas': return fd.qtd_pecas ?? 0;
          case 'area_placa': return (fd.area_placa || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
          case 'area_plana_total': return (fd.area_plana_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
          case 'qtd_cobrar': return fd.qtd_cobrar ?? 0;
          default: return '';
        }
      });
      y += rowHCalc;
    });

    y += 4;
    pdf.setDrawColor(200);
    pdf.line(margin, y, margin + usableW, y);
    y += 4;
  }

  // Proposta heading
  y += 4;
  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Proposta', margin, y + 4);
  y += 6;

  pdf.setDrawColor(200);
  pdf.line(margin, y, margin + usableW, y);
  y += 4;

  if (y + headerH + rowH * visibleCols.length > 280) {
    pdf.addPage();
    y = margin;
  }

  drawHeader(y, visibleCols);
  y += headerH;

  let totalGeral = 0;

  pv.itens.forEach((item) => {
    if (y + rowH + 20 > 280) {
      pdf.addPage();
      y = margin;
      drawHeader(y, visibleCols);
      y += headerH;
    }
    const rowHCalc = drawWrappedRow(y, visibleCols, (key) => {
      switch (key) {
        case 'lpuLabel': return getLpuLabel(item);
        case 'valor': return formatCurrency(parseFloat(item.valor) || 0);
        case 'valor_flpu': return item.valor_flpu != null ? formatCurrency(parseFloat(item.valor_flpu)) : '-';
        case 'bdi': return item.bdi != null ? item.bdi + '%' : '-';
        case 'laudo': return item.laudo || '-';
        case 'valor_total': return formatCurrency(parseFloat(item.valor_total) || 0);
        default: return item[key] != null ? item[key] : '-';
      }
    });
    totalGeral += parseFloat(item.valor_total) || 0;
    y += rowHCalc;
  });

  // Footer
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, y, usableW, rowH, 'F');
  drawRowBorders(y, visibleCols);

  const labelColsW = visibleCols.slice(0, -1).reduce((sum, c) => sum + c.width, 0);
  const lastCol = visibleCols[visibleCols.length - 1];

  pdf.setFont('Helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Total Geral', margin + 2, y + rowH - 1.5);

  const totalText = formatCurrency(totalGeral);
  pdf.text(totalText, margin + labelColsW + lastCol.width - 2, y + rowH - 1.5, { align: 'right' });

  y += rowH + 4;

  // Footer note
  pdf.setFont('Helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Gerado pelo sistema Rubble', margin, y + 4);

  // Build filename
  const safeLocal = (pv.local || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeEquip = (pv.equipamento || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const capacityStr = pv.capacidade ? '-' + pv.capacidade + 'TR' : '';
  const filename = 'PV-' + (pv.numero_pv || '') + '-' + safeLocal + '-' + safeEquip + capacityStr + '.pdf';

  pdf.save(filename);
}

function openPvEmailModal(options) {
  const isBatch = options && options.batch;
  const pv = isBatch ? null : pvEmailPvData;
  const pvs = isBatch ? (options.pvs || []) : null;

  if (!isBatch && !pv) {
    showToast('Erro: dados da PV n\u00e3o dispon\u00edveis', 'error');
    return;
  }

  if (isBatch && (!pvs || pvs.length === 0)) {
    showToast('Erro: dados das PVs n\u00e3o dispon\u00edveis', 'error');
    return;
  }

  const firstPv = isBatch ? pvs[0] : pv;
  const uf = firstPv.uf || '';
  const allOs = isBatch
    ? pvs.map(p => p.os || '').filter(Boolean).join(', ')
    : (pv.os || '-');
  const allPvNums = isBatch
    ? pvs.map(p => p.numero_pv || '-').join(', ')
    : (pv.numero_pv || '-');
  const subjectPrefix = isBatch ? 'PVs: ' + allPvNums : 'PV: ' + (pv.numero_pv || '-');

  const localGroup = document.getElementById('pvEmailLocalGroup');
  const localInput = document.getElementById('pvEmailLocal');
  const isFornecimento = isBatch ? false : (firstPv.equipamento_id == 229);
  const displayLocal = isFornecimento ? '' : (firstPv.local || '');
  const displayAddress = firstPv.local_do_endereco || firstPv.local || '';

  localInput.value = firstPv.local || '';
  if (isFornecimento) {
    localGroup.classList.remove('hidden');
  } else {
    localGroup.classList.add('hidden');
  }

  function buildSubject(localVal) {
    const loc = localVal || displayLocal || '-';
    const addr = localVal || displayAddress || '-';
    return {
      materiais: subjectPrefix + ' - ' + loc + ' - Aquisi\u00e7\u00e3o de Materiais - ' + addr + ' - ' + allOs,
      servicos: subjectPrefix + ' - ' + loc + ' - Execu\u00e7\u00e3o de servi\u00e7os - ' + addr + ' - ' + allOs,
      contratacao: subjectPrefix + ' - ' + loc + ' - Contrata\u00e7\u00e3o de Servi\u00e7os - ' + addr + ' - ' + allOs,
    };
  }

  let subjects = buildSubject('');

  document.getElementById('subjectMateriais').textContent = subjects.materiais;
  document.getElementById('subjectServicos').textContent = subjects.servicos;
  document.getElementById('subjectContratacao').textContent = subjects.contratacao;

  document.querySelectorAll('input[name="pvSubject"]').forEach((r) => (r.checked = false));

  const ufGroup = document.getElementById('pvUfGroup');
  if (isBatch || uf === 'ES' || uf === 'RJ') {
    ufGroup.classList.add('hidden');
  } else {
    ufGroup.classList.remove('hidden');
    document.querySelectorAll('input[name="pvUf"]').forEach((r) => (r.checked = false));
  }

  localInput.oninput = function () {
    const val = this.value.trim() || firstPv.local || '';
    subjects = buildSubject(val);
    document.getElementById('subjectMateriais').textContent = subjects.materiais;
    document.getElementById('subjectServicos').textContent = subjects.servicos;
    document.getElementById('subjectContratacao').textContent = subjects.contratacao;
  };

  if (isBatch) {
    pvEmailPvId = null;
    pvEmailPvData = null;
    pvEmailBatchIds = options.ids || [];
    pvEmailBatchUf = firstPv.uf || '';
  } else {
    pvEmailBatchIds = null;
    hideModal('pvItemModal');
  }
  showModal('pvEmailModal');
}

function closePvEmailModal() {
  pvEmailBatchIds = null;
  pvEmailBatchUf = null;
  hideModal('pvEmailModal');
}

async function sendPvEmail() {
  const selected = document.querySelector('input[name="pvSubject"]:checked');
  if (!selected) {
    showToast('Selecione um assunto', 'error');
    return;
  }

  const isBatch = pvEmailBatchIds !== null && pvEmailBatchIds.length > 0;

  const ufEl = document.querySelector('input[name="pvUf"]:checked');
  const uf = isBatch ? pvEmailBatchUf : (ufEl?.value || pvEmailPvData?.uf || '');
  if (!uf && !isBatch) {
    showToast('Selecione a UF', 'error');
    return;
  }

  const local = document.getElementById('pvEmailLocal').value.trim() || '';

  const btn = document.getElementById('btnSendPvEmail');
  const originalText = btn ? btn.textContent : 'Enviar';
  if (btn) {
    btn.textContent = 'Enviando...';
    btn.disabled = true;
    btn.classList.add('opacity-75', 'cursor-not-allowed');
  }

  if (!isBatch && !pvEmailPvId) {
    if (btn) {
      btn.textContent = originalText;
      btn.disabled = false;
      btn.classList.remove('opacity-75', 'cursor-not-allowed');
    }
    showToast('Erro: dados da PV n\u00e3o dispon\u00edveis', 'error');
    return;
  }

  const endpoint = isBatch ? 'send-batch-email' : 'send-email';
  const body = isBatch
    ? { ids: pvEmailBatchIds, subject: selected.value, uf, local }
    : { id: pvEmailPvId, subject: selected.value, uf, local };

  try {
    const response = await fetch('/app/api/index.php?route=pv&action=' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (result.success) {
      if (!isBatch) {
        const statusRes = await fetch('/app/api/index.php?route=pv', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: pvEmailPvId, status: 'E-mail de lib. aquisi\u00e7\u00e3o/servi\u00e7o' }),
        });
        if (!statusRes.ok) {
          showToast('E-mail enviado, mas falha ao atualizar status', 'error');
        } else {
          showToast(result.message, 'success');
        }
      } else {
        showToast(result.message, 'success');
      }
      closePvEmailModal();
      resetPvState(pvSearch, pvStatusFilter, pvCycleFilter, true);
      await loadPvs();
    } else {
      showToast(result.message, 'error');
    }
  } catch (err) {
    showToast('Erro ao enviar e-mail', 'error');
    console.error(err);
  } finally {
    if (btn) {
      btn.textContent = originalText;
      btn.disabled = false;
      btn.classList.remove('opacity-75', 'cursor-not-allowed');
    }
  }
}

async function generatePvCSV() {
  try {
    let url = `/app/api/index.php?route=pv&action=export-csv&search=${encodeURIComponent(pvSearch)}`;
    if (pvStatusFilter) url += `&status=${encodeURIComponent(pvStatusFilter)}`;
    if (pvCycleFilter) url += `&ciclo=${encodeURIComponent(pvCycleFilter)}`;

    const res = await fetch(url);
    const result = await res.json();
    const list = result.data || [];

    if (list.length === 0) {
      showToast('Nenhuma PV encontrada', 'error');
      return;
    }

    const header = [
      'N\u00ba PV',
      'Data',
      'Ciclo',
      'Local',
      'Status',
      'OS',
      'RAL',
      'Equipamento',
      'LPU Origem',
      'N\u00ba Item',
      'Descri\u00e7\u00e3o LPU',
      'Especifica\u00e7\u00e3o',
      'Valor Cat.',
      'Qtd',
      'Valor Total Item',
      'BDI(%)',
      'Fatura',
      'SCM',
      'Laudo',
    ].join(';');

    const formatVal = (v) => v != null ? parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';

    downloadCSV(
      pvSearch ? `pv_${pvSearch}.csv` : 'pv_completo.csv',
      header,
      (addRow) => {
        list.forEach(({ pv, itens }) => {
          if (!itens || itens.length === 0) {
            addRow([
              sanitizeCSV(pv.numero_pv),
              sanitizeCSV(pv.data),
              sanitizeCSV(pv.ciclo),
              sanitizeCSV(pv.local),
              sanitizeCSV(pv.status),
              sanitizeCSV(pv.os),
              sanitizeCSV(pv.ral),
              sanitizeCSV(pv.equipamento),
              '', '', '', '', '', '', '', '', '', '',
            ]);
            return;
          }
          itens.forEach((item) => {
            addRow([
              sanitizeCSV(pv.numero_pv),
              sanitizeCSV(pv.data),
              sanitizeCSV(pv.ciclo),
              sanitizeCSV(pv.local),
              sanitizeCSV(pv.status),
              sanitizeCSV(pv.os),
              sanitizeCSV(pv.ral),
              sanitizeCSV(pv.equipamento),
              sanitizeCSV(item.lpu_origem),
              item.numero_item ?? '',
              sanitizeCSV(item.descricao_lpu),
              sanitizeCSV(item.descricao),
              formatVal(item.valor),
              item.quantidade ?? '',
              formatVal(item.valor_total),
              item.bdi ?? '',
              sanitizeCSV(item.fatura),
              sanitizeCSV(item.scm),
              sanitizeCSV(item.laudo),
            ]);
          });
        });
      }
    );

    showToast('Relat\u00f3rio CSV gerado', 'success');
  } catch (err) {
    console.error(err);
    showToast('Erro ao gerar relat\u00f3rio', 'error');
  }
}
