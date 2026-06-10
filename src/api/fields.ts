import { fieldsAxios } from './axios'
import type { AcidComposition, AcidCompositionFormValues, CompositionWithField, OilField, OilFieldDetail } from '../types/fields'

export const fieldsApi = {
  async list(): Promise<OilField[]> {
    const r = await fieldsAxios.get<OilField[]>('')
    return r.data
  },

  async create(name: string): Promise<OilField> {
    const r = await fieldsAxios.post<OilField>('', { name })
    return r.data
  },

  async get(fieldId: number): Promise<OilFieldDetail> {
    const r = await fieldsAxios.get<OilFieldDetail>(`/${fieldId}`)
    return r.data
  },

  async update(fieldId: number, name: string): Promise<OilField> {
    const r = await fieldsAxios.put<OilField>(`/${fieldId}`, { name })
    return r.data
  },

  async remove(fieldId: number): Promise<void> {
    await fieldsAxios.delete(`/${fieldId}`)
  },

  async listAllCompositions(): Promise<CompositionWithField[]> {
    const r = await fieldsAxios.get<CompositionWithField[]>('/compositions')
    return r.data
  },

  async listCompositions(fieldId: number): Promise<AcidComposition[]> {
    const r = await fieldsAxios.get<AcidComposition[]>(`/${fieldId}/compositions`)
    return r.data
  },

  async createComposition(fieldId: number, body: AcidCompositionFormValues): Promise<AcidComposition> {
    const r = await fieldsAxios.post<AcidComposition>(`/${fieldId}/compositions`, body)
    return r.data
  },

  async updateComposition(fieldId: number, compId: number, body: AcidCompositionFormValues): Promise<AcidComposition> {
    const r = await fieldsAxios.put<AcidComposition>(`/${fieldId}/compositions/${compId}`, body)
    return r.data
  },

  async removeComposition(fieldId: number, compId: number): Promise<void> {
    await fieldsAxios.delete(`/${fieldId}/compositions/${compId}`)
  },
}
