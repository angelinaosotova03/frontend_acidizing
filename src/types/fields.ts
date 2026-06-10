export interface OilField {
  id:         number
  name:       string
  created_at: string
}

export interface OilFieldDetail extends OilField {
  compositions: AcidComposition[]
}

export interface AdditiveItem {
  name:          string
  concentration: number
}

// Список доступных дополнительных компонентов (выбираются из выпадающего списка)
export const ADDITIVE_NAMES = [
  'Сонкор-9022 Б',
  'Нефтенол К',
  'Алдинол МК',
  'Нефтенол ГФ',
  'ГФ-1',
  'Хлористый аммоний',
  'Нефтенол ВВД',
] as const

export type HfMode = 'hf' | 'bffa'

export interface AcidComposition {
  id:          number
  field_id:    number
  name:        string
  hcl:         number
  citric_acid: number
  acetic_acid: number
  hf_mode:     HfMode
  hf:          number
  bffa_chf:    number
  additives:   AdditiveItem[]
  created_at:  string
}

export interface CompositionWithField extends AcidComposition {
  field_name: string
}

export interface AcidCompositionFormValues {
  name:        string
  hcl:         number
  citric_acid: number
  acetic_acid: number
  hf_mode:     HfMode
  hf:          number
  bffa_chf:    number
  additives:   AdditiveItem[]
}
