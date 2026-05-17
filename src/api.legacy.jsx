/* eslint-disable */
/**
 * src/api.jsx — HTTP-клиент для трёх бэкенд-сервисов.
 *
 * Auth API:     http://localhost:8001  (PREFIX /auth/...)
 * OPZ Predict:  http://localhost:8000  (PREFIX /predict/...)
 * Volume Calc:  http://localhost:8003  (PREFIX /calculate_vols)
 *
 * Адаптеры:
 *  - volumesApi:  конвертирует multi-section мм → один NKT + метры для бэка;
 *                 нормализует ответ в форму { reagents, meta } для UI.
 *  - predictApi:  разворачивает q_liquid_history[] → month_N_before;
 *                 делает два запроса (/predict + /predict/baseline) и
 *                 возвращает объединённый объект с baseline_months.
 */

const AUTH_URL = 'http://localhost:8001';
const OPZ_URL  = 'http://localhost:8000';
const VOL_URL  = 'http://localhost:8003';

// ─── Regex-константы (используются в pages-auth.jsx / pages-app.jsx) ──────
const USERNAME_RE = /^[A-Za-z0-9_-]{3,50}$/;
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*\d).{8,128}$/;

// ─── Хранилище токенов ──────────────────────────────────────────────────────
const TOKEN_KEYS = { access: 'access_token', refresh: 'refresh_token' };
const tokenStore = {
  getAccess()  { return localStorage.getItem(TOKEN_KEYS.access); },
  getRefresh() { return localStorage.getItem(TOKEN_KEYS.refresh); },
  set(access, refresh) {
    if (access)  localStorage.setItem(TOKEN_KEYS.access, access);
    if (refresh) localStorage.setItem(TOKEN_KEYS.refresh, refresh);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.refresh);
  },
};

// ─── Тип ошибки ─────────────────────────────────────────────────────────────
class ApiError extends Error {
  constructor(status, data, message) {
    super(message || (data && data.detail) || `HTTP ${status}`);
    this.status = status;
    this.data   = data || {};
  }
}

