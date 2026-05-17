import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { AuthShell } from './AuthShell'
import { Button, Field, PasswordInput, PasswordRequirements } from '../../components/ui'
import { authApi } from '../../api/auth'

const schema = z.object({
  new_password: z.string().min(8, 'Минимум 8 символов').regex(/\d/, 'Нужна хотя бы одна цифра'),
  confirm:      z.string(),
}).refine(d => d.new_password === d.confirm, { message: 'Пароли не совпадают', path: ['confirm'] })
type FormValues = z.infer<typeof schema>

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const pwd = watch('new_password', '')

  const onSubmit = async (data: FormValues) => {
    if (!token) { toast.error('Токен не найден в URL'); return }
    try {
      await authApi.resetPassword(token, data.new_password)
      toast.success('Пароль обновлён, войдите с новым паролем')
      navigate('/login')
    } catch {
      toast.error('Токен недействителен или истёк')
    }
  }

  return (
    <AuthShell>
      <div className="page-enter">
        <h2 className="text-[22px] font-semibold tracking-tight">Новый пароль</h2>
        <p className="text-sm text-ink-500 mt-1">Установите пароль для входа.</p>
        {!token && (
          <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
            Токен сброса не найден в URL. Запросите ссылку повторно.
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
          <Field label="Новый пароль" error={errors.new_password?.message}>
            <PasswordInput {...register('new_password')} autoFocus error={errors.new_password?.message} />
            <PasswordRequirements pwd={pwd} />
          </Field>
          <Field label="Повторите пароль" error={errors.confirm?.message}>
            <PasswordInput {...register('confirm')} error={errors.confirm?.message} />
          </Field>
          <Button type="submit" loading={isSubmitting} size="lg" className="w-full mt-2" disabled={!token}>
            Установить пароль
          </Button>
        </form>
        <div className="mt-6 text-sm text-ink-500 text-center">
          <Link to="/login" className="link inline-flex items-center gap-1"><ArrowLeft size={13} /> Назад ко входу</Link>
        </div>
      </div>
    </AuthShell>
  )
}
