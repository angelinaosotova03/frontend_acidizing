import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { AuthShell } from './AuthShell'
import { Button, Field, Input } from '../../components/ui'
import { authApi } from '../../api/auth'

const schema = z.object({ email: z.string().email('Некорректный email') })
type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    try {
      await authApi.forgotPassword(data.email)
      setSent(data.email)
    } catch {
      toast.error('Ошибка при отправке запроса')
    }
  }

  return (
    <AuthShell>
      <div className="page-enter">
        <h2 className="text-[22px] font-semibold tracking-tight">Сброс пароля</h2>
        <p className="text-sm text-ink-500 mt-1">Введите email — мы отправим ссылку для восстановления.</p>
        {sent ? (
          <div className="mt-7 p-4 rounded-md bg-brand-50 border border-brand-100">
            <div className="flex items-start gap-2.5">
              <Mail size={18} className="text-brand-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-ink-900">Ссылка отправлена на {sent}</div>
                <div className="text-ink-700 mt-1">Проверьте почту и перейдите по ссылке для установки нового пароля.</div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register('email')} placeholder="i.ivanov@company.ru" autoFocus error={errors.email?.message} />
            </Field>
            <Button type="submit" loading={isSubmitting} size="lg" className="w-full mt-2">Отправить ссылку</Button>
          </form>
        )}
        <div className="mt-6 text-sm text-ink-500 text-center">
          <Link to="/login" className="link inline-flex items-center gap-1"><ArrowLeft size={13} /> Назад ко входу</Link>
        </div>
      </div>
    </AuthShell>
  )
}
