import { volAxios } from './axios'
import type { VolumesFormValues, VolumesResponse } from '../types/volumes'

export interface VolumeHistoryItem {
  id:                number
  well_id:           string
  ks_vol:            number
  fluid_vol:         number
  tovar_kislota_vol: number
  hlor_bar_mass:     number
  hlor_bar_vol:      number
  stabilizer_vol:    number
  inhibitor_vol:     number
  intensifier_vol:   number
  plavikov_vol:      number
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
