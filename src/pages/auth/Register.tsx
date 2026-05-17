import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { AxiosError } from 'axios'
import { AuthShell } from './AuthShell'
import { Button, Field, Input, PasswordInput, PasswordRequirements } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'

const schema = z.object({
  username: z.string().min(3, '3–50 символов').max(50).regex(/^[A-Za-z0-9_-]+$/, 'Только буквы, цифры, _ и -'),
  email:    z.string().email('Некорректный email'),
  password: z.string().min(8, 'Минимум 8 символов').max(128).regex(/\d/, 'Нужна хотя бы одна цифра'),
})
type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const { register: authRegister } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })
  const pwd = watch('password', '')

  const onSubmit = async (data: FormValues) => {
    try {
      await authRegister(data.username, data.email, data.password)
      toast.success('Аккаунт создан')
      navigate('/')
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 409) {
          const detail = err.response.data?.detail as string
          if (detail?.toLowerCase().includes('username') || detail?.toLowerCase().includes('пользователь'))
            setError('username', { message: detail })
          else setError('email', { message: detail })
          return
        }
      }
      toast.error('Ошибка регистрации')
    }
  }

  return (
    <AuthShell>
      <div className="page-enter">
        <h2 className="text-[22px] font-semibold tracking-tight">Создать аккаунт</h2>
        <p className="text-sm text-ink-500 mt-1">Доступ к расчётам ОПЗ — для инженеров‑нефтяников.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
          <Field label="Имя пользователя" error={errors.username?.message} help={!errors.username ? '3–50 символов: буквы, цифры, _ или -' : undefined}>
            <Input {...register('username')} placeholder="ivanov" autoComplete="username" autoFocus error={errors.username?.message} />
          </Field>
          <Field label="Корпоративный email" error={errors.email?.message}>
            <Input type="email" {...register('email')} placeholder="i.ivanov@company.ru" autoComplete="email" error={errors.email?.message} />
          </Field>
          <Field label="Пароль" error={errors.password?.message}>
            <PasswordInput {...register('password')} placeholder="••••••••" autoComplete="new-password" error={errors.password?.message} />
            <PasswordRequirements pwd={pwd} />
          </Field>
          <Button type="submit" loading={isSubmitting} size="lg" className="w-full mt-2" iconRight={<ArrowRight size={15} />}>
            Создать аккаунт
          </Button>
        </form>
        <div className="mt-6 text-sm text-ink-500 text-center">
          Уже есть аккаунт? <Link to="/login" className="link">Войти</Link>
        </div>
      </div>
    </AuthShell>
  )
}