// ─── Базовый fetch ──────────────────────────────────────────────────────────
async function _fetchJson(url, opts = {}) {
  const { method = 'GET', body, headers = {}, skipAuth = false } = opts;
  const token = !skipAuth ? tokenStore.getAccess() : null;
  const allHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
  const res = await fetch(url, {
    method,
    headers: allHeaders,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

// ─── Обёртка с авто-рефрешем при 401 ───────────────────────────────────────
let _refreshing = null;

async function apiCall(url, opts = {}) {
  try {
    return await _fetchJson(url, opts);
  } catch (e) {
    if (e.status === 401 && !opts._retried && tokenStore.getRefresh()) {
      if (!_refreshing) {
        _refreshing = _fetchJson(`${AUTH_URL}/auth/refresh`, {
          method: 'POST',
          body: { refresh_token: tokenStore.getRefresh() },
          skipAuth: true,
        }).then(r => {
          tokenStore.set(r.access_token, r.refresh_token);
        }).finally(() => { _refreshing = null; });
      }
      try {
        await _refreshing;
        return apiCall(url, { ...opts, _retried: true });
      } catch (refreshErr) {
        tokenStore.clear();
        window.dispatchEvent(new CustomEvent('opz:auth-expired'));
        throw refreshErr;
      }
    }
    throw e;
  }
}

// ─── Auth API ────────────────────────────────────────────────────────────────
const authApi = {
  async login(body) {
    const r = await _fetchJson(`${AUTH_URL}/auth/login`, {
      method: 'POST', body, skipAuth: true,
    });
    tokenStore.set(r.access_token, r.refresh_token);
    return r;
  },
  async register(body) {
    return _fetchJson(`${AUTH_URL}/auth/register`, { method: 'POST', body, skipAuth: true });
  },
  async refresh() {
    const r = await _fetchJson(`${AUTH_URL}/auth/refresh`, {
      method: 'POST',
      body: { refresh_token: tokenStore.getRefresh() },
      skipAuth: true,
    });
    tokenStore.set(r.access_token, r.refresh_token);
    return r;
  },
  async logout() {
    const rt = tokenStore.getRefresh();
    try {
      if (rt) {
        await _fetchJson(`${AUTH_URL}/auth/logout`, {
          method: 'POST', body: { refresh_token: rt }, skipAuth: true,
        });
      }
    } finally { tokenStore.clear(); }
  },
  async me()              { return apiCall(`${AUTH_URL}/auth/me`); },
  async changePassword(b) { return apiCall(`${AUTH_URL}/auth/me/password`, { method: 'PUT', body: b }); },
  async forgotPassword(b) {
    return _fetchJson(`${AUTH_URL}/auth/forgot-password`, { method: 'POST', body: b, skipAuth: true });
  },
  async resetPassword(b) {
    return _fetchJson(`${AUTH_URL}/auth/reset-password`, { method: 'POST', body: b, skipAuth: true });
  },
};

// ─── Утилита: разворачивает q_liquid_history[] в month_N_before ─────────────
function _flattenHistory(body) {
  const hist = body.q_liquid_history || [];
  const flat = {};
  hist.forEach((v, i) => { flat[`month_${i + 1}_before`] = v; });
  const { q_liquid_history, ...rest } = body;
  return { ...rest, ...flat };
}

// ─── OPZ Predict API ─────────────────────────────────────────────────────────
const predictApi = {
  async predict(body) {
    const flat = _flattenHistory(body);
    // Параллельно запрашиваем прогноз и базовую экстраполяцию Арпс
    const [pred, base] = await Promise.all([
      apiCall(`${OPZ_URL}/predict`,          { method: 'POST', body: flat }),
      apiCall(`${OPZ_URL}/predict/baseline`, { method: 'POST', body: flat }),
    ]);
    return {
      months_after:    pred.months_after,
      effect:          pred.effect,
      cumulative:      pred.cumulative,
      baseline_months: base.months_baseline,
    };
  },

  async predictBaseline(body) {
    const flat = _flattenHistory(body);
    const r = await apiCall(`${OPZ_URL}/predict/baseline`, { method: 'POST', body: flat });
    return { months_after: r.months_baseline };
  },

  async predictBatch(body) {
    const inputWells = body.wells || [];
    const transformed = { wells: inputWells.map(_flattenHistory) };
    const r = await apiCall(`${OPZ_URL}/predict/batch`, { method: 'POST', body: transformed });
    // Бэк возвращает results[] без well_id — прикрепляем из входных данных
    return {
      results: r.results.map((res, i) => ({
        well_id:     inputWells[i] ? inputWells[i].well_id : `well-${i + 1}`,
        ok:          true,
        months_after: res.months_after,
        effect:       res.effect,
        cumulative:   res.cumulative,
      })),
    };
  },
};

// ─── Volume Calc API ─────────────────────────────────────────────────────────
const volumesApi = {
  /**
   * Принимает form-values с nkt_sections (мм) и ek_d/ek_thikness (мм).
   * Конвертирует в формат бэка (последняя секция НКТ, всё в метрах).
   * Нормализует ответ в { reagents, meta } для совместимости с UI.
   */
  async calculateVolumes(formBody) {
    const sections = formBody.nkt_sections || [];
    const last = sections[sections.length - 1] || { d: 73, thickness: 5.5, bottom: 0 };

    const apiBody = {
      well_id:      formBody.well_id,
      perf_sum:     formBody.perf_sum,
      nkt_d:        last.d        / 1000,
      nkt_thikness: last.thickness / 1000,
      nkt_depth:    last.bottom,
      perf_depth:   formBody.perf_depth,
      ek_d:         formBody.ek_d        / 1000,
      ek_thikness:  formBody.ek_thikness / 1000,
    };

    const r = await apiCall(`${VOL_URL}/calculate_vols`, { method: 'POST', body: apiBody });

    // Вычисляем объём НКТ на клиенте из multi-section формы (для отображения)
    let nktVol = 0;
    sections.forEach((sec, i) => {
      const ri  = (sec.d - 2 * sec.thickness) / 2 / 1000; // мм → м, внутренний радиус
      const top = i === 0 ? 0 : sections[i - 1].bottom;
      nktVol   += Math.PI * ri * ri * (sec.bottom - top);
    });
    const ekRi  = (formBody.ek_d - 2 * formBody.ek_thikness) / 2 / 1000;
    const ekVol = Math.PI * ekRi * ekRi * (formBody.perf_depth - last.bottom);
    const rnd   = v => Math.round(v * 1000) / 1000;

    // Нормализуем ответ в форму, ожидаемую pages-volumes.jsx
    return {
      well_id: r.well_id,
      reagents: {
        ks_vol:          r.ks_vol,
        flush_vol:        r.fluid_vol,
        commercial_acid:  r.tovar_kislota_vol,
        bacl2_kg:         r.hlor_bar_mass,
        // m³ → литры для отображения в таблице (единицы измерения в REAGENT_META — л)
        fe_stabilizer_l:  Math.round(r.stabilizer_vol  * 1000 * 10) / 10,
        inhibitor_l:      Math.round(r.inhibitor_vol   * 1000 * 10) / 10,
        activator_l:      Math.round(r.intensifier_vol * 1000 * 10) / 10,
        hf_acid_m3:       r.plavikov_vol,
        water_m3:         r.water_vol,
      },
      meta: {
        nkt_volume_m3:   rnd(nktVol),
        ek_volume_m3:    rnd(ekVol),
        total_well_m3:   rnd(nktVol + ekVol),
        computed_at:     new Date().toISOString(),
      },
    };
  },
};

// ─── Экспорт в window (совместимость с inline-скриптами без бандлера) ────────
Object.assign(window, {
  ApiError, tokenStore, authApi, predictApi, volumesApi,
  USERNAME_RE, EMAIL_RE, PASSWORD_RE,
});
