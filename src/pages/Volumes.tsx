import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calculator, TrendingUp, Download, Check, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { AxiosError } from 'axios'
import { Button, Card, Chip, Empty, Field, NumberInput, Input, SectionRule, Toggle } from '../components/ui'
import { volumesApi } from '../api/volumes'
import { useHandoff } from '../hooks/useHandoff'
import { downloadCsv } from '../utils/csv'
import { fmt } from '../utils/format'
import { get422Errors } from '../utils/errors'
import type { VolumesFormValues, VolumesResponse } from '../types/volumes'

// ─── Zod-схема ──────────────────────────────────────────────────────────────
const nktSectionSchema = z.object({
  d:       z.number({ invalid_type_error: 'Введите число' }).positive('> 0'),
  thikness: z.number({ invalid_type_error: 'Введите число' }).positive('> 0'),
  bottom:  z.number({ invalid_type_error: 'Введите число' }).positive('> 0'),
}).refine(s => s.d > 2 * s.thikness, { message: 'Ø > 2 × стенка', path: ['d'] })

const schema = z.object({
  well_id:      z.string().min(1, 'Укажите ID скважины'),
  perf_sum:     z.number({ invalid_type_error: 'Введите число' }).positive('Должно быть > 0'),
  nkt_sections: z.array(nktSectionSchema).min(1),
  ek_d:         z.number({ invalid_type_error: 'Введите число' }).positive(),
  ek_thikness:  z.number({ invalid_type_error: 'Введите число' }).positive(),
  perf_depth:   z.number({ invalid_type_error: 'Введите число' }).positive(),
  grp_done:     z.number().int().min(0).max(1),
  grp_mass:     z.number().min(0),
}).superRefine((d, ctx) => {
  // секции в порядке возрастания глубины
  d.nkt_sections.forEach((sec, i) => {
    const prev = i === 0 ? 0 : d.nkt_sections[i - 1].bottom
    if (sec.bottom <= prev)
      ctx.addIssue({ code: 'custom', path: ['nkt_sections', i, 'bottom'], message: `Должно быть > ${prev.toFixed(0)} м` })
  })
  // perf_depth > башмак последней секции
  const shoe = d.nkt_sections[d.nkt_sections.length - 1]?.bottom ?? 0
  if (d.perf_depth <= shoe)
    ctx.addIssue({ code: 'custom', path: ['perf_depth'], message: `Должно быть > ${shoe.toFixed(0)} м (башмак НКТ)` })
  // ЭК
  if (d.ek_d <= 2 * d.ek_thikness)
    ctx.addIssue({ code: 'custom', path: ['ek_d'], message: 'Ø ЭК > 2 × толщина стенки' })
  // ГРП
  if (d.grp_done === 1 && d.grp_mass <= 0)
    ctx.addIssue({ code: 'custom', path: ['grp_mass'], message: 'При ГРП масса пропанта должна быть > 0' })
})

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = {
  well_id: '', perf_sum: 12.5,
  nkt_sections: [{ d: 0.073, thikness: 0.0055, bottom: 2480 }],
  ek_d: 0.146, ek_thikness: 0.0077, perf_depth: 2495,
  grp_done: 0, grp_mass: 0,
}

const REAGENTS = [
  { key: 'ks_vol',            label: 'Объём КС',              unit: 'м³', color: '#2563EB' },
  { key: 'fluid_vol',         label: 'Продавочная жидкость',   unit: 'м³', color: '#0EA5E9' },
  { key: 'tovar_kislota_vol', label: 'Товарная кислота',       unit: 'м³', color: '#7C3AED' },
  { key: 'hlor_bar_mass',     label: 'Хлористый барий',        unit: 'кг', color: '#0891B2' },
  { key: 'hlor_bar_vol',      label: 'Хлористый барий (объём)', unit: 'м³', color: '#0891B2' },
  { key: 'stabilizer_vol',    label: 'Стабилизатор Fe³⁺',       unit: 'м³', color: '#10B981' },
  { key: 'inhibitor_vol',     label: 'Ингибитор коррозии',     unit: 'м³', color: '#F59E0B' },
  { key: 'intensifier_vol',   label: 'Активатор',              unit: 'м³', color: '#EC4899' },
  { key: 'plavikov_vol',      label: 'Плавиковая кислота',     unit: 'м³', color: '#A855F7' },
  { key: 'water_vol',         label: 'Вода',                   unit: 'м³', color: '#64748B' },
] as const

