import { ArrowRight, AlertTriangle, TrendingUp } from 'lucide-react'
import { Card, Chip, Empty, KpiCard } from '../ui'
import { C, EffectAreaChart, OilVsLiquidChart } from '../charts'
import { fmt } from '../../utils/format'
import type { PredictHistoryItem, PredictRecordFields } from '../../types/predict'

/** Собирает помесячные значения "до ОПЗ" из записи истории для графиков. */
export function monthsBeforeFromHistory(item: PredictHistoryItem): { oil?: number[]; liquid?: number[] } {
  const oil = [
    item.month_1_before, item.month_2_before, item.month_3_before, item.month_4_before,
    item.month_5_before, item.month_6_before, item.month_7_before, item.month_8_before,
    item.month_9_before, item.month_10_before, item.month_11_before, item.month_12_before,
  ]
  const liquid = [
    item.month_1_before_liquid, item.month_2_before_liquid, item.month_3_before_liquid, item.month_4_before_liquid,
    item.month_5_before_liquid, item.month_6_before_liquid, item.month_7_before_liquid, item.month_8_before_liquid,
    item.month_9_before_liquid, item.month_10_before_liquid, item.month_11_before_liquid, item.month_12_before_liquid,
  ]
  return {
    oil: oil.every((v): v is number => v != null) ? oil : undefined,
    liquid: liquid.every((v): v is number => v != null) ? liquid : undefined,
  }
}

export function PredictResultPanel({ record, oilMonthsBefore, liquidMonthsBefore }: {
  record: PredictRecordFields
  oilMonthsBefore?: number[] | null
  liquidMonthsBefore?: number[] | null
}) {
  const hasOil = !!record.oil_months_after?.length && !!record.oil_months_baseline?.length
  const hasLiquid = !!record.liquid_months_after?.length && !!record.liquid_months_baseline?.length

  const liquidBefore = record.month_1_before_liquid ?? record.month_1_before
  const liquidBeforeIsProxy = record.month_1_before_liquid == null && record.month_1_before != null

  const hasKpr = record.kpr_before != null && record.kpr_after != null
  const hasPzab = record.pzab_before != null && record.pzab_after != null
  const hasLiquidDebit = liquidBefore != null && record.debit_liquid_after != null
  const hasBeforeAfter = hasKpr || hasPzab || hasLiquidDebit

  if (!hasOil && !hasLiquid && !hasBeforeAfter) {
    return (
      <Empty icon={<TrendingUp size={18} />} title="Нет результатов"
        body="Для этой записи пока нет рассчитанных показателей." />
    )
  }

  return (
    <div className="space-y-5">
      {hasOil && (
        <Card title="Эффект ОПЗ — дебит нефти">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <KpiCard label="Эффект (мес. 1)" value={record.oil_effect ?? 0} unit="м³/сут" color={C.forecast} decimals={2} delta />
            <KpiCard label="Накопленная доп. добыча" value={record.oil_cumulative ?? 0} unit="м³" color={C.cum} decimals={1} />
            <KpiCard label="Длительность эффекта" value={record.oil_effect_duration_months ?? 0} unit="мес." color={C.axis} decimals={0} />
          </div>
          <EffectAreaChart
            before={oilMonthsBefore}
            after={record.oil_months_after!}
            baseline={record.oil_months_baseline!}
            effectDurationMonths={record.oil_effect_duration_months}
            color={C.forecast}
          />
        </Card>
      )}

      {hasLiquid && (
        <Card title="Эффект ОПЗ — дебит жидкости"
          right={record.liquid_anchored === false ? (
            <Chip kind="warn" icon={<AlertTriangle size={12} />}>оценки месяца 1 могут немного отличаться</Chip>
          ) : undefined}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <KpiCard label="Эффект (мес. 1)" value={record.liquid_effect ?? 0} unit="м³/сут" color={C.liquid} decimals={2} delta />
            <KpiCard label="Накопленная доп. добыча" value={record.liquid_cumulative ?? 0} unit="м³" color={C.cum} decimals={1} />
            <KpiCard label="Длительность эффекта" value={record.liquid_effect_duration_months ?? 0} unit="мес." color={C.axis} decimals={0} />
          </div>
          <EffectAreaChart
            before={liquidMonthsBefore}
            after={record.liquid_months_after!}
            baseline={record.liquid_months_baseline!}
            effectDurationMonths={record.liquid_effect_duration_months}
            color={C.liquid}
          />
        </Card>
      )}

      {hasOil && hasLiquid && (
        <Card title="Нефть vs Жидкость" right={<span className="text-[11px] text-ink-500">обводнённость</span>}>
          <OilVsLiquidChart
            oilBefore={oilMonthsBefore}
            oilAfter={record.oil_months_after!}
            oilBaseline={record.oil_months_baseline!}
            liquidBefore={liquidMonthsBefore}
            liquidAfter={record.liquid_months_after!}
            liquidBaseline={record.liquid_months_baseline!}
          />
        </Card>
      )}

      {hasBeforeAfter && (
        <Card title="До / После">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {hasKpr && (
              <BeforeAfterCard label="Кпр" unit="м³/сут/атм" before={record.kpr_before} after={record.kpr_after} decimals={4} goodDirection="up" />
            )}
            {hasPzab && (
              <BeforeAfterCard label="Рзаб" unit="атм" before={record.pzab_before} after={record.pzab_after} decimals={2} goodDirection="down" />
            )}
            {hasLiquidDebit && (
              <BeforeAfterCard label="Дебит жидкости (мес. 1)" unit="м³/сут" before={liquidBefore} after={record.debit_liquid_after} decimals={2} goodDirection="up"
                note={liquidBeforeIsProxy ? 'оценка "до" по дебиту нефти' : undefined} />
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

function BeforeAfterCard({ label, unit, before, after, decimals = 2, goodDirection, note }: {
  label: string; unit: string; before: number | null; after: number | null
  decimals?: number; goodDirection: 'up' | 'down'; note?: string
}) {
  if (before == null || after == null) return null
  const delta = after - before
  const isGood = goodDirection === 'up' ? delta > 0 : delta < 0
  const isBad = goodDirection === 'up' ? delta < 0 : delta > 0
  const color = isGood ? '#16A34A' : isBad ? '#DC2626' : '#64748B'
  return (
    <div className="kpi" style={{ padding: '12px 14px' }}>
      <div className="label" style={{ fontSize: 10 }}>{label}</div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="tabnum text-ink-500" style={{ fontSize: 15 }}>{fmt.num(before, decimals)}</span>
        <ArrowRight size={13} style={{ color }} />
        <span className="tabnum font-semibold" style={{ fontSize: 18, color }}>{fmt.num(after, decimals)}</span>
        <span className="unit">{unit}</span>
      </div>
      {note && <div className="text-[10px] text-ink-400 mt-1">{note}</div>}
    </div>
  )
}
