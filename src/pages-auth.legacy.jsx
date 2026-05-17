/* eslint-disable */
/**
 * src/pages-auth.jsx — Login / Register / ForgotPassword / ResetPassword
 *
 * Visual: split-screen.  Left = engineering brand panel (decorative grid,
 * stat tiles, mini-explanation).  Right = focused form, dense.
 */

const { useState: aUseState, useEffect: aUseEffect, useMemo: aUseMemo } = React;

// ─── Brand mark + side panel ──────────────────────────────────────────
const BrandLogo = ({ size='md' }) => (
  <div className="flex items-center gap-2.5">
    <div className={`brand-mark ${size==='lg'?'lg':''}`}>O<span style={{opacity:0.55}}>/</span>P</div>
    <div className="leading-tight">
      <div className={size==='lg'?'text-base font-semibold tracking-tight':'text-[13px] font-semibold tracking-tight'}>
        ОПЗ‑Проектирование
      </div>
    </div>
  </div>
);

const AuthAside = () => (
  <aside className="auth-aside">
    <div className="grid-bg" />
    <div className="relative">
      <div className="flex items-center gap-2.5">
        <div className="brand-mark lg" style={{ background:'rgba(255,255,255,0.12)', backdropFilter:'blur(2px)' }}>O<span style={{opacity:0.55}}>/</span>P</div>
        <div className="leading-tight text-white">
          <div className="text-base font-semibold tracking-tight">ОПЗ‑Проектирование</div>
          <div className="text-[10px] mono uppercase tracking-[0.14em] text-blue-200/70">matrix.acid · prediction</div>
        </div>
      </div>
    </div>

    <div className="relative">
      <h1 className="text-white text-[34px] leading-[1.08] font-semibold tracking-tight max-w-[28ch]">
        Расчёт объёмов и&nbsp;прогноз эффекта матричной кислотной обработки.
      </h1>
      <p className="mt-5 max-w-[40ch] text-blue-200/80 text-[14px] leading-relaxed">
        Инструмент для инженеров по&nbsp;разработке. Вводите параметры скважины&nbsp;— получайте раскладку реагентов, прогноз дебита по&nbsp;модели и&nbsp;накопленный эффект.
      </p>

      <div className="mt-9 grid grid-cols-3 gap-2.5 max-w-[480px]">
        {[
          { k: 'Точность',  v: '±8.4%', label:'MAE по historical wells' },
          { k: 'Скважин',   v: '1281', label:'в обучающей выборке' },
          { k: 'Реагентов', v: '9',      label:'в составе КС' },
        ].map(s => (
          <div key={s.k} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <div className="text-[10px] uppercase tracking-[0.12em] text-blue-200/60">{s.k}</div>
            <div className="mono text-white text-[18px] mt-1.5 font-semibold tabnum">{s.v}</div>
            <div className="text-[11px] text-blue-200/55 mt-1 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>
    </div>

    <div className="relative flex items-center justify-between text-[11px] text-blue-200/55">
      <span className="mono">v1.4.2 · build 30c1a</span>
      <span className="flex items-center gap-1.5"><span className="dot green"/> сервис доступен</span>
    </div>
  </aside>
);

// ─── Auth shell ───────────────────────────────────────────────────────
const AuthShell = ({ children }) => (
  <div className="auth-shell">
    <AuthAside/>
    <main className="w-full max-w-[420px] px-2 py-8 lg:py-0">
      <div className="lg:hidden mb-6 flex justify-center"><BrandLogo size="lg"/></div>
      {children}
    </main>
  </div>
);

// ─── LoginPage ────────────────────────────────────────────────────────
const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [values, setValues] = aUseState({ username: '', password: '' });
  const [errors, setErrors] = aUseState({});
  const [loading, setLoading] = aUseState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await login(values);
      toast.success('Вход выполнен', `Добро пожаловать, ${values.username}.`);
      navigate('/');
    } catch (e) {
      if (e.status === 401) setErrors({ password: 'Неверный логин или пароль' });
      else if (e.status === 422) setErrors(fieldErrorsFrom422(e));
      else { const d = describeApiError(e); toast.push(d); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="page-enter">
        <h2 className="text-[22px] font-semibold tracking-tight">Вход в систему</h2>
        <p className="text-sm text-ink-500 mt-1">Войдите, чтобы запустить расчёт.</p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
          <Field label="Имя пользователя" error={errors.username}>
            <Input value={values.username} onChange={e=>setValues(v=>({...v, username:e.target.value}))}
                   placeholder="ivanov" autoComplete="username" autoFocus error={errors.username}/>
          </Field>
          <Field label="Пароль" error={errors.password}>
            <PasswordInput value={values.password} onChange={e=>setValues(v=>({...v, password:e.target.value}))}
                           placeholder="••••••••" autoComplete="current-password" error={errors.password}/>
          </Field>
          <div className="flex items-center justify-between text-[12px]">
            <label className="flex items-center gap-2 text-ink-500 select-none cursor-pointer">
              <input type="checkbox" className="accent-brand-600"/> Запомнить меня
            </label>
            <Link to="/forgot-password" className="link">Забыли пароль?</Link>
          </div>

          <Button type="submit" loading={loading} size="lg" className="w-full mt-2"
                  iconRight={<Icons.ArrowRight size={15}/>}>
            Войти
          </Button>
        </form>

        <div className="mt-6 text-sm text-ink-500 text-center">
          Нет аккаунта? <Link to="/register" className="link">Зарегистрироваться</Link>
        </div>
      </div>
    </AuthShell>
  );
};

// ─── RegisterPage ─────────────────────────────────────────────────────
const PasswordRequirements = ({ pwd }) => {
  const rules = [
    { ok: pwd.length >= 8 && pwd.length <= 128, label: '8–128 символов' },
    { ok: /\d/.test(pwd), label: 'минимум одна цифра' },
  ];
  return (
    <div className="space-y-1 mt-1">
      {rules.map((r, i) => (
        <div key={i} className={`flex items-center gap-1.5 text-[11px] ${r.ok ? 'text-green-600' : 'text-ink-500'}`}>
          {r.ok ? <Icons.Check size={11}/> : <span className="w-[11px] h-[11px] rounded-full border border-current inline-block"/>}
          {r.label}
        </div>
      ))}
    </div>
  );
};

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [values, setValues] = aUseState({ username: '', email: '', password: '' });
  const [errors, setErrors] = aUseState({});
  const [loading, setLoading] = aUseState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    // client validation mirrors backend
    const errs = {};
    if (!USERNAME_RE.test(values.username)) errs.username = '3–50 символов: буквы, цифры, _ или -';
    if (!EMAIL_RE.test(values.email)) errs.email = 'Некорректный email';
    if (!PASSWORD_RE.test(values.password)) errs.password = 'Минимум 8 символов и одна цифра';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await register(values);
      toast.success('Аккаунт создан', 'Выполняется автоматический вход…');
      navigate('/');
    } catch (e) {
      if (e.status === 409 && e.data && e.data.field) {
        setErrors({ [e.data.field]: e.data.detail });
      } else if (e.status === 422) setErrors(fieldErrorsFrom422(e));
      else { const d = describeApiError(e); toast.push(d); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="page-enter">
        <h2 className="text-[22px] font-semibold tracking-tight">Создать аккаунт</h2>
        <p className="text-sm text-ink-500 mt-1">Доступ к расчётам ОПЗ — для инженеров‑нефтяников.</p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
          <Field label="Имя пользователя" error={errors.username} help={!errors.username && '3–50 символов: буквы, цифры, _ или -'}>
            <Input value={values.username} onChange={e=>setValues(v=>({...v, username:e.target.value}))}
                   placeholder="ivanov" autoComplete="username" autoFocus error={errors.username}/>
          </Field>
          <Field label="Корпоративный email" error={errors.email}>
            <Input type="email" value={values.email} onChange={e=>setValues(v=>({...v, email:e.target.value}))}
                   placeholder="i.ivanov@company.ru" autoComplete="email" error={errors.email}/>
          </Field>
          <Field label="Пароль" error={errors.password}>
            <PasswordInput value={values.password} onChange={e=>setValues(v=>({...v, password:e.target.value}))}
                           placeholder="••••••••" autoComplete="new-password" error={errors.password}/>
            <PasswordRequirements pwd={values.password}/>
          </Field>

          <Button type="submit" loading={loading} size="lg" className="w-full mt-2"
                  iconRight={<Icons.ArrowRight size={15}/>}>
            Создать аккаунт
          </Button>
        </form>

        <div className="mt-6 text-sm text-ink-500 text-center">
          Уже есть аккаунт? <Link to="/login" className="link">Войти</Link>
        </div>
      </div>
    </AuthShell>
  );
};

// ─── ForgotPasswordPage ───────────────────────────────────────────────
const ForgotPasswordPage = () => {
  const toast = useToast();
  const [email, setEmail] = aUseState('');
  const [errors, setErrors] = aUseState({});
  const [loading, setLoading] = aUseState(false);
  const [sent, setSent] = aUseState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!EMAIL_RE.test(email)) { setErrors({ email: 'Некорректный email' }); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSent({ email });
    } catch (e) {
      const d = describeApiError(e); toast.push(d);
    } finally { setLoading(false); }
  };

  return (
    <AuthShell>
      <div className="page-enter">
        <h2 className="text-[22px] font-semibold tracking-tight">Сброс пароля</h2>
        <p className="text-sm text-ink-500 mt-1">Введите email — мы отправим ссылку для восстановления.</p>

        {sent ? (
          <div className="mt-7 p-4 rounded-md bg-brand-50 border border-brand-100">
            <div className="flex items-start gap-2.5">
              <Icons.Mail size={18} className="text-brand-600 mt-0.5"/>
              <div className="text-sm">
                <div className="font-medium text-ink-900">Ссылка отправлена на {sent.email}</div>
                <div className="text-ink-700 mt-1">Проверьте почту и перейдите по ссылке для установки нового пароля.</div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
            <Field label="Email" error={errors.email}>
              <Input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                     placeholder="i.ivanov@company.ru" autoFocus error={errors.email}/>
            </Field>
            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              Отправить ссылку
            </Button>
          </form>
        )}

        <div className="mt-6 text-sm text-ink-500 text-center">
          <Link to="/login" className="link inline-flex items-center gap-1"><Icons.ArrowLeft size={13}/> Назад ко входу</Link>
        </div>
      </div>
    </AuthShell>
  );
};