export function VolumesPage() {
  const navigate = useNavigate()
  const { set: setHandoff } = useHandoff()
  const [result, setResult] = useState<VolumesResponse | null>(null)

  const { register, handleSubmit, reset, getValues, setValue, watch, control, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })

  const { fields: nktFields, append: appendNKT, remove: removeNKT } = useFieldArray({
    control,
    name: 'nkt_sections',
  })

  const grpDone = watch('grp_done') === 1
  const sections = watch('nkt_sections')

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await volumesApi.calculateVolumes(data as VolumesFormValues)
      setResult(res)
      toast.success(`Расчёт готов — скважина ${data.well_id}`)
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 422) {
        const map = get422Errors(err)
        Object.entries(map).forEach(([k, v]) => setError(k as keyof FormValues, { message: v }))
      } else {
        toast.error('Ошибка расчёта')
      }
    }
  }

  const addSection = () => {
    const last = sections[sections.length - 1]
    appendNKT({ d: Math.max(0.060, +(last.d - 0.016).toFixed(3)), thikness: 0.0055, bottom: last.bottom + 300 })
  }

  const sendToPredict = () => {
    if (!result) return
    const vals = getValues()
    // nkt_vol = сумма объёмов всех секций
    let nktVol = 0, prevBottom = 0
    vals.nkt_sections.forEach(sec => {
      const r = (sec.d - 2 * sec.thikness) / 2
      nktVol += Math.PI * r * r * (sec.bottom - prevBottom)
      prevBottom = sec.bottom
    })
    setHandoff({ well_id: vals.well_id, ks_vol: result.ks_vol, flush_vol: result.fluid_vol, perf_sum: vals.perf_sum, nkt_vol: Math.round(nktVol * 1000) / 1000 })
    toast.success('Параметры переданы в прогноз')
    navigate('/predict')
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[.1em] text-ink-500 font-semibold mb-1">Расчёты · /calculate_vols</div>
          <h1 className="text-[26px] font-semibold tracking-tight">Расчёт объёмов реагентов</h1>
        </div>
        <Button variant="secondary" onClick={() => { reset(DEFAULTS); setResult(null) }}>Сбросить</Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-7 space-y-4 self-start" noValidate>
          <Card title="Параметры скважины" badge="входные данные">
            <Field label="Идентификатор скважины" error={errors.well_id?.message}>
              <Input {...register('well_id')} placeholder="Самотлор-4127" className="input-text" />
            </Field>

            <SectionRule>Геометрия пласта</SectionRule>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <Field label="Перфорированная толщина" unit="м" error={errors.perf_sum?.message}>
                <NumberInput {...register('perf_sum', { valueAsNumber: true })} error={errors.perf_sum?.message} />
              </Field>
              <Field label="Глубина перфорации" unit="м" error={errors.perf_depth?.message}>
                <NumberInput {...register('perf_depth', { valueAsNumber: true })} error={errors.perf_depth?.message} />
              </Field>
            </div>

            {/* ── Многосекционный НКТ ────────────────────────────────── */}
            <SectionRule right={
              <Button type="button" variant="ghost" size="sm" icon={<Plus size={12}/>} onClick={addSection}>
                Добавить секцию
              </Button>
            }>
              Колонна НКТ · {nktFields.length} {nktFields.length === 1 ? 'секция' : nktFields.length < 5 ? 'секции' : 'секций'}
            </SectionRule>

            <div className="space-y-2">
              {nktFields.map((field, i) => {
                const prevBottom = i === 0 ? 0 : (sections[i - 1]?.bottom ?? 0)
                const curBottom  = sections[i]?.bottom ?? 0
                return (
                  <div key={field.id} className="rounded-md border border-ink-200 bg-ink-50/40 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] mono text-ink-500 font-medium">
                        Секция #{i + 1}
                        <span className="ml-2 text-ink-400 font-normal">
                          {prevBottom.toFixed(0)} → {curBottom.toFixed(0)} м
                        </span>
                      </span>
                      {nktFields.length > 1 && (
                        <button type="button" onClick={() => removeNKT(i)}
                          className="text-ink-400 hover:text-red-500 transition p-1 -m-1">
                          <Trash2 size={13}/>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3 items-start">
                      <Field label="Диаметр НКТ" unit="м"
                        error={errors.nkt_sections?.[i]?.d?.message}>
                        <NumberInput
                          {...register(`nkt_sections.${i}.d`, { valueAsNumber: true })}
                          step="0.001"
                          error={errors.nkt_sections?.[i]?.d?.message}
                        />
                      </Field>
                      <Field label="Толщина стенки" unit="м"
                        error={errors.nkt_sections?.[i]?.thikness?.message}>
                        <NumberInput
                          {...register(`nkt_sections.${i}.thikness`, { valueAsNumber: true })}
                          step="0.0001"
                          error={errors.nkt_sections?.[i]?.thikness?.message}
                        />
                      </Field>
                      <Field label="Низ секции" unit="м"
                        error={errors.nkt_sections?.[i]?.bottom?.message}>
                        <NumberInput
                          {...register(`nkt_sections.${i}.bottom`, { valueAsNumber: true })}
                          error={errors.nkt_sections?.[i]?.bottom?.message}
                        />
                      </Field>
                    </div>
                  </div>
                )
              })}
            </div>

            <SectionRule>Эксплуатационная колонна (ЭК)</SectionRule>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <Field label="Диаметр ЭК" unit="м" error={errors.ek_d?.message}>
                <NumberInput {...register('ek_d', { valueAsNumber: true })} step="0.001" error={errors.ek_d?.message} />
              </Field>
              <Field label="Толщина стенки ЭК" unit="м" error={errors.ek_thikness?.message}>
                <NumberInput {...register('ek_thikness', { valueAsNumber: true })} step="0.0001" error={errors.ek_thikness?.message} />
              </Field>
            </div>

            <SectionRule>Гидравлический разрыв пласта (ГРП)</SectionRule>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-ink-900">Ранее проведён ГРП</div>
                  <div className="text-[11px] text-ink-500">Объём трещины будет добавлен к продавке</div>
                </div>
                <Toggle value={grpDone} onChange={v => {
                  setValue('grp_done', v ? 1 : 0, { shouldValidate: true })
                  if (!v) setValue('grp_mass', 0, { shouldValidate: true })
                }} />
              </div>
              {grpDone && (
                <Field label="Масса пропанта" unit="т" error={errors.grp_mass?.message}
                  help="Объём трещины = 1000 × 0.37 × масса / 1550 м³">
                  <NumberInput {...register('grp_mass', { valueAsNumber: true })}
                    step="0.1" placeholder="18" error={errors.grp_mass?.message} />
                </Field>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-ink-200/70 flex items-center justify-between">
              <div className="text-[11px] text-ink-500 mono">POST /calculate_vols · Volume Calc API</div>
              <Button type="submit" loading={isSubmitting} size="lg"
                icon={!isSubmitting ? <Calculator size={14}/> : undefined}>
                Рассчитать объёмы
              </Button>
            </div>
          </Card>
        </form>

        <div className="lg:col-span-5">
          {!result ? (
            <Card padded={false} className="h-full">
              <Empty icon={<Calculator size={20}/>} title="Результат появится здесь"
                body="Заполните параметры скважины и нажмите «Рассчитать объёмы»." />
            </Card>
          ) : (
            <Card title="Раскладка реагентов" badge={result.well_id}
              right={<Chip kind="ok" icon={<Check size={11}/>}>готово</Chip>}>
              <table className="dtable">
                <thead>
                  <tr><th>Реагент</th><th className="num">Объём</th><th className="num">Ед.</th></tr>
                </thead>
                <tbody>
                  {REAGENTS.map(r => (
                    <tr key={r.key}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span style={{ width:8, height:8, borderRadius:'50%', background:r.color, display:'inline-block', flexShrink:0 }}/>
                          {r.label}
                        </div>
                      </td>
                      <td className="num font-semibold tabnum">{fmt.num(result[r.key as keyof VolumesResponse] as number, 3)}</td>
                      <td className="num text-ink-400 mono">{r.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 pt-4 border-t border-ink-200/70 flex justify-end gap-2">
                <Button variant="secondary" size="sm" icon={<Download size={13}/>}
                  onClick={() => downloadCsv(`volumes-${result.well_id}.csv`, [
                    ['Реагент', 'Объём', 'Ед.'],
                    ...REAGENTS.map(r => [r.label, result[r.key as keyof VolumesResponse], r.unit])
                  ])}>
                  CSV
                </Button>
                <Button icon={<TrendingUp size={14}/>} onClick={sendToPredict}>
                  Использовать в прогнозе
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
