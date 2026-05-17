import { AxiosError } from 'axios'
import toast from 'react-hot-toast'

export function handleApiError(err: unknown): void {
  if (err instanceof AxiosError) {
    const status = err.response?.status
    const detail = err.response?.data?.detail
    if (status === 429) { toast.error('Слишком много попыток, подождите минуту'); return }
    if (status === 503) { toast.error('Модель не загружена, обратитесь к администратору'); return }
    if (status === 500) { toast.error(`Ошибка сервера: ${detail || err.message}`); return }
    if (status === 409) { toast.error(typeof detail === 'string' ? detail : 'Конфликт данных'); return }
    if (status === 401) { toast.error('Сессия истекла, войдите снова'); return }
    toast.error(typeof detail === 'string' ? detail : err.message)
  } else {
    toast.error('Неизвестная ошибка')
  }
}

export function get422Errors(err: unknown): Record<string, string> {
  if (err instanceof AxiosError && err.response?.status === 422) {
    const detail = err.response.data?.detail
    if (Array.isArray(detail)) {
      const map: Record<string, string> = {}
      for (const d of detail) {
        const key = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : String(d.loc)
        map[String(key)] = String(d.msg)
      }
      return map
    }
  }
  return {}
}
