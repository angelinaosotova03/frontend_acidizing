/**
 * Экспоненциальный Арпс q(t) = q0·exp(-Di·t).
 * Зеркалит _fit_arps_row из features.py бекенда:
 * линейная регрессия по ln(q) vs t, затем экстраполяция на месяцы n..n+11.
 */
export function computeArpsBaseline(monthsBefore: number[]): number[] {
  const n = monthsBefore.length
  const EPS = 1e-6
  const q = monthsBefore.map(v => Math.max(v, EPS))
  const logQ = q.map(v => Math.log(v))

  const tMean = (n - 1) / 2
  const logQMean = logQ.reduce((a, b) => a + b, 0) / n

  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (i - tMean) * (logQ[i] - logQMean)
    den += (i - tMean) ** 2
  }

  const slope = den > 0 ? num / den : 0
  const Di = Math.max(-slope, 0)
  const q0 = Math.exp(logQMean - slope * tMean)
  const lastQ = monthsBefore[n - 1]

  return Array.from({ length: 12 }, (_, i) => {
    const t = n + i
    return Math.max(Math.min(q0 * Math.exp(-Di * t), lastQ), 0)
  })
}

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
