import axios from 'axios'
import { opzAxios } from './axios'
import type {
  ExtendedWellInput,
  HealthResponse,
  KprPredictResponse,
  LiquidCurveInput,
  LiquidCurvePredictResponse,
  LiquidDebitResponse,
  OilPredictResponse,
  PredictFormValues,
  PredictHistoryItem,
  PzabPredictResponse,
} from '../types/predict'

function monthFields(values: number[], suffix = ''): Record<string, number> {
  const out: Record<string, number> = {}
  for (let i = 0; i < 12; i++) out[`month_${i + 1}_before${suffix}`] = values[i] ?? 0
  return out
}

export function toExtendedWellInput(form: PredictFormValues): ExtendedWellInput {
  return {
    well_id: form.well_id.trim() || undefined,
    ...monthFields(form.monthsBefore),
    ks_vol: form.ks_vol,
    flush_vol: form.flush_vol,
    perf_sum: form.perf_sum,
    nkt_vol: form.nkt_vol,
    vol_ek: form.vol_ek,
    grp_done: form.grp_done ? 1 : 0,
    grp_mass: form.grp_done ? form.grp_mass : 0,
    is_horizontal: form.is_horizontal ? 1 : 0,
    reservoir_pressure: form.reservoir_pressure,
    pzab_before: form.pzab_before,
    kpr_before: form.kpr_before,
  } as unknown as ExtendedWellInput
}

export function toLiquidCurveInput(form: PredictFormValues): LiquidCurveInput {
  return {
    ...toExtendedWellInput(form),
    ...monthFields(form.monthsBeforeLiquid, '_liquid'),
  } as unknown as LiquidCurveInput
}

export const predictApi = {
  async health(): Promise<HealthResponse> {
    const r = await axios.get<HealthResponse>('/health')
    return r.data
  },

  async kpr(input: ExtendedWellInput): Promise<KprPredictResponse> {
    const r = await opzAxios.post<KprPredictResponse>('/kpr', input)
    return r.data
  },

  async pzab(input: ExtendedWellInput): Promise<PzabPredictResponse> {
    const r = await opzAxios.post<PzabPredictResponse>('/pzab', input)
    return r.data
  },

  async liquid(input: ExtendedWellInput): Promise<LiquidDebitResponse> {
    const r = await opzAxios.post<LiquidDebitResponse>('/liquid', input)
    return r.data
  },

  async oil(input: ExtendedWellInput): Promise<OilPredictResponse> {
    const r = await opzAxios.post<OilPredictResponse>('/oil', input)
    return r.data
  },

  async liquidCurve(input: LiquidCurveInput): Promise<LiquidCurvePredictResponse> {
    const r = await opzAxios.post<LiquidCurvePredictResponse>('/liquid_curve', input)
    return r.data
  },

  async getHistory(limit = 20): Promise<PredictHistoryItem[]> {
    const r = await opzAxios.get<PredictHistoryItem[]>('/history', { params: { limit } })
    return r.data
  },
}
