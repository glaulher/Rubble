import { describe, it, expect, beforeEach } from 'bun:test';
import { buildWhatsAppMessage, getTermoPublicUrl, openCreateTermoModal, openTermosListModal } from '../public/js/termo/termo-modal.js';
import { generateQrCodeSvg } from '../public/js/termo/qr-code.js';

describe('Termo Modal & Sharing Logic', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    globalThis.sessionStorage = {
      getItem: (key) => (key === 'rubble_user' || key === 'user' ? JSON.stringify({ id: 1, role: 'admin', nome: 'Admin' }) : null),
      setItem: () => {},
      removeItem: () => {},
    };
    globalThis.localStorage = {
      getItem: (key) => (key === 'rubble_token' || key === 'token' ? 'fake-token' : null),
      setItem: () => {},
      removeItem: () => {},
    };
  });

  it('generates public termo URL correctly', () => {
    const url = getTermoPublicUrl('token123456', 'https://rubbleapp.com');
    expect(url).toBe('https://rubbleapp.com/#/assinar-termo?token=token123456');
  });

  it('builds clear WhatsApp message with link', () => {
    const msg = buildWhatsAppMessage({
      tecnico: 'Raphael',
      entregue_por: 'Mauro',
      codigo: 'TR-2026-0001',
      url: 'https://rubbleapp.com/#/assinar-termo?token=abc',
    });

    expect(msg).toContain('Raphael');
    expect(msg).toContain('Mauro');
    expect(msg).toContain('TR-2026-0001');
    expect(msg).toContain('https://rubbleapp.com/#/assinar-termo?token=abc');
  });

  it('generates offline SVG QR code data URL without external requests', () => {
    const qrSvg = generateQrCodeSvg('https://rubbleapp.com/#/assinar-termo?token=123', 180);
    expect(qrSvg).toStartWith('data:image/svg+xml');
    expect(qrSvg).toContain('<svg');
    expect(qrSvg).toContain('</svg>');
  });

  it('openCreateTermoModal pre-fills multiple selected items and auto-fills entregador', async () => {
    globalThis.fetch = async () => ({
      json: async () => ({ success: true, data: ['Raphael', 'Mauro'] }),
    });

    const items = [
      { id: 101, material_nome: 'Bomba de Vácuo', modelo: 'Value 2CFM', serial: 'BV-01', tecnico_nome: 'Tiago' },
      { id: 102, material_nome: 'Alicate Amperímetro', modelo: 'Minipa', serial: 'AL-02', tecnico_nome: 'Tiago' },
    ];

    await openCreateTermoModal(items);

    const modal = document.getElementById('modalTermoCreate');
    expect(modal).not.toBeNull();

    const entreguePorInput = document.getElementById('termoEntreguePor');
    expect(entreguePorInput.value).toBe('Tiago');

    const itemRows = modal.querySelectorAll('.item-row');
    expect(itemRows.length).toBe(2);

    expect(itemRows[0].querySelector('.item-mat').value).toBe('Bomba de Vácuo');
    expect(itemRows[0].querySelector('.item-ser').value).toBe('BV-01');
    expect(itemRows[1].querySelector('.item-mat').value).toBe('Alicate Amperímetro');
    expect(itemRows[1].querySelector('.item-ser').value).toBe('AL-02');
  });

  it('openTermosListModal renders Excluir button for admin users', async () => {
    globalThis.fetch = async () => ({
      json: async () => ({
        success: true,
        data: [
          {
            id: 55,
            codigo: 'TR-2026-0055',
            status: 'assinado',
            tecnico_nome: 'Raphael',
            entregue_por: 'Mauro',
            created_at: '2026-10-29 10:00:00',
            itens: [{ id: 1, material_nome: 'Bomba' }],
          },
        ],
      }),
    });

    await openTermosListModal();

    const deleteBtn = document.querySelector('.btn-delete-termo');
    expect(deleteBtn).not.toBeNull();
    expect(deleteBtn.textContent).toContain('Excluir');
    expect(deleteBtn.dataset.id).toBe('55');
  });

  it('openTermosListModal does NOT render Excluir button for non-admin users', async () => {
    globalThis.sessionStorage.getItem = (key) =>
      key === 'rubble_user' || key === 'user' ? JSON.stringify({ id: 2, role: 'supervisor', nome: 'Supervisor' }) : null;

    globalThis.fetch = async () => ({
      json: async () => ({
        success: true,
        data: [
          {
            id: 56,
            codigo: 'TR-2026-0056',
            status: 'pendente',
            tecnico_nome: 'Tiago',
            entregue_por: 'Engemon',
            created_at: '2026-10-29 11:00:00',
            itens: [],
          },
        ],
      }),
    });

    await openTermosListModal();

    const deleteBtn = document.querySelector('.btn-delete-termo');
    expect(deleteBtn).toBeNull();
  });
});
