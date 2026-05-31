function downloadCSV(filename, headerRow, rowBuilder) {
  let csv = headerRow + '\n';
  rowBuilder((cells) => {
    csv += cells.join(';') + '\n';
  });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
