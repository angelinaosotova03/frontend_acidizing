/* eslint-disable */
/**
 * src/pages-predict.jsx — Predict pages.
 *   /predict       → single-well prediction with 3 charts + KPI
 *   /predict/batch → CSV batch
 */

const { useState: pUseState, useEffect: pUseEffect, useMemo: pUseMemo, useRef: pUseRef } = React;

const PREDICT_DEFAULTS = {
  q_liquid_history: [38.2, 36.1, 34.4, 32.9, 31.6, 30.2, 29.0, 27.7, 26.4, 25.2, 24.0, 22.9],
  ks_vol:        6.5,
  flush_vol:     14.0,
  perf_sum:      12.5,
  nkt_vol:       10.3,
  to_lower_perf: 0,
  grp_done:      1,
  grp_mass:      18,
  is_horizontal: 0,
};
const PREDICT_EXAMPLE_FLAT = {
  q_liquid_history: [22.4, 21.6, 20.9, 20.1, 19.4, 18.7, 18.0, 17.4, 16.7, 16.1, 15.5, 14.9],
  ks_vol: 4.8, flush_vol: 11.5, perf_sum: 9.2, nkt_vol: 8.1,
  to_lower_perf: 1, grp_done: 0, grp_mass: 0, is_horizontal: 0,
};

