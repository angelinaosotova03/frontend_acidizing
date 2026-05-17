export interface NKTSection {
  d:       number   // наружный диаметр, м
  thikness: number  // толщина стенки, м
  bottom:  number   // глубина низа секции, м
}

export interface VolumesFormValues {
  well_id:      string
  perf_sum:     number        // м
  nkt_sections: NKTSection[]
  ek_d:         number        // м
  ek_thikness:  number        // м
  perf_depth:   number        // м
  grp_done:     number        // 0 | 1
  grp_mass:     number        // т
}

export interface VolumesResponse {
  well_id: string
  ks_vol: number
  fluid_vol: number
  tovar_kislota_vol: number
  hlor_bar_mass: number
  hlor_bar_vol: number
  stabilizer_vol: number
  inhibitor_vol: number
  intensifier_vol: number
  plavikov_vol: number
  water_vol: number
}

export interface HandoffPayload {
  well_id: string
  ks_vol: number
  flush_vol: number
  perf_sum: number
  nkt_vol: number
}
