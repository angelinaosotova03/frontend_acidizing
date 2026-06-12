import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { AxiosError } from 'axios'
import { useAuth } from '../hooks/useAuth'
import { authApi } from '../api/auth'
import { Button, Card, Field, Input, PasswordInput, PasswordRequirements } from '../components/ui'
import { fmt } from '../utils/format'

const schema = z.object({
  current_password: z.string().min(1, 'Введите текущий пароль'),
  new_password:     z.string().min(8, 'Минимум 8 символов').regex(/\d/, 'Нужна хотя бы одна цифра'),
  confirm:          z.string(),
}).refine(d => d.new_password === d.confirm, { message: 'Пароли не совпадают', path: ['confirm'] })
type FormValues = z.infer<typeof schema>

export function ProfilePage() {
  const { user } = useAuth()
  const { register, handleSubmit, watch, reset, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })
  const pwd = watch('new_password', '')

  const onSubmit = async (data: FormValues) => {
    try {
      await authApi.changePassword({ current_password: data.current_password, new_password: data.new_password })
      toast.success('Пароль обновлён')
      reset()
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 400) {
        setError('current_password', { message: 'Неверный текущий пароль' })
      } else {
        toast.error('Ошибка при смене пароля')
      }
    }
  }

  if (!user) return null
  return (
    <div className="space-y-6 max-w-[820px]">
      <header>
        <div className="text-[11px] uppercase tracking-[.1em] text-ink-500 font-semibold mb-1">Аккаунт</div>
        <h1 className="text-[26px] font-semibold tracking-tight">Профиль</h1>
      </header>

      <Card title="Учётная запись">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Имя пользователя"><Input value={user.username} disabled className="input-text" /></Field>
          <Field label="Email"><Input value={user.email ?? '—'} disabled className="input-text" /></Field>
          <Field label="Дата регистрации"><Input value={fmt.date(user.created_at)} disabled className="input-text" /></Field>
        </div>
      </Card>

      <Card title="Смена пароля">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-3 gap-4" noValidate>
          <Field label="Текущий пароль" error={errors.current_password?.message}>
            <PasswordInput {...register('current_password')} autoComplete="current-password" error={errors.current_password?.message} />
          </Field>
          <Field label="Новый пароль" error={errors.new_password?.message}>
            <PasswordInput {...register('new_password')} autoComplete="new-password" error={errors.new_password?.message} />
            <PasswordRequirements pwd={pwd} />
          </Field>
          <Field label="Повторите" error={errors.confirm?.message}>
            <PasswordInput {...register('confirm')} autoComplete="new-password" error={errors.confirm?.message} />
          </Field>
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" loading={isSubmitting} icon={<Save size={14}/>}>Сохранить новый пароль</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
