import { describe, it, expect } from 'bun:test';
import { buildWhatsAppMessage, getTermoPublicUrl } from '../public/js/termo/termo-modal.js';
import { generateQrCodeSvg } from '../public/js/termo/qr-code.js';

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

  it('generates offline SVG QR code data URL without external requests', () => {
    const qrSvg = generateQrCodeSvg('https://rubbleapp.com/#/assinar-termo?token=123', 180);
    expect(qrSvg).toStartWith('data:image/svg+xml');
    expect(qrSvg).toContain('<svg');
    expect(qrSvg).toContain('</svg>');
  });
});
