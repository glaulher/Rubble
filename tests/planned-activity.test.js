import { describe, it, expect } from "bun:test";

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const PLANNED_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function formatDateTimeline(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const ano = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1;
  const dia = parseInt(parts[2], 10);
  const dt = new Date(ano, mes, dia);
  const diaSemana = DIAS_SEMANA[dt.getDay()];
  return diaSemana + ', ' + dia + ' de ' + PLANNED_MESES[mes] + ' de ' + ano;
}

function duplicateDayIconHtml(dateStr) {
  if (!dateStr) return '';
  return '<button data-action="duplicate-day" data-date="' + dateStr.replace(/"/g, '\\"') + '">copy</button>';
}

describe("formatDateTimeline", () => {
  it("returns day of week + formatted date for a weekday", () => {
    // 2026-07-15 is a Wednesday
    var result = formatDateTimeline("2026-07-15");
    expect(result).toBe("quarta-feira, 15 de julho de 2026");
  });

  it("returns day of week + formatted date for Monday", () => {
    // 2026-07-06 is a Monday
    var result = formatDateTimeline("2026-07-06");
    expect(result).toBe("segunda-feira, 6 de julho de 2026");
  });

  it("returns day of week + formatted date for Sunday", () => {
    // 2026-07-12 is a Sunday
    var result = formatDateTimeline("2026-07-12");
    expect(result).toBe("domingo, 12 de julho de 2026");
  });

  it("returns empty string for null/empty input", () => {
    expect(formatDateTimeline("")).toBe("");
    expect(formatDateTimeline(null)).toBe("");
    expect(formatDateTimeline(undefined)).toBe("");
  });

  it("returns raw string for malformed input", () => {
    expect(formatDateTimeline("abc")).toBe("abc");
  });
});

describe("duplicateDayIconHtml", () => {
  it("returns button with data-date attribute", () => {
    var html = duplicateDayIconHtml("2026-07-15");
    expect(html).toContain('data-action="duplicate-day"');
    expect(html).toContain('data-date="2026-07-15"');
  });

  it("escapes double quotes in date value", () => {
    var html = duplicateDayIconHtml('2026-07-15" onclick="alert(1)');
    expect(html).toContain('\\"');
    expect(html).not.toContain('data-date="2026-07-15" onclick=');
  });
});

/*
|--------------------------------------------------------------------------
| Observation Inline Edit
|--------------------------------------------------------------------------
*/

function obsEditIconHtml() {
  return '<button class="obs-edit-btn" data-action="edit-obs" aria-label="Editar observação">' +
    '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>' +
    '</svg></button>';
}

function buildObsHtml(obs, canEdit) {
  var displayText = obs ? escapeHtml(obs) : '<span class="text-slate-400 italic">Adicionar observação...</span>';
  var icon = canEdit ? obsEditIconHtml() : '';
  return '<div class="mt-2 text-xs border-t border-slate-100 pt-2">' +
    '<div class="flex items-start gap-2 obs-container">' +
      '<span class="text-slate-600 whitespace-pre-line leading-relaxed flex-1 obs-text">' + displayText + '</span>' +
      icon +
    '</div>' +
  '</div>';
}

function startObsInlineEdit(btn) {
  var container = btn.closest('.obs-container');
  if (!container) return;
  var span = container.querySelector('.obs-text');
  if (!span) return;
  var currentText = span.textContent;
  var placeholder = span.querySelector('.text-slate-400');
  var currentValue = placeholder ? '' : currentText;

  var textarea = document.createElement('textarea');
  textarea.value = currentValue;
  textarea.className = 'obs-edit-input text-xs w-full bg-transparent border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500';
  textarea.dataset.originalValue = currentValue;
  textarea.style.minHeight = '40px';

  span.style.display = 'none';
  span.parentNode.insertBefore(textarea, span.nextSibling);
  textarea.focus();

  var saved = false;

  function doSave() {
    if (saved) return;
    saved = true;
    finishObsEdit(textarea, span);
  }

  function doCancel() {
    if (saved) return;
    saved = true;
    cancelObsEdit(textarea, span);
  }

  textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      textarea.blur();
    } else if (e.key === 'Escape') {
      doCancel();
    }
  });

  textarea.addEventListener('blur', function () {
    doSave();
  });
}

function finishObsEdit(textarea, span, newValue) {
  if (newValue !== undefined) {
    var displayText = newValue ? escapeHtml(newValue) : '<span class="text-slate-400 italic">Adicionar observação...</span>';
    span.innerHTML = displayText;
  }
  if (textarea && textarea.parentNode) {
    textarea.parentNode.removeChild(textarea);
  }
  if (span) {
    span.style.display = '';
  }
}

function cancelObsEdit(textarea, span) {
  finishObsEdit(textarea, span);
}

