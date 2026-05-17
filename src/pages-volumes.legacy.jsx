/* eslint-disable */
/**
 * src/pages-volumes.jsx — Volume Calc page.
 * /volumes  →  POST /calculate_vols
 *
 * Layout:
 *   ┌─ left (form)  ────────────────────┬─ right (result) ─┐
 *   │ well_id, perf_sum, depths, sizes  │ reagent table    │
 *   │ submit                            │ KPI tiles + CTA  │
 *   └────────────────────────────────────┴──────────────────┘
 */

const { useState: vUseState, useEffect: vUseEffect, useMemo: vUseMemo, useRef: vUseRef } = React;

// Sensible defaults — a typical Western Siberia well. NKT can be a multi-section
// string with different diameters (taper) — each section has its own d/thickness
// and a "bottom" depth (the depth where this section ends). Section above
// implicitly starts at the surface (or the previous section's bottom).
const VOLUMES_DEFAULTS = {
  well_id:       '',
  perf_sum:      12.5,
  ek_d:          146,
  ek_thikness:   7.7,
  perf_depth:    2495,
  nkt_sections: [
    { d: 73, thickness: 5.5, bottom: 2480 },
  ],
};

const VOLUMES_EXAMPLE = {
  well_id:       'Самотлор-4127',
  perf_sum:      14.0,
  ek_d:          146,
  ek_thikness:   7.7,
  perf_depth:    2492,
  nkt_sections: [
    { d: 89, thickness: 6.5, bottom: 1800 },
    { d: 73, thickness: 5.5, bottom: 2480 },
  ],
};

const REAGENT_META = {
  ks_vol:           { label:'КС (кислотный состав)',    unit:'м³',  icon:'Beaker',  color:'#2563EB' },
  flush_vol:        { label:'Продавочная жидкость',     unit:'м³',  icon:'Wave',    color:'#0EA5E9' },
  commercial_acid:  { label:'Товарная кислота (24%)',   unit:'м³',  icon:'Droplet', color:'#7C3AED' },
  hf_acid_m3:       { label:'Плавиковая кислота HF',    unit:'м³',  icon:'Atom',    color:'#A855F7' },
  bacl2_kg:         { label:'Хлористый барий BaCl₂',    unit:'кг',  icon:'Flask',   color:'#0891B2' },
  fe_stabilizer_l:  { label:'Стабилизатор Fe³⁺',         unit:'л',   icon:'Beaker',  color:'#10B981' },
  inhibitor_l:      { label:'Ингибитор коррозии',       unit:'л',   icon:'Beaker',  color:'#F59E0B' },
  activator_l:      { label:'Активатор',                unit:'л',   icon:'Beaker',  color:'#EC4899' },
  water_m3:         { label:'Вода для разбавления',     unit:'м³',  icon:'Droplet', color:'#64748B' },
};
const REAGENT_ORDER = ['ks_vol','flush_vol','commercial_acid','hf_acid_m3','bacl2_kg','fe_stabilizer_l','inhibitor_l','activator_l','water_m3'];

// Visual indicator for "is this volume large vs typical?"
function volumeLevel(key, value) {
  const t = {
    ks_vol: [6, 12], flush_vol: [10, 30], commercial_acid: [2, 6],
    hf_acid_m3: [0.5, 1.5], bacl2_kg: [80, 160], fe_stabilizer_l: [40, 90],
    inhibitor_l: [60, 110], activator_l: [25, 55], water_m3: [4, 10],
  }[key] || [0, 1];
  if (value < t[0]) return 'low';
  if (value > t[1]) return 'high';
  return 'mid';
}

const VolumesPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { set: setHandoff } = useHandoff();

  const [values, setValues] = vUseState(VOLUMES_DEFAULTS);
  const [errors, setErrors] = vUseState({});
  const [loading, setLoading] = vUseState(false);
  const [result, setResult] = vUseState(null);

  const setField = (k, v) => setValues(s => ({ ...s, [k]: v }));
  const setSection = (i, patch) => setValues(s => ({
    ...s, nkt_sections: s.nkt_sections.map((sec, j) => j === i ? { ...sec, ...patch } : sec),
  }));
  const addSection = () => setValues(s => {
    const prev = s.nkt_sections[s.nkt_sections.length - 1];
    return { ...s, nkt_sections: [...s.nkt_sections, { d: Math.max(60, prev.d - 16), thickness: 5.5, bottom: prev.bottom + 200 }] };
  });
  const removeSection = (i) => setValues(s => ({ ...s, nkt_sections: s.nkt_sections.filter((_, j) => j !== i) }));

  // Derived: depth of NKT shoe = bottom of last section
  const nktShoeDepth = values.nkt_sections[values.nkt_sections.length - 1].bottom;

  // Client-side validation (mirrors backend)
  const clientValidate = () => {
    const errs = {};
    if (!values.well_id || !values.well_id.trim()) errs.well_id = 'Укажите идентификатор скважины';
    if (!(values.perf_sum > 0)) errs.perf_sum = 'Должно быть > 0';
    values.nkt_sections.forEach((sec, i) => {
      if (!(sec.d > 2 * sec.thickness)) errs[`nkt_d_${i}`] = 'Ø должен быть > 2 × толщина стенки';
      const top = i === 0 ? 0 : values.nkt_sections[i-1].bottom;
      if (!(sec.bottom > top)) errs[`nkt_bottom_${i}`] = `Низ должен быть > ${top.toFixed(0)} м`;
      if (!(sec.thickness > 0)) errs[`nkt_thikness_${i}`] = 'Должно быть > 0';
    });
    if (!(values.perf_depth > nktShoeDepth)) errs.perf_depth = `Должно быть > ${nktShoeDepth.toFixed(0)} м (башмак НКТ)`;
    if (!(values.ek_d > 2 * values.ek_thikness)) errs.ek_d = 'Ø должен быть > 2 × толщина стенки';
    return errs;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = clientValidate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const r = await volumesApi.calculateVolumes(values);
      setResult(r);
      toast.success('Расчёт готов', `Скважина ${values.well_id}`);
    } catch (e) {
      if (e.status === 422) setErrors(fieldErrorsFrom422(e));
      const d = describeApiError(e); toast.push(d);
    } finally { setLoading(false); }
  };

  const onReset = () => { setValues(VOLUMES_DEFAULTS); setErrors({}); setResult(null); };
  const onExample = () => { setValues(VOLUMES_EXAMPLE); setErrors({}); };

  const sendToPredict = () => {
    if (!result) return;
    setHandoff({
      well_id:   values.well_id,
      ks_vol:    result.reagents.ks_vol,
      flush_vol: result.reagents.flush_vol,
      perf_sum:  values.perf_sum,
      nkt_vol:   result.meta.nkt_volume_m3,
    });
    toast.info('Данные переданы в прогноз', 'Поля ks_vol, flush_vol, perf_sum, nkt_vol предзаполнены.');
    navigate('/predict');
  };

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] text-ink-500 font-semibold mb-1">Расчёты · /calculate_vols</div>
          <h1 className="text-[26px] font-semibold tracking-tight">Расчёт объёмов реагентов</h1>
          <p className="text-sm text-ink-500 mt-1 max-w-[60ch]">
            Раскладка кислотного состава для матричной обработки призабойной зоны. Введите параметры скважины — получите 9 объёмов.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost"     icon={<Icons.Plus size={14}/>}  onClick={onExample}>Пример</Button>
          <Button variant="secondary" icon={<Icons.Refresh size={13}/>} onClick={onReset}>Сбросить</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ── FORM ── */}
        <form onSubmit={onSubmit} className="lg:col-span-7 space-y-4" noValidate>
          <Card title="Параметры скважины" badge="входные данные">
            <Field label="Идентификатор скважины" error={errors.well_id}
                   help="Например: Самотлор-4127. Используется в результатах и истории.">
              <Input value={values.well_id} onChange={e=>setField('well_id', e.target.value)}
                     placeholder="Месторождение‑номер" error={errors.well_id}/>
            </Field>

            <SectionRule>Геометрия пласта</SectionRule>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Суммарная вскрытая толщина" unit="м" error={errors.perf_sum}>
                <NumberInput value={values.perf_sum} onChange={e=>setField('perf_sum', +e.target.value)} error={errors.perf_sum}/>
              </Field>
              <Field label="Глубина верха перфорации" unit="м" error={errors.perf_depth}>
                <NumberInput value={values.perf_depth} onChange={e=>setField('perf_depth', +e.target.value)} error={errors.perf_depth}/>
              </Field>
            </div>

            <SectionRule right={
              <Button type="button" variant="ghost" size="sm" icon={<Icons.Plus size={12}/>} onClick={addSection}>
                Добавить секцию НКТ
              </Button>
            }>
              Колонна НКТ · {values.nkt_sections.length} {values.nkt_sections.length === 1 ? 'секция' : 'секций'}
            </SectionRule>

            <div className="space-y-2">
              {values.nkt_sections.map((sec, i) => {
                const top = i === 0 ? 0 : values.nkt_sections[i-1].bottom;
                const length = Math.max(0, sec.bottom - top);
                return (
                  <div key={i} className="rounded-md border border-ink-200 bg-ink-50/50 p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="mono text-[10px] uppercase tracking-[0.1em] text-ink-500 font-semibold bg-white px-1.5 py-0.5 rounded border border-ink-200">
                          секция #{i+1}
                        </span>
                        <span className="text-[11px] text-ink-500 mono">
                          {top.toFixed(0)} → {sec.bottom.toFixed(0)} м · L = {length.toFixed(0)} м
                        </span>
                      </div>
                      {values.nkt_sections.length > 1 && (
                        <button type="button" onClick={()=>removeSection(i)}
                                className="text-ink-400 hover:text-red-500 p-1 -m-1 rounded transition"
                                title="Удалить секцию">
                          <Icons.Trash size={13}/>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Field label="Диаметр" unit="мм" error={errors[`nkt_d_${i}`]}>
                        <NumberInput value={sec.d} onChange={e=>setSection(i, { d: +e.target.value })} error={errors[`nkt_d_${i}`]}/>
                      </Field>
                      <Field label="Толщина стенки" unit="мм" error={errors[`nkt_thikness_${i}`]}>
                        <NumberInput value={sec.thickness} onChange={e=>setSection(i, { thickness: +e.target.value })} error={errors[`nkt_thikness_${i}`]}/>
                      </Field>
                      <Field label="Низ секции" unit="м" error={errors[`nkt_bottom_${i}`]}>
                        <NumberInput value={sec.bottom} onChange={e=>setSection(i, { bottom: +e.target.value })} error={errors[`nkt_bottom_${i}`]}/>
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>

            <SectionRule>Эксплуатационная колонна (ЭК)</SectionRule>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
              <Field label="Диаметр ЭК" unit="мм" error={errors.ek_d}>
                <NumberInput value={values.ek_d} onChange={e=>setField('ek_d', +e.target.value)} error={errors.ek_d}/>
              </Field>
              <Field label="Толщина стенки ЭК" unit="мм" error={errors.ek_thikness}>
                <NumberInput value={values.ek_thikness} onChange={e=>setField('ek_thikness', +e.target.value)} error={errors.ek_thikness}/>
              </Field>
            </div>

            <div className="mt-5 pt-4 border-t border-ink-200/70 flex items-center justify-between">
              <div className="text-[11px] text-ink-500">
                Сервис: <span className="mono">POST /calculate_vols</span>
              </div>
              <Button type="submit" loading={loading} size="lg"
                      icon={!loading && <Icons.Calculator size={14}/>}>
                Рассчитать объёмы
              </Button>
            </div>
          </Card>

          {/* Inline schematic of well */}
          <Card title="Схема компоновки" badge="превью">
            <WellSchematic values={values}/>
          </Card>
        </form>

        {/* ── RESULT ── */}
        <div className="lg:col-span-5">
          {!result ? (
            <Card padded={false} className="h-full">
              <Empty
                icon={<Icons.Calculator size={20}/>}
                title="Результат появится здесь"
                body="Заполните параметры скважины слева и нажмите «Рассчитать объёмы». Расчёт выполняется на сервисе Volume Calc API."
              />
            </Card>
          ) : (
            <div className="space-y-4">
              <Card title={`Раскладка реагентов`} badge={values.well_id || '—'}
                    right={<Chip kind="ok" icon={<Icons.Check size={11}/>}>готово</Chip>}>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="kpi">
                    <div className="label">Объём НКТ</div>
                    <div className="value tabnum text-[20px]">{fmt.num(result.meta.nkt_volume_m3, 2)} <span className="unit">м³</span></div>
                  </div>
                  <div className="kpi">
                    <div className="label">Объём ЭК</div>
                    <div className="value tabnum text-[20px]">{fmt.num(result.meta.ek_volume_m3, 2)} <span className="unit">м³</span></div>
                  </div>
                  <div className="kpi">
                    <div className="label">Всего</div>
                    <div className="value tabnum text-[20px]">{fmt.num(result.meta.total_well_m3, 2)} <span className="unit">м³</span></div>
                  </div>
                </div>

                <table className="dtable">
                  <thead>
                    <tr>
                      <th>Реагент</th>
                      <th className="num">Объём</th>
                      <th>Уровень</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REAGENT_ORDER.map(k => {
                      const m = REAGENT_META[k];
                      const v = result.reagents[k];
                      const lvl = volumeLevel(k, v);
                      const Icn = Icons[m.icon] || Icons.Beaker;
                      return (
                        <tr key={k}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded flex items-center justify-center"
                                    style={{ background: m.color + '14', color: m.color }}>
                                <Icn size={13}/>
                              </span>
                              <span className="text-ink-900">{m.label}</span>
                            </div>
                          </td>
                          <td className="num tabnum text-ink-900 font-semibold">
                            {fmt.num(v, 2)} <span className="text-ink-400 font-normal text-[11px] ml-1">{m.unit}</span>
                          </td>
                          <td>
                            <LevelBar level={lvl}/>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-4 pt-4 border-t border-ink-200/70 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-ink-500 mono">
                    computed_at: {fmt.dateTime(result.meta.computed_at)}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" icon={<Icons.Download size={13}/>}
                            onClick={() => downloadCsv(`volumes-${values.well_id||'well'}.csv`, [
                              ['well_id', values.well_id],
                              [], ['reagent','value','unit'],
                              ...REAGENT_ORDER.map(k=>[REAGENT_META[k].label, result.reagents[k], REAGENT_META[k].unit])
                            ])}>
                      CSV
                    </Button>
                    <Button onClick={sendToPredict} icon={<Icons.TrendUp size={14}/>}>
                      Использовать в прогнозе
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LevelBar = ({ level }) => {
  const config = {
    low:  { color:'#0EA5E9', label:'низкий',  pct: 25 },
    mid:  { color:'#22C55E', label:'норма',   pct: 55 },
    high: { color:'#F97316', label:'высокий', pct: 85 },
  }[level];
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="w-[64px] h-1.5 rounded-full bg-ink-100 overflow-hidden">
        <div className="h-full" style={{ width: config.pct + '%', background: config.color }}/>
      </div>
      <span className="text-[11px] mono uppercase tracking-[0.05em]" style={{ color: config.color }}>{config.label}</span>
    </div>
  );
};

// SVG schematic — supports multi-section NKT (each section drawn with width
// proportional to its diameter, stacked vertically).
const WellSchematic = ({ values }) => {
  const sections = values.nkt_sections || [];
  const lastBottom = sections.length ? sections[sections.length - 1].bottom : 0;
  const maxDepth = Math.max(values.perf_depth + 50, lastBottom + 80, 100);
  const H = Math.max(260, 60 + sections.length * 40);
  const scale = (d) => (d / maxDepth) * (H - 26) + 12;
  const perfY = scale(values.perf_depth);
  const perfH = Math.max(4, (values.perf_sum / maxDepth) * (H - 26));

  // Widths for NKT sections — scaled within [12..30]px relative to max d
  const maxD = Math.max(...sections.map(s => s.d), 1);
  const sectionWidth = (d) => 8 + (d / maxD) * 18;

  return (
    <div className="flex gap-6">
      <svg width="140" height={H} viewBox={`0 0 140 ${H}`} className="shrink-0">
        {/* surface */}
        <line x1="10" y1="8" x2="130" y2="8" stroke="#94A3B8" strokeDasharray="2 2"/>
        <text x="14" y="6" fontSize="9" fill="#94A3B8" fontFamily="JetBrains Mono">0м</text>
        {/* casing (EK) */}
        <rect x="50" y="12" width="40" height={H - 20} fill="#F1F5F9" stroke="#CBD5E1"/>

        {/* NKT sections — stacked, each centered horizontally */}
        {sections.map((sec, i) => {
          const top = i === 0 ? 12 : scale(sections[i-1].bottom);
          const bottom = scale(sec.bottom);
          const w = sectionWidth(sec.d);
          const x = 70 - w / 2;
          return (
            <g key={i}>
              <rect x={x} y={top} width={w} height={bottom - top}
                    fill={i % 2 === 0 ? '#DBEAFE' : '#BFDBFE'} stroke="#60A5FA"/>
              {/* shoe marker for last section */}
              {i === sections.length - 1 && (
                <g>
                  <line x1="50" y1={bottom} x2="90" y2={bottom} stroke="#1D4ED8" strokeDasharray="2 2"/>
                  <text x="94" y={bottom+3} fontSize="9" fill="#1D4ED8" fontFamily="JetBrains Mono">{sec.bottom}м</text>
                </g>
              )}
              {/* label on section */}
              {bottom - top > 18 && (
                <text x="70" y={(top + bottom)/2 + 3} fontSize="8" fill="#1D4ED8"
                      fontFamily="JetBrains Mono" textAnchor="middle">
                  Ø{sec.d}
                </text>
              )}
            </g>
          );
        })}

        {/* perforations */}
        <rect x="50" y={perfY} width="40" height={perfH} fill="#FEF3C7" stroke="#F59E0B"/>
        {Array.from({length: 6}).map((_, i) => (
          <line key={i} x1="50" y1={perfY + (i+1)*(perfH/7)} x2="46" y2={perfY + (i+1)*(perfH/7)} stroke="#92400E"/>
        ))}
        {Array.from({length: 6}).map((_, i) => (
          <line key={'r'+i} x1="90" y1={perfY + (i+1)*(perfH/7)} x2="94" y2={perfY + (i+1)*(perfH/7)} stroke="#92400E"/>
        ))}
        <text x="3" y={perfY+perfH/2+3} fontSize="9" fill="#92400E" fontFamily="JetBrains Mono">{values.perf_depth}м</text>
      </svg>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-ink-900 mb-2">Контроль связности</div>
        <dl className="dl">
          <dt>Секций НКТ</dt>
          <dd>
            {sections.length}
            {sections.length > 1 && <span className="text-ink-500 ml-2 normal-case font-normal">телескоп</span>}
          </dd>
          {sections.map((sec, i) => {
            const top = i === 0 ? 0 : sections[i-1].bottom;
            return (
              <React.Fragment key={i}>
                <dt>Секция #{i+1}</dt>
                <dd>Ø{sec.d}/{sec.thickness} · {top}→{sec.bottom} м</dd>
              </React.Fragment>
            );
          })}
          <dt>Башмак НКТ</dt><dd>{fmt.num(lastBottom, 0)} м</dd>
          <dt>Глубина перфорации</dt><dd>{fmt.num(values.perf_depth, 0)} м</dd>
          <dt>Зазор НКТ → перф.</dt>
          <dd className={values.perf_depth > lastBottom ? '' : 'text-red-500'}>
            {fmt.num(values.perf_depth - lastBottom, 1)} м{' '}
            {values.perf_depth > lastBottom
              ? <Chip kind="ok" mono>OK</Chip>
              : <Chip kind="err" mono>требует исправления</Chip>}
          </dd>
          <dt>Внутр. Ø ЭК</dt><dd>{fmt.num(values.ek_d - 2*values.ek_thikness, 1)} мм</dd>
        </dl>
      </div>
    </div>
  );
};

Object.assign(window, { VolumesPage });
