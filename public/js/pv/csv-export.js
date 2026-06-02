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
              sanitizeCSV(pv.worst_status),
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
              sanitizeCSV(pv.worst_status),
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
