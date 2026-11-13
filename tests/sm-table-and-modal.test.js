import { describe, test, expect, beforeEach } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const store = {};
globalThis.sessionStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
globalThis.localStorage = globalThis.sessionStorage;

const VIEW = readFileSync(resolve(import.meta.dir, '../app/Views/sc/list.html'), 'utf-8');
const TOAST = '<div id="toast" class="hidden"><span id="toastIcon"></span><span id="toastMessage"></span><div id="toastProgress" class="hidden"></div></div>';

const SAMPLE_SM = {
  id: 42,
  numero_sm: '260042',
  titulo_email: 'Solicitação de Peças e Filtros',
  status: 'solicitada_cotacao',
  site: 'BMADTC',
  equipamento: 'Chiller 01',
  equipamento_texto: null,
  numero_sc: 'SC-5501',
  numero_os: '998877',
  os: '998877',
  numero_pv: '260025',
  numero_pc: 'PC-112',
  valor_sc: '2500.00',
  pv_valor_total: '3800.00',
  data: '2026-11-13',
  data_status: '2026-11-13',
  sla_dias: 5,
  observacao: 'Filtros de reposição para manutenção preventiva',
};

function mountView() {
  document.body.innerHTML = VIEW + TOAST;
}

function mockApi(items = [SAMPLE_SM]) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const urlStr = String(url);
    calls.push({ url: urlStr, options });

    if (urlStr.includes('route=pv&numero_pv=260025')) {
      return {
        json: async () => ({
          success: true,
          data: {
            id: 10,
            numero_pv: '260025',
            itens: [
              {
                lpu_origem: 'lpu_servicos',
                numero_item: 1,
                descricao_lpu: 'Manutenção de Chiller',
                descricao: 'Troca de filtros',
                quantidade: 2,
                valor: '1900.00',
                valor_total: '3800.00',
              },
            ],
          },
        }),
      };
    }

    if (urlStr.includes('route=sc')) {
      return {
        json: async () => ({
          success: true,
          total: items.length,
          status_counts: { solicitada_cotacao: items.length },
          data: items,
        }),
      };
    }

    return { json: async () => ({ success: true, data: ['BMADTC'] }) };
  };

  return calls;
}

describe('SM Table Columns and Detail Modal', () => {
  beforeEach(() => {
    mountView();
  });

  test('scTable thead contains PV, SC, PC, and OS columns', () => {
    const thead = document.querySelector('#scTable thead');
    expect(thead).not.toBeNull();
    const ths = Array.from(thead.querySelectorAll('th')).map((th) => th.textContent.trim());

    expect(ths).toContain('SM');
    expect(ths).toContain('PV');
    expect(ths).toContain('SC');
    expect(ths).toContain('PC');
    expect(ths).toContain('OS');
    expect(ths).toContain('Ações');
  });

  test('buildSmRowHtml renders copy buttons for SM, PV, SC, PC, and OS, and omits inline email button', async () => {
    mockApi();
    const list = await import('../public/js/sc/list.js');
    await list.initSc();

    const row = document.querySelector('tr[data-sm-row="42"]');
    expect(row).not.toBeNull();

    // Verifique botões de cópia
    const copyButtons = row.querySelectorAll('[data-action="copy-num"]');
    expect(copyButtons.length).toBeGreaterThanOrEqual(5);

    const tipos = Array.from(copyButtons).map((btn) => btn.getAttribute('data-tipo'));
    expect(tipos).toContain('SM');
    expect(tipos).toContain('PV');
    expect(tipos).toContain('SC');
    expect(tipos).toContain('PC');
    expect(tipos).toContain('OS');

    // Botão de email não deve mais existir na linha
    expect(row.querySelector('.sm-email-btn')).toBeNull();

    // Botões de ação restantes: Editar, Status
    expect(row.querySelector('[data-action="edit"]')).not.toBeNull();
    expect(row.querySelector('[data-action="status"]')).not.toBeNull();
  });

  test('clicking row opens smDetailModal with information table and email button', async () => {
    mockApi();
    const list = await import('../public/js/sc/list.js');
    await list.initSc();

    const row = document.querySelector('tr[data-sm-row="42"]');
    expect(row).not.toBeNull();

    // Clica na linha (em uma célula de texto do site, não em botão)
    const tdSite = row.querySelector('td:nth-child(8)');
    tdSite.click();
    await new Promise((r) => setTimeout(r, 20));

    const modal = document.getElementById('smDetailModal');
    expect(modal.classList.contains('hidden')).toBe(false);

    // Header do modal
    expect(document.getElementById('smDetailNumero').textContent).toContain('260042');
    expect(document.getElementById('smDetailSubtitle').textContent).toContain('BMADTC');

    // Tabela de informações
    const infoBody = document.getElementById('smDetailInfoBody');
    expect(infoBody.innerHTML).toContain('Solicitação de Peças e Filtros');
    expect(infoBody.innerHTML).toContain('SC-5501');
    expect(infoBody.innerHTML).toContain('PC-112');
    expect(infoBody.innerHTML).toContain('998877');

    // Botão Enviar E-mail no modal
    const emailBtn = document.getElementById('btnSmDetailEmail');
    expect(emailBtn).not.toBeNull();
    expect(emailBtn.classList.contains('bg-sky-300')).toBe(true);

    // Botão Editar com cor esmeralda e posicionado junto com Fechar
    const editBtn = document.getElementById('btnSmDetailEdit');
    expect(editBtn).not.toBeNull();
    expect(editBtn.classList.contains('bg-emerald-300')).toBe(true);
    expect(editBtn.classList.contains('text-emerald-800')).toBe(true);
    expect(editBtn.classList.contains('bg-blue-300')).toBe(false);

    const closeBtn = document.getElementById('btnCloseSmDetail');
    expect(closeBtn).not.toBeNull();
    expect(editBtn.parentElement).toBe(closeBtn.parentElement);

    // Labels da tabela usam sm-detail-label e bg-slate-50
    const labelCells = infoBody.querySelectorAll('.sm-detail-label');
    expect(labelCells.length).toBeGreaterThan(0);
    labelCells.forEach((cell) => {
      expect(cell.classList.contains('bg-slate-50')).toBe(true);
      expect(cell.className.includes('/70')).toBe(false);
    });

    // Clicar em Editar fecha o modal de detalhes e abre o modal de edição modalSc
    editBtn.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(modal.classList.contains('hidden')).toBe(true);
    const modalSc = document.getElementById('modalSc');
    expect(modalSc.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('scTitulo').value).toBe('Solicitação de Peças e Filtros');
    expect(document.getElementById('scPc').value).toBe('PC-112');

    // Botão Cancelar fecha o modalSc
    const cancelModalSc = document.getElementById('modalScCancel');
    cancelModalSc.click();
    expect(modalSc.classList.contains('hidden')).toBe(true);
  });
});
