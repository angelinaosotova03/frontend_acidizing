import { forwardRef, useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'

// ─── Button ─────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}
export function Button({ variant = 'primary', size = 'md', loading, disabled, icon, iconRight, children, className = '', type = 'button', ...rest }: ButtonProps) {
  const cls = `btn btn-${variant} ${size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : ''} ${className}`.trim()
  return (
    <button type={type} disabled={disabled || loading} className={cls} {...rest}>
      {loading && <span className={`spinner ${variant === 'primary' ? '' : 'dark'}`} />}
      {!loading && icon}
      {children}
      {!loading && iconRight}
    </button>
  )
}

// ─── Form helpers ────────────────────────────────────────────────────────────
interface FieldProps { label?: string; unit?: string; help?: string; error?: string; children: React.ReactNode; optional?: boolean }
export function Field({ label, unit, help, error, children, optional }: FieldProps) {
  return (
    <div className="flex flex-col">
      {label && (
        <label className="field-label">
          <span>{label}{optional && <span className="ml-1 normal-case font-medium text-ink-400">(опц.)</span>}</span>
          {unit && <span className="unit">{unit}</span>}
        </label>
      )}
      <div>
        {children}
        {error ? <div className="field-error">{error}</div> : help ? <div className="field-help">{help}</div> : null}
      </div>
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { error?: string; mono?: boolean }
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, mono = false, className = '', ...rest }, ref) => (
    <input ref={ref} className={`input ${mono ? '' : 'input-text'} ${error ? 'error' : ''} ${className}`} {...rest} />
  ),
)
Input.displayName = 'Input'

export const NumberInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <Input ref={ref} type="number" step="any" mono {...props} />
))
NumberInput.displayName = 'NumberInput'

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(
  ({ error, ...rest }, ref) => {
    const [show, setShow] = useState(false)
    return (
      <div className="relative">
        <Input ref={ref} type={show ? 'text' : 'password'} error={error} className="pr-9" {...rest} />
        <button type="button" onClick={() => setShow(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-700">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'

// ─── Toggle ──────────────────────────────────────────────────────────────────
interface ToggleProps { value: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }
export function Toggle({ value, onChange, label, disabled }: ToggleProps) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!value)} className={`toggle ${value ? 'on' : ''} ${disabled ? 'disabled' : ''}`}>
      <span className="track"><span className="knob" /></span>
      {label && <span className="text-sm text-ink-700">{label}</span>}
    </button>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────
interface CardProps { title?: string; badge?: string; right?: React.ReactNode; padded?: boolean; className?: string; children: React.ReactNode }
export function Card({ title, badge, right, padded = true, className = '', children }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {(title || right) && (
        <div className="card-header">
          <div className="card-title">{title}{badge && <span className="badge">{badge}</span>}</div>
          {right}
        </div>
      )}
      {padded ? <div className="card-body">{children}</div> : children}
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
interface TabsProps { value: string; onChange: (v: string) => void; items: { value: string; label: string; icon?: React.ReactNode }[] }
export function Tabs({ value, onChange, items }: TabsProps) {
  return (
    <div className="tabs">
      {items.map(it => (
        <button key={it.value} className={value === it.value ? 'active' : ''} onClick={() => onChange(it.value)}>
          {it.icon && <span className="mr-1.5 inline-flex align-middle">{it.icon}</span>}
          {it.label}
        </button>
      ))}
    </div>
  )
}

// ─── Chip ────────────────────────────────────────────────────────────────────
interface ChipProps { kind?: 'brand' | 'ok' | 'warn' | 'err' | ''; icon?: React.ReactNode; children: React.ReactNode; mono?: boolean }
export function Chip({ kind = '', icon, children, mono = false }: ChipProps) {
  return <span className={`chip ${kind} ${mono ? 'mono' : ''}`}>{icon && <span>{icon}</span>}{children}</span>
}

// ─── SectionRule ─────────────────────────────────────────────────────────────
export function SectionRule({ children, right }: { children?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 mb-2 mt-3">
      <div className="section-rule flex-1" style={{ margin: 0 }}>{children}</div>
      {right}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────
export function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      <div className="w-10 h-10 rounded-lg bg-ink-50 flex items-center justify-center text-ink-400 mb-3">{icon}</div>
      <div className="font-medium text-ink-900">{title}</div>
      {body && <div className="text-sm text-ink-500 mt-1 max-w-sm">{body}</div>}
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; width?: number }
export function Modal({ open, onClose, title, children, footer, width = 420 }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,.45)' }} onClick={onClose}>
      <div className="card shadow-pop" style={{ width: '100%', maxWidth: width }} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <div className="card-title">{title}</div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="card-body">{children}</div>
        {footer && <div className="px-[18px] pb-[14px] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

// ─── SparkBar ────────────────────────────────────────────────────────────────
export function SparkBar({ values, color = '#22C55E', width = 80, height = 22 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (!values.length) return <span className="text-ink-400 text-xs">—</span>
  const max = Math.max(...values, 0.001)
  const barW = width / values.length - 1
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {values.map((v, i) => {
        const h = (v / max) * (height - 2)
        return <rect key={i} x={i * (barW + 1)} y={height - h} width={barW} height={h} fill={color} rx={1} />
      })}
    </svg>
  )
}

// ─── PasswordRequirements ────────────────────────────────────────────────────
export function PasswordRequirements({ pwd }: { pwd: string }) {
  const rules = [
    { ok: pwd.length >= 8 && pwd.length <= 128, label: '8–128 символов' },
    { ok: /\d/.test(pwd), label: 'минимум одна цифра' },
  ]
  return (
    <div className="space-y-1 mt-1">
      {rules.map((r, i) => (
        <div key={i} className={`flex items-center gap-1.5 text-[11px] ${r.ok ? 'text-green-600' : 'text-ink-500'}`}>
          {r.ok
            ? <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6 9 17l-5-5"/></svg>
            : <span className="w-[11px] h-[11px] rounded-full border border-current inline-block" />}
          {r.label}
        </div>
      ))}
    </div>
  )
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────
interface KpiCardProps { label: string; value: number; unit: string; color: string; decimals?: number; delta?: boolean }
export function KpiCard({ label, value, unit, color, decimals = 2, delta = false }: KpiCardProps) {
  return (
    <div className="kpi" style={{ borderTopColor: color, borderTopWidth: 2 }}>
      <div className="label">{label}</div>
      <div className="value tabnum">
        {delta && value > 0 ? '+' : ''}
        {value.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        <span className="unit">{unit}</span>
      </div>
      <div className={`delta ${value > 0 ? 'up' : value < 0 ? 'down' : ''}`} style={{ color }}>
        <span className="mono">{value > 0 ? 'прирост' : value < 0 ? 'снижение' : '—'}</span>
      </div>
    </div>
  )
}

// ─── useFileInput ─────────────────────────────────────────────────────────────
export function useFileInput(onFile: (f: File) => void) {
  const ref = useRef<HTMLInputElement>(null)
  const onClick = () => ref.current?.click()
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onFile(f)
    e.target.value = ''
  }
  return { ref, onClick, onChange }
}