// ─── ResetPasswordPage ────────────────────────────────────────────────
const ResetPasswordPage = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const token = search.get('token') || '';
  const [pwd, setPwd] = aUseState('');
  const [confirm, setConfirm] = aUseState('');
  const [errors, setErrors] = aUseState({});
  const [loading, setLoading] = aUseState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    const errs = {};
    if (!PASSWORD_RE.test(pwd)) errs.new_password = 'Минимум 8 символов и одна цифра';
    if (pwd !== confirm) errs.confirm = 'Пароли не совпадают';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, new_password: pwd });
      toast.success('Пароль обновлён', 'Войдите с новым паролем.');
      navigate('/login');
    } catch (e) {
      if (e.status === 422) setErrors(fieldErrorsFrom422(e));
      else { const d = describeApiError(e); toast.push(d); }
    } finally { setLoading(false); }
  };

  return (
    <AuthShell>
      <div className="page-enter">
        <h2 className="text-[22px] font-semibold tracking-tight">Новый пароль</h2>
        <p className="text-sm text-ink-500 mt-1">Установите пароль для входа.</p>

        {!token && (
          <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
            Токен сброса не найден в URL. Запросите ссылку повторно на странице «Забыли пароль?».
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
          <Field label="Новый пароль" error={errors.new_password}>
            <PasswordInput value={pwd} onChange={e=>setPwd(e.target.value)} autoFocus error={errors.new_password}/>
            <PasswordRequirements pwd={pwd}/>
          </Field>
          <Field label="Повторите пароль" error={errors.confirm}>
            <PasswordInput value={confirm} onChange={e=>setConfirm(e.target.value)} error={errors.confirm}/>
          </Field>
          <Button type="submit" loading={loading} size="lg" className="w-full mt-2"
                  disabled={!token}>
            Установить пароль
          </Button>
        </form>

        <div className="mt-6 text-sm text-ink-500 text-center">
          <Link to="/login" className="link inline-flex items-center gap-1"><Icons.ArrowLeft size={13}/> Назад ко входу</Link>
        </div>
      </div>
    </AuthShell>
  );
};

Object.assign(window, { BrandLogo, AuthAside, AuthShell, LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage });
