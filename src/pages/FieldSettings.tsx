import { useEffect, useState } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MapPin, FlaskConical, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card, Empty, Field, Input, Modal, NumberInput, Tabs } from '../components/ui'
import { fieldsApi } from '../api/fields'
import { handleApiError, get422Errors } from '../utils/errors'
import { fmt } from '../utils/format'
import { ADDITIVE_NAMES, type AcidComposition, type AcidCompositionFormValues, type OilField } from '../types/fields'
import { AxiosError } from 'axios'

// ─── Кислотный состав: схема формы ──────────────────────────────────────────
const additiveSchema = z.object({
  name:          z.string().min(1, 'Выберите компонент'),
  concentration: z.number({ invalid_type_error: 'Введите число' }).min(0, '≥ 0').max(100, '≤ 100'),
})

const compositionSchema = z.object({
  name:        z.string().min(1, 'Укажите наименование состава'),
  hcl:         z.number({ invalid_type_error: 'Введите число' }).min(0, '≥ 0').max(100, '≤ 100'),
  citric_acid: z.number({ invalid_type_error: 'Введите число' }).min(0, '≥ 0').max(100, '≤ 100'),
  acetic_acid: z.number({ invalid_type_error: 'Введите число' }).min(0, '≥ 0').max(100, '≤ 100'),
  hf_mode:     z.enum(['hf', 'bffa']),
  hf:          z.number({ invalid_type_error: 'Введите число' }).min(0, '≥ 0').max(100, '≤ 100'),
  bffa_chf:    z.number({ invalid_type_error: 'Введите число' }).min(0, '≥ 0').max(100, '≤ 100'),
  additives:   z.array(additiveSchema),
})
type CompositionFormValues = z.infer<typeof compositionSchema>

const COMPOSITION_DEFAULTS: CompositionFormValues = {
  name: '', hcl: 12, citric_acid: 0, acetic_acid: 0,
  hf_mode: 'hf', hf: 3, bffa_chf: 0,
  additives: [],
}

const ACID_FIELDS: { key: keyof Pick<AcidCompositionFormValues, 'hcl' | 'citric_acid' | 'acetic_acid'>; label: string }[] = [
  { key: 'hcl',         label: 'HCl' },
  { key: 'citric_acid', label: 'Лимонная к-та' },
  { key: 'acetic_acid', label: 'Уксусная к-та' },
]

function hfSummary(c: AcidComposition): string {
  return c.hf_mode === 'bffa'
    ? `БФФА · CHF ${fmt.num(c.bffa_chf, 1)}%`
    : `HF ${fmt.num(c.hf, 1)}%`
}

function additivesSummary(c: AcidComposition): string {
  if (!c.additives.length) return '—'
  return c.additives.map(a => `${a.name} ${fmt.num(a.concentration, 1)}%`).join(' · ')
}

