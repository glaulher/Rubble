import { describe, test, expect } from 'bun:test';

function parseLinhasCsv(texto) {
  let limpo = String(texto || '');
  if (limpo.charCodeAt(0) === 0xfeff) limpo = limpo.slice(1);
  if (!limpo.trim()) return [];

  const linhas = [];
  let linhaAtual = [];
  let campoAtual = '';
  let inQuotes = false;

  const primeiraQuebra = limpo.indexOf('\n');
  const headerPreview = primeiraQuebra !== -1 ? limpo.substring(0, primeiraQuebra) : limpo;
  const countPontoVirgula = (headerPreview.match(/;/g) || []).length;
  const countVirgula = (headerPreview.match(/,/g) || []).length;
  const countTab = (headerPreview.match(/\t/g) || []).length;

  let delimitador = ';';
  if (countTab > countPontoVirgula && countTab > countVirgula) delimitador = '\t';
  else if (countVirgula > countPontoVirgula) delimitador = ',';

  for (let i = 0; i < limpo.length; i++) {
    const ch = limpo[i];
    const prox = limpo[i + 1];

    if (ch === '"') {
      if (inQuotes && prox === '"') {
        campoAtual += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimitador && !inQuotes) {
      linhaAtual.push(campoAtual.trim());
      campoAtual = '';
    } else if ((ch === '\r' || ch === '\n') && !inQuotes) {
      if (ch === '\r' && prox === '\n') i++;
      linhaAtual.push(campoAtual.trim());
      campoAtual = '';
      if (linhaAtual.some((c) => c !== '')) {
        linhas.push(linhaAtual);
      }
      linhaAtual = [];
    } else {
      campoAtual += ch;
    }
  }
  if (campoAtual || linhaAtual.length > 0) {
    linhaAtual.push(campoAtual.trim());
    if (linhaAtual.some((c) => c !== '')) {
      linhas.push(linhaAtual);
    }
  }
  return linhas;
}

function normalizarNomeColunaCsv(col) {
  return String(col || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

function parseHtmlTable(html) {
  const trMatches = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
  const linhas = [];
  for (const trMatch of trMatches) {
    const trContent = trMatch[1];
    const cellMatches = Array.from(trContent.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi));
    if (cellMatches.length) {
      const row = cellMatches.map(m => m[1].replace(/<[^>]+>/g, '').trim());
      if (row.some(c => c !== '')) {
        linhas.push(row);
      }
    }
  }
  return linhas;
}

describe('Tempo Fechado - Upload Guia (Horas Extras Simplificadas)', () => {
  describe('parseLinhasCsv', () => {
    test('parses semicolon delimited CSV', () => {
      const csv = 'Data;Dia;Colaborador;CC;Entrada;Saida;Total de H.E.;Gestor Mediato;Adm;Sobreaviso;Justificativa\n' +
        '26/08/2026;Qua;CARLOS SILVA;CC-01;08:00;19:30;02:30;MARCOS;ANA;Sim;Atendimento emergencial';
      const parsed = parseLinhasCsv(csv);
      expect(parsed.length).toBe(2);
      expect(parsed[0][0]).toBe('Data');
      expect(parsed[0][2]).toBe('Colaborador');
      expect(parsed[1][0]).toBe('26/08/2026');
      expect(parsed[1][2]).toBe('CARLOS SILVA');
      expect(parsed[1][7]).toBe('MARCOS');
      expect(parsed[1][9]).toBe('Sim');
      expect(parsed[1][10]).toBe('Atendimento emergencial');
    });

    test('parses comma delimited CSV and removes UTF-8 BOM', () => {
      const csv = '\uFEFFData,Dia,Colaborador,CC,Entrada,Saida,Total de H.E.,Gestor Mediato,Adm,Sobreaviso,Justificativa\n' +
        '27/08/2026,Qui,"SILVA, BRUNO",CC-02,08:00,20:00,03:00,ROBERTO,MARIA,Não,"Manutenção ""preventiva"""';
      const parsed = parseLinhasCsv(csv);
      expect(parsed.length).toBe(2);
      expect(parsed[0][0]).toBe('Data');
      expect(parsed[1][2]).toBe('SILVA, BRUNO');
      expect(parsed[1][7]).toBe('ROBERTO');
      expect(parsed[1][9]).toBe('Não');
      expect(parsed[1][10]).toBe('Manutenção "preventiva"');
    });
  });

  describe('parseHtmlTable (Exportar Guia .xls format)', () => {
    test('parses HTML table exported by Exportar Guia', () => {
      const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
  <h3>Horas Extras Simplificadas</h3>
  <table>
    <thead>
      <tr>
        <th>Data</th><th>Dia</th><th>Colaborador</th><th>Entrada</th><th>Saída</th>
        <th>Total de H.E.</th><th>Gestor Mediato</th><th>Adm</th><th>Sobreaviso</th><th>Justificativa</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>26/08/2026</td><td>Qua</td><td><strong>JOAO SANTOS</strong></td>
        <td>08:00</td><td>19:00</td><td><span class="badge">02:00</span></td>
        <td>CARLOS GESTOR</td><td>MARIA ADM</td><td>Sim</td><td>Atendimento urgente</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
      const parsed = parseHtmlTable(html);
      expect(parsed.length).toBe(2);
      expect(parsed[0][0]).toBe('Data');
      expect(parsed[0][2]).toBe('Colaborador');
      expect(parsed[0][6]).toBe('Gestor Mediato');
      expect(parsed[1][0]).toBe('26/08/2026');
      expect(parsed[1][2]).toBe('JOAO SANTOS');
      expect(parsed[1][6]).toBe('CARLOS GESTOR');
      expect(parsed[1][7]).toBe('MARIA ADM');
      expect(parsed[1][8]).toBe('Sim');
      expect(parsed[1][9]).toBe('Atendimento urgente');
    });
  });

  describe('normalizarNomeColunaCsv', () => {
    test('normalizes varied header names', () => {
      expect(normalizarNomeColunaCsv('Colaborador')).toBe('colaborador');
      expect(normalizarNomeColunaCsv('Nome do Gestor')).toBe('nomedogestor');
      expect(normalizarNomeColunaCsv('Gestor Mediato')).toBe('gestormediato');
      expect(normalizarNomeColunaCsv('Adm Responsável')).toBe('admresponsavel');
      expect(normalizarNomeColunaCsv('Observação')).toBe('observacao');
      expect(normalizarNomeColunaCsv('Total de H.E.')).toBe('totaldehe');
      expect(normalizarNomeColunaCsv('Sobreaviso?')).toBe('sobreaviso');
    });
  });

  describe('Roundtrip & Key Building', () => {
    test('correctly constructs operational annotation key for Horas Extras Simplificadas', () => {
      const guia = 'horas_extras_simplificadas';
      const r = {
        cc: 'CC-01',
        nome: 'CARLOS SILVA',
        data: '26/08/2026',
        dia: 'Qua',
      };
      const chave = [guia, r.cc, r.nome, r.data, r.dia]
        .map((v) => String(v ?? '').trim().toLowerCase())
        .join('|')
        .slice(0, 260);

      expect(chave).toBe('horas_extras_simplificadas|cc-01|carlos silva|26/08/2026|qua');
    });

    test('matches date in YYYY-MM-DD or DD/MM/YYYY format', () => {
      const normData = (d) => {
        const s = String(d || '').trim();
        if (s.includes('-')) {
          const p = s.split('-');
          if (p.length === 3 && p[0].length === 4) return `${p[2]}/${p[1]}/${p[0]}`;
        }
        return s;
      };

      expect(normData('2026-08-26')).toBe('26/08/2026');
      expect(normData('26/08/2026')).toBe('26/08/2026');
    });

    test('builds query params with data_inicio and data_fim for Horas Extras Simplificadas', () => {
      const p = new URLSearchParams();
      const paginaAtual = 'hora_extra_simplificada';
      const dataInicioVal = '2026-08-01';
      const dataFimVal = '2026-08-31';

      if (paginaAtual === 'hora_extra_simplificada') {
        if (dataInicioVal) p.set('data_inicio', dataInicioVal);
        if (dataFimVal) p.set('data_fim', dataFimVal);
      }

      expect(p.toString()).toBe('data_inicio=2026-08-01&data_fim=2026-08-31');
    });

    test('obterAnotacaoOperacional matches uploaded record without CC and ignores empty shadow keys', () => {
      const normalizarDataAnotacao = (d) => {
        let s = String(d || '').trim().split(' ')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          const [y, m, dia] = s.split('-');
          return `${dia}/${m}/${y}`;
        }
        return s;
      };

      const normalizarTextoAnotacao = (t) => {
        return String(t || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
      };

      const cache = {
        'horas_extras_simplificadas|rj001|claudio roberto ferreira rocha|17/08/2026|seg': {
          nome_gestor: '',
          adm_responsavel: '',
          sobreaviso: '',
          observacao: '',
        },
        'horas_extras_simplificadas||claudio roberto ferreira rocha|17/08/2026|seg': {
          nome_gestor: 'Renata',
          adm_responsavel: 'Fernanda',
          sobreaviso: 'Não',
          observacao: 'testou man',
        },
      };

      const obterAnotacaoOperacional = (guia, r) => {
        const nomeNorm = normalizarTextoAnotacao(r?.nome);
        const dataBr = normalizarDataAnotacao(r?.data || r?.data_referencia || r?.data_retorno || r?.data_anterior);
        const ccNorm = normalizarTextoAnotacao(r?.cc);
        const diaNorm = normalizarTextoAnotacao(r?.dia);

        const temConteudo = (obj) => Boolean(obj && (obj.nome_gestor || obj.adm_responsavel || obj.sobreaviso || obj.observacao));

        const chaveCompleta = [guia, ccNorm, nomeNorm, dataBr, diaNorm].join('|').slice(0, 260);
        if (temConteudo(cache[chaveCompleta])) return cache[chaveCompleta];

        const chaveSemCc = [guia, '', nomeNorm, dataBr, diaNorm].join('|').slice(0, 260);
        if (temConteudo(cache[chaveSemCc])) return cache[chaveSemCc];

        const chaveSemDia = [guia, ccNorm, nomeNorm, dataBr, ''].join('|').slice(0, 260);
        if (temConteudo(cache[chaveSemDia])) return cache[chaveSemDia];

        const chaveSemCcSemDia = [guia, '', nomeNorm, dataBr, ''].join('|').slice(0, 260);
        if (temConteudo(cache[chaveSemCcSemDia])) return cache[chaveSemCcSemDia];

        let candidatoSemConteudo = null;
        if (nomeNorm && dataBr) {
          for (const [k, obj] of Object.entries(cache)) {
            if (!k.startsWith(guia + '|')) continue;
            const partes = k.split('|');
            if (partes.length >= 4) {
              const kNome = normalizarTextoAnotacao(partes[2]);
              const kData = normalizarDataAnotacao(partes[3]);
              if (kNome === nomeNorm && kData === dataBr) {
                if (temConteudo(obj)) return obj;
                if (!candidatoSemConteudo) candidatoSemConteudo = obj;
              }
            }
          }
        }
        return candidatoSemConteudo || cache[chaveCompleta] || {};
      };

      const result = obterAnotacaoOperacional('horas_extras_simplificadas', {
        cc: 'RJ001',
        nome: 'CLAUDIO ROBERTO FERREIRA ROCHA',
        data: '17/08/2026',
        dia: 'SEG',
      });

      expect(result.nome_gestor).toBe('Renata');
      expect(result.adm_responsavel).toBe('Fernanda');
      expect(result.sobreaviso).toBe('Não');
      expect(result.observacao).toBe('testou man');
    });
  });
});
