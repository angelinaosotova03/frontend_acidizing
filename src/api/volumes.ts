import { volAxios } from './axios'
import type { AdditiveResult, VolumesFormValues, VolumesResponse } from '../types/volumes'

export interface VolumeHistoryItem {
  id:                number
  well_id:           string
  composition_id:    number | null
  ks_vol:            number
  fluid_vol:         number
  tovar_kislota_vol: number
  plavikov_vol:      number
  citric_acid_vol:   number
  acetic_acid_vol:   number
  bffa_mass:         number
  additives:         AdditiveResult[]
  water_vol:         number
  perf_sum:          number
  created_at:        string
}

export const volumesApi = {
  async calculateVolumes(form: VolumesFormValues): Promise<VolumesResponse> {
    const r = await volAxios.post<VolumesResponse>('/calculate', form)
    return r.data
  },

  async getHistory(limit = 20): Promise<VolumeHistoryItem[]> {
    const r = await volAxios.get<VolumeHistoryItem[]>('/history', { params: { limit } })
    return r.data
  },
}