describe("buildObsHtml", () => {
  it("renders observation text when obs is provided", () => {
    var html = buildObsHtml("Teste de observação", false);
    expect(html).toContain("Teste de observação");
    expect(html).not.toContain("Adicionar observação");
  });

  it("shows placeholder when obs is empty", () => {
    var html = buildObsHtml("", true);
    expect(html).toContain("Adicionar observação");
  });

  it("shows edit icon when canEdit is true", () => {
    var html = buildObsHtml("obs", true);
    expect(html).toContain("obs-edit-btn");
    expect(html).toContain('data-action="edit-obs"');
  });

  it("hides edit icon when canEdit is false", () => {
    var html = buildObsHtml("obs", false);
    expect(html).not.toContain("obs-edit-btn");
  });
});

describe("startObsInlineEdit", () => {
  it("replaces span with textarea on click", () => {
    document.body.innerHTML = buildObsHtml("Minha observação", true);
    var btn = document.querySelector('.obs-edit-btn');
    expect(btn).not.toBeNull();

    startObsInlineEdit(btn);

    var textarea = document.querySelector('.obs-edit-input');
    expect(textarea).not.toBeNull();
    expect(textarea.value).toBe("Minha observação");
  });

  it("shows empty textarea when observation is placeholder", () => {
    document.body.innerHTML = buildObsHtml("", true);
    var btn = document.querySelector('.obs-edit-btn');
    startObsInlineEdit(btn);

    var textarea = document.querySelector('.obs-edit-input');
    expect(textarea).not.toBeNull();
    expect(textarea.value).toBe("");
  });
});

describe("cancelObsEdit", () => {
  it("restores span and removes textarea on Escape", () => {
    document.body.innerHTML = buildObsHtml("Texto original", true);
    var btn = document.querySelector('.obs-edit-btn');
    startObsInlineEdit(btn);

    var textarea = document.querySelector('.obs-edit-input');
    expect(textarea).not.toBeNull();

    var escEvent = new Event('keydown');
    escEvent.key = 'Escape';
    textarea.dispatchEvent(escEvent);

    var textareaAfter = document.querySelector('.obs-edit-input');
    expect(textareaAfter).toBeNull();

    var span = document.querySelector('.obs-text');
    expect(span.style.display).not.toBe('none');
  });
});

/*
|--------------------------------------------------------------------------
| Corretiva Status Modal
|--------------------------------------------------------------------------
*/

const CORRETIVA_STATUSES = ['Concluído', 'Pendente', 'Em andamento', 'Planejado', 'Projeto Clean up'];

function openCorretivaStatusModal(id, currentStatus) {
  var modal = document.getElementById('modalStatusCorretiva');
  if (!modal) return;
  document.getElementById('corretivaStatusId').value = id;

  var select = document.getElementById('corretivaStatusSelect');
  select.innerHTML = '';
  CORRETIVA_STATUSES.forEach(function (s) {
    var opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    if (s === currentStatus) opt.selected = true;
    select.appendChild(opt);
  });

  modal.classList.remove('hidden');
}

describe("openCorretivaStatusModal", () => {
  it("populates modal with all status options", () => {
    document.body.innerHTML =
      '<div id="modalStatusCorretiva" class="hidden">' +
        '<select id="corretivaStatusSelect"></select>' +
        '<input type="hidden" id="corretivaStatusId" value="">' +
      '</div>';

    openCorretivaStatusModal(42, 'Pendente');

    var select = document.getElementById('corretivaStatusSelect');
    expect(select.options.length).toBe(5);
    expect(select.options[0].value).toBe('Concluído');
    expect(select.options[3].value).toBe('Planejado');
    expect(select.value).toBe('Pendente');
  });

  it("sets the hidden id field", () => {
    document.body.innerHTML =
      '<div id="modalStatusCorretiva" class="hidden">' +
        '<select id="corretivaStatusSelect"></select>' +
        '<input type="hidden" id="corretivaStatusId" value="">' +
      '</div>';

    openCorretivaStatusModal(99, 'Concluído');
    expect(document.getElementById('corretivaStatusId').value).toBe('99');
  });

  it("shows the modal", () => {
    document.body.innerHTML =
      '<div id="modalStatusCorretiva" class="hidden">' +
        '<select id="corretivaStatusSelect"></select>' +
        '<input type="hidden" id="corretivaStatusId" value="">' +
      '</div>';

    openCorretivaStatusModal(1, 'Planejado');
    expect(document.getElementById('modalStatusCorretiva').classList.contains('hidden')).toBeFalse();
  });
});

/*
|--------------------------------------------------------------------------
| SLA Line Helper
|--------------------------------------------------------------------------
*/

function canEditPlanned() { return true; }

