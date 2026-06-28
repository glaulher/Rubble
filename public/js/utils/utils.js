function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatAddress(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

function titleCase(str) {
  if (!str) return '';
  return str
    .toLocaleLowerCase('pt-BR')
    .replace(/(\p{L})(\p{L}*)/gu, (_, first, rest) => first.toLocaleUpperCase('pt-BR') + rest);
}

function sanitizeCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }
  var result = String(value)
    .replace(/;/g, ',')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/"/g, "'")
    .trim();
  return result.replace(/^[=+\-@]/g, "'$&");
}

function formatCurrency(value) {
  const val = parseFloat(value) || 0;
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}
