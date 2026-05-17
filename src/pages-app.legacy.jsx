/* eslint-disable */
/**
 * src/pages-app.jsx — AppShell, Header, Sidebar, Dashboard, Profile.
 * Volumes and Predict pages are split into pages-volumes.jsx and pages-predict.jsx.
 */

const { useState: appUseState, useEffect: appUseEffect, useMemo: appUseMemo } = React;

// ─── App Shell ────────────────────────────────────────────────────────
const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = appUseState(false);

  const doLogout = async () => {
    try { await logout(); toast.info('Вы вышли из системы'); navigate('/login'); }
    catch (_) { /* ignore */ }
  };

  return (
    <div className="min-h-screen flex bg-ink-50">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-[232px] shrink-0 border-r border-ink-200 bg-white">
        <div className="px-4 py-4 border-b border-ink-200">
          <Link to="/" className="block"><BrandLogo/></Link>
        </div>
        <nav className="flex-1 p-3 space-y-5">
          <div>
            <div className="nav-section-title">Расчёты</div>
            <div className="space-y-0.5">
              <NavLink to="/" className="nav-link"><Icons.Layers size={15}/> Дашборд</NavLink>
              <NavLink to="/volumes" className="nav-link"><Icons.Flask size={15}/> Расчёт объёмов</NavLink>
              <NavLink to="/predict" className="nav-link"><Icons.TrendUp size={15}/> Прогноз эффекта</NavLink>
              <NavLink to="/predict/batch" className="nav-link"><Icons.Database size={15}/> Батч‑прогноз</NavLink>
            </div>
          </div>
          <div>
            <div className="nav-section-title">Аккаунт</div>
            <div className="space-y-0.5">
              <NavLink to="/profile" className="nav-link"><Icons.User size={15}/> Профиль</NavLink>
            </div>
          </div>
        </nav>
        <div className="px-3 pb-3 pt-2 border-t border-ink-200">
          <div className="px-3 py-2 rounded-md bg-ink-50 border border-ink-200/70">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-[12px] font-semibold uppercase">
                {(user && user.username || '?').slice(0,1)}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-ink-900 truncate">{user && user.username}</div>
                <div className="text-[11px] text-ink-500 truncate">{user && user.email}</div>
              </div>
            </div>
            <button onClick={doLogout}
              className="mt-2 w-full text-left text-[12px] text-ink-500 hover:text-ink-900 flex items-center gap-1.5 px-1">
              <Icons.LogOut size={13}/> Выйти
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer trigger */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-ink-200 flex items-center justify-between px-4 h-12">
        <button onClick={()=>setMenuOpen(o=>!o)} className="text-ink-700 p-1.5 -ml-1.5"><Icons.Layers size={18}/></button>
        <BrandLogo/>
        <button onClick={doLogout} className="text-ink-500 p-1.5 -mr-1.5"><Icons.LogOut size={16}/></button>
      </div>
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={()=>setMenuOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-white p-3" onClick={e=>e.stopPropagation()}>
            <BrandLogo/>
            <div className="mt-4 space-y-0.5">
              <NavLink to="/" className="nav-link" onClick={()=>setMenuOpen(false)}><Icons.Layers size={15}/> Дашборд</NavLink>
              <NavLink to="/volumes" className="nav-link" onClick={()=>setMenuOpen(false)}><Icons.Flask size={15}/> Расчёт объёмов</NavLink>
              <NavLink to="/predict" className="nav-link" onClick={()=>setMenuOpen(false)}><Icons.TrendUp size={15}/> Прогноз</NavLink>
              <NavLink to="/predict/batch" className="nav-link" onClick={()=>setMenuOpen(false)}><Icons.Database size={15}/> Батч</NavLink>
              <NavLink to="/profile" className="nav-link" onClick={()=>setMenuOpen(false)}><Icons.User size={15}/> Профиль</NavLink>
            </div>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col md:ml-0 mt-12 md:mt-0">
        <TopHeader/>
        <main className="flex-1 p-5 md:p-7 max-w-[1380px] w-full mx-auto">
          <div className="page-enter">{children}</div>
        </main>
        <footer className="px-5 md:px-7 py-3 text-[11px] text-ink-400 mono flex justify-between border-t border-ink-200 bg-white">
          <span>ОПЗ‑Проектирование · v1.4.2</span>
          <span>build 30c1a · 16.05.26</span>
        </footer>
      </div>
    </div>
  );
};

