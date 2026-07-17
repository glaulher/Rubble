import { createInfiniteScroll } from '/public/js/components/infinite-scroll.js';

globalThis.currentSearch = '';
globalThis.totalEquipment = 0;
globalThis.totalOS = 0;
globalThis.totalValor = 0;
globalThis._homeScroll = null;

var limit = 20;

function setupHomeScroll() {
  globalThis._homeScroll = createInfiniteScroll({
    sentinelId: 'sentinel',
    limit: limit,
    pollingInterval: 30000,
    timeout: 15000,
    fetchFn: function (params, opts) {
      var url = '/app/api/index.php?route=equipment&limit=' + params.limit + '&search=' + encodeURIComponent(globalThis.currentSearch);
      if (params.offset > 0 && params.data.length > 0) {
        var lastItem = params.data[params.data.length - 1];
        url += '&last_local=' + encodeURIComponent(lastItem.local || '') + '&last_equipamento=' + encodeURIComponent(lastItem.equipamento || '') + '&last_id=' + lastItem.id;
      } else {
        url += '&offset=' + params.offset;
      }
      return fetch(url, opts).then(function (r) { return r.json(); }).then(function (result) {
        if (!result || !result.data) return { data: [], total: 0 };
        globalThis.totalEquipment = result.total || result.data.length;
        globalThis.totalOS = result.total_os || 0;
        globalThis.totalValor = result.total_valor || 0;
        return { data: result.data, total: globalThis.totalEquipment };
      });
    },
    renderFn: function (items) {
      render(items, true);
    },
    renderFullFn: function (items) {
      syncHomeCards(items);
    },
    getFilterHash: function () {
      return globalThis.currentSearch;
    },
    onError: function (err) {
      console.error('Erro ao carregar equipamentos:', err);
    },
  });
}

globalThis.setupHomeScroll = setupHomeScroll;

async function deleteTicket(id, button, osNumber) {
  const numericId = Number(id);

  var itemName = osNumber;
  var message = 'Tem certeza que deseja excluir a OS';
  if (!itemName) {
    message = 'Tem certeza que deseja excluir o ticket de';
    var equipCardEl = button.closest('.card-item');
    itemName = equipCardEl ? equipCardEl.querySelector('h3')?.textContent?.trim() || '' : '';
  }

  const confirmed = await confirmDelete('Excluir OS', message, itemName);

  if (!confirmed) return;

  const ticketCard = button.closest('.bg-slate-50');
  const equipCard = button.closest('.card-item');

  button.disabled = true;

  try {
    const response = await fetch('/app/api/index.php?route=tickets', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: numericId }),
    });

    const json = await response.json();

    if (!json.success) {
      showToast(json.message);
      return;
    }

    ticketCard.remove();

    if (equipCard) {
      const equipId = equipCard.dataset.equipId;
      var scrollData = globalThis._homeScroll ? globalThis._homeScroll.getState().data : [];
      const equip = scrollData.find(e => String(e.id) === String(equipId));
      if (equip && equip.tickets_count > 0) {
        equip.tickets_count--;
      }

      const badge = equipCard.querySelector('.bg-slate-100.text-slate-600');
      if (badge) {
        if (equip && equip.tickets_count > 0) {
          badge.textContent = equip.tickets_count + ' OS';
        } else {
          badge.remove();
        }
      }
    }
  } catch (err) {
    console.error(err);

    showToast('Erro ao excluir registro');
  }
}

globalThis.deleteTicket = deleteTicket;

function parseCSVToJSON(text) {
  if (!text || text.trim() === '') return [];

  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  const verifaiColumnMap = {
    'Tarefa': 'tarefa',
    'Empresa': 'empresa',
    'Tipo': 'tipo',
    'Data Criação': 'dataCriacao',
    'Data Alteração': 'dataAlteracao',
    '6-Local': 'local',
    '11-TAG': 'tag',
    '12-1º Técnico': 'tecnico',
    '15-Problema': 'problema',
    '16-Causa': 'causa',
    '17-Solução': 'solucao',
    '19-Materiais': 'materiais',
    '20-Status': 'status',
  };

  const infratelColumnMap = {
    'Site': 'site',
    'Equipamento': 'equipamento',
    'Justificativas': 'justificativas',
    'Ação Técnico': 'acao_tecnico',
    'Ação Validador': 'acao_validador',
    'Fim': 'fim',
    'Executor': 'executor',
  };

  const verifaiIdx = lines.findIndex(line => line.includes('Tarefa'));
  if (verifaiIdx !== -1) {
    const headers = lines[verifaiIdx].split(';').map(h => h.replace(/^\uFEFF/, '').trim());
    return parseRows(lines, verifaiIdx, headers, verifaiColumnMap);
  }

  const infratelIdx = lines.findIndex(line =>
    line.includes('Site') && line.includes('Equipamento') && line.includes('Justificativas')
  );
  if (infratelIdx !== -1) {
    const headers = lines[infratelIdx].split(';').map(h => h.replace(/^\uFEFF/, '').trim());
    return parseRows(lines, infratelIdx, headers, infratelColumnMap);
  }

  return [];
}

function parseRows(lines, headerIdx, rawHeaders, columnMap) {
  const result = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const row = {};
    rawHeaders.forEach((header, idx) => {
      const key = columnMap[header] || header;
      row[key] = (values[idx] || '').trim();
    });
    result.push(row);
  }
  return result;
}

