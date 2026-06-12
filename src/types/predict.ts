// ─── Базовые входные модели (зеркалят matrix_acidizing_model/app.py) ────────

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

export interface ExtendedWellInput extends WellInput {
  reservoir_pressure: number
  pzab_before: number
  kpr_before: number
}

export interface LiquidCurveInput extends ExtendedWellInput {
  month_1_before_liquid: number
  month_2_before_liquid: number
  month_3_before_liquid: number
  month_4_before_liquid: number
  month_5_before_liquid: number
  month_6_before_liquid: number
  month_7_before_liquid: number
  month_8_before_liquid: number
  month_9_before_liquid: number
  month_10_before_liquid: number
  month_11_before_liquid: number
  month_12_before_liquid: number
}

// ─── Ответы предсказательных эндпоинтов ──────────────────────────────────────

export interface KprPredictResponse {
  kpr_after: number
}

export interface PzabPredictResponse {
  pzab_after: number
}

export interface LiquidDebitResponse {
  debit_liquid_after: number
}

export interface OilPredictResponse {
  months_after: number[]
  months_baseline: number[]
  effect: number
  cumulative: number
  effect_duration_months: number
}

export interface LiquidCurvePredictResponse extends OilPredictResponse {
  anchored: boolean
}

// ─── Health-check ────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string
  oil_model_loaded: boolean
  kpr_model_loaded: boolean
  pzab_model_loaded: boolean
  liquid_curve_model_loaded: boolean
  db_ready: boolean
}

// ─── Общий набор результатных полей (используется и в результате расчёта,
//     и в записи истории) ────────────────────────────────────────────────────

export interface PredictRecordFields {
  kpr_before: number | null
  pzab_before: number | null
  month_1_before: number | null
  month_1_before_liquid: number | null

  kpr_after: number | null
  pzab_after: number | null
  debit_liquid_after: number | null

  oil_months_after: number[] | null
  oil_months_baseline: number[] | null
  oil_effect: number | null
  oil_cumulative: number | null
  oil_effect_duration_months: number | null

  liquid_months_after: number[] | null
  liquid_months_baseline: number[] | null
  liquid_effect: number | null
  liquid_cumulative: number | null
  liquid_effect_duration_months: number | null
  liquid_anchored: boolean | null
}

export interface PredictHistoryItem extends PredictRecordFields {
  well_id: string
  username: string

  month_2_before: number | null
  month_3_before: number | null
  month_4_before: number | null
  month_5_before: number | null
  month_6_before: number | null
  month_7_before: number | null
  month_8_before: number | null
  month_9_before: number | null
  month_10_before: number | null
  month_11_before: number | null
  month_12_before: number | null

  ks_vol: number | null
  flush_vol: number | null
  perf_sum: number | null
  nkt_vol: number | null
  to_lower_perf: number | null
  grp_done: number | null
  grp_mass: number | null
  is_horizontal: number | null
  reservoir_pressure: number | null

  month_2_before_liquid: number | null
  month_3_before_liquid: number | null
  month_4_before_liquid: number | null
  month_5_before_liquid: number | null
  month_6_before_liquid: number | null
  month_7_before_liquid: number | null
  month_8_before_liquid: number | null
  month_9_before_liquid: number | null
  month_10_before_liquid: number | null
  month_11_before_liquid: number | null
  month_12_before_liquid: number | null

  created_at: string
  updated_at: string
}

// ─── Значения формы ──────────────────────────────────────────────────────────

export interface PredictFormValues {
  well_id: string
  monthsBefore: number[]       // 12 значений, дебит нефти до ОПЗ, м³/сут
  ks_vol: number
  flush_vol: number
  perf_sum: number
  nkt_vol: number
  to_lower_perf: number
  grp_done: boolean
  grp_mass: number
  is_horizontal: boolean
  reservoir_pressure: number
  pzab_before: number
  kpr_before: number
  liquidHistoryEnabled: boolean
  monthsBeforeLiquid: number[] // 12 значений, дебит жидкости до ОПЗ, м³/сут
}
