/**
 * Módulo de geração e download de PDF do Termo de Responsabilidade assinado.
 */
export function generateTermoPdf(termo) {
  if (typeof window === 'undefined') return;
  const jsPDF = window.jspdf ? window.jspdf.jsPDF : null;
  if (!jsPDF) {
    window.print();
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Cabeçalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RUBBLE MANUTENÇÃO', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text('TERMO DE RESPONSABILIDADE E CAUTELA', 105, 28, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Identificação: ' + (termo.codigo || ''), 105, 34, { align: 'center' });

  // Linha divisória
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 38, 190, 38);

  // Dados das partes
  let y = 46;
  doc.setFont('helvetica', 'bold');
  doc.text('1. PARTES:', 20, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Entregue por: ${termo.entregue_por || 'Engemon'}`, 25, y);
  y += 5;
  doc.text(`Técnico Recebedor: ${termo.tecnico_nome || ''} ${termo.tecnico_documento ? ' - Doc: ' + termo.tecnico_documento : ''}`, 25, y);
  y += 5;
  doc.text(`Data de Emissão: ${termo.created_at || new Date().toLocaleDateString()}`, 25, y);

  // Lista de Ferramentas / Equipamentos
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('2. EQUIPAMENTOS / FERRAMENTAS SOB CUSTÓDIA:', 20, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFillColor(240, 240, 240);
  doc.rect(20, y, 170, 6, 'F');
  doc.text('#', 22, y + 4);
  doc.text('Material / Descrição', 30, y + 4);
  doc.text('Modelo', 95, y + 4);
  doc.text('Serial / Patrimônio', 145, y + 4);
  y += 7;

  doc.setFont('helvetica', 'normal');
  (termo.itens || []).forEach((it, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(String(idx + 1), 22, y + 4);
    doc.text(String(it.material_nome || ''), 30, y + 4);
    doc.text(String(it.modelo || '-'), 95, y + 4);
    doc.text(String(it.serial || 'N/A'), 145, y + 4);
    y += 6;
  });

  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  // Cláusula de Responsabilidade
  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('3. TERMO DE COMPROMISSO E DECLARAÇÃO:', 20, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  const clausula = 'Declaro para os devidos fins que recebi os equipamentos e ferramentas acima relacionados em perfeito estado de conservação e funcionamento, assumindo a responsabilidade pela guarda, zelo e conservação dos mesmos, comprometendo-me a utilizá-los exclusivamente para o desempenho de minhas atividades profissionais e a devolvê-los quando solicitado.';
  const splitText = doc.splitTextToSize(clausula, 170);
  doc.text(splitText, 20, y);
  y += splitText.length * 5 + 10;

  // Assinatura Digital
  if (termo.assinatura_imagem) {
    doc.setFont('helvetica', 'bold');
    doc.text('4. ASSINATURA DIGITAL REGISTRADA:', 20, y);
    y += 4;
    try {
      doc.addImage(termo.assinatura_imagem, 'PNG', 20, y, 60, 25);
    } catch (_) {}
    y += 30;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Assinado por: ${termo.tecnico_nome}`, 20, y);
    y += 4;
    doc.text(`Data/Hora: ${termo.assinado_em || '-'} | IP: ${termo.assinado_ip || 'Registrado'}`, 20, y);
  }

  doc.save(`Termo_${termo.codigo || 'Responsabilidade'}.pdf`);
}