// ─── Single Predict Page ──────────────────────────────────────────────
const PredictPage = () => {
  const toast = useToast();
  const { consume } = useHandoff();

  const [values, setValues] = pUseState(PREDICT_DEFAULTS);
  const [errors, setErrors] = pUseState({});
  const [loading, setLoading] = pUseState(false);
  const [result, setResult] = pUseState(null);
  const [view, setView] = pUseState('charts'); // 'charts' | 'json'

  // Consume volumes→predict handoff on mount
  pUseEffect(() => {
    const payload = consume();
    if (payload) {
      setValues(s => ({ ...s, ks_vol: payload.ks_vol, flush_vol: payload.flush_vol, perf_sum: payload.perf_sum, nkt_vol: payload.nkt_vol }));
      toast.info('Параметры подставлены', `Скважина ${payload.well_id || ''}`.trim());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setQ = (i, v) => {
    const arr = values.q_liquid_history.slice();
    arr[i] = v;
    setValues(s => ({ ...s, q_liquid_history: arr }));
  };
  const setField = (k, v) => setValues(s => ({ ...s, [k]: v }));

  const clientValidate = () => {
    const errs = {};
    if (values.q_liquid_history.some(v => !(v >= 0))) errs.q_liquid_history = 'Все 12 значений должны быть ≥ 0';
    if (values.q_liquid_history.every(v => v === 0)) errs.q_liquid_history = 'Хотя бы одно значение должно быть > 0';
    if (values.grp_done && !(values.grp_mass > 0)) errs.grp_mass = 'При активном ГРП масса должна быть > 0';
    if (!values.grp_done && values.grp_mass > 0)   errs.grp_mass = 'При выключенном ГРП масса должна быть = 0';
    if (!(values.ks_vol > 0))     errs.ks_vol = 'Должно быть > 0';
    if (!(values.flush_vol > 0))  errs.flush_vol = 'Должно быть > 0';
    if (!(values.perf_sum > 0))   errs.perf_sum = 'Должно быть > 0';
    if (!(values.nkt_vol > 0))    errs.nkt_vol = 'Должно быть > 0';
    return errs;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = clientValidate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setLoading(true);
    try {
      const r = await predictApi.predict(values);
      setResult(r);
      toast.success('Прогноз готов', `Эффект в 1‑й месяц: +${fmt.num(r.effect, 2)} м³/сут`);
    } catch (e) {
      if (e.status === 422) setErrors(fieldErrorsFrom422(e));
      const d = describeApiError(e); toast.push(d);
    } finally { setLoading(false); }
  };

  const onExample = () => { setValues(PREDICT_EXAMPLE_FLAT); setErrors({}); };
  const onReset   = () => { setValues(PREDICT_DEFAULTS);    setErrors({}); setResult(null); };

  const handleGrpToggle = (on) => {
    if (on) setValues(s => ({ ...s, grp_done: 1, grp_mass: s.grp_mass || 15 }));
    else    setValues(s => ({ ...s, grp_done: 0, grp_mass: 0 }));
  };

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] text-ink-500 font-semibold mb-1">Расчёты · /predict</div>
          <h1 className="text-[26px] font-semibold tracking-tight">Прогноз эффекта ОПЗ</h1>
          <p className="text-sm text-ink-500 mt-1 max-w-[64ch]">
            12 месяцев истории + параметры обработки → прогноз дебита, базовая Арпс‑экстраполяция и накопленный эффект.
          </p>
        </div>
        <div className="flex gap-2">
          <Tabs value="single" onChange={(v) => v==='batch' && (window.location.hash='#/predict/batch')} items={[
            { value:'single', label:'Одна скважина', icon: <Icons.TrendUp size={12}/> },
            { value:'batch',  label:'Батч (CSV)',    icon: <Icons.Database size={12}/> },
          ]}/>
          <Button variant="ghost"     icon={<Icons.Plus size={14}/>}    onClick={onExample}>Пример</Button>
          <Button variant="secondary" icon={<Icons.Refresh size={13}/>} onClick={onReset}>Сбросить</Button>
        </div>
      </header>

      {/* Two-column inputs */}
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Section A: history */}
          <Card className="lg:col-span-7" title="История дебита жидкости" badge="секция А · 12 месяцев"
                right={
                  <div className="flex items-center gap-2 text-[11px] text-ink-500">
                    <Icons.Wave size={12}/> ед. <span className="mono">м³/сут</span>
                  </div>
                }>
            <div className="grid grid-cols-4 gap-2.5">
              {values.q_liquid_history.map((v, i) => (
                <Field key={i}
                       label={<span className="mono">M{(i-11) < 0 ? (i-11).toString() : '+'+(i-11)}</span>}
                       unit={i === 11 ? 'тек.' : null}>
                  <NumberInput value={v} onChange={e=>setQ(i, +e.target.value)}/>
                </Field>
              ))}
            </div>
            {errors.q_liquid_history && (
              <div className="field-error mt-2">{errors.q_liquid_history}</div>
            )}

            <div className="mt-4 pt-4 border-t border-ink-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-ink-500">
                <Icons.Activity size={12}/>
                <span>Тренд: <span className="mono text-ink-700">
                  {(() => {
                    const a = values.q_liquid_history[0], b = values.q_liquid_history[11];
                    const p = a > 0 ? ((b/a - 1) * 100) : 0;
                    const sign = p >= 0 ? '+' : '';
                    return sign + p.toFixed(1) + '%';
                  })()}
                </span></span>
              </div>
              <button type="button" className="link text-[12px]"
                      onClick={() => {
                        // monotonic decline starting at 30 — quick fill
                        const arr = Array.from({length:12}, (_, i) => Math.round((30 * Math.pow(0.97, i))*10)/10);
                        setValues(s => ({ ...s, q_liquid_history: arr }));
                      }}>
                Заполнить кривой Арпс
              </button>
            </div>
          </Card>

          {/* Section B: treatment params */}
          <Card className="lg:col-span-5" title="Параметры обработки" badge="секция Б">
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="Объём КС" unit="м³" error={errors.ks_vol}>
                <NumberInput value={values.ks_vol} onChange={e=>setField('ks_vol', +e.target.value)} error={errors.ks_vol}/>
              </Field>
              <Field label="Объём продавки" unit="м³" error={errors.flush_vol}>
                <NumberInput value={values.flush_vol} onChange={e=>setField('flush_vol', +e.target.value)} error={errors.flush_vol}/>
              </Field>
              <Field label="Перф. толщина" unit="м" error={errors.perf_sum}>
                <NumberInput value={values.perf_sum} onChange={e=>setField('perf_sum', +e.target.value)} error={errors.perf_sum}/>
              </Field>
              <Field label="Объём НКТ" unit="м³" error={errors.nkt_vol}>
                <NumberInput value={values.nkt_vol} onChange={e=>setField('nkt_vol', +e.target.value)} error={errors.nkt_vol}/>
              </Field>
            </div>

            <div className="mt-4 pt-4 border-t border-ink-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-ink-900">Закачка в нижние интервалы</div>
                  <div className="text-[11px] text-ink-500">to_lower_perf</div>
                </div>
                <Toggle value={!!values.to_lower_perf} onChange={v=>setField('to_lower_perf', v?1:0)}/>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-ink-900">Горизонтальная скважина</div>
                  <div className="text-[11px] text-ink-500">is_horizontal</div>
                </div>
                <Toggle value={!!values.is_horizontal} onChange={v=>setField('is_horizontal', v?1:0)}/>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-ink-900">Ранее проведён ГРП</div>
                  <div className="text-[11px] text-ink-500">grp_done</div>
                </div>
                <Toggle value={!!values.grp_done} onChange={handleGrpToggle}/>
              </div>

              {values.grp_done ? (
                <Field label="Масса проппанта (ГРП)" unit="т" error={errors.grp_mass}
                       help="Появляется когда включён ГРП">
                  <NumberInput value={values.grp_mass} onChange={e=>setField('grp_mass', +e.target.value)} error={errors.grp_mass}/>
                </Field>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[11px] text-ink-500">
            Сервис: <span className="mono">POST /predict</span> · модель LGBM v1.4 · MAE ≈ 8.4%
          </div>
          <Button type="submit" size="lg" loading={loading} icon={!loading && <Icons.TrendUp size={14}/>}>
            Запустить прогноз
          </Button>
        </div>
      </form>

      {/* Results */}
      {result && <PredictResults result={result} values={values} view={view} setView={setView}/>}
    </div>
  );
};

// ─── Results ─────────────────────────────────────────────────────────
const PredictResults = ({ result, values, view, setView }) => {
  const baseline = result.baseline_months;
  const forecast = result.months_after;
  const peak = Math.max(...forecast.map((v, i) => v - baseline[i]));

  return (
    <div className="space-y-5 page-enter">
      <SectionRule>Результаты прогноза</SectionRule>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Эффект в 1‑й месяц" value={result.effect} unit="м³/сут" color="#22C55E" decimals={2} delta/>
        <KpiCard label="Пиковый эффект" value={peak} unit="м³/сут" color="#16A34A" decimals={2} delta/>
        <KpiCard label="Накопленная доб." value={result.cumulative} unit="м³" color="#F97316" decimals={1}/>
        <KpiCard label="Прирост за 12 мес" value={forecast.reduce((a,b)=>a+b,0) / baseline.reduce((a,b)=>a+b,0) * 100 - 100} unit="%" color="#2563EB" decimals={1} delta/>
      </div>

      {/* 3 charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Базовая экстраполяция Арпс"
              badge="без ОПЗ"
              right={<span className="dot red"/>}>
          <BaselineChart baseline={baseline} history={values.q_liquid_history}/>
          <div className="text-[11px] text-ink-500 mt-2 leading-relaxed">
            Прогноз дебита без обработки. Метод Арпса по последним 6 месяцам истории, b = 0.4.
          </div>
        </Card>
        <Card title="Прогноз после ОПЗ"
              badge="vs базовый"
              right={<div className="flex gap-2"><span className="dot red"/><span className="dot green"/></div>}>
          <ForecastChart baseline={baseline} forecast={forecast}/>
          <div className="text-[11px] text-ink-500 mt-2 leading-relaxed">
            Сравнение: красный пунктир — Арпс, зелёный — прогноз ML‑модели с учётом ОПЗ.
          </div>
        </Card>
        <Card title="Накопленный эффект"
              badge="прирост по месяцам"
              right={<span className="dot orange"/>}>
          <CumulativeChart baseline={baseline} forecast={forecast}/>
          <div className="text-[11px] text-ink-500 mt-2 leading-relaxed">
            За месяц (столбцы) и нарастающим итогом (область). 1 месяц ≈ 30 суток.
          </div>
        </Card>
      </div>

      {/* Detail table + JSON */}
      <Card title="Помесячная таблица" badge="м³/сут"
            right={
              <Tabs value={view} onChange={setView} items={[
                { value:'charts', label:'Таблица' },
                { value:'json',   label:'JSON' },
              ]}/>
            }>
        {view === 'charts' ? (
          <div className="overflow-x-auto">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Метрика</th>
                  {forecast.map((_, i) => <th key={i} className="num">M+{i+1}</th>)}
                  <th className="num">Σ за 12</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="flex items-center gap-2"><span className="dot red"/> Без ОПЗ (Арпс)</div>
                  </td>
                  {baseline.map((v,i) => <td key={i} className="num">{fmt.num(v,2)}</td>)}
                  <td className="num font-semibold">{fmt.num(baseline.reduce((a,b)=>a+b,0), 2)}</td>
                </tr>
                <tr>
                  <td>
                    <div className="flex items-center gap-2"><span className="dot green"/> С ОПЗ</div>
                  </td>
                  {forecast.map((v,i) => <td key={i} className="num">{fmt.num(v,2)}</td>)}
                  <td className="num font-semibold">{fmt.num(forecast.reduce((a,b)=>a+b,0), 2)}</td>
                </tr>
                <tr>
                  <td>
                    <div className="flex items-center gap-2"><span className="dot orange"/> Δ эффект</div>
                  </td>
                  {forecast.map((v,i) => {
                    const d = v - baseline[i];
                    return <td key={i} className={`num ${d>0?'text-green-700':''}`}>{fmt.delta(d, 2)}</td>;
                  })}
                  <td className="num font-semibold text-green-700">
                    {fmt.delta(forecast.reduce((a,b)=>a+b,0) - baseline.reduce((a,b)=>a+b,0), 2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <pre className="codeblock">{JSON.stringify(result, null, 2)}</pre>
        )}
      </Card>
    </div>
  );
};

const KpiCard = ({ label, value, unit, color, decimals=2, delta=false }) => (
  <div className="kpi" style={{ borderTopColor: color }}>
    <div className="label">{label}</div>
    <div className="value tabnum">
      {delta && value > 0 ? '+' : ''}
      {fmt.num(value, decimals)}
      {unit && <span className="unit">{unit}</span>}
    </div>
    <div className={'delta ' + (value > 0 ? 'up' : value < 0 ? 'down' : '')} style={{ color }}>
      {value > 0 ? <Icons.TrendUp size={11}/> : null}
      <span className="mono">{value > 0 ? 'прирост' : value < 0 ? 'снижение' : '—'}</span>
    </div>
  </div>
);

// ─── Batch Predict Page ───────────────────────────────────────────────
const PredictBatchPage = () => {
  const toast = useToast();
  const fileInput = pUseRef(null);
  const [rows, setRows] = pUseState([]);      // input wells[]
  const [errors, setErrors] = pUseState([]);
  const [results, setResults] = pUseState([]);
  const [loading, setLoading] = pUseState(false);
  const [selected, setSelected] = pUseState(null);
  const [dragOver, setDragOver] = pUseState(false);

  const stats = pUseMemo(() => {
    const ok = results.filter(r => r.ok);
    if (!ok.length) return null;
    const effects = ok.map(r => r.effect);
    return {
      total: results.length, ok: ok.length, failed: results.length - ok.length,
      avgEffect: effects.reduce((a,b)=>a+b,0)/effects.length,
      cumSum:    ok.reduce((a,b)=>a+b.cumulative,0),
      maxEffect: Math.max(...effects),
    };
  }, [results]);

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const { wells, errors } = parseBatchCsv(reader.result);
      setRows(wells);
      setErrors(errors);
      setResults([]);
      if (errors.length) toast.error('Ошибки в CSV', errors[0]);
      else toast.success('CSV загружен', `${wells.length} скважин`);
    };
    reader.readAsText(file);
  };

  const onPickFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFile(file);
    e.target.value = '';
  };
  const onDownloadTemplate = () => {
    const csv = batchCsvTemplate();
    downloadCsv('opz-batch-template.csv', csv.split('\r\n').map(r => r.split(',')));
  };
  const onAddRow = () => {
    setRows(rs => ([...rs, { well_id:`new-${rs.length+1}`, q_liquid_history: Array(12).fill(20),
      ks_vol: 5, flush_vol: 12, perf_sum: 10, nkt_vol: 8, to_lower_perf:0, grp_done:0, grp_mass:0, is_horizontal:0 }]));
  };
  const onDeleteRow = (i) => setRows(rs => rs.filter((_, j) => j !== i));

  const onRun = async () => {
    if (!rows.length) { toast.warn('Нет данных', 'Загрузите CSV или добавьте строку.'); return; }
    setLoading(true);
    try {
      const r = await predictApi.predictBatch({ wells: rows });
      setResults(r.results);
      toast.success('Батч готов', `${r.results.length} скважин`);
    } catch (e) {
      const d = describeApiError(e); toast.push(d);
    } finally { setLoading(false); }
  };

  const onExport = () => {
    if (!results.length) return;
    const csv = exportBatchResults(results);
    downloadCsv('opz-batch-results.csv', csv.split('\r\n').map(r => r.split(',')));
  };

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] text-ink-500 font-semibold mb-1">Расчёты · /predict/batch</div>
          <h1 className="text-[26px] font-semibold tracking-tight">Батч‑прогноз</h1>
          <p className="text-sm text-ink-500 mt-1 max-w-[64ch]">
            Прогноз эффекта для нескольких скважин одновременно. CSV‑импорт или ручное добавление. Лимит — 500 скважин в одном запросе.
          </p>
        </div>
        <div className="flex gap-2">
          <Tabs value="batch" onChange={(v) => v==='single' && (window.location.hash='#/predict')} items={[
            { value:'single', label:'Одна скважина', icon: <Icons.TrendUp size={12}/> },
            { value:'batch',  label:'Батч (CSV)',    icon: <Icons.Database size={12}/> },
          ]}/>
        </div>
      </header>

      {/* Input section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7" title="Источник данных">
          <div
            className={`dropzone ${dragOver?'active':''}`}
            onDragOver={e=>{e.preventDefault(); setDragOver(true);}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files&&e.dataTransfer.files[0]; if(f)handleFile(f);}}
            onClick={()=>fileInput.current && fileInput.current.click()}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">
                <Icons.Upload size={18}/>
              </div>
              <div className="text-[14px] font-medium text-ink-900">Перетащите CSV сюда или нажмите для выбора</div>
              <div className="text-[12px] text-ink-500">
                Колонки: <span className="mono">well_id, q1..q12, ks_vol, flush_vol, perf_sum, nkt_vol, to_lower_perf, grp_done, grp_mass, is_horizontal</span>
              </div>
              <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={onPickFile}/>
              <div className="flex gap-2 mt-2">
                <Button variant="secondary" size="sm" type="button" icon={<Icons.Download size={13}/>}
                        onClick={(e)=>{e.stopPropagation(); onDownloadTemplate();}}>
                  Шаблон CSV
                </Button>
                <Button variant="ghost" size="sm" type="button" icon={<Icons.Plus size={13}/>}
                        onClick={(e)=>{e.stopPropagation(); onAddRow();}}>
                  Добавить вручную
                </Button>
              </div>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="mt-3 p-3 rounded-md bg-red-50 border border-red-200 text-[12px] text-red-700">
              <div className="font-medium mb-1">Ошибки парсинга:</div>
              <ul className="list-disc pl-5 space-y-0.5">{errors.map((e,i)=><li key={i}>{e}</li>)}</ul>
            </div>
          )}

          {rows.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[12px] text-ink-500">Загружено скважин: <span className="mono text-ink-900">{rows.length}</span></div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={()=>{ setRows([]); setResults([]); }}>Очистить</Button>
                  <Button onClick={onRun} loading={loading} icon={!loading && <Icons.TrendUp size={13}/>}>
                    Запустить прогноз ({rows.length})
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[200px] overflow-y-auto border border-ink-200 rounded-md">
                <table className="dtable" style={{ fontSize:12 }}>
                  <thead>
                    <tr>
                      <th>well_id</th><th className="num">q1..q12 (последнее)</th>
                      <th className="num">ks_vol</th><th className="num">perf_sum</th>
                      <th>ГРП</th><th>гориз.</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r,i) => (
                      <tr key={i}>
                        <td className="mono">{r.well_id}</td>
                        <td className="num">{r.q_liquid_history[11]}</td>
                        <td className="num">{r.ks_vol}</td>
                        <td className="num">{r.perf_sum}</td>
                        <td>{r.grp_done ? <Chip kind="brand" mono>{r.grp_mass}т</Chip> : <span className="text-ink-400">—</span>}</td>
                        <td>{r.is_horizontal ? <Chip kind="ok" mono>гор</Chip> : <span className="text-ink-400">—</span>}</td>
                        <td className="num">
                          <button className="text-ink-400 hover:text-red-500 p-1" onClick={()=>onDeleteRow(i)}>
                            <Icons.Trash size={13}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-5" title="Сводка по результатам" badge={results.length ? `${results.length} скважин`: 'не запущено'}>
          {!stats ? (
            <Empty
              icon={<Icons.ChartLine size={18}/>}
              title="Сводка появится после прогноза"
              body="Загрузите CSV и нажмите «Запустить прогноз». Сервис обработает до 500 скважин за один вызов."
            />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Успешно"   value={stats.ok}   ofN={stats.total} color="#22C55E"/>
                <MiniStat label="С ошибкой" value={stats.failed} ofN={stats.total} color={stats.failed?'#EF4444':'#94A3B8'}/>
                <MiniStat label="Ср. эффект 1м"   value={fmt.num(stats.avgEffect, 2)} unit="м³/сут" color="#16A34A"/>
                <MiniStat label="Σ накопл."      value={fmt.num(stats.cumSum, 0)}     unit="м³"     color="#F97316"/>
              </div>
              <div className="pt-3 border-t border-ink-200/70 flex justify-end">
                <Button onClick={onExport} icon={<Icons.Download size={13}/>}>Скачать CSV ({results.length})</Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Results table */}
      {results.length > 0 && (
        <Card title="Результаты по скважинам" badge={`${results.length}`}>
          <div className="overflow-x-auto">
            <table className="dtable hover">
              <thead>
                <tr>
                  <th>Скважина</th>
                  <th>Статус</th>
                  <th className="num">Эффект 1м, м³/сут</th>
                  <th className="num">Накопл., м³</th>
                  <th>Кривая эффекта</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} onClick={() => r.ok && setSelected(r)} style={{ cursor: r.ok ? 'pointer' : 'default' }}>
                    <td className="mono text-ink-900 font-medium">{r.well_id}</td>
                    <td>
                      {r.ok
                        ? <Chip kind="ok" icon={<Icons.Check size={11}/>}>OK</Chip>
                        : <Chip kind="err" icon={<Icons.Alert size={11}/>}>{r.error || 'ошибка'}</Chip>}
                    </td>
                    <td className="num font-semibold text-green-700">{r.ok ? `+${fmt.num(r.effect, 2)}` : '—'}</td>
                    <td className="num">{r.ok ? fmt.num(r.cumulative, 1) : '—'}</td>
                    <td>{r.ok ? <SparkBar values={r.months_after}/> : '—'}</td>
                    <td className="num">
                      {r.ok && <button className="link text-[12px]" onClick={(e)=>{e.stopPropagation(); setSelected(r);}}>детали →</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail modal */}
      <Modal open={!!selected} onClose={()=>setSelected(null)} width={720}
             title={selected ? `Скважина ${selected.well_id}` : ''}
             footer={<Button variant="secondary" onClick={()=>setSelected(null)}>Закрыть</Button>}>
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Эффект 1м" value={fmt.num(selected.effect, 2)} unit="м³/сут" color="#22C55E"/>
              <MiniStat label="Накопл." value={fmt.num(selected.cumulative, 1)} unit="м³" color="#F97316"/>
              <MiniStat label="Σ за 12м" value={fmt.num(selected.months_after.reduce((a,b)=>a+b,0), 1)} unit="м³/сут" color="#2563EB"/>
            </div>
            <ForecastChart baseline={selected.months_after.map((v,i)=>v*0.7)} forecast={selected.months_after} height={200}/>
            <div className="overflow-x-auto">
              <table className="dtable" style={{fontSize:11.5}}>
                <thead>
                  <tr><th>Месяц</th>{selected.months_after.map((_,i)=><th key={i} className="num">M+{i+1}</th>)}</tr>
                </thead>
                <tbody>
                  <tr><td>Дебит</td>{selected.months_after.map((v,i)=><td key={i} className="num">{fmt.num(v,2)}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const MiniStat = ({ label, value, ofN, unit, color }) => (
  <div className="kpi" style={{ padding:'10px 12px' }}>
    <div className="label" style={{ fontSize:10 }}>{label}</div>
    <div className="value tabnum" style={{ fontSize:20, color: color || undefined }}>
      {value}
      {ofN != null && <span className="text-ink-400 text-[12px] mono ml-1">/ {ofN}</span>}
      {unit && <span className="unit" style={{ fontSize: 11 }}>{unit}</span>}
    </div>
  </div>
);

Object.assign(window, { PredictPage, PredictBatchPage });