const TopHeader = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const crumbs = {
    '/':            ['Дашборд'],
    '/volumes':     ['Расчёты', 'Расчёт объёмов'],
    '/predict':     ['Расчёты', 'Прогноз эффекта ОПЗ'],
    '/predict/batch':['Расчёты', 'Прогноз ОПЗ', 'Батч'],
    '/profile':     ['Аккаунт', 'Профиль'],
  }[pathname] || ['Страница'];
  return (
    <div className="hidden md:flex items-center justify-between px-7 h-12 border-b border-ink-200 bg-white">
      <div className="flex items-center gap-2 text-[12px]">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i>0 && <span className="text-ink-300">/</span>}
            <span className={i===crumbs.length-1 ? 'text-ink-900 font-medium' : 'text-ink-500'}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-[12px] text-ink-500">
          <span className="dot green"/>
          <span className="mono">API · OK</span>
        </div>
        <div className="flex items-center gap-2 pl-4 border-l border-ink-200">
          <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-[11px] font-semibold uppercase">
            {(user && user.username || '?').slice(0,1)}
          </div>
          <span className="text-[13px] text-ink-900 font-medium">{user && user.username}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const history = [];

  return (
    <div className="space-y-7">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] text-ink-500 font-semibold mb-1">Дашборд</div>
          <h1 className="text-[26px] font-semibold tracking-tight">Здравствуйте, {user && user.username}.</h1>
          <p className="text-sm text-ink-500 mt-1">Запустите расчёт реагентов или прогноз эффекта ОПЗ.</p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-ink-500">
          <Icons.Clock size={13}/>
          <span className="mono">{new Date().toLocaleDateString('ru-RU', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}</span>
        </div>
      </header>

      {/* Two big nav cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NavTile
          icon={<Icons.Flask size={20}/>}
          eyebrow="Volume Calc · /calculate_vols"
          title="Расчёт объёмов"
          body="Раскладка кислотного состава: КС, продавка, товарная кислота, BaCl₂, стабилизаторы, ингибиторы. Введите параметры скважины — получите 9 объёмов."
          accent="brand"
          stats={[
            { k:'Реагентов', v:'9' },
            { k:'Поля',      v:'8' },
            { k:'Время',     v:'~1с' },
          ]}
          cta="Запустить расчёт"
          to="/volumes"
        />
        <NavTile
          icon={<Icons.TrendUp size={20}/>}
          eyebrow="OPZ Predict · /predict"
          title="Прогноз эффекта ОПЗ"
          body="Прогноз 12 месяцев после обработки на ML‑модели + базовая экстраполяция Арпса. Эффект в м³/сут, накопленная добыча, графики, KPI."
          accent="green"
          stats={[
            { k:'Горизонт', v:'12 мес' },
            { k:'Графиков', v:'3' },
            { k:'Батч',     v:'до 500' },
          ]}
          cta="Открыть прогноз"
          to="/predict"
        />
      </div>

      {/* Bottom row: history + service status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2" title="Последние расчёты" right={<Chip kind="" mono>{history.length} записей</Chip>}>
          <table className="dtable hover">
            <thead>
              <tr>
                <th>ID</th><th>Скважина</th><th>Тип</th><th>Дата</th><th className="num">Эффект</th><th></th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id}>
                  <td className="mono text-ink-700">{h.id}</td>
                  <td className="text-ink-900 font-medium">{h.well}</td>
                  <td>
                    {h.type === 'volumes'
                      ? <Chip kind="brand" icon={<Icons.Flask size={11}/>}>объёмы</Chip>
                      : <Chip kind="ok"    icon={<Icons.TrendUp size={11}/>}>прогноз</Chip>}
                  </td>
                  <td className="text-ink-500">{fmt.dateTime(h.date)}</td>
                  <td className="num text-ink-900">{h.effect != null ? `+${fmt.num(h.effect, 1)}` : '—'}</td>
                  <td className="num">
                    <button className="link text-[12px]"
                      onClick={()=>navigate(h.type==='volumes' ? '/volumes' : '/predict')}>
                      открыть →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Состояние сервисов" right={<Chip kind="ok" icon={<span className="dot green"/>}>все онлайн</Chip>}>
          <ServiceRow name="Auth API"    url="localhost:8001" status="ok"/>
          <ServiceRow name="OPZ Predict" url="localhost:8000" status="ok"/>
          <ServiceRow name="Volume Calc" url="localhost:8003" status="ok"/>
        </Card>
      </div>
    </div>
  );
};

const NavTile = ({ icon, eyebrow, title, body, stats, cta, to, accent='brand' }) => {
  const navigate = useNavigate();
  const accentBg = accent === 'green' ? '#ECFDF5' : '#EFF6FF';
  const accentFg = accent === 'green' ? '#16A34A' : '#2563EB';
  return (
    <button onClick={()=>navigate(to)}
      className="group text-left card hover:shadow-cardlg transition-shadow"
      style={{ padding: 0 }}>
      <div className="p-6 flex flex-col gap-4 h-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: accentBg, color: accentFg }}>
            {icon}
          </div>
          <div className="mono text-[10px] uppercase tracking-[0.1em] text-ink-400">{eyebrow}</div>
        </div>
        <div>
          <h3 className="text-[20px] font-semibold tracking-tight text-ink-900">{title}</h3>
          <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">{body}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {stats.map(s => (
            <div key={s.k} className="bg-ink-50 rounded-md px-3 py-2 border border-ink-200/70">
              <div className="text-[10px] uppercase tracking-[0.08em] text-ink-400 font-semibold">{s.k}</div>
              <div className="mono text-[15px] font-semibold text-ink-900 tabnum mt-0.5">{s.v}</div>
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-[13px] font-medium" style={{ color: accentFg }}>{cta}</span>
          <span className="w-7 h-7 rounded-full border border-ink-200 flex items-center justify-center text-ink-500 group-hover:bg-brand-600 group-hover:border-brand-600 group-hover:text-white transition">
            <Icons.ArrowRight size={14}/>
          </span>
        </div>
      </div>
    </button>
  );
};

const ServiceRow = ({ name, url, status }) => (
  <div className="flex items-center justify-between py-2 border-b border-ink-200/70 last:border-b-0">
    <div className="flex items-center gap-2.5">
      <span className={`dot ${status==='ok'?'green':'red'}`}/>
      <span className="text-[13px] font-medium text-ink-900">{name}</span>
    </div>
    <span className="mono text-[11px] text-ink-500">{url}</span>
  </div>
);

// ─── Profile ──────────────────────────────────────────────────────────
const ProfilePage = () => {
  const { user, refreshMe } = useAuth();
  const toast = useToast();
  const [pwd, setPwd] = appUseState({ current_password:'', new_password:'', confirm:'' });
  const [errors, setErrors] = appUseState({});
  const [loading, setLoading] = appUseState(false);

  const submitPwd = async (e) => {
    e.preventDefault();
    setErrors({});
    const errs = {};
    if (!pwd.current_password) errs.current_password = 'Введите текущий пароль';
    if (!PASSWORD_RE.test(pwd.new_password)) errs.new_password = 'Минимум 8 символов и одна цифра';
    if (pwd.new_password !== pwd.confirm) errs.confirm = 'Пароли не совпадают';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await authApi.changePassword({ current_password: pwd.current_password, new_password: pwd.new_password });
      toast.success('Пароль обновлён');
      setPwd({ current_password:'', new_password:'', confirm:'' });
    } catch (e) {
      if (e.status === 422) setErrors(fieldErrorsFrom422(e));
      else { const d = describeApiError(e); toast.push(d); }
    } finally { setLoading(false); }
  };

  if (!user) return null;
  return (
    <div className="space-y-6 max-w-[820px]">
      <header>
        <div className="text-[11px] uppercase tracking-[0.1em] text-ink-500 font-semibold mb-1">Аккаунт</div>
        <h1 className="text-[26px] font-semibold tracking-tight">Профиль</h1>
      </header>

      <Card title="Учётная запись">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Имя пользователя">
            <Input value={user.username} disabled/>
          </Field>
          <Field label="Email">
            <Input value={user.email} disabled/>
          </Field>
          <Field label="Дата регистрации">
            <Input value={fmt.date(user.created_at)} disabled/>
          </Field>
          <Field label="Сессия (access JWT)">
            <Input value={tokenStore.getAccess() ? '••••••••••.••.•••• активен (30 мин)' : 'нет'} disabled mono/>
          </Field>
        </div>
      </Card>

      <Card title="Смена пароля" badge="PUT /auth/me/password">
        <form onSubmit={submitPwd} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Текущий пароль" error={errors.current_password}>
            <PasswordInput value={pwd.current_password} onChange={e=>setPwd(v=>({...v, current_password:e.target.value}))} error={errors.current_password}/>
          </Field>
          <Field label="Новый пароль" error={errors.new_password}>
            <PasswordInput value={pwd.new_password} onChange={e=>setPwd(v=>({...v, new_password:e.target.value}))} error={errors.new_password}/>
            <PasswordRequirements pwd={pwd.new_password}/>
          </Field>
          <Field label="Повторите" error={errors.confirm}>
            <PasswordInput value={pwd.confirm} onChange={e=>setPwd(v=>({...v, confirm:e.target.value}))} error={errors.confirm}/>
          </Field>
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" loading={loading} icon={<Icons.Save size={14}/>}>Сохранить новый пароль</Button>
          </div>
        </form>
      </Card>

      <Card title="Безопасность сессии">
        <div className="flex items-start gap-3 text-[13px] text-ink-700">
          <Icons.Info size={16} className="text-brand-600 mt-0.5 shrink-0"/>
          <div>
            <div className="font-medium text-ink-900 mb-1">Как работают токены</div>
            <ul className="space-y-1 text-ink-500 list-disc pl-4">
              <li><span className="mono">access_token</span> — JWT, 30 минут, передаётся в <span className="mono">Authorization: Bearer</span>.</li>
              <li><span className="mono">refresh_token</span> — JWT, 7 дней, хранится в localStorage; используется для обновления.</li>
              <li>При 401 интерцептор Axios автоматически вызывает <span className="mono">/auth/refresh</span> и повторяет исходный запрос.</li>
              <li>Если refresh невалиден — токены чистятся, происходит редирект на <span className="mono">/login</span>.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

Object.assign(window, { AppShell, DashboardPage, ProfilePage });