export function FieldSettingsPage() {
  const [fields, setFields] = useState<OilField[]>([])
  const [loadingFields, setLoadingFields] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [newFieldName, setNewFieldName] = useState('')
  const [creatingField, setCreatingField] = useState(false)

  const [compositions, setCompositions] = useState<AcidComposition[]>([])
  const [loadingCompositions, setLoadingCompositions] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AcidComposition | null>(null)

  const loadFields = async () => {
    setLoadingFields(true)
    try {
      const data = await fieldsApi.list()
      setFields(data)
      setSelectedId(prev => prev ?? data[0]?.id ?? null)
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoadingFields(false)
    }
  }

  useEffect(() => { loadFields() }, [])

  const loadCompositions = async (fieldId: number) => {
    setLoadingCompositions(true)
    try {
      setCompositions(await fieldsApi.listCompositions(fieldId))
    } catch (err) {
      handleApiError(err)
    } finally {
      setLoadingCompositions(false)
    }
  }

  useEffect(() => {
    if (selectedId != null) loadCompositions(selectedId)
    else setCompositions([])
  }, [selectedId])

  const selectedField = fields.find(f => f.id === selectedId) ?? null

  // ── Месторождения ──────────────────────────────────────────────────────
  const submitNewField = async () => {
    const name = newFieldName.trim()
    if (!name) return
    setCreatingField(true)
    try {
      const created = await fieldsApi.create(name)
      setFields(prev => [created, ...prev])
      setSelectedId(created.id)
      setNewFieldName('')
      toast.success('Месторождение добавлено')
    } catch (err) {
      handleApiError(err)
    } finally {
      setCreatingField(false)
    }
  }

  const [renameValue, setRenameValue] = useState('')
  const startRename = (f: OilField) => { setRenamingId(f.id); setRenameValue(f.name) }
  const submitRename = async (f: OilField) => {
    const name = renameValue.trim()
    if (!name || name === f.name) { setRenamingId(null); return }
    try {
      const updated = await fieldsApi.update(f.id, name)
      setFields(prev => prev.map(x => x.id === f.id ? updated : x))
      setRenamingId(null)
      toast.success('Сохранено')
    } catch (err) {
      handleApiError(err)
    }
  }

  const removeField = async (f: OilField) => {
    if (!window.confirm(`Удалить месторождение «${f.name}» вместе со всеми его кислотными составами?`)) return
    try {
      await fieldsApi.remove(f.id)
      setFields(prev => prev.filter(x => x.id !== f.id))
      if (selectedId === f.id) setSelectedId(null)
      toast.success('Месторождение удалено')
    } catch (err) {
      handleApiError(err)
    }
  }

  // ── Кислотные составы ──────────────────────────────────────────────────
  const openCreateComposition = () => { setEditing(null); setModalOpen(true) }
  const openEditComposition = (c: AcidComposition) => { setEditing(c); setModalOpen(true) }

  const removeComposition = async (c: AcidComposition) => {
    if (selectedId == null) return
    if (!window.confirm(`Удалить состав «${c.name}»?`)) return
    try {
      await fieldsApi.removeComposition(selectedId, c.id)
      setCompositions(prev => prev.filter(x => x.id !== c.id))
      toast.success('Состав удалён')
    } catch (err) {
      handleApiError(err)
    }
  }

  const onCompositionSaved = (saved: AcidComposition, wasEdit: boolean) => {
    setCompositions(prev => wasEdit ? prev.map(x => x.id === saved.id ? saved : x) : [saved, ...prev])
    setModalOpen(false)
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="text-[11px] uppercase tracking-[.1em] text-ink-500 font-semibold mb-1">Настройки</div>
        <h1 className="text-[26px] font-semibold tracking-tight">Месторождение и кислотные составы</h1>
        <p className="text-sm text-ink-500 mt-1">
          Задайте наименование месторождения и кислотные составы (HCl, лимонная и уксусная кислоты, HF или БФФА,
          дополнительные компоненты) — их можно будет выбрать на этапе расчёта объёмов.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Месторождения */}
        <div className="lg:col-span-4">
          <Card title="Месторождения" badge="GET /fields">
            <div className="space-y-1 mb-3">
              {loadingFields ? (
                <div className="py-4 text-center text-ink-400 text-sm">Загрузка…</div>
              ) : fields.length === 0 ? (
                <div className="py-2 text-[13px] text-ink-500">Месторождения ещё не добавлены.</div>
              ) : fields.map(f => (
                <div key={f.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border transition cursor-pointer ${selectedId === f.id ? 'border-brand-600 bg-brand-50/50' : 'border-ink-200 hover:bg-ink-50'}`}
                  onClick={() => renamingId !== f.id && setSelectedId(f.id)}>
                  {renamingId === f.id ? (
                    <div className="flex items-center gap-1.5 flex-1" onClick={e => e.stopPropagation()}>
                      <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} className="input-text" autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') submitRename(f); if (e.key === 'Escape') setRenamingId(null) }} />
                      <button className="text-ink-400 hover:text-green-600 p-1" onClick={() => submitRename(f)}><Check size={14}/></button>
                      <button className="text-ink-400 hover:text-red-500 p-1" onClick={() => setRenamingId(null)}><X size={14}/></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin size={14} className={selectedId === f.id ? 'text-brand-600' : 'text-ink-400'} />
                        <span className="text-[13px] font-medium text-ink-900 truncate">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button className="text-ink-400 hover:text-ink-900 p-1" onClick={e => { e.stopPropagation(); startRename(f) }}><Pencil size={13}/></button>
                        <button className="text-ink-400 hover:text-red-500 p-1" onClick={e => { e.stopPropagation(); removeField(f) }}><Trash2 size={13}/></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 pt-3 border-t border-ink-200/70">
              <Input value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="Наименование месторождения"
                className="input-text" onKeyDown={e => { if (e.key === 'Enter') submitNewField() }} />
              <Button icon={<Plus size={13}/>} loading={creatingField} onClick={submitNewField}>Добавить</Button>
            </div>
          </Card>
        </div>

        {/* Кислотные составы */}
        <div className="lg:col-span-8">
          {!selectedField ? (
            <Card padded={false} className="h-full">
              <Empty icon={<FlaskConical size={20}/>} title="Выберите месторождение"
                body="Добавьте месторождение слева или выберите существующее, чтобы задать его кислотные составы." />
            </Card>
          ) : (
            <Card title={`Кислотные составы · ${selectedField.name}`} badge="POST /fields/{id}/compositions"
              right={<Button size="sm" icon={<Plus size={12}/>} onClick={openCreateComposition}>Добавить состав</Button>}>
              {loadingCompositions ? (
                <div className="py-6 text-center text-ink-400 text-sm">Загрузка…</div>
              ) : compositions.length === 0 ? (
                <Empty icon={<FlaskConical size={20}/>} title="Составы не заданы"
                  body="Добавьте первый кислотный состав для этого месторождения, указав HCl, лимонную и уксусную кислоты, HF или БФФА." />
              ) : (
                <table className="dtable">
                  <thead>
                    <tr>
                      <th>Состав</th>
                      <th className="num">HCl, %</th>
                      <th className="num">Лимонная, %</th>
                      <th className="num">Уксусная, %</th>
                      <th>HF / БФФА</th>
                      <th>Доп. компоненты</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {compositions.map(c => (
                      <tr key={c.id}>
                        <td className="font-medium text-ink-900">{c.name}</td>
                        <td className="num tabnum">{fmt.num(c.hcl, 1)}</td>
                        <td className="num tabnum">{fmt.num(c.citric_acid, 1)}</td>
                        <td className="num tabnum">{fmt.num(c.acetic_acid, 1)}</td>
                        <td className="text-ink-700 text-sm">{hfSummary(c)}</td>
                        <td className="text-ink-500 text-sm">{additivesSummary(c)}</td>
                        <td className="num">
                          <div className="flex items-center justify-end gap-0.5">
                            <button className="text-ink-400 hover:text-ink-900 p-1" onClick={() => openEditComposition(c)}><Pencil size={13}/></button>
                            <button className="text-ink-400 hover:text-red-500 p-1" onClick={() => removeComposition(c)}><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
        </div>
      </div>

      {selectedId != null && (
        <CompositionModal
          open={modalOpen}
          fieldId={selectedId}
          editing={editing}
          onClose={() => setModalOpen(false)}
          onSaved={onCompositionSaved}
        />
      )}
    </div>
  )
}

function CompositionModal({ open, fieldId, editing, onClose, onSaved }: {
  open: boolean
  fieldId: number
  editing: AcidComposition | null
  onClose: () => void
  onSaved: (c: AcidComposition, wasEdit: boolean) => void
}) {
  const { register, control, handleSubmit, reset, watch, setError, formState: { errors, isSubmitting } } = useForm<CompositionFormValues>({
    resolver: zodResolver(compositionSchema),
    defaultValues: COMPOSITION_DEFAULTS,
  })

  const { fields: additiveFields, append: appendAdditive, remove: removeAdditive } = useFieldArray({
    control,
    name: 'additives',
  })

  const additives = watch('additives')
  const hfMode = watch('hf_mode')

  useEffect(() => {
    if (open) reset(editing ?? COMPOSITION_DEFAULTS)
  }, [open, editing, reset])

  const onSubmit = async (data: CompositionFormValues) => {
    try {
      const saved = editing
        ? await fieldsApi.updateComposition(fieldId, editing.id, data)
        : await fieldsApi.createComposition(fieldId, data)
      toast.success(editing ? 'Состав обновлён' : 'Состав добавлен')
      onSaved(saved, !!editing)
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 422) {
        const map = get422Errors(err)
        Object.entries(map).forEach(([k, v]) => setError(k as keyof CompositionFormValues, { message: v }))
      } else {
        handleApiError(err)
      }
    }
  }

  const addAdditive = () => {
    const used = new Set(additives.map(a => a.name))
    const next = ADDITIVE_NAMES.find(n => !used.has(n)) ?? ADDITIVE_NAMES[0]
    appendAdditive({ name: next, concentration: 0 })
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Изменить состав' : 'Новый кислотный состав'} width={520}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>{editing ? 'Сохранить' : 'Добавить'}</Button>
        </div>
      }>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <Field label="Наименование состава" error={errors.name?.message}>
          <Input {...register('name')} placeholder="Состав №1 — стандартный" className="input-text" />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          {ACID_FIELDS.map(({ key, label }) => (
            <Field key={key} label={label} unit="%" error={errors[key]?.message}>
              <NumberInput {...register(key, { valueAsNumber: true })} step="0.1" error={errors[key]?.message} />
            </Field>
          ))}
        </div>

        <div className="space-y-2 pt-1">
          <div className="text-xs font-medium text-ink-500 uppercase tracking-wide">
            Плавиковая кислота (HF) или БФФА
          </div>
          <Controller
            control={control}
            name="hf_mode"
            render={({ field }) => (
              <Tabs
                value={field.value}
                onChange={v => field.onChange(v)}
                items={[
                  { value: 'hf', label: 'HF, % об. КС' },
                  { value: 'bffa', label: 'БФФА (по концентрации HF)' },
                ]}
              />
            )}
          />
          {hfMode === 'hf' ? (
            <Field label="HF" unit="% об. КС" error={errors.hf?.message}>
              <NumberInput {...register('hf', { valueAsNumber: true })} step="0.1" error={errors.hf?.message} />
            </Field>
          ) : (
            <Field label="Целевая концентрация HF" unit="% масс." error={errors.bffa_chf?.message}
              help="Навеска БФФА рассчитывается по формуле mБФФА = CHF·MNH₄HF₂·Vр-ра / (2·MHF) при расчёте объёмов">
              <NumberInput {...register('bffa_chf', { valueAsNumber: true })} step="0.1" error={errors.bffa_chf?.message} />
            </Field>
          )}
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-ink-500 uppercase tracking-wide">
              Дополнительные компоненты
            </div>
            <Button type="button" variant="ghost" size="sm" icon={<Plus size={12}/>}
              onClick={addAdditive} disabled={additiveFields.length >= ADDITIVE_NAMES.length}>
              Добавить
            </Button>
          </div>
          {additiveFields.length === 0 ? (
            <div className="text-[13px] text-ink-400">Не заданы</div>
          ) : (
            <div className="space-y-2">
              {additiveFields.map((field, i) => {
                const used = new Set(additives.filter((_, j) => j !== i).map(a => a.name))
                return (
                  <div key={field.id} className="flex items-center gap-2">
                    <select
                      className="input input-text flex-1"
                      {...register(`additives.${i}.name` as const)}
                    >
                      {ADDITIVE_NAMES.filter(n => !used.has(n) || n === additives[i]?.name).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <div className="w-28">
                      <NumberInput
                        {...register(`additives.${i}.concentration` as const, { valueAsNumber: true })}
                        step="0.1"
                        error={errors.additives?.[i]?.concentration?.message}
                      />
                    </div>
                    <span className="text-ink-400 text-[12px] mono shrink-0">% об. КС</span>
                    <button type="button" onClick={() => removeAdditive(i)}
                      className="text-ink-400 hover:text-red-500 transition p-1 -m-1 shrink-0">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
