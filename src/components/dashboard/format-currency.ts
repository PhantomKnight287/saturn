export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

export function sumByCurrency<T extends { currency: string }>(
  list: T[],
  value: (item: T) => number
) {
  const totals: Record<string, number> = {}
  for (const item of list) {
    totals[item.currency] = (totals[item.currency] ?? 0) + value(item)
  }
  return totals
}
