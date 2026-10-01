export function computeTotalKm(recharges: { recharge_date: string; odometer: number }[]): number {
  if (recharges.length <= 1) return 0
  const sorted = [...recharges].sort(
    (a, b) => new Date(a.recharge_date).getTime() - new Date(b.recharge_date).getTime(),
  )
  let total = 0
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i].odometer - sorted[i - 1].odometer
    if (diff > 0) total += diff
  }
  return total
}

export function computeAvgKmPerLiter(totalKm: number, totalLiters: number): number {
  return totalLiters > 0 ? totalKm / totalLiters : 0
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function filterByDateRange<T>(
  records: T[],
  startDate: string,
  endDate: string,
  dateField: string,
): T[] {
  return records.filter((r) => {
    const date = new Date((r as Record<string, unknown>)[dateField] as string)
    if (startDate && date < new Date(startDate)) return false
    if (endDate && date > new Date(endDate + 'T23:59:59')) return false
    return true
  })
}
