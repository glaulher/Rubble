let equipment = [];
let filteredEquipment = [];
let totalEquipment = 0;
let totalOS = 0;
let totalValor = 0;
let currentSearch = '';
let page = 0;
let limit = 20;
let loading = false;
let allLoaded = false;
let lastHomeHash = '';

async function loadEquipment(isPolling) {
  if (loading) return;

  if (isPolling) {
    loading = true;
    try {
      const response = await fetch(
        `/app/api/index.php?route=equipment&limit=${limit}&offset=0&search=${encodeURIComponent(currentSearch)}`
      );
      const result = await response.json();

      const newHash = JSON.stringify(result);
      if (newHash === lastHomeHash) {
        loading = false;
        return;
      }
      lastHomeHash = newHash;

      const newItems = result.data || [];
      totalEquipment = result.total || 0;
      totalOS = result.total_os || 0;
      totalValor = result.total_valor || 0;

      equipment = newItems;
      filteredEquipment = [...equipment];
      allLoaded = newItems.length < limit;
      page = 1;

      syncHomeCards(newItems);
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    } finally {
      loading = false;
    }
    return;
  }

  loading = true;

  try {
    const offset = page * limit;

    const response = await fetch(
      `/app/api/index.php?route=equipment&limit=${limit}&offset=${offset}&search=${encodeURIComponent(currentSearch)}`
    );

    const result = await response.json();

    const newItems = result.data || [];

    totalEquipment = result.total || 0;
    totalOS = result.total_os || 0;
    totalValor = result.total_valor || 0;

    if (newItems.length < limit) {
      allLoaded = true;
    }

    equipment.push(...newItems);

    filteredEquipment = [...equipment];

    render(newItems, true);

    page++;
  } catch (error) {
    console.error('Erro ao carregar equipamentos:', error);
  } finally {
    loading = false;
  }
}

async function deleteTicket(id, button) {
  const numericId = Number(id);

  const confirmed = await confirmAction('Tem certeza que deseja excluir?');

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
      const equip = equipment.find(e => String(e.id) === String(equipId));
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

function parseCSVToJSON(text) {
  if (!text || text.trim() === '') return [];

  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  let headerIdx = lines.findIndex(line => line.includes('Tarefa'));
  if (headerIdx === -1) return [];

  const headers = lines[headerIdx].split(';').map(h =>
    h.replace(/^\uFEFF/, '').trim()
  );

  const columnMap = {
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

  const result = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const row = {};
    headers.forEach((header, idx) => {
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

      const response = await fetch('/app/api/index.php?route=tickets&action=import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      });

      const result = await response.json();

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

async function generateCSVReport() {
  try {
    const response = await fetch(
      `/app/api/index.php?route=equipment&limit=999999&offset=0&search=${encodeURIComponent(currentSearch)}`
    );

    const result = await response.json();

    const list = result.data || [];

    if (list.length === 0) {
      showToast('Nenhum dado encontrado', 'error');

      return;
    }

    const header = 'LOCAL;LOCALIDADE;EQUIPAMENTO;CAPACIDADE;STATUS';

    downloadCSV(
      currentSearch && currentSearch.trim() !== ''
        ? `report_${currentSearch}.csv`
        : 'report_complete.csv',
      header,
      (addRow) => {
        list.forEach((e) => {
          addRow([
            sanitizeCSV(e.local),
            sanitizeCSV(e.localidade),
            sanitizeCSV(e.equipamento),
            sanitizeCSV(e.capacidade != null ? e.capacidade + ' TR' : ''),
            sanitizeCSV(e.searchStatus || ''),
          ]);
        });
      }
    );
  } catch (error) {
    console.error(error);

    showToast('Erro ao gerar relatório', 'error');
  }
}
