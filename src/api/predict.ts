import { opzAxios } from './axios'
import type { PredictFormValues, WellInput, PredictResult, BatchResultItem } from '../types/predict'

function toWellInput(form: PredictFormValues): WellInput {
  const hist = form.q_liquid_history
  return {
    well_id:           form.well_id || null,
    month_1_before:  hist[0]  ?? 0,
    month_2_before:  hist[1]  ?? 0,
    month_3_before:  hist[2]  ?? 0,
    month_4_before:  hist[3]  ?? 0,
    month_5_before:  hist[4]  ?? 0,
    month_6_before:  hist[5]  ?? 0,
    month_7_before:  hist[6]  ?? 0,
    month_8_before:  hist[7]  ?? 0,
    month_9_before:  hist[8]  ?? 0,
    month_10_before: hist[9]  ?? 0,
    month_11_before: hist[10] ?? 0,
    month_12_before: hist[11] ?? 0,
    ks_vol:        form.ks_vol,
    flush_vol:     form.flush_vol,
    perf_sum:      form.perf_sum,
    nkt_vol:       form.nkt_vol,
    to_lower_perf: form.to_lower_perf,
    grp_done:      form.grp_done ? 1 : 0,
    grp_mass:      form.grp_mass,
    is_horizontal: form.is_horizontal ? 1 : 0,
  }
}

export interface PredictHistoryItem {
  well_id:       string
  effect:        number
  cumulative:    number
  perf_sum:      number
  ks_vol:        number
  months_before: number[]
  months_after:  number[]
  updated_at:    string
}

export const predictApi = {
  async getHistory(limit = 20): Promise<PredictHistoryItem[]> {
    const r = await opzAxios.get<PredictHistoryItem[]>('/history', { params: { limit } })
    return r.data
  },
  async predict(form: PredictFormValues): Promise<PredictResult> {
    const body = toWellInput(form)
    const [pred, base] = await Promise.all([
      opzAxios.post<{ months_after: number[]; effect: number; cumulative: number }>('', body),
      opzAxios.post<{ months_baseline: number[] }>('/baseline', body),
    ])
    return {
      months_after:    pred.data.months_after,
      effect:          pred.data.effect,
      cumulative:      pred.data.cumulative,
      baseline_months: base.data.months_baseline,
    }
  },

  async predictBatch(wells: PredictFormValues[]): Promise<BatchResultItem[]> {
    const body = { wells: wells.map(toWellInput) }
    const r = await opzAxios.post<{ results: Array<{ months_after: number[]; effect: number; cumulative: number }> }>(
      '/batch',
      body,
    )
    return r.data.results.map((res, i) => ({
      well_id:     wells[i]?.well_id || `well-${i + 1}`,
      ok:          true,
      months_after: res.months_after,
      effect:       res.effect,
      cumulative:   res.cumulative,
    }))
  },
}
