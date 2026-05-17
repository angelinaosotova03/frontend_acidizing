import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Database, RefreshCw, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { handleApiError } from '../utils/errors'
import { fmt } from '../utils/format'
import { predictApi } from '../api/predict'
import { useHandoff } from '../hooks/useHandoff'
import { Button, Card, Field, Input, NumberInput, SectionRule, Tabs, Toggle, KpiCard } from '../components/ui'
import { BaselineChart, ForecastChart, CumulativeChart } from '../components/charts'
import type { PredictFormValues, PredictResult } from '../types/predict'

const DEFAULTS: PredictFormValues = {
  q_liquid_history: [38.2,36.1,34.4,32.9,31.6,30.2,29.0,27.7,26.4,25.2,24.0,22.9],
  ks_vol: 6.5, flush_vol: 14.0, perf_sum: 12.5, nkt_vol: 10.3,
  to_lower_perf: 0, grp_done: false, grp_mass: 0, is_horizontal: false,
}

export function PredictPage() {
  const navigate = useNavigate()
  const { consume } = useHandoff()
  const [values, setValues] = useState<PredictFormValues>(DEFAULTS)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PredictResult | null>(null)
  const [view, setView] = useState<'charts' | 'json'>('charts')

  useEffect(() => {
    const payload = consume()
    if (payload) {
      setValues(s => ({ ...s, well_id: payload.well_id, ks_vol: payload.ks_vol, flush_vol: payload.flush_vol, perf_sum: payload.perf_sum, nkt_vol: payload.nkt_vol }))
      toast.success(`Параметры подставлены (${payload.well_id})`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setQ = (i: number, v: number) => {
    setValues(s => { const arr = [...s.q_liquid_history]; arr[i] = v; return { ...s, q_liquid_history: arr } })
  }
  const setField = <K extends keyof PredictFormValues>(k: K, v: PredictFormValues[K]) =>
    setValues(s => ({ ...s, [k]: v }))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (values.q_liquid_history.some(v => !(v >= 0))) errs.q_liquid_history = 'Все 12 значений должны быть ≥ 0'
    if (values.q_liquid_history.every(v => v === 0))   errs.q_liquid_history = 'Хотя бы одно значение > 0'
    if (values.grp_done && !(values.grp_mass > 0))     errs.grp_mass = 'При активном ГРП масса > 0'
    if (!values.grp_done && values.grp_mass > 0)       errs.grp_mass = 'При выключенном ГРП масса = 0'
    if (!(values.ks_vol > 0))    errs.ks_vol    = 'Должно быть > 0'
    if (!(values.perf_sum > 0))  errs.perf_sum  = 'Должно быть > 0'
    if (!(values.nkt_vol > 0))   errs.nkt_vol   = 'Должно быть > 0'
    return errs
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({}); setLoading(true)
    try {
      const r = await predictApi.predict(values)
      setResult(r)
      toast.success(`Прогноз готов — эффект +${fmt.num(r.effect, 2)} м³/сут`)
    } catch (err) { handleApiError(err) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[.1em] text-ink-500 font-semibold mb-1">Расчёты · /predict</div>
          <h1 className="text-[26px] font-semibold tracking-tight">Прогноз эффекта ОПЗ</h1>
          <p className="text-sm text-ink-500 mt-1 max-w-[64ch]">12 месяцев истории + параметры обработки → прогноз дебита и накопленный эффект.</p>
        </div>
        <div className="flex gap-2">
          <Tabs value="single" onChange={v => v === 'batch' && navigate('/predict/batch')} items={[
            { value:'single', label:'Одна скважина', icon:<TrendingUp size={12}/> },
            { value:'batch',  label:'Батч (CSV)',    icon:<Database size={12}/> },
          ]} />
          <Button variant="secondary" icon={<RefreshCw size={13}/>} onClick={() => { setValues(DEFAULTS); setErrors({}); setResult(null) }}>Сбросить</Button>
        </div>
      </header>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Card title="Идентификатор скважины" badge="для сохранения в БД">
          <Field label="ID скважины" help="Укажите — результат будет сохранён в историю">
            <Input
              value={values.well_id ?? ''}
              onChange={e => setField('well_id', e.target.value || undefined)}
              placeholder="Например: Самотлор-4127"
              className="input-text"
            />
          </Field>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Card className="lg:col-span-7" title="История дебита жидкости" badge="секция А · 12 месяцев"
            right={<span className="text-[11px] text-ink-500 mono">м³/сут</span>}>
            <div className="grid grid-cols-4 gap-2.5 items-start">
              {values.q_liquid_history.map((v, i) => (
                <Field key={i} label={<span className="mono text-[10px]">{i < 11 ? `M${i-11}` : 'Тек.'}</span> as unknown as string}>
                  <NumberInput value={v} onChange={e => setQ(i, +e.target.value)} />
                </Field>
              ))}
            </div>
            {errors.q_liquid_history && <div className="field-error mt-2">{errors.q_liquid_history}</div>}
            <div className="mt-4 pt-4 border-t border-ink-200/70 flex items-center justify-between">
              <div className="text-[11px] text-ink-500">
                Тренд: <span className="mono text-ink-700">
                  {(() => { const a = values.q_liquid_history[0], b = values.q_liquid_history[11]; const p = a > 0 ? ((b/a-1)*100) : 0; return (p>=0?'+':'')+p.toFixed(1)+'%' })()}
                </span>
              </div>
              <button type="button" className="link text-[12px]"
                onClick={() => setValues(s => ({ ...s, q_liquid_history: Array.from({length:12},(_,i) => Math.round(30*Math.pow(0.97,i)*10)/10) }))}>
                Заполнить кривой Арпс
              </button>
            </div>
          </Card>

          <Card className="lg:col-span-5" title="Параметры обработки" badge="секция Б">
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 items-start">
              <Field label="Объём КС" unit="м³" error={errors.ks_vol}><NumberInput value={values.ks_vol} onChange={e => setField('ks_vol', +e.target.value)} error={errors.ks_vol} /></Field>
              <Field label="Объём продавки" unit="м³"><NumberInput value={values.flush_vol} onChange={e => setField('flush_vol', +e.target.value)} /></Field>
              <Field label="Перф. толщина" unit="м" error={errors.perf_sum}><NumberInput value={values.perf_sum} onChange={e => setField('perf_sum', +e.target.value)} error={errors.perf_sum} /></Field>
              <Field label="Объём НКТ" unit="м³" error={errors.nkt_vol}><NumberInput value={values.nkt_vol} onChange={e => setField('nkt_vol', +e.target.value)} error={errors.nkt_vol} /></Field>
            </div>
            <div className="mt-4 pt-4 border-t border-ink-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <div><div className="text-[13px] font-medium text-ink-900">Закачка в нижние интервалы</div><div className="text-[11px] text-ink-500">to_lower_perf</div></div>
                <Toggle value={values.to_lower_perf > 0} onChange={v => setField('to_lower_perf', v ? 1 : 0)} />
              </div>
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

        <div className="flex items-center justify-between">
          <div className="text-[11px] text-ink-500 mono">POST /predict · OPZ Predict API</div>
          <Button type="submit" size="lg" loading={loading} icon={!loading ? <TrendingUp size={14}/> : undefined}>
            Запустить прогноз
          </Button>
        </div>
      </form>

      {result && <PredictResults result={result} history={values.q_liquid_history} view={view} setView={setView} />}
    </div>
  )
}

function PredictResults({ result, history, view, setView }: {
  result: PredictResult; history: number[]; view: string; setView: (v: 'charts'|'json') => void
}) {
  const { baseline_months: baseline, months_after: forecast } = result
  const peak = Math.max(...forecast.map((v, i) => v - (baseline[i] ?? 0)))
  const pct = baseline.reduce((a,b)=>a+b,0) > 0
    ? (forecast.reduce((a,b)=>a+b,0) / baseline.reduce((a,b)=>a+b,0) * 100 - 100)
    : 0

  return (
    <div className="space-y-5 page-enter">
      <SectionRule>Результаты прогноза</SectionRule>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Эффект в 1‑й месяц" value={result.effect} unit="м³/сут" color="#22C55E" decimals={2} delta />
        <KpiCard label="Пиковый эффект"     value={peak}          unit="м³/сут" color="#16A34A" decimals={2} delta />
        <KpiCard label="Накопленная доб."   value={result.cumulative} unit="м³"  color="#F97316" />
        <KpiCard label="Прирост за 12 мес"  value={pct}           unit="%"      color="#2563EB" decimals={1} delta />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Базовая Арпс-экстраполяция" badge="без ОПЗ"><BaselineChart baseline={baseline} history={history} /></Card>
        <Card title="Прогноз после ОПЗ" badge="vs базовый"><ForecastChart baseline={baseline} forecast={forecast} /></Card>
        <Card title="Накопленный эффект" badge="прирост по месяцам"><CumulativeChart baseline={baseline} forecast={forecast} /></Card>
      </div>

      <Card title="Помесячная таблица" badge="м³/сут"
        right={<Tabs value={view} onChange={v => setView(v as 'charts'|'json')} items={[{value:'charts',label:'Таблица'},{value:'json',label:'JSON'}]} />}>
        {view === 'charts' ? (
          <div className="overflow-x-auto">
            <table className="dtable">
              <thead>
                <tr><th>Метрика</th>{forecast.map((_,i) => <th key={i} className="num">M+{i+1}</th>)}<th className="num">Σ</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="dot red mr-2"/>Без ОПЗ (Арпс)</td>
                  {baseline.map((v,i) => <td key={i} className="num">{fmt.num(v,2)}</td>)}
                  <td className="num font-semibold">{fmt.num(baseline.reduce((a,b)=>a+b,0),2)}</td>
                </tr>
                <tr>
                  <td><span className="dot green mr-2"/>С ОПЗ</td>
                  {forecast.map((v,i) => <td key={i} className="num">{fmt.num(v,2)}</td>)}
                  <td className="num font-semibold">{fmt.num(forecast.reduce((a,b)=>a+b,0),2)}</td>
                </tr>
                <tr>
                  <td><span className="dot orange mr-2"/>Δ эффект</td>
                  {forecast.map((v,i) => { const d=v-(baseline[i]??0); return <td key={i} className={`num ${d>0?'text-green-700':''}`}>{fmt.delta(d,2)}</td> })}
                  <td className="num font-semibold text-green-700">{fmt.delta(forecast.reduce((a,b)=>a+b,0)-baseline.reduce((a,b)=>a+b,0),2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <pre className="codeblock">{JSON.stringify(result, null, 2)}</pre>
        )}
      </Card>
    </div>
  )
}
