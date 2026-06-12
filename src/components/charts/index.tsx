import {
  ResponsiveContainer, LineChart, Line, Area,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'

export const C = { arps: '#EF4444', forecast: '#16A34A', liquid: '#1D4ED8', cum: '#F97316', axis: '#94A3B8', grid: '#E2E8F0' }
const TICK = { fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono, monospace' }
const DOT_R = 1.5

function monthLabel(label: number): string {
  if (label < 0) return `${Math.abs(label)} мес. до ОПЗ`
  if (label > 0) return `${label} мес. после ОПЗ`
  return 'Дата ОПЗ'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ChartTip({ active, payload, label, unit = 'м³/сут' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:6, padding:'8px 10px', fontSize:12, boxShadow:'0 8px 20px rgba(15,23,42,.10)' }}>
      <div style={{ fontWeight:600, color:'#0F172A', marginBottom:4, fontSize:11, letterSpacing:'0.06em', textTransform:'uppercase' }}>{monthLabel(Number(label))}</div>
      {payload.filter((p: any) => p.name).map((p: any, i: number) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'2px 0' }}>
          <span style={{ display:'inline-block', width:8, height:8, borderRadius:99, background:p.color }} />
          <span style={{ color:'#64748B', minWidth:90 }}>{p.name}</span>
          <span style={{ fontFamily:'JetBrains Mono,monospace', fontVariantNumeric:'tabular-nums', color:'#0F172A', fontWeight:600 }}>
            {Number(p.value).toFixed(2)} <span style={{ color:'#94A3B8', fontWeight:400 }}>{unit}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

interface EffectAreaChartProps {
  before?: number[] | null
  after: number[]
  baseline: number[]
  effectDurationMonths?: number | null
  color?: string
  beforeLabel?: string
  afterLabel?: string
  baselineLabel?: string
  unit?: string
  height?: number
}

export function EffectAreaChart({
  before, after, baseline, effectDurationMonths,
  color = C.forecast, beforeLabel = 'Дебит до ОПЗ (факт)', afterLabel = 'Прогноз после ОПЗ', baselineLabel = 'Базис без ОПЗ (Арпс)',
  unit = 'м³/сут', height = 260,
}: EffectAreaChartProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = []
  if (before?.length) {
    before.forEach((v, i) => data.push({ month: i - before.length, before: v }))
  }
  baseline.forEach((b, i) => {
    const a = after[i] ?? 0
    data.push({ month: i + 1, baseline: b, after: a, effect: Math.max(a - b, 0) })
  })
  const showOpzLine = !!before?.length
  const showRefLine = effectDurationMonths != null && effectDurationMonths > 0 && effectDurationMonths < 12
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top:14, right:14, left:-8, bottom:4 }}>
        <defs>
          <linearGradient id="gradEffect" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.16} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.grid} strokeDasharray="2 3" />
        <XAxis dataKey="month" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false} tick={TICK} stroke={C.axis} tickLine={false} />
        <YAxis tick={TICK} stroke={C.axis} tickLine={false} axisLine={false} width={42} />
        <Tooltip content={(p: unknown) => <ChartTip {...(p as object)} unit={unit} />} />
        <Legend iconType="plainline" wrapperStyle={{ fontSize:11, paddingTop:4 }} />
        <Area dataKey="baseline" stackId="effect" stroke="none" fill="transparent" name="" isAnimationActive={false} />
        <Area dataKey="effect" stackId="effect" stroke="none" fill="url(#gradEffect)" name="Эффект ОПЗ" isAnimationActive={false} />
        {before?.length && (
          <Line type="monotone" dataKey="before" name={beforeLabel} stroke="#64748B" strokeWidth={1.25} dot={{ r:DOT_R, strokeWidth:0, fill:'#64748B' }} isAnimationActive={false} connectNulls={false} />
        )}
        <Line type="monotone" dataKey="baseline" name={baselineLabel} stroke={C.arps} strokeWidth={1.25} strokeDasharray="4 3" dot={{ r:DOT_R, strokeWidth:0, fill:C.arps }} isAnimationActive={false} connectNulls={false} />
        <Line type="monotone" dataKey="after" name={afterLabel} stroke={color} strokeWidth={1.5} dot={{ r:DOT_R, strokeWidth:0, fill:color }} isAnimationActive={false} connectNulls={false} />
        {showOpzLine && (
          <ReferenceLine x={0} stroke="#0F172A" strokeWidth={1} strokeOpacity={0.35} strokeDasharray="5 4"
            label={{ value: 'Дата ОПЗ', position: 'top', fontSize: 10, fill: '#0F172A' }} />
        )}
        {showRefLine && (
          <ReferenceLine x={effectDurationMonths} stroke="#94A3B8" strokeWidth={1} strokeDasharray="3 3"
            label={{ value: 'конец эффекта', position: 'insideTopRight', fontSize: 10, fill: '#94A3B8' }} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function InputHistoryChart({ values, label = 'Дебит жидкости до ОПЗ', height = 140 }: { values: number[]; label?: string; height?: number }) {
  const data = values.map((v, i) => ({ month: i - values.length + 1, value: v }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top:8, right:14, left:-8, bottom:4 }}>
        <CartesianGrid stroke={C.grid} strokeDasharray="2 3" />
        <XAxis dataKey="month" tick={TICK} stroke={C.axis} tickLine={false} />
        <YAxis tick={TICK} stroke={C.axis} tickLine={false} axisLine={false} width={42} />
        <Tooltip content={(p: unknown) => <ChartTip {...(p as object)} />} />
        <Line type="monotone" dataKey="value" name={label} stroke={C.liquid} strokeWidth={1.25} dot={{ r:DOT_R, strokeWidth:0, fill:C.liquid }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface OilVsLiquidChartProps {
  oilBefore?: number[] | null
  oilAfter: number[]
  oilBaseline: number[]
  liquidBefore?: number[] | null
  liquidAfter: number[]
  liquidBaseline: number[]
  height?: number
}

export function OilVsLiquidChart({ oilBefore, oilAfter, oilBaseline, liquidBefore, liquidAfter, liquidBaseline, height = 280 }: OilVsLiquidChartProps) {
  const beforeLen = Math.max(oilBefore?.length ?? 0, liquidBefore?.length ?? 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = []
  for (let i = 0; i < beforeLen; i++) {
    data.push({ month: i - beforeLen, oilBefore: oilBefore?.[i], liquidBefore: liquidBefore?.[i] })
  }
  oilAfter.forEach((_, i) => {
    data.push({ month: i + 1, oilAfter: oilAfter[i], oilBaseline: oilBaseline[i], liquidAfter: liquidAfter[i], liquidBaseline: liquidBaseline[i] })
  })
  const showOpzLine = beforeLen > 0
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top:14, right:14, left:-8, bottom:4 }}>
        <CartesianGrid stroke={C.grid} strokeDasharray="2 3" />
        <XAxis dataKey="month" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false} tick={TICK} stroke={C.axis} tickLine={false} />
        <YAxis tick={TICK} stroke={C.axis} tickLine={false} axisLine={false} width={42} />
        <Tooltip content={(p: unknown) => <ChartTip {...(p as object)} />} />
        <Legend iconType="plainline" wrapperStyle={{ fontSize:11, paddingTop:4 }} />
        {oilBefore?.length && (
          <Line type="monotone" dataKey="oilBefore" name="Нефть · до ОПЗ" stroke="#64748B" strokeWidth={1} dot={false} isAnimationActive={false} connectNulls={false} />
        )}
        <Line type="monotone" dataKey="oilBaseline"    name="Нефть · базис"    stroke={C.arps}     strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls={false} />
        <Line type="monotone" dataKey="oilAfter"       name="Нефть · после ОПЗ" stroke={C.forecast} strokeWidth={1.5} dot={{ r:DOT_R, strokeWidth:0, fill:C.forecast }} isAnimationActive={false} connectNulls={false} />
        {liquidBefore?.length && (
          <Line type="monotone" dataKey="liquidBefore" name="Жидкость · до ОПЗ" stroke="#94A3B8" strokeWidth={1} dot={false} isAnimationActive={false} connectNulls={false} />
        )}
        <Line type="monotone" dataKey="liquidBaseline" name="Жидкость · базис"    stroke="#93C5FD"   strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls={false} />
        <Line type="monotone" dataKey="liquidAfter"    name="Жидкость · после ОПЗ" stroke={C.liquid} strokeWidth={1.5} dot={{ r:DOT_R, strokeWidth:0, fill:C.liquid }} isAnimationActive={false} connectNulls={false} />
        {showOpzLine && (
          <ReferenceLine x={0} stroke="#0F172A" strokeWidth={1} strokeOpacity={0.35} strokeDasharray="5 4"
            label={{ value: 'Дата ОПЗ', position: 'top', fontSize: 10, fill: '#0F172A' }} />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
