/* eslint-disable */
/**
 * src/csv.jsx — tiny CSV parser/encoder for batch import/export.
 * No third-party — naive but handles quoted strings and commas correctly.
 */

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  const flushField = () => { row.push(field); field = ''; };
  const flushRow   = () => { rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i+1];
    if (inQ) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') flushField();
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { flushField(); flushRow(); }
      else field += c;
    }
  }
  if (field.length || row.length) { flushField(); flushRow(); }
  // drop trailing empty row
  if (rows.length && rows[rows.length-1].length === 1 && rows[rows.length-1][0] === '') rows.pop();
  return rows;
}

function toCsv(rows) {
  return rows.map(r =>
    r.map(c => {
      const s = c == null ? '' : String(c);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(',')
  ).join('\r\n');
}

function downloadCsv(filename, rows) {
  const csv = toCsv(rows);
  // Excel-friendly with BOM
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Parse a batch-predict CSV into wells[].
 * Header must contain: well_id, q1..q12, ks_vol, flush_vol, perf_sum, nkt_vol,
 *                      to_lower_perf, grp_done, grp_mass, is_horizontal
 */
function parseBatchCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) return { wells: [], errors: ['Файл пуст'] };
  const [headerRaw, ...body] = rows;
  const header = headerRaw.map(h => h.trim().toLowerCase());

  const idx = (name) => header.indexOf(name);
  const need = ['well_id','ks_vol','flush_vol','perf_sum','nkt_vol','to_lower_perf','grp_done','grp_mass','is_horizontal'];
  for (let i = 1; i <= 12; i++) need.push('q' + i);
  const missing = need.filter(n => idx(n) === -1);
  if (missing.length) return { wells: [], errors: ['Не хватает колонок: ' + missing.join(', ')] };

  const num = (v) => {
    const s = (v || '').toString().replace(',', '.').trim();
    if (s === '') return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const wells = [];
  const errors = [];
  body.forEach((r, i) => {
    if (!r.length || r.every(c => !c || !c.trim())) return;
    try {
      const hist = [];
      for (let q = 1; q <= 12; q++) hist.push(num(r[idx('q'+q)]));
      wells.push({
        well_id:       r[idx('well_id')] || `row-${i+1}`,
        q_liquid_history: hist,
        ks_vol:        num(r[idx('ks_vol')]),
        flush_vol:     num(r[idx('flush_vol')]),
        perf_sum:      num(r[idx('perf_sum')]),
        nkt_vol:       num(r[idx('nkt_vol')]),
        to_lower_perf: num(r[idx('to_lower_perf')]) ? 1 : 0,
        grp_done:      num(r[idx('grp_done')]) ? 1 : 0,
        grp_mass:      num(r[idx('grp_mass')]),
        is_horizontal: num(r[idx('is_horizontal')]) ? 1 : 0,
      });
    } catch (e) {
      errors.push(`Строка ${i+2}: ${e.message}`);
    }
  });
  return { wells, errors };
}

/** Build a CSV template that users can fill in */
function batchCsvTemplate() {
  const header = ['well_id'];
  for (let i = 1; i <= 12; i++) header.push('q'+i);
  header.push('ks_vol','flush_vol','perf_sum','nkt_vol','to_lower_perf','grp_done','grp_mass','is_horizontal');
  const example1 = ['Самотлор-4127', 38.2, 36.1, 34.4, 32.9, 31.6, 30.2, 29.0, 27.7, 26.4, 25.2, 24.0, 22.9,
                    6.5, 14.0, 9.2, 3.4, 0, 1, 18, 0];
  const example2 = ['Приобское-8821', 22.4, 21.6, 20.9, 20.1, 19.4, 18.7, 18.0, 17.4, 16.7, 16.1, 15.5, 14.9,
                    4.8, 11.5, 7.6, 2.8, 1, 0, 0, 0];
  return toCsv([header, example1, example2]);
}

/** Export batch-predict results to CSV */
function exportBatchResults(results) {
  const header = ['well_id','ok','effect_m3_d','cumulative_m3','m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12','error'];
  const rows = results.map(r => {
    if (!r.ok) return [r.well_id, 0, '', '', '', '', '', '', '', '', '', '', '', '', '', '', r.error || 'error'];
    return [r.well_id, 1, r.effect, r.cumulative, ...r.months_after, ''];
  });
  return toCsv([header, ...rows]);
}

Object.assign(window, { parseCsv, toCsv, downloadCsv, parseBatchCsv, batchCsvTemplate, exportBatchResults });
