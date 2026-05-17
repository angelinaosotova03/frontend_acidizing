/* eslint-disable */
/**
 * src/charts.jsx — Recharts wrappers, three views:
 *   1. BaselineChart   — base Arps decline (red)
 *   2. ForecastChart   — overlay baseline vs after-OPZ (red + green)
 *   3. CumulativeChart — cumulative effect by month (orange area+bar)
 *
 * Plus a small "SparkBar" used in the batch table.
 */

const {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} = Recharts;

const CHART = {
  arps:     '#EF4444',
  forecast: '#22C55E',
  cum:      '#F97316',
  axis:     '#94A3B8',
  grid:     '#E2E8F0',
};

const TICK = { fontSize: 11, fill: '#64748B', fontFamily: 'JetBrains Mono, monospace' };

// Tooltip — engineering style
const ChartTip = ({ active, payload, label, unit='м³/сут' }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background:'#fff', border:'1px solid #E2E8F0', borderRadius:6,
      padding:'8px 10px', fontSize:12, boxShadow:'0 8px 20px rgba(15,23,42,.10)'
    }}>
      <div style={{fontWeight:600, color:'#0F172A', marginBottom:4, fontSize:11, letterSpacing:'0.06em', textTransform:'uppercase'}}>
        Месяц {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{display:'flex', alignItems:'center', gap:8, padding:'2px 0'}}>
          <span style={{display:'inline-block', width:8, height:8, borderRadius:99, background:p.color}}/>
          <span style={{color:'#64748B', minWidth:90}}>{p.name}</span>
          <span style={{fontFamily:'JetBrains Mono, monospace', fontVariantNumeric:'tabular-nums', color:'#0F172A', fontWeight:600}}>
            {Number(p.value).toFixed(2)} <span style={{color:'#94A3B8', fontWeight:400}}>{unit}</span>
          </span>
        </div>
      ))}
    </div>
  );
};

function makeMonthSeries(arr, key) {
  return arr.map((v, i) => ({ month: i+1, [key]: v }));
}

function mergeSeries(...named) {
  // named: [{key, arr}, ...]
  const out = [];
  const n = Math.max(...named.map(s => s.arr.length));
  for (let i = 0; i < n; i++) {
    const row = { month: i + 1 };
    named.forEach(s => { row[s.key] = s.arr[i]; });
    out.push(row);
  }
  return out;
}

// ─── 1. BaselineChart ─────────────────────────────────────────────────
const BaselineChart = ({ baseline, history = [], height = 220 }) => {
  // show history (months -12..-1) + baseline (months 1..12)
  const histData  = (history || []).map((v, i) => ({ month: i - 11, history: v }));
  const baseData  = (baseline || []).map((v, i) => ({ month: i + 1, baseline: v }));
  const data = [...histData, ...baseData];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 14, left: -8, bottom: 4 }}>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" vertical={false}/>
        <XAxis dataKey="month" tick={TICK} stroke={CHART.axis} tickLine={false}
               label={{ value:'месяц', position:'insideBottomRight', fontSize:10, fill:'#94A3B8', dy: 10 }}/>
        <YAxis tick={TICK} stroke={CHART.axis} tickLine={false} axisLine={false} width={42}/>
        <Tooltip content={<ChartTip/>}/>
        <ReferenceLine x={0} stroke="#CBD5E1" strokeDasharray="3 3" label={{ value:'ОПЗ', position:'top', fontSize:10, fill:'#94A3B8' }}/>
        <Line type="monotone" dataKey="history"  name="История"  stroke="#64748B"
              strokeWidth={1.5} dot={{ r:2, fill:'#64748B' }} activeDot={{ r:4 }} isAnimationActive={false}/>
        <Line type="monotone" dataKey="baseline" name="Арпс-баз." stroke={CHART.arps}
              strokeWidth={2} dot={{ r:2.5, fill:CHART.arps }} activeDot={{ r:4 }}
              strokeDasharray="4 3" isAnimationActive={false}/>
      </LineChart>
    </ResponsiveContainer>
  );
};

