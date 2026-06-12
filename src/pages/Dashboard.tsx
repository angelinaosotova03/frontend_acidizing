import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, TrendingUp, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Card, Modal, Button } from '../components/ui'
import { PredictResultPanel, monthsBeforeFromHistory } from '../components/predict/ResultPanel'
import { predictApi } from '../api/predict'
import type { PredictHistoryItem } from '../types/predict'
import { volumesApi, type VolumeHistoryItem } from '../api/volumes'
import { fmt } from '../utils/format'

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
          preds.value.forEach(p => rows.push({ key: `p-${p.well_id}-${p.updated_at}`, well_id: p.well_id, type: 'predict', date: p.updated_at, effect: p.oil_effect ?? p.liquid_effect ?? undefined, raw: p }))
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
        <NavTile icon={<FlaskConical size={20}/>} title="Расчёт объёмов"
          body="Расчёт объёмов раствора и реагентов для обработки скважины."
          accent="brand" cta="Запустить расчёт" to="/volumes"/>
        <NavTile icon={<TrendingUp size={20}/>} title="Прогноз эффекта ОПЗ"
          body="Прогноз добычи на 12 месяцев после кислотной обработки с экстраполяцией по Арпсу."
          accent="green" cta="Открыть прогноз" to="/predict"/>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <Card title="Последние расчёты"
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
      </div>

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={selected ? `${selected.well_id} · ${selected.type === 'predict' ? 'Прогноз' : 'Объёмы'}` : ''}
        width={selected?.type === 'predict' ? 760 : 520}
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
  const { oil, liquid } = monthsBeforeFromHistory(row)
  return (
    <div className="space-y-4">
      <PredictResultPanel record={row} oilMonthsBefore={oil} liquidMonthsBefore={liquid} />
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
          {VOL_REAGENTS.filter(r => !r.optional || (row[r.key] as number) > 0).map(r => (
            <tr key={r.key}>
              <td>{r.label}</td>
              <td className="num font-semibold tabnum">{fmt.num(row[r.key] as number, 3)}</td>
              <td className="num text-ink-400 mono">{r.unit}</td>
            </tr>
          ))}
          {row.additives.map(a => (
            <tr key={a.name}>
              <td>{a.name}</td>
              <td className="num font-semibold tabnum">{fmt.num(a.vol, 3)}</td>
              <td className="num text-ink-400 mono">м³</td>
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
const VOL_REAGENTS: { key: keyof VolumeHistoryItem; label: string; unit: string; optional?: boolean }[] = [
  { key: 'ks_vol',            label: 'Объём КС',           unit: 'м³' },
  { key: 'fluid_vol',         label: 'Продавочная жидкость', unit: 'м³' },
  { key: 'tovar_kislota_vol', label: 'Товарная кислота',    unit: 'м³' },
  { key: 'plavikov_vol',      label: 'Плавиковая кислота',  unit: 'м³', optional: true },
  { key: 'citric_acid_vol',   label: 'Лимонная кислота',    unit: 'м³' },
  { key: 'acetic_acid_vol',   label: 'Уксусная кислота',    unit: 'м³' },
  { key: 'bffa_mass',         label: 'БФФА (навеска)',      unit: 'кг', optional: true },
  { key: 'water_vol',         label: 'Вода',                unit: 'м³' },
]

function NavTile({ icon, title, body, cta, to, accent }: {
  icon: React.ReactNode; title: string; body: string
  cta: string; to: string; accent: 'brand'|'green'
}) {
  const navigate = useNavigate()
  const bg = accent === 'green' ? '#ECFDF5' : '#EFF6FF'
  const fg = accent === 'green' ? '#16A34A' : '#2563EB'
  return (
    <button onClick={() => navigate(to)} className="group text-left card hover:shadow-cardlg transition-shadow" style={{ padding:0 }}>
      <div className="p-6 flex flex-col gap-4 h-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background:bg, color:fg }}>{icon}</div>
        </div>
        <div>
          <h3 className="text-[20px] font-semibold tracking-tight text-ink-900">{title}</h3>
          <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">{body}</p>
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
