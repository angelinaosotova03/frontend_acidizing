export interface NKTSection {
  d:       number   // наружный диаметр, м
  thikness: number  // толщина стенки, м
  bottom:  number   // глубина низа секции, м
}

export interface VolumesFormValues {
  well_id:        string
  perf_sum:       number        // м
  nkt_sections:   NKTSection[]
  ek_d:           number        // м
  ek_thikness:    number        // м
  perf_depth:     number        // м
  grp_done:       number        // 0 | 1
  grp_mass:       number        // т
  composition_id: number | null // выбранный кислотный состав месторождения
}

export interface AdditiveResult {
  name: string
  vol:  number
}

export interface VolumesResponse {
  well_id: string
  composition_id: number | null
  ks_vol: number
  fluid_vol: number
  tovar_kislota_vol: number
  plavikov_vol: number
  citric_acid_vol: number
  acetic_acid_vol: number
  bffa_mass: number
  additives: AdditiveResult[]
  water_vol: number
}

export interface HandoffPayload {
  well_id: string
  ks_vol: number
  flush_vol: number
  perf_sum: number
  nkt_vol: number
}
