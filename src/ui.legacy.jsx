/* eslint-disable */
/**
 * src/ui.jsx — shared UI primitives + icons + toast system.
 * Loaded after React, before pages.
 */

const { useState, useEffect, useRef, useCallback, useContext, createContext, useMemo } = React;

// ─── Icons (mono-stroke Lucide-style) ──────────────────────────────────
const Icon = ({ d, size = 16, className = '', stroke = 'currentColor', fill = 'none', strokeWidth = 1.75, children, viewBox = '0 0 24 24' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={viewBox}
       fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
       className={className} aria-hidden="true">
    {d ? <path d={d}/> : children}
  </svg>
);

// Icon paths derived from Lucide (MIT). 24×24 viewBox, stroke-linecap/join: round.
const Icons = {
  Lock:       (p) => <Icon {...p}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>,
  User:       (p) => <Icon {...p}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>,
  Mail:       (p) => <Icon {...p}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></Icon>,
  Eye:        (p) => <Icon {...p}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></Icon>,
  EyeOff:     (p) => <Icon {...p}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></Icon>,
  ArrowRight: (p) => <Icon {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></Icon>,
  ArrowLeft:  (p) => <Icon {...p}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></Icon>,
  Check:      (p) => <Icon {...p}><path d="M20 6 9 17l-5-5"/></Icon>,
  X:          (p) => <Icon {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></Icon>,
  Info:       (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></Icon>,
  Alert:      (p) => <Icon {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></Icon>,
  LogOut:     (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></Icon>,
  Settings:   (p) => <Icon {...p}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></Icon>,
  Beaker:     (p) => <Icon {...p}><path d="M4.5 3h15"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M6 14h12"/></Icon>,
  Activity:   (p) => <Icon {...p}><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.5.5 0 0 1-.96 0L9.24 2.18a.5.5 0 0 0-.96 0l-2.35 8.36A2 2 0 0 1 4 12H2"/></Icon>,
  TrendUp:    (p) => <Icon {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></Icon>,
  Database:   (p) => <Icon {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></Icon>,
  Upload:     (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></Icon>,
  Download:   (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></Icon>,
  File:       (p) => <Icon {...p}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><polyline points="14 2 14 8 20 8"/></Icon>,
  FileSpread: (p) => <Icon {...p}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></Icon>,
  Plus:       (p) => <Icon {...p}><path d="M5 12h14"/><path d="M12 5v14"/></Icon>,
  Trash:      (p) => <Icon {...p}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></Icon>,
  Copy:       (p) => <Icon {...p}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></Icon>,
  Search:     (p) => <Icon {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></Icon>,
  Calculator: (p) => <Icon {...p}><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></Icon>,
  ChartLine:  (p) => <Icon {...p}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></Icon>,
  Wave:       (p) => <Icon {...p}><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></Icon>,
  Droplet:    (p) => <Icon {...p}><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></Icon>,
  Layers:     (p) => <Icon {...p}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></Icon>,
  Clock:      (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>,
  Save:       (p) => <Icon {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></Icon>,
  Pipe:       (p) => <Icon {...p}><path d="M4 4v16"/><path d="M20 4v16"/><path d="M4 8h16"/><path d="M4 16h16"/></Icon>,
  Drill:      (p) => <Icon {...p}><path d="M14 6a2 2 0 0 1 2 2v1H4V8a2 2 0 0 1 2-2Z"/><path d="M14 9v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><path d="M10 14v8"/><path d="M14 9h4a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-4"/><path d="M18 14h-4"/></Icon>,
  Refresh:    (p) => <Icon {...p}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></Icon>,
  ChevronDown:(p) => <Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>,
  KeyRound:   (p) => <Icon {...p}><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor" stroke="none"/></Icon>,
  Atom:       (p) => <Icon {...p}><circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/></Icon>,
  Flask:      (p) => <Icon {...p}><path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"/><path d="M6.453 15h11.094"/><path d="M8.5 2h7"/></Icon>,
  Help:       (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></Icon>,
};

// ─── Button ────────────────────────────────────────────────────────────
const Button = (props) => {
  const {
    variant = 'primary', size = 'md',
    loading = false, disabled = false,
    icon, iconRight, children,
    type = 'button', className = '',
    ...rest
  } = props;
  const cls = `btn btn-${variant} ${size==='lg'?'btn-lg':size==='sm'?'btn-sm':''} ${className}`.trim();
  return (
    <button type={type} disabled={disabled||loading} className={cls} {...rest}>
      {loading && <span className={'spinner ' + (variant==='primary'?'':'dark')} />}
      {!loading && icon}
      {children}
      {!loading && iconRight}
    </button>
  );
};

// ─── Form primitives ───────────────────────────────────────────────────
const Field = ({ label, unit, help, error, children, htmlFor, optional }) => (
  <div className="flex flex-col h-full">
    {label && (
      <label htmlFor={htmlFor} className="field-label">
        <span>{label}{optional && <span className="ml-1 normal-case font-medium text-ink-400">(опц.)</span>}</span>
        {unit && <span className="unit">{unit}</span>}
      </label>
    )}
    <div className="mt-auto">
      {children}
      {error ? <div className="field-error">{error}</div> : help ? <div className="field-help">{help}</div> : null}
    </div>
  </div>
);

const Input = (props) => {
  const { as = 'input', error, mono = false, className = '', innerRef, ...rest } = props;
  const Tag = as;
  return <Tag ref={innerRef} className={`input ${mono?'':'input-text'} ${error?'error':''} ${className}`} {...rest} />;
};

const NumberInput = (props) => <Input type="number" step="any" mono {...props} />;

const PasswordInput = (props) => {
  const { error, ...rest } = props;
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show?'text':'password'} error={error} {...rest} className="pr-9" />
      <button type="button" onClick={()=>setShow(s=>!s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-700">
        {show ? <Icons.EyeOff size={15}/> : <Icons.Eye size={15}/>}
      </button>
    </div>
  );
};

// Toggle (switch)
const Toggle = ({ value, onChange, label, disabled, children }) => (
  <button type="button" onClick={() => !disabled && onChange(!value)}
          className={`toggle ${value?'on':''} ${disabled?'disabled':''}`}>
    <span className="track"><span className="knob"/></span>
    {(label || children) && <span className="text-sm text-ink-700">{label || children}</span>}
  </button>
);

// ─── Toast system ──────────────────────────────────────────────────────
const ToastCtx = createContext(null);
const useToast = () => useContext(ToastCtx);

const ToastHost = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(s => [...s, { id, ...t }]);
    setTimeout(() => setToasts(s => s.filter(x => x.id !== id)), t.duration || 4200);
  }, []);
  const api = useMemo(() => ({
    push,
    success: (title, body) => push({ kind:'ok',   title, body }),
    error:   (title, body) => push({ kind:'err',  title, body }),
    warn:    (title, body) => push({ kind:'warn', title, body }),
    info:    (title, body) => push({ kind:'info', title, body }),
  }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.kind||'info'}`}>
            <div className="mt-0.5">
              {t.kind==='ok'   && <Icons.Check size={16} className="text-green-600"/>}
              {t.kind==='err'  && <Icons.Alert size={16} className="text-red-500"/>}
              {t.kind==='warn' && <Icons.Alert size={16} className="text-amber-500"/>}
              {(t.kind==='info'||!t.kind) && <Icons.Info size={16} className="text-brand-600"/>}
            </div>
            <div className="flex-1">
              <div className="toast-title">{t.title}</div>
              {t.body && <div className="toast-body">{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

// translate API errors into toasts
function describeApiError(e) {
  if (!e) return { title: 'Неизвестная ошибка' };
  if (e.status === 503) return { kind:'warn', title:'Модель не загружена', body:'Обратитесь к администратору сервиса.' };
  if (e.status === 429) return { kind:'warn', title:'Слишком много попыток', body:'Попробуйте через минуту.' };
  if (e.status === 401) return { kind:'err',  title:'Сессия истекла', body:'Войдите ещё раз.' };
  if (e.status === 422) return { kind:'err',  title:'Ошибка валидации', body: 'Проверьте подсвеченные поля.' };
  if (e.status >= 500)  return { kind:'err',  title:'Ошибка сервера', body:'Попробуйте повторить запрос.' };
  if (e.status === 409) return { kind:'err',  title:'Конфликт данных', body: (e.data && e.data.detail) || '' };
  return { kind:'err', title:'Ошибка', body: (e.data && e.data.detail) || e.message };
}

// helper: pull a per-field map out of FastAPI 422 detail
function fieldErrorsFrom422(e) {
  if (!e || e.status !== 422) return {};
  const detail = (e.data && e.data.detail);
  if (!Array.isArray(detail)) return {};
  const map = {};
  for (const d of detail) {
    const key = Array.isArray(d.loc) ? d.loc[d.loc.length-1] : d.loc;
    map[key] = d.msg;
  }
  return map;
}

// ─── Misc layout helpers ────────────────────────────────────────────────
const Card = ({ title, badge, right, padded=true, className='', children }) => (
  <div className={`card ${className}`}>
    {(title || right) && (
      <div className="card-header">
        <div className="card-title">
          {title}
          {badge && <span className="badge">{badge}</span>}
        </div>
        {right}
      </div>
    )}
    {padded ? <div className="card-body">{children}</div> : children}
  </div>
);

const Tabs = ({ value, onChange, items }) => (
  <div className="tabs">
    {items.map(it => (
      <button key={it.value} className={value===it.value?'active':''} onClick={()=>onChange(it.value)}>
        {it.icon && <span className="mr-1.5 inline-flex align-middle">{it.icon}</span>}
        {it.label}
      </button>
    ))}
  </div>
);

const Chip = ({ kind='', icon, children, mono=false }) =>
  <span className={`chip ${kind} ${mono?'mono':''}`}>{icon && <span>{icon}</span>}{children}</span>;

const SectionRule = ({ children, right }) => (
  <div className="flex items-baseline gap-3 mb-3 mt-1">
    <div className="section-rule m-0 flex-1">{children}</div>
    {right}
  </div>
);

const Empty = ({ icon, title, body, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-6">
    <div className="w-10 h-10 rounded-lg bg-ink-50 flex items-center justify-center text-ink-400 mb-3">{icon}</div>
    <div className="font-medium text-ink-900">{title}</div>
    {body && <div className="text-sm text-ink-500 mt-1 max-w-sm">{body}</div>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// Confirmation modal
const Modal = ({ open, onClose, title, children, footer, width=420 }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key==='Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
         style={{ background:'rgba(15,23,42,0.45)' }} onClick={onClose}>
      <div className="card shadow-pop" style={{ width: '100%', maxWidth: width }} onClick={e=>e.stopPropagation()}>
        <div className="card-header">
          <div className="card-title">{title}</div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icons.X size={15}/></button>
        </div>
        <div className="card-body">{children}</div>
        {footer && <div className="px-[18px] pb-[14px] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

// ─── Format helpers ────────────────────────────────────────────────────
const fmt = {
  num(v, decimals=2) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    const n = Number(v);
    return n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  },
  int(v) { return v == null ? '—' : Number(v).toLocaleString('ru-RU'); },
  date(s) {
    if (!s) return '—';
    const d = new Date(s);
    return d.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' });
  },
  dateTime(s) {
    if (!s) return '—';
    const d = new Date(s);
    return d.toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  },
  delta(v, decimals=1) {
    if (v == null) return '—';
    const sign = v > 0 ? '+' : '';
    return sign + Number(v).toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  },
};

// ─── Export to globals ─────────────────────────────────────────────────
Object.assign(window, {
  Icon, Icons,
  Button, Field, Input, NumberInput, PasswordInput, Toggle,
  Card, Tabs, Chip, SectionRule, Empty, Modal,
  ToastHost, useToast, describeApiError, fieldErrorsFrom422,
  fmt,
});
