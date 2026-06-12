export const fmt = {
  num(v: number | null | undefined, decimals = 2): string {
    if (v == null || Number.isNaN(v)) return '—'
    return Number(v).toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  },
  delta(v: number | null | undefined, decimals = 1): string {
    if (v == null) return '—'
    const sign = v > 0 ? '+' : ''
    return sign + Number(v).toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  },
  date(s: string | null | undefined): string {
    if (!s) return '—'
    return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  },
  dateTime(s: string | null | undefined): string {
    if (!s) return '—'
    return new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  },
}
