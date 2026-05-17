import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { AxiosError } from 'axios'
import { AuthShell } from './AuthShell'
import { Button, Field, Input, PasswordInput } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'

const schema = z.object({
  username: z.string().min(1, 'Введите имя пользователя'),
  password: z.string().min(1, 'Введите пароль'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    try {
      await login(data.username, data.password)
      toast.success(`Добро пожаловать, ${data.username}!`)
      navigate('/')
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 401) { setError('password', { message: 'Неверный логин или пароль' }); return }
        if (err.response?.status === 429) { toast.error('Слишком много попыток, подождите минуту'); return }
      }
      toast.error('Ошибка входа')
    }
  }

  return (
    <AuthShell>
      <div className="page-enter">
        <h2 className="text-[22px] font-semibold tracking-tight">Вход в систему</h2>
        <p className="text-sm text-ink-500 mt-1">Войдите, чтобы запустить расчёт.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
          <Field label="Имя пользователя" error={errors.username?.message}>
            <Input {...register('username')} placeholder="ivanov" autoComplete="username" autoFocus error={errors.username?.message} />
          </Field>
          <Field label="Пароль" error={errors.password?.message}>
            <PasswordInput {...register('password')} placeholder="••••••••" autoComplete="current-password" error={errors.password?.message} />
          </Field>
          <div className="flex items-center justify-end text-[12px]">
            <Link to="/forgot-password" className="link">Забыли пароль?</Link>
          </div>
          <Button type="submit" loading={isSubmitting} size="lg" className="w-full mt-2" iconRight={<ArrowRight size={15} />}>
            Войти
          </Button>
        </form>
        <div className="mt-6 text-sm text-ink-500 text-center">
          Нет аккаунта? <Link to="/register" className="link">Зарегистрироваться</Link>
        </div>
      </div>
    </AuthShell>
  )
}
