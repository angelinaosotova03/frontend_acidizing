import { useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import { Database } from 'lucide-react'
import { predictApi } from '../api/predict'
import { handleApiError } from '../utils/errors'
import { fmt } from '../utils/format'
import { Button, Card, Chip, Empty, Modal } from '../components/ui'
import { PredictResultPanel, monthsBeforeFromHistory } from '../components/predict/ResultPanel'
import type { PredictHistoryItem } from '../types/predict'

const BADGES: { key: keyof PredictHistoryItem; label: string }[] = [
  { key: 'kpr_after', label: 'Кпр' },
  { key: 'pzab_after', label: 'Рзаб' },
  { key: 'debit_liquid_after', label: 'Жидкость' },
  { key: 'oil_months_after', label: 'Нефть-кривая' },
  { key: 'liquid_months_after', label: 'Жидкость-кривая' },
]

export function PredictHistoryPage() {
  const [items, setItems] = useState<PredictHistoryItem[]>([])
  const [limit, setLimit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [selected, setSelected] = useState<PredictHistoryItem | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    predictApi.getHistory(limit)
      .then(data => { if (!cancelled) { setItems(data); setUnavailable(false) } })
      .catch(err => {
        if (cancelled) return
        if (err instanceof AxiosError && err.response?.status === 503) setUnavailable(true)
        else handleApiError(err)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [limit])

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[.1em] text-ink-500 font-semibold mb-1">Расчёты · /predict/history</div>
          <h1 className="text-[26px] font-semibold tracking-tight">История прогнозов</h1>
          <p className="text-sm text-ink-500 mt-1 max-w-[64ch]">Сохранённые расчёты по скважинам — Кпр, Рзаб, дебит жидкости и кривые добычи.</p>
        </div>
      </header>

      {unavailable ? (
        <Card>
          <Empty icon={<Database size={18} />} title="История временно недоступна"
            body="База данных истории расчётов сейчас недоступна. Расчёты на странице «Прогноз эффекта» по-прежнему работают." />
        </Card>
      ) : (
        <Card title="Записи" right={<span className="chip mono">{items.length}</span>}>
          {loading ? (
            <div className="py-6 text-center text-ink-400 text-sm">Загрузка…</div>
          ) : items.length === 0 ? (
            <Empty icon={<Database size={18} />} title="Записей пока нет"
              body="Запустите расчёт на странице «Прогноз эффекта», указав идентификатор скважины." />
          ) : (
            <div className="overflow-x-auto">
              <table className="dtable hover">
                <thead>
                  <tr><th>Скважина</th><th>Результаты</th><th>Обновлено</th><th></th></tr>
                </thead>
                <tbody>
                  {items.map(row => (
                    <tr key={`${row.well_id}-${row.updated_at}`} onClick={() => setSelected(row)} style={{ cursor: 'pointer' }}>
                      <td className="font-medium text-ink-900 mono">{row.well_id}</td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {BADGES.filter(b => row[b.key] != null).map(b => <Chip key={b.label} kind="ok">{b.label}</Chip>)}
                        </div>
                      </td>
                      <td className="text-ink-500">{fmt.dateTime(row.updated_at)}</td>
                      <td className="num">
                        <button className="link text-[12px]" onClick={e => { e.stopPropagation(); setSelected(row) }}>детали →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && items.length >= limit && (
            <div className="pt-4 flex justify-center">
              <Button variant="secondary" onClick={() => setLimit(l => l + 20)}>Показать ещё</Button>
            </div>
          )}
        </Card>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.well_id ?? ''} width={760}
        footer={<Button variant="secondary" onClick={() => setSelected(null)}>Закрыть</Button>}>
        {selected && (() => {
          const { oil, liquid } = monthsBeforeFromHistory(selected)
          return <PredictResultPanel record={selected} oilMonthsBefore={oil} liquidMonthsBefore={liquid} />
        })()}
      </Modal>
    </div>
  )
}
