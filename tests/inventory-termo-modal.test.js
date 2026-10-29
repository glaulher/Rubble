import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Window } from 'happy-dom';
import { buildWhatsAppMessage, getTermoPublicUrl } from '../public/js/termo/termo-modal.js';

describe('Termo Modal & Sharing Logic', () => {
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
});
