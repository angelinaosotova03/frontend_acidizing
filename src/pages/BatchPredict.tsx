import { useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Database, Upload, Download, Plus, Trash, Check, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { handleApiError } from '../utils/errors'
import { fmt } from '../utils/format'
import { parseBatchCsv, batchCsvTemplate, exportBatchResults, downloadCsv } from '../utils/csv'
import { predictApi } from '../api/predict'
import { Button, Card, Chip, Empty, Modal, SparkBar, Tabs } from '../components/ui'
import { ForecastChart } from '../components/charts'
import type { PredictFormValues, BatchResultItem } from '../types/predict'

export function BatchPredictPage() {
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<PredictFormValues[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [results, setResults] = useState<BatchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<BatchResultItem | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const stats = useMemo(() => {
    const ok = results.filter(r => r.ok)
    if (!ok.length) return null
    const effects = ok.map(r => r.effect ?? 0)
    return { total: results.length, ok: ok.length, failed: results.length - ok.length,
      avgEffect: effects.reduce((a,b)=>a+b,0)/effects.length, cumSum: ok.reduce((a,b)=>a+(b.cumulative??0),0) }
  }, [results])

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const { wells, errors } = parseBatchCsv(reader.result as string)
      setRows(wells); setParseErrors(errors); setResults([])
      if (errors.length) toast.error(`Ошибки в CSV: ${errors[0]}`)
      else toast.success(`CSV загружен — ${wells.length} скважин`)
    }
    reader.readAsText(file)
  }

  const onRun = async () => {
    if (!rows.length) { toast.error('Загрузите CSV или добавьте строку'); return }
    setLoading(true)
    try {
      const r = await predictApi.predictBatch(rows)
      setResults(r); toast.success(`Батч готов — ${r.length} скважин`)
    } catch (err) { handleApiError(err) }
    finally { setLoading(false) }
  }

  const emptyRow = (): PredictFormValues => ({
    well_id: `new-${rows.length+1}`, q_liquid_history: Array(12).fill(20),
    ks_vol:5, flush_vol:12, perf_sum:10, nkt_vol:8, to_lower_perf:0, grp_done:false, grp_mass:0, is_horizontal:false,
  })

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[.1em] text-ink-500 font-semibold mb-1">Расчёты · /predict/batch</div>
          <h1 className="text-[26px] font-semibold tracking-tight">Батч‑прогноз</h1>
          <p className="text-sm text-ink-500 mt-1 max-w-[64ch]">Прогноз для нескольких скважин. CSV‑импорт или ручное добавление. Лимит — 500 скважин.</p>
        </div>
        <Tabs value="batch" onChange={v => v==='single' && navigate('/predict')} items={[
          { value:'single', label:'Одна скважина', icon:<TrendingUp size={12}/> },
          { value:'batch',  label:'Батч (CSV)',    icon:<Database size={12}/> },
        ]} />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7" title="Источник данных">
          <div className={`dropzone ${dragOver ? 'active' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => fileInput.current?.click()}>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center"><Upload size={18}/></div>
              <div className="text-[14px] font-medium text-ink-900">Перетащите CSV сюда или нажмите для выбора</div>
              <div className="text-[12px] text-ink-500 mono">well_id, q1..q12, ks_vol, flush_vol, perf_sum, nkt_vol, to_lower_perf, grp_done, grp_mass, is_horizontal</div>
              <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value='' }} />
              <div className="flex gap-2 mt-2">
                <Button variant="secondary" size="sm" type="button" icon={<Download size={13}/>}
                  onClick={e => { e.stopPropagation(); downloadCsv('opz-batch-template.csv', batchCsvTemplate().split('\r\n').map(r => r.split(','))) }}>
                  Шаблон CSV
                </Button>
                <Button variant="ghost" size="sm" type="button" icon={<Plus size={13}/>}
                  onClick={e => { e.stopPropagation(); setRows(rs => [...rs, emptyRow()]) }}>
                  Добавить вручную
                </Button>
              </div>
            </div>
          </div>
          {parseErrors.length > 0 && (
            <div className="mt-3 p-3 rounded-md bg-red-50 border border-red-200 text-[12px] text-red-700">
              <div className="font-medium mb-1">Ошибки парсинга:</div>
              <ul className="list-disc pl-5">{parseErrors.map((e,i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
          {rows.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[12px] text-ink-500">Загружено: <span className="mono text-ink-900">{rows.length}</span> скважин</div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setRows([]); setResults([]) }}>Очистить</Button>
                  <Button onClick={onRun} loading={loading} icon={!loading ? <TrendingUp size={13}/> : undefined}>
                    Запустить ({rows.length})
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[200px] overflow-y-auto border border-ink-200 rounded-md">
                <table className="dtable" style={{ fontSize:12 }}>
                  <thead><tr><th>well_id</th><th className="num">q12 (тек.)</th><th className="num">ks_vol</th><th className="num">perf_sum</th><th>ГРП</th><th></th></tr></thead>
                  <tbody>
                    {rows.map((r,i) => (
                      <tr key={i}>
                        <td className="mono">{r.well_id}</td>
                        <td className="num">{r.q_liquid_history[11]}</td>
                        <td className="num">{r.ks_vol}</td>
                        <td className="num">{r.perf_sum}</td>
                        <td>{r.grp_done ? <Chip kind="brand" mono>{r.grp_mass}т</Chip> : <span className="text-ink-400">—</span>}</td>
                        <td className="num"><button className="text-ink-400 hover:text-red-500 p-1" onClick={() => setRows(rs => rs.filter((_,j) => j!==i))}><Trash size={13}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-5" title="Сводка" badge={results.length ? `${results.length} скважин` : 'не запущено'}>
          {!stats ? (
            <Empty icon={<Database size={18}/>} title="Сводка появится после прогноза" body="Загрузите CSV и нажмите «Запустить прогноз»." />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label:'Успешно',      value:`${stats.ok} / ${stats.total}`,      color:'#22C55E' },
                  { label:'С ошибкой',    value:String(stats.failed),                color:stats.failed?'#EF4444':'#94A3B8' },
                  { label:'Ср. эффект',   value:`${fmt.num(stats.avgEffect,2)} м³/сут`, color:'#16A34A' },
                  { label:'Σ накопл.',    value:`${fmt.num(stats.cumSum,0)} м³`,     color:'#F97316' },
                ].map(s => (
                  <div key={s.label} className="kpi" style={{ padding:'10px 12px' }}>
                    <div className="label" style={{ fontSize:10 }}>{s.label}</div>
                    <div className="value tabnum" style={{ fontSize:18, color:s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-ink-200/70 flex justify-end">
                <Button icon={<Download size={13}/>}
                  onClick={() => downloadCsv('opz-batch-results.csv', exportBatchResults(results).split('\r\n').map(r => r.split(',')))}>
                  Скачать CSV ({results.length})
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {results.length > 0 && (
        <Card title="Результаты по скважинам" badge={String(results.length)}>
          <div className="overflow-x-auto">
            <table className="dtable hover">
              <thead><tr><th>Скважина</th><th>Статус</th><th className="num">Эффект 1м, м³/сут</th><th className="num">Накопл., м³</th><th>Кривая</th><th></th></tr></thead>
              <tbody>
                {results.map((r,i) => (
                  <tr key={i} onClick={() => r.ok && setSelected(r)} style={{ cursor:r.ok?'pointer':'default' }}>
                    <td className="mono font-medium">{r.well_id}</td>
                    <td>{r.ok ? <Chip kind="ok" icon={<Check size={11}/>}>OK</Chip> : <Chip kind="err" icon={<AlertTriangle size={11}/>}>{r.error||'ошибка'}</Chip>}</td>
                    <td className="num font-semibold text-green-700">{r.ok ? `+${fmt.num(r.effect,2)}` : '—'}</td>
                    <td className="num">{r.ok ? fmt.num(r.cumulative,1) : '—'}</td>
                    <td>{r.ok && r.months_after ? <SparkBar values={r.months_after} /> : '—'}</td>
                    <td className="num">{r.ok && <button className="link text-[12px]" onClick={e => { e.stopPropagation(); setSelected(r) }}>детали →</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} width={720}
        title={selected ? `Скважина ${selected.well_id}` : ''}
        footer={<Button variant="secondary" onClick={() => setSelected(null)}>Закрыть</Button>}>
        {selected && selected.months_after && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="kpi" style={{padding:'10px 12px'}}><div className="label" style={{fontSize:10}}>Эффект 1м</div><div className="value tabnum" style={{fontSize:18,color:'#22C55E'}}>{fmt.num(selected.effect,2)} м³/сут</div></div>
              <div className="kpi" style={{padding:'10px 12px'}}><div className="label" style={{fontSize:10}}>Накопл.</div><div className="value tabnum" style={{fontSize:18,color:'#F97316'}}>{fmt.num(selected.cumulative,1)} м³</div></div>
            </div>
            <ForecastChart baseline={selected.months_after.map(v => v * 0.75)} forecast={selected.months_after} height={200} />
          </div>
        )}
      </Modal>
    </div>
  )
}
