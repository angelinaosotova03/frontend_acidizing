import { useEffect, useState } from 'react'
import { TrendingUp, RefreshCw, History as HistoryIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { handleApiError } from '../utils/errors'
import { predictApi, toExtendedWellInput, toLiquidCurveInput } from '../api/predict'
import { useHandoff } from '../hooks/useHandoff'
import { Button, Card, Field, Input, NumberInput, SectionRule, Toggle, Chip } from '../components/ui'
import { InputHistoryChart } from '../components/charts'
import { PredictResultPanel } from '../components/predict/ResultPanel'
import type { HealthResponse, PredictFormValues, PredictRecordFields } from '../types/predict'

const DEFAULTS: PredictFormValues = {
  well_id: '',
  monthsBefore: Array.from({ length: 12 }, (_, i) => Math.round(4.2 * Math.pow(0.965, i) * 100) / 100),
  ks_vol: 24.0,
  flush_vol: 32.0,
  perf_sum: 7.05,
  nkt_vol: 8.03,
  vol_ek: 0,
  grp_done: false,
  grp_mass: 0,
  is_horizontal: false,
  reservoir_pressure: 100.0,
  pzab_before: 35.0,
  kpr_before: 0.2308,
  liquidHistoryEnabled: false,
  monthsBeforeLiquid: Array.from({ length: 12 }, (_, i) => Math.round(5.4 * Math.pow(0.965, i) * 100) / 100),
}

export function PredictPage() {
  const navigate = useNavigate()
  const { consume } = useHandoff()
  const [values, setValues] = useState<PredictFormValues>(DEFAULTS)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PredictRecordFields | null>(null)
  const [health, setHealth] = useState<HealthResponse | null>(null)

  useEffect(() => {
    const payload = consume()
    if (payload) {
      setValues(s => ({ ...s, well_id: payload.well_id, ks_vol: payload.ks_vol, flush_vol: payload.flush_vol, perf_sum: payload.perf_sum, nkt_vol: payload.nkt_vol }))
      toast.success(`Параметры подставлены (${payload.well_id})`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    predictApi.health().then(setHealth).catch(() => setHealth(null))
  }, [])

  const setField = <K extends keyof PredictFormValues>(k: K, v: PredictFormValues[K]) =>
    setValues(s => ({ ...s, [k]: v }))

  const setMonth = (i: number, v: number) =>
    setValues(s => { const arr = [...s.monthsBefore]; arr[i] = v; return { ...s, monthsBefore: arr } })

  const setMonthLiquid = (i: number, v: number) =>
    setValues(s => { const arr = [...s.monthsBeforeLiquid]; arr[i] = v; return { ...s, monthsBeforeLiquid: arr } })

  const fillExponential = (key: 'monthsBefore' | 'monthsBeforeLiquid') =>
    setValues(s => {
      const start = s[key][0] || (key === 'monthsBefore' ? 4.2 : 5.4)
      // заметный экспоненциальный спад (~70% за 12 мес.), а не почти-линейный
      const arr = Array.from({ length: 12 }, (_, i) => Math.round(start * Math.pow(0.9, i) * 100) / 100)
      return { ...s, [key]: arr }
    })

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (values.monthsBefore.some(v => !(v >= 0))) errs.monthsBefore = 'Все 12 значений должны быть ≥ 0'
    if (!(values.ks_vol > 0)) errs.ks_vol = 'Должно быть > 0'
    if (values.flush_vol < 0) errs.flush_vol = 'Должно быть ≥ 0'
    if (!(values.perf_sum > 0)) errs.perf_sum = 'Должно быть > 0'
    if (!(values.nkt_vol > 0)) errs.nkt_vol = 'Должно быть > 0'
    if (values.vol_ek < 0) errs.vol_ek = 'Должно быть ≥ 0'
    if (!(values.reservoir_pressure > 0)) errs.reservoir_pressure = 'Должно быть > 0'
    if (!(values.pzab_before > 0)) errs.pzab_before = 'Должно быть > 0'
    if (!(values.kpr_before > 0)) errs.kpr_before = 'Должно быть > 0'
    if (values.grp_done && !(values.grp_mass > 0)) errs.grp_mass = 'При активном ГРП масса должна быть > 0'
    if (!values.grp_done && values.grp_mass > 0) errs.grp_mass = 'При выключенном ГРП масса должна быть 0'
    if (values.liquidHistoryEnabled && values.monthsBeforeLiquid.some(v => !(v >= 0))) errs.monthsBeforeLiquid = 'Все 12 значений должны быть ≥ 0'
    return errs
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); toast.error('Проверьте поля формы'); return }
    setErrors({}); setLoading(true)

    const extended = toExtendedWellInput(values)
    const [kprR, pzabR, liquidR, oilR, liquidCurveR] = await Promise.allSettled([
      predictApi.kpr(extended),
      predictApi.pzab(extended),
      predictApi.liquid(extended),
      predictApi.oil(extended),
      values.liquidHistoryEnabled ? predictApi.liquidCurve(toLiquidCurveInput(values)) : Promise.resolve(null),
    ])

    const reported = new Set<string>()
    const reportFailure = (r: PromiseSettledResult<unknown>, label: string) => {
      if (r.status !== 'rejected') return
      const err = r.reason
      if (err instanceof AxiosError && err.response?.status === 503) {
        const key = `503:${label}`
        if (!reported.has(key)) { reported.add(key); toast.error(`${label}: модель временно недоступна`) }
        return
      }
      const status = err instanceof AxiosError ? err.response?.status : 'err'
      const key = `${status}`
      if (!reported.has(key)) { reported.add(key); handleApiError(err) }
    }
    reportFailure(kprR, 'Кпр')
    reportFailure(pzabR, 'Рзаб')
    reportFailure(liquidR, 'Дебит жидкости')
    reportFailure(oilR, 'Прогноз нефти')
    if (values.liquidHistoryEnabled) reportFailure(liquidCurveR, 'Кривая жидкости')

    const liquidCurve = liquidCurveR.status === 'fulfilled' ? liquidCurveR.value : null

    const record: PredictRecordFields = {
      kpr_before: extended.kpr_before,
      pzab_before: extended.pzab_before,
      month_1_before: extended.month_1_before,
      month_1_before_liquid: values.liquidHistoryEnabled ? values.monthsBeforeLiquid[0] : null,

      kpr_after: kprR.status === 'fulfilled' ? kprR.value.kpr_after : null,
      pzab_after: pzabR.status === 'fulfilled' ? pzabR.value.pzab_after : null,
      debit_liquid_after: liquidR.status === 'fulfilled' ? liquidR.value.debit_liquid_after : null,

      oil_months_after: oilR.status === 'fulfilled' ? oilR.value.months_after : null,
      oil_months_baseline: oilR.status === 'fulfilled' ? oilR.value.months_baseline : null,
      oil_effect: oilR.status === 'fulfilled' ? oilR.value.effect : null,
      oil_cumulative: oilR.status === 'fulfilled' ? oilR.value.cumulative : null,
      oil_effect_duration_months: oilR.status === 'fulfilled' ? oilR.value.effect_duration_months : null,

      liquid_months_after: liquidCurve?.months_after ?? null,
      liquid_months_baseline: liquidCurve?.months_baseline ?? null,
      liquid_effect: liquidCurve?.effect ?? null,
      liquid_cumulative: liquidCurve?.cumulative ?? null,
      liquid_effect_duration_months: liquidCurve?.effect_duration_months ?? null,
      liquid_anchored: liquidCurve?.anchored ?? null,
    }

    setResult(record)
    if (kprR.status === 'fulfilled' || pzabR.status === 'fulfilled' || liquidR.status === 'fulfilled' || oilR.status === 'fulfilled' || liquidCurve)
      toast.success('Расчёт завершён')
    setLoading(false)
  }

  const modelWarnings = health ? [
    !health.kpr_model_loaded && 'Кпр',
    !health.pzab_model_loaded && 'Рзаб',
    !health.oil_model_loaded && 'дебит нефти',
    !health.liquid_curve_model_loaded && 'кривая жидкости',
  ].filter((v): v is string => !!v) : []

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[.1em] text-ink-500 font-semibold mb-1">Расчёты</div>
          <h1 className="text-[26px] font-semibold tracking-tight">Прогноз эффекта ОПЗ</h1>
          <p className="text-sm text-ink-500 mt-1 max-w-[64ch]">Расчёт прогноза эффекта кислотной обработки на 12 месяцев.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<HistoryIcon size={13} />} onClick={() => navigate('/predict/history')}>История</Button>
          <Button variant="secondary" icon={<RefreshCw size={13} />} onClick={() => { setValues(DEFAULTS); setErrors({}); setResult(null) }}>Сбросить</Button>
        </div>
      </header>

      {modelWarnings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {modelWarnings.map(w => <Chip key={w} kind="warn">{w}: модель временно недоступна</Chip>)}
          {health && !health.db_ready && <Chip kind="warn">история временно недоступна</Chip>}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Card title="Идентификатор скважины" badge="для истории">
          <Field label="ID скважины" help="Укажите — результаты расчёта будут сохранены в историю">
            <Input
              value={values.well_id}
              onChange={e => setField('well_id', e.target.value)}
              placeholder="Например: WELL-001"
              className="input-text"
            />
          </Field>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Card className="lg:col-span-7" title="Дебит нефти до ОПЗ" badge="12 месяцев"
            right={
              <div className="flex items-center gap-3">
                <button type="button" className="link text-[11px]" onClick={() => fillExponential('monthsBefore')}>Заполнить экспонентой</button>
                <span className="text-[11px] text-ink-500 mono">м³/сут</span>
              </div>
            }>
            <div className="grid grid-cols-4 gap-2.5 items-start">
              {values.monthsBefore.map((v, i) => (
                <Field key={i} label={`M${i - 11}`}>
                  <NumberInput value={v} onChange={e => setMonth(i, +e.target.value)} />
                </Field>
              ))}
            </div>
            {errors.monthsBefore && <div className="field-error mt-2">{errors.monthsBefore}</div>}
            <div className="pt-3 mt-3 border-t border-ink-200/70">
              <InputHistoryChart values={values.monthsBefore} label="Дебит нефти до ОПЗ" />
            </div>
          </Card>

          <Card className="lg:col-span-5" title="Параметры скважины и обработки">
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 items-start">
              <Field label="Объём КС" unit="м³" error={errors.ks_vol}><NumberInput value={values.ks_vol} onChange={e => setField('ks_vol', +e.target.value)} error={errors.ks_vol} /></Field>
              <Field label="Объём продавки" unit="м³" error={errors.flush_vol}><NumberInput value={values.flush_vol} onChange={e => setField('flush_vol', +e.target.value)} error={errors.flush_vol} /></Field>
              <Field label="Перф. толщина" unit="м" error={errors.perf_sum}><NumberInput value={values.perf_sum} onChange={e => setField('perf_sum', +e.target.value)} error={errors.perf_sum} /></Field>
              <Field label="Объём НКТ" unit="м³" error={errors.nkt_vol}><NumberInput value={values.nkt_vol} onChange={e => setField('nkt_vol', +e.target.value)} error={errors.nkt_vol} /></Field>
              <Field label="Объем ЭК" unit="м³" error={errors.vol_ek}><NumberInput value={values.vol_ek} onChange={e => setField('vol_ek', +e.target.value)} error={errors.vol_ek} /></Field>
              <Field label="Пластовое давление" unit="атм" error={errors.reservoir_pressure}><NumberInput value={values.reservoir_pressure} onChange={e => setField('reservoir_pressure', +e.target.value)} error={errors.reservoir_pressure} /></Field>
              <Field label="Рзаб до ОПЗ" unit="атм" error={errors.pzab_before}><NumberInput value={values.pzab_before} onChange={e => setField('pzab_before', +e.target.value)} error={errors.pzab_before} /></Field>
              <Field label="Кпр до ОПЗ" unit="м³/сут/атм" error={errors.kpr_before}><NumberInput value={values.kpr_before} onChange={e => setField('kpr_before', +e.target.value)} error={errors.kpr_before} /></Field>
            </div>
            <div className="mt-4 pt-4 border-t border-ink-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <div><div className="text-[13px] font-medium text-ink-900">Горизонтальная скважина</div><div className="text-[11px] text-ink-500">is_horizontal</div></div>
                <Toggle value={values.is_horizontal} onChange={v => setField('is_horizontal', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div><div className="text-[13px] font-medium text-ink-900">Ранее проведён ГРП</div><div className="text-[11px] text-ink-500">grp_done</div></div>
                <Toggle value={values.grp_done} onChange={v => { setField('grp_done', v); if (!v) setField('grp_mass', 0) }} />
              </div>
              {values.grp_done && (
                <Field label="Масса проппанта (ГРП)" unit="т" error={errors.grp_mass}>
                  <NumberInput value={values.grp_mass} onChange={e => setField('grp_mass', +e.target.value)} error={errors.grp_mass} />
                </Field>
              )}
            </div>
          </Card>
        </div>

        <Card title="Дебит жидкости до ОПЗ" badge="опционально"
          right={<Toggle value={values.liquidHistoryEnabled} onChange={v => setField('liquidHistoryEnabled', v)} label="заполнить" />}>
          {values.liquidHistoryEnabled ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button type="button" className="link text-[11px]" onClick={() => fillExponential('monthsBeforeLiquid')}>Заполнить экспонентой</button>
              </div>
              <div className="grid grid-cols-4 gap-2.5 items-start">
                {values.monthsBeforeLiquid.map((v, i) => (
                  <Field key={i} label={`M${i - 11}`}>
                    <NumberInput value={v} onChange={e => setMonthLiquid(i, +e.target.value)} />
                  </Field>
                ))}
              </div>
              {errors.monthsBeforeLiquid && <div className="field-error">{errors.monthsBeforeLiquid}</div>}
              <div className="pt-2 border-t border-ink-200/70">
                <InputHistoryChart values={values.monthsBeforeLiquid} />
              </div>
            </div>
          ) : (
            <div className="text-[12px] text-ink-500">
              Если заполнить помесячный дебит жидкости до ОПЗ, дополнительно будет рассчитан прогноз кривой дебита жидкости.
            </div>
          )}
        </Card>

        <div className="flex items-center justify-end">
          <Button type="submit" size="lg" loading={loading} icon={!loading ? <TrendingUp size={14} /> : undefined}>
            Рассчитать
          </Button>
        </div>
      </form>

      {result && (
        <div className="space-y-5 page-enter">
          <SectionRule>Результаты расчёта</SectionRule>
          <PredictResultPanel
            record={result}
            oilMonthsBefore={values.monthsBefore}
            liquidMonthsBefore={values.liquidHistoryEnabled ? values.monthsBeforeLiquid : undefined}
          />
        </div>
      )}
    </div>
  )
}