async function importOS() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';

  async function readFileAsText(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const hasUtf8Bom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
    const offset = hasUtf8Bom ? 3 : 0;

    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer.slice(offset));
    } catch {
      return new TextDecoder('iso-8859-1').decode(buffer);
    }
  }

  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const rows = parseCSVToJSON(text);

      if (rows.length === 0) {
        showToast('Nenhum dado encontrado no CSV', 'error');
        return;
      }

      const firstRow = rows[0];
      const isInfratel = 'site' in firstRow && 'justificativas' in firstRow;
      const action = isInfratel ? 'import-infratel' : 'import';

      var response = await fetch('/app/api/index.php?route=tickets&action=' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('Server response (HTML/PHP error):', text.substring(0, 1000));
        showToast('Erro no servidor. Veja o console (F12) para detalhes.', 'error');
        return;
      }

      if (result.success) {
        const d = result.data;
        showToast(
          `${d.imported} importada(s), ${d.updated} atualizada(s), ${d.skipped} pulada(s)`,
          'success'
        );
      } else {
        showToast('Erro: ' + (result.message || 'Falha na importação'), 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Erro ao importar CSV', 'error');
    }
  });

  input.click();
}

globalThis.importOS = importOS;

const CSV_CHUNK = 500;

async function generateCSVReport() {
  try {
    var allEquipment = [];
    var total;

    while (true) {
      var url = '/app/api/index.php?route=equipment&limit=' + CSV_CHUNK + '&search=' + encodeURIComponent(globalThis.currentSearch);
      if (allEquipment.length > 0) {
        var lastItem = allEquipment[allEquipment.length - 1];
        url += '&last_local=' + encodeURIComponent(lastItem.local || '') + '&last_equipamento=' + encodeURIComponent(lastItem.equipamento || '') + '&last_id=' + lastItem.id;
      }
      var resp = await fetch(url);
      var result = await resp.json();
      var chunk = result.data || [];
      total = result.total || chunk.length;
      allEquipment.push.apply(allEquipment, chunk);
      if (chunk.length === 0) break;
    }

    if (allEquipment.length === 0) {
      showToast('Nenhum dado encontrado', 'error');
      return;
    }

    var ids = allEquipment.map(function (e) { return e.id; });
    var ticketChunks = [];
    for (var i = 0; i < ids.length; i += CSV_CHUNK) {
      var chunkIds = ids.slice(i, i + CSV_CHUNK);
      var tr = await fetch(
        '/app/api/index.php?route=equipment&action=tickets-by-ids&' + chunkIds.map(function (id) { return 'ids[]=' + id; }).join('&')
      );
      var trResult = await tr.json();
      if (trResult.data) {
        ticketChunks.push(trResult.data);
      }
    }

    var ticketsByEquipId = Object.assign.apply(Object, [{}].concat(ticketChunks));

    var header = 'LOCAL;LOCALIDADE;EQUIPAMENTO;CAPACIDADE;STATUS;OS;DATA;DATA_PLANEJADA;DATA_CONCLUSAO;MATERIAL;OBSERVACAO';

    downloadCSV(
      globalThis.currentSearch && globalThis.currentSearch.trim() !== ''
        ? 'report_' + globalThis.currentSearch + '.csv'
        : 'report_complete.csv',
      header,
      function (addRow) {
        var searchTerm = (globalThis.currentSearch || '').toLowerCase().trim();
        var searchNorm = searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        var statusKeywords = ['pendente', 'conclu', 'planej', 'andamento', 'clean'];
        var isStatusSearch = searchTerm && statusKeywords.some(function (kw) { return searchTerm.includes(kw); });

        allEquipment.forEach(function (e) {
          var allTickets = ticketsByEquipId[String(e.id)] || [];

          var matchedTickets = isStatusSearch
            ? allTickets.filter(function (t) {
                var statusNorm = (t.status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return statusNorm.indexOf(searchNorm) >= 0;
              })
            : allTickets;

          if (matchedTickets.length === 0) {
            addRow([
              sanitizeCSV(e.local),
              sanitizeCSV(e.localidade),
              sanitizeCSV(e.equipamento),
              sanitizeCSV(e.capacidade != null ? e.capacidade + ' TR' : ''),
              sanitizeCSV(e.searchStatus || ''),
              '', '', '', '', '', '',
            ]);
          } else {
            matchedTickets.forEach(function (t) {
              addRow([
                sanitizeCSV(e.local),
                sanitizeCSV(e.localidade),
                sanitizeCSV(e.equipamento),
                sanitizeCSV(e.capacidade != null ? e.capacidade + ' TR' : ''),
                sanitizeCSV(t.status || ''),
                sanitizeCSV(t.os || ''),
                sanitizeCSV(t.data || ''),
                sanitizeCSV(t.data_planejada || ''),
                sanitizeCSV(t.data_concluido || ''),
                sanitizeCSV(t.material || ''),
                sanitizeCSV(t.obs || ''),
              ]);
            });
          }
        });
      }
    );
  } catch (error) {
    console.error(error);

    showToast('Erro ao gerar relatório', 'error');
  }
}

globalThis.generateCSVReport = generateCSVReport;
