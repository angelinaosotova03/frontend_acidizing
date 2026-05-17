import {
  ResponsiveContainer, LineChart, Line, Area,
  Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

const C = { arps: '#EF4444', forecast: '#22C55E', cum: '#F97316', axis: '#94A3B8', grid: '#E2E8F0' }
const TICK = { fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono, monospace' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTip({ active, payload, label, unit = 'м³/сут' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:6, padding:'8px 10px', fontSize:12, boxShadow:'0 8px 20px rgba(15,23,42,.10)' }}>
      <div style={{ fontWeight:600, color:'#0F172A', marginBottom:4, fontSize:11, letterSpacing:'0.06em', textTransform:'uppercase' }}>Месяц {label}</div>
      {payload.map((p: any, i: number) => (
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

export function BaselineChart({ baseline, history = [], height = 220 }: { baseline: number[]; history?: number[]; height?: number }) {
  const histData = history.map((v, i) => ({ month: i - 11, history: v }))
  const baseData = baseline.map((v, i) => ({ month: i + 1, baseline: v }))
  const data = [...histData, ...baseData]
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top:8, right:14, left:-8, bottom:4 }}>
        <CartesianGrid stroke={C.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="month" tick={TICK} stroke={C.axis} tickLine={false} />
        <YAxis tick={TICK} stroke={C.axis} tickLine={false} axisLine={false} width={42} />
        <Tooltip content={(p: unknown) => <ChartTip {...(p as object)} />} />
        <Line type="monotone" dataKey="history"  name="История"   stroke="#64748B" strokeWidth={1.5} dot={{ r:2, fill:'#64748B' }} isAnimationActive={false} />
        <Line type="monotone" dataKey="baseline" name="Арпс-баз." stroke={C.arps}  strokeWidth={2}   dot={{ r:2.5, fill:C.arps }} strokeDasharray="4 3" isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ForecastChart({ baseline, forecast, height = 260 }: { baseline: number[]; forecast: number[]; height?: number }) {
  const data = baseline.map((b, i) => ({ month: i + 1, baseline: b, forecast: forecast[i] }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top:14, right:14, left:-8, bottom:4 }}>
        <defs>
          <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={C.forecast} stopOpacity={0.22} />
            <stop offset="100%" stopColor={C.forecast} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="month" tick={TICK} stroke={C.axis} tickLine={false} />
        <YAxis tick={TICK} stroke={C.axis} tickLine={false} axisLine={false} width={42} />
        <Tooltip content={(p: unknown) => <ChartTip {...(p as object)} />} />
        <Legend iconType="plainline" wrapperStyle={{ fontSize:11, paddingTop:4 }} />
        <Area type="monotone" dataKey="forecast" stroke="none" fill="url(#gradForecast)" name="" />
        <Line type="monotone" dataKey="baseline" name="Арпс (без ОПЗ)" stroke={C.arps}     strokeWidth={2}   strokeDasharray="4 3" dot={{ r:2.5, fill:C.arps }}     isAnimationActive={false} />
        <Line type="monotone" dataKey="forecast" name="Прогноз с ОПЗ"  stroke={C.forecast} strokeWidth={2.5} dot={{ r:3, fill:C.forecast }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function CumulativeChart({ baseline, forecast, height = 240 }: { baseline: number[]; forecast: number[]; height?: number }) {
  let cum = 0
  const data = forecast.map((f, i) => {
    const monthly = (f - (baseline[i] ?? 0)) * 30
    cum += monthly
    return { month: i + 1, monthly: Math.round(monthly * 10) / 10, cumulative: Math.round(cum * 10) / 10 }
  })
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top:14, right:14, left:-4, bottom:4 }}>
        <defs>
          <linearGradient id="gradCum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={C.cum} stopOpacity={0.32} />
            <stop offset="100%" stopColor={C.cum} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="month" tick={TICK} stroke={C.axis} tickLine={false} />
        <YAxis tick={TICK} stroke={C.axis} tickLine={false} axisLine={false} width={48} />
        <Tooltip content={(p: unknown) => <ChartTip {...(p as object)} unit="м³" />} />
        <Legend iconType="plainline" wrapperStyle={{ fontSize:11, paddingTop:4 }} />
        <Bar  dataKey="monthly"    name="За месяц"    fill={C.cum} fillOpacity={0.8} barSize={14} radius={[3,3,0,0]} />
        <Area type="monotone" dataKey="cumulative" name="Накопленный" stroke={C.cum} strokeWidth={2} fill="url(#gradCum)" isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
