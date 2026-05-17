import type { PredictFormValues } from '../types/predict'
import type { BatchResultItem } from '../types/predict'

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', inQ = false
  const flushField = () => { row.push(field); field = '' }
  const flushRow   = () => { rows.push(row); row = [] }
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1]
    if (inQ) {
      if (c === '"' && n === '"') { field += '"'; i++ }
      else if (c === '"') inQ = false
      else field += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') flushField()
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { flushField(); flushRow() }
      else field += c
    }
  }
  if (field.length || row.length) { flushField(); flushRow() }
  if (rows.length && rows[rows.length - 1].every(c => !c)) rows.pop()
  return rows
}

function toCsv(rows: (string | number)[][]): string {
  return rows.map(r =>
    r.map(c => {
      const s = c == null ? '' : String(c)
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  ).join('\r\n')
}

export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const csv = toCsv(rows)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a)
  a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function parseBatchCsv(text: string): { wells: PredictFormValues[]; errors: string[] } {
  const rows = parseCsv(text)
  if (!rows.length) return { wells: [], errors: ['Файл пуст'] }
  const [headerRaw, ...body] = rows
  const header = headerRaw.map(h => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)
  const need = ['well_id', 'ks_vol', 'flush_vol', 'perf_sum', 'nkt_vol', 'to_lower_perf', 'grp_done', 'grp_mass', 'is_horizontal']
  for (let i = 1; i <= 12; i++) need.push('q' + i)
  const missing = need.filter(n => idx(n) === -1)
  if (missing.length) return { wells: [], errors: ['Не хватает колонок: ' + missing.join(', ')] }

  const num = (v: string) => {
    const s = (v || '').replace(',', '.').trim()
    if (!s) return 0
    const n = Number(s)
    return Number.isFinite(n) ? n : 0
  }

  const wells: PredictFormValues[] = []
  const errors: string[] = []
  body.forEach((r, i) => {
    if (!r.length || r.every(c => !c?.trim())) return
    try {
      const hist: number[] = []
      for (let q = 1; q <= 12; q++) hist.push(num(r[idx('q' + q)] || '0'))
      wells.push({
        well_id:          r[idx('well_id')] || `row-${i + 1}`,
        q_liquid_history: hist,
        ks_vol:           num(r[idx('ks_vol')] || '0'),
        flush_vol:        num(r[idx('flush_vol')] || '0'),
        perf_sum:         num(r[idx('perf_sum')] || '0'),
        nkt_vol:          num(r[idx('nkt_vol')] || '0'),
        to_lower_perf:    num(r[idx('to_lower_perf')] || '0'),
        grp_done:         Boolean(num(r[idx('grp_done')] || '0')),
        grp_mass:         num(r[idx('grp_mass')] || '0'),
        is_horizontal:    Boolean(num(r[idx('is_horizontal')] || '0')),
      })
    } catch (e) {
      errors.push(`Строка ${i + 2}: ${(e as Error).message}`)
    }
  })
  return { wells, errors }
}

export function batchCsvTemplate(): string {
  const header = ['well_id', ...Array.from({length:12}, (_,i) => 'q'+(i+1)),
    'ks_vol','flush_vol','perf_sum','nkt_vol','to_lower_perf','grp_done','grp_mass','is_horizontal']
  const ex1 = ['Самотлор-4127', 38.2,36.1,34.4,32.9,31.6,30.2,29.0,27.7,26.4,25.2,24.0,22.9, 6.5,14.0,9.2,3.4,0,1,18,0]
  const ex2 = ['Приобское-8821', 22.4,21.6,20.9,20.1,19.4,18.7,18.0,17.4,16.7,16.1,15.5,14.9, 4.8,11.5,7.6,2.8,1,0,0,0]
  return toCsv([header, ex1, ex2])
}

export function exportBatchResults(results: BatchResultItem[]): string {
  const header = ['well_id','ok','effect_m3_d','cumulative_m3',
    ...Array.from({length:12},(_,i)=>'m'+(i+1)),'error']
  const rows = results.map(r => {
    if (!r.ok) return [r.well_id, 0, '', '', ...Array(12).fill(''), r.error || '']
    return [r.well_id, 1, r.effect ?? '', r.cumulative ?? '', ...(r.months_after || Array(12).fill('')), '']
  })
  return toCsv([header, ...rows])
}
