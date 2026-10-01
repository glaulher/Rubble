export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const escapeCell = (cell: string | number | null | undefined) => {
    const str = String(cell ?? '')
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvContent = [
    headers.map(escapeCell).join(';'),
    ...rows.map((r) => r.map(escapeCell).join(';')),
  ].join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
