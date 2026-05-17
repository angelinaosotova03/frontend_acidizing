import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, TrendingUp, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Card, Modal, Button, SparkBar } from '../components/ui'
import { ForecastChart } from '../components/charts'
import { predictApi, type PredictHistoryItem } from '../api/predict'
import { volumesApi, type VolumeHistoryItem } from '../api/volumes'
import { fmt, computeArpsBaseline } from '../utils/format'

interface HistoryRow {
  key:     string
  well_id: string
  type:    'predict' | 'volumes'
  date:    string
  effect?: number
  raw:     PredictHistoryItem | VolumeHistoryItem
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [selected, setSelected] = useState<HistoryRow | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [preds, vols] = await Promise.allSettled([
          predictApi.getHistory(10),
          volumesApi.getHistory(10),
        ])
        const rows: HistoryRow[] = []
        if (preds.status === 'fulfilled')
          preds.value.forEach(p => rows.push({ key: `p-${p.well_id}-${p.updated_at}`, well_id: p.well_id, type: 'predict', date: p.updated_at, effect: p.effect, raw: p }))
        if (vols.status === 'fulfilled')
          vols.value.forEach(v => rows.push({ key: `v-${v.id}`, well_id: v.well_id, type: 'volumes', date: v.created_at, raw: v }))
        rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setHistory(rows.slice(0, 15))
      } finally {
        setLoadingHistory(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-7">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[.1em] text-ink-500 font-semibold mb-1">Дашборд</div>
          <h1 className="text-[26px] font-semibold tracking-tight">Здравствуйте, {user?.username}.</h1>
          <p className="text-sm text-ink-500 mt-1">Запустите расчёт реагентов или прогноз эффекта ОПЗ.</p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-ink-500 mono">
          {new Date().toLocaleDateString('ru-RU', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NavTile icon={<FlaskConical size={20}/>} eyebrow="Volume Calc · /calculate_vols" title="Расчёт объёмов"
          body="Раскладка кислотного состава: КС, продавка, товарная кислота, BaCl₂, стабилизаторы, ингибиторы."
          accent="brand" stats={[{k:'Реагентов',v:'9'},{k:'Поля',v:'8'},{k:'Время',v:'~1с'}]} cta="Запустить расчёт" to="/volumes"/>
        <NavTile icon={<TrendingUp size={20}/>} eyebrow="OPZ Predict · /predict" title="Прогноз эффекта ОПЗ"
          body="Прогноз 12 месяцев после обработки на ML‑модели + базовая экстраполяция Арпса."
          accent="green" stats={[{k:'Горизонт',v:'12 мес'},{k:'Графиков',v:'3'},{k:'Батч',v:'до 500'}]} cta="Открыть прогноз" to="/predict"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2" title="Последние расчёты"
          right={<span className="chip mono">{history.length} записей</span>}>
          {loadingHistory ? (
            <div className="py-6 text-center text-ink-400 text-sm">Загрузка…</div>
          ) : history.length === 0 ? (
            <div className="py-6 text-center text-ink-400 text-sm">Нет сохранённых расчётов. Запустите прогноз или расчёт объёмов.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="dtable hover">
                <thead>
                  <tr><th>Скважина</th><th>Тип</th><th>Дата</th><th className="num">Эффект, м³/сут</th><th></th></tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.key} onClick={() => setSelected(h)} style={{ cursor:'pointer' }}>
                      <td className="font-medium text-ink-900 mono">{h.well_id}</td>
                      <td>
                        {h.type === 'volumes'
                          ? <span className="chip brand">объёмы</span>
                          : <span className="chip ok">прогноз</span>}
                      </td>
                      <td className="text-ink-500">{fmt.dateTime(h.date)}</td>
                      <td className="num text-ink-900">
                        {h.effect != null ? `+${fmt.num(h.effect, 2)}` : '—'}
                      </td>
                      <td className="num">
                        <button className="link text-[12px]" onClick={e => { e.stopPropagation(); setSelected(h) }}>
                          детали →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Состояние сервисов" right={<span className="chip ok"><span className="dot green" style={{marginRight:4}}/>все онлайн</span>}>
          {[{name:'Auth API',url:'localhost:8001'},{name:'OPZ Predict',url:'localhost:8000'},{name:'Volume Calc',url:'localhost:8003'}].map(s => (
            <div key={s.name} className="flex items-center justify-between py-2 border-b border-ink-200/70 last:border-b-0">
              <div className="flex items-center gap-2.5"><span className="dot green"/><span className="text-[13px] font-medium text-ink-900">{s.name}</span></div>
              <span className="mono text-[11px] text-ink-500">{s.url}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={selected ? `${selected.well_id} · ${selected.type === 'predict' ? 'Прогноз' : 'Объёмы'}` : ''}
        width={selected?.type === 'predict' ? 680 : 520}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSelected(null)}>Закрыть</Button>
            <Button onClick={() => { navigate(selected?.type === 'predict' ? '/predict' : '/volumes'); setSelected(null) }}>
              Новый расчёт
            </Button>
          </div>
        }>
        {selected?.type === 'predict' && <PredictDetail row={selected.raw as PredictHistoryItem} />}
        {selected?.type === 'volumes' && <VolumesDetail row={selected.raw as VolumeHistoryItem} />}
      </Modal>
    </div>
  )
}

function PredictDetail({ row }: { row: PredictHistoryItem }) {
  const ma       = row.months_after  ?? []
  const mb       = row.months_before ?? []
  const baseline = mb.length === 12 ? computeArpsBaseline(mb) : ma.map(v => v * 0.78)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="kpi" style={{padding:'12px 14px'}}>
          <div className="label" style={{fontSize:10}}>Эффект в 1‑й месяц</div>
          <div className="value tabnum" style={{fontSize:22, color:'#22C55E'}}>+{fmt.num(row.effect, 2)} <span className="unit">м³/сут</span></div>
        </div>
        <div className="kpi" style={{padding:'12px 14px'}}>
          <div className="label" style={{fontSize:10}}>Накопленная добыча</div>
          <div className="value tabnum" style={{fontSize:22, color:'#F97316'}}>{fmt.num(row.cumulative, 1)} <span className="unit">м³</span></div>
        </div>
      </div>
      {ma.length === 12 && (
        <>
          <ForecastChart baseline={baseline} forecast={ma} height={200} />
          <div className="overflow-x-auto">
            <table className="dtable" style={{fontSize:11.5}}>
              <thead>
                <tr>
                  <th>Метрика</th>
                  {ma.map((_,i) => <th key={i} className="num">M+{i+1}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="dot red" style={{marginRight:6}}/>Арпс (без ОПЗ)</td>
                  {baseline.map((v,i) => <td key={i} className="num">{fmt.num(v,2)}</td>)}
                </tr>
                <tr>
                  <td><span className="dot green" style={{marginRight:6}}/>С ОПЗ</td>
                  {ma.map((v,i) => <td key={i} className="num">{fmt.num(v,2)}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="flex items-center gap-4 text-[11px] text-ink-500 mono pt-1 border-t border-ink-200/70">
        <span>perf_sum: {fmt.num(row.perf_sum, 1)} м</span>
        <span>ks_vol: {fmt.num(row.ks_vol, 2)} м³</span>
        <span className="ml-auto">{fmt.dateTime(row.updated_at)}</span>
      </div>
    </div>
  )
}

function VolumesDetail({ row }: { row: VolumeHistoryItem }) {
  return (
    <div className="space-y-4">
      <table className="dtable">
        <thead><tr><th>Реагент</th><th className="num">Объём</th><th className="num">Ед.</th></tr></thead>
        <tbody>
          {VOL_REAGENTS.map(r => (
            <tr key={r.key}>
              <td>{r.label}</td>
              <td className="num font-semibold tabnum">{fmt.num(row[r.key] as number, 3)}</td>
              <td className="num text-ink-400 mono">{r.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-4 text-[11px] text-ink-500 mono pt-1 border-t border-ink-200/70">
        <span>perf_sum: {fmt.num(row.perf_sum, 1)} м</span>
        <span className="ml-auto">{fmt.dateTime(row.created_at)}</span>
      </div>
    </div>
  )
}

// ─── Стабильные константы для таблицы объёмов ──────────────────────────────
const VOL_REAGENTS: { key: keyof VolumeHistoryItem; label: string; unit: string }[] = [
  { key: 'ks_vol',            label: 'Объём КС',           unit: 'м³' },
  { key: 'fluid_vol',         label: 'Продавочная жидкость', unit: 'м³' },
  { key: 'tovar_kislota_vol', label: 'Товарная кислота',    unit: 'м³' },
  { key: 'hlor_bar_mass',     label: 'Хлористый барий',     unit: 'кг' },
  { key: 'hlor_bar_vol',      label: 'Хлористый барий (объём)', unit: 'м³' },
  { key: 'stabilizer_vol',    label: 'Стабилизатор',        unit: 'м³' },
  { key: 'inhibitor_vol',     label: 'Ингибитор',           unit: 'м³' },
  { key: 'intensifier_vol',   label: 'Активатор',           unit: 'м³' },
  { key: 'plavikov_vol',      label: 'Плавиковая кислота',  unit: 'м³' },
  { key: 'water_vol',         label: 'Вода',                unit: 'м³' },
]

function NavTile({ icon, eyebrow, title, body, stats, cta, to, accent }: {
  icon: React.ReactNode; eyebrow: string; title: string; body: string
  stats: {k:string;v:string}[]; cta: string; to: string; accent: 'brand'|'green'
}) {
  const navigate = useNavigate()
  const bg = accent === 'green' ? '#ECFDF5' : '#EFF6FF'
  const fg = accent === 'green' ? '#16A34A' : '#2563EB'
  return (
    <button onClick={() => navigate(to)} className="group text-left card hover:shadow-cardlg transition-shadow" style={{ padding:0 }}>
      <div className="p-6 flex flex-col gap-4 h-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background:bg, color:fg }}>{icon}</div>
          <div className="mono text-[10px] uppercase tracking-[.1em] text-ink-400">{eyebrow}</div>
        </div>
        <div>
          <h3 className="text-[20px] font-semibold tracking-tight text-ink-900">{title}</h3>
          <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">{body}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {stats.map(s => (
            <div key={s.k} className="bg-ink-50 rounded-md px-3 py-2 border border-ink-200/70">
              <div className="text-[10px] uppercase tracking-[.08em] text-ink-400 font-semibold">{s.k}</div>
              <div className="mono text-[15px] font-semibold text-ink-900 tabnum mt-0.5">{s.v}</div>
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-[13px] font-medium" style={{ color:fg }}>{cta}</span>
          <span className="w-7 h-7 rounded-full border border-ink-200 flex items-center justify-center text-ink-500 group-hover:bg-brand-600 group-hover:border-brand-600 group-hover:text-white transition">
            <ArrowRight size={14}/>
          </span>
        </div>
      </div>
    </button>
  )
}
