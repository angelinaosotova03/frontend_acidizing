import { BrandLogo } from '../../components/Layout'

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="grid-bg" />
        <div className="relative">
          <div className="leading-tight text-white">
            <div className="text-xl font-semibold tracking-tight">ОПЗ‑Моделирование</div>
            <div className="text-[10px] mono uppercase tracking-[.14em] text-blue-200/70 mt-0.5">matrix.acid · prediction</div>
          </div>
        </div>
        <div className="relative">
          <h1 className="text-white text-[34px] leading-[1.08] font-semibold tracking-tight max-w-[28ch]">
            Расчёт объёмов и&nbsp;прогноз эффекта матричной кислотной обработки.
          </h1>
          <p className="mt-5 max-w-[40ch] text-blue-200/80 text-[14px] leading-relaxed">
            Инструмент для инженеров по&nbsp;разработке. Вводите параметры скважины&nbsp;— получайте раскладку реагентов и прогноз дебита.
          </p>
          <div className="mt-9 grid grid-cols-3 gap-2.5 max-w-[480px]">
            {[
              { k:'Точность', v:'±8.4%', l:'MAE по историческим данным' },
              { k:'Скважин',  v:'1281', l:'в обучающей выборке' },
              { k:'Реагентов',v:'9',      l:'в составе КС' },
            ].map(s => (
              <div key={s.k} className="rounded-md border border-white/10 bg-white/[.04] p-3">
                <div className="text-[10px] uppercase tracking-[.12em] text-blue-200/60">{s.k}</div>
                <div className="mono text-white text-[18px] mt-1.5 font-semibold tabnum">{s.v}</div>
                <div className="text-[11px] text-blue-200/55 mt-1 leading-tight">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center justify-between text-[11px] text-blue-200/55">
          <span className="mono">v1.5.0</span>
          <span className="flex items-center gap-1.5"><span className="dot green" /> сервис доступен</span>
        </div>
      </aside>
      <main className="w-full max-w-[420px] px-2 py-8 lg:py-0">
        <div className="lg:hidden mb-6 flex justify-center"><BrandLogo size="lg" /></div>
        {children}
      </main>
    </div>
  )
}