function buildSlaLineHtml(item) {
  var slaDays = parseInt(item.sla_days, 10);
  if (!slaDays || slaDays <= 0) return '';
  var slaDayNum = parseInt(item.sla_day_number, 10) || 0;
  var exceeded = slaDayNum > slaDays ? slaDayNum - slaDays : 0;
  var lineClass = exceeded > 0 ? 'text-amber-600' : 'text-slate-500';
  var text = '';
  if (exceeded > 0) {
    text = slaDayNum + ' de ' + slaDays + ' · ' + exceeded + ' excedente' + (exceeded > 1 ? 's' : '');
  } else {
    text = slaDayNum + ' de ' + slaDays + ' dia' + (slaDays > 1 ? 's' : '') + ' programado' + (slaDays > 1 ? 's' : '');
  }
  return '<div class="mt-2 text-xs ' + lineClass + '">' +
    '<span>' + text + ' programados</span>' +
    '</div>';
}

describe("buildSlaLineHtml", () => {
  it("returns empty for items without sla_days", () => {
    expect(buildSlaLineHtml({})).toBe('');
    expect(buildSlaLineHtml({ sla_days: null })).toBe('');
    expect(buildSlaLineHtml({ sla_days: 0 })).toBe('');
  });

  it("shows normal SLA display for day within limits", () => {
    var html = buildSlaLineHtml({ sla_days: '4', sla_day_number: '2' });
    expect(html).toContain('2 de 4');
    expect(html).toContain('dias programados');
    expect(html).not.toContain('excedente');
  });

  it("uses singular for 1 day", () => {
    var html = buildSlaLineHtml({ sla_days: '1', sla_day_number: '1' });
    expect(html).toContain('1 de 1');
    expect(html).toContain('dia programado');
    expect(html).not.toContain('dias');
  });

  it("shows exceeded count when sla_day_number exceeds sla_days", () => {
    var html = buildSlaLineHtml({ sla_days: '6', sla_day_number: '8' });
    expect(html).toContain('8 de 6');
    expect(html).toContain('2 excedentes');
  });

  it("uses singular for 1 exceeded day", () => {
    var html = buildSlaLineHtml({ sla_days: '6', sla_day_number: '7' });
    expect(html).toContain('7 de 6');
    expect(html).toContain('1 excedente');
    expect(html).not.toContain('excedentes');
  });

  it("adds amber class when exceeded", () => {
    var html = buildSlaLineHtml({ sla_days: '3', sla_day_number: '5' });
    expect(html).toContain('text-amber-600');
  });

  it("uses slate class when not exceeded", () => {
    var html = buildSlaLineHtml({ sla_days: '5', sla_day_number: '3' });
    expect(html).toContain('text-slate-500');
  });

  it("returns empty when sla_days decremented to 0", () => {
    expect(buildSlaLineHtml({ sla_days: '0', sla_day_number: '1' })).toBe('');
  });
});

/*
|--------------------------------------------------------------------------
| SLA Date List Generator
|--------------------------------------------------------------------------
*/

function generateSlaDateList(startDate, days, includeSat, includeSun) {
  var dates = [];
  var current = new Date(startDate + 'T12:00:00');
  var created = 0;
  var dayNum = 1;
  while (created < days) {
    var dow = current.getDay();
    var isSat = dow === 6;
    var isSun = dow === 0;
    if ((isSat && !includeSat) || (isSun && !includeSun)) {
      current.setDate(current.getDate() + 1);
      continue;
    }
    if (dayNum > 1) {
      var dd = String(current.getDate()).padStart(2, '0');
      var mm = String(current.getMonth() + 1).padStart(2, '0');
      var yyyy = current.getFullYear();
      dates.push(dd + '/' + mm);
    }
    current.setDate(current.getDate() + 1);
    dayNum++;
    created++;
  }
  return dates;
}

describe("generateSlaDateList", () => {
  it("generates correct dates for weekdays only starting Mon", () => {
    // Monday 2026-07-06, SLA=4, no weekends
    var dates = generateSlaDateList('2026-07-06', 4, false, false);
    expect(dates.length).toBe(3);
    expect(dates[0]).toBe('07/07'); // Tue
    expect(dates[1]).toBe('08/07'); // Wed
    expect(dates[2]).toBe('09/07'); // Thu
  });

  it("skips weekends when includeSat=false, includeSun=false", () => {
    // Thursday 2026-07-09, SLA=4, no weekends
    var dates = generateSlaDateList('2026-07-09', 4, false, false);
    expect(dates.length).toBe(3);
    expect(dates[0]).toBe('10/07'); // Fri
    expect(dates[1]).toBe('13/07'); // Mon (skip Sat+Sun)
    expect(dates[2]).toBe('14/07'); // Tue
  });

  it("includes weekends when both checkboxes are checked", () => {
    // Saturday 2026-07-11, SLA=4
    var dates = generateSlaDateList('2026-07-11', 3, true, true);
    expect(dates.length).toBe(2);
    expect(dates[0]).toBe('12/07'); // Sun
    expect(dates[1]).toBe('13/07'); // Mon
  });
});