// ─── 2. ForecastChart ─────────────────────────────────────────────────
const ForecastChart = ({ baseline, forecast, height = 260 }) => {
  const data = mergeSeries(
    { key: 'baseline', arr: baseline || [] },
    { key: 'forecast', arr: forecast || [] },
  );
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 14, right: 14, left: -8, bottom: 4 }}>
        <defs>
          <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={CHART.forecast} stopOpacity={0.22}/>
            <stop offset="100%" stopColor={CHART.forecast} stopOpacity={0.02}/>
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" vertical={false}/>
        <XAxis dataKey="month" tick={TICK} stroke={CHART.axis} tickLine={false}/>
        <YAxis tick={TICK} stroke={CHART.axis} tickLine={false} axisLine={false} width={42}/>
        <Tooltip content={<ChartTip/>}/>
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, paddingTop: 4 }}/>
        <Area type="monotone" dataKey="forecast" stroke="none" fill="url(#gradForecast)" name=""/>
        <Line type="monotone" dataKey="baseline"  name="Арпс (без ОПЗ)"  stroke={CHART.arps}
              strokeWidth={2} strokeDasharray="4 3"
              dot={{ r:2.5, fill: CHART.arps }} isAnimationActive={false}/>
        <Line type="monotone" dataKey="forecast"  name="Прогноз с ОПЗ"   stroke={CHART.forecast}
              strokeWidth={2.5}
              dot={{ r:3, fill: CHART.forecast }} isAnimationActive={false}/>
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// ─── 3. CumulativeChart ──────────────────────────────────────────────
const CumulativeChart = ({ baseline, forecast, height = 240 }) => {
  // monthly effect = forecast - baseline ; cumulative = running sum × ~30
  const data = [];
  let cum = 0;
  const DAYS = 30;
  for (let i = 0; i < (forecast||[]).length; i++) {
    const monthly = (forecast[i] - baseline[i]) * DAYS;
    cum += monthly;
    data.push({ month: i + 1, monthly: Math.round(monthly*10)/10, cumulative: Math.round(cum*10)/10 });
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 14, right: 14, left: -4, bottom: 4 }}>
        <defs>
          <linearGradient id="gradCum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={CHART.cum} stopOpacity={0.32}/>
            <stop offset="100%" stopColor={CHART.cum} stopOpacity={0.02}/>
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" vertical={false}/>
        <XAxis dataKey="month" tick={TICK} stroke={CHART.axis} tickLine={false}/>
        <YAxis tick={TICK} stroke={CHART.axis} tickLine={false} axisLine={false} width={48}/>
        <Tooltip content={<ChartTip unit="м³"/>}/>
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, paddingTop: 4 }}/>
        <Bar  dataKey="monthly"     name="За месяц"  fill={CHART.cum} fillOpacity={0.8} barSize={14} radius={[3,3,0,0]}/>
        <Area type="monotone" dataKey="cumulative" name="Накопленный" stroke={CHART.cum}
              strokeWidth={2} fill="url(#gradCum)" isAnimationActive={false}/>
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// ─── SparkBar — small inline bar of 12 months for batch table ──────────
const SparkBar = ({ values, color = '#22C55E', width = 80, height = 22 }) => {
  if (!values || !values.length) return <span className="text-ink-400 text-xs">—</span>;
  const max = Math.max(...values, 0.001);
  const barW = width / values.length - 1;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {values.map((v, i) => {
        const h = (v / max) * (height - 2);
        return <rect key={i} x={i*(barW+1)} y={height - h} width={barW} height={h} fill={color} rx={1}/>;
      })}
    </svg>
  );
};

// Export
Object.assign(window, { BaselineChart, ForecastChart, CumulativeChart, SparkBar, CHART });
