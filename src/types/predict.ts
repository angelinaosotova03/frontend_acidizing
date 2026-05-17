export interface PredictFormValues {
  well_id?: string
  q_liquid_history: number[]
  ks_vol: number
  flush_vol: number
  perf_sum: number
  nkt_vol: number
  to_lower_perf: number
  grp_done: boolean
  grp_mass: number
  is_horizontal: boolean
}

export interface WellInput {
  well_id?: string | null
  month_1_before: number
  month_2_before: number
  month_3_before: number
  month_4_before: number
  month_5_before: number
  month_6_before: number
  month_7_before: number
  month_8_before: number
  month_9_before: number
  month_10_before: number
  month_11_before: number
  month_12_before: number
  ks_vol: number
  flush_vol: number
  perf_sum: number
  nkt_vol: number
  to_lower_perf: number
  grp_done: 0 | 1
  grp_mass: number
  is_horizontal: 0 | 1
}

export interface PredictResult {
  months_after: number[]
  baseline_months: number[]
  effect: number
  cumulative: number
}

export interface BatchResultItem {
  well_id: string
  ok: boolean
  months_after?: number[]
  effect?: number
  cumulative?: number
  error?: string
}
