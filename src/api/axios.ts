import axios, { AxiosInstance } from 'axios'

const ACCESS_KEY  = 'opz_access'
const REFRESH_KEY = 'opz_refresh'

export const tokenStore = {
  getAccess:  () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

let refreshing: Promise<void> | null = null

function createInstance(baseURL: string): AxiosInstance {
  const instance = axios.create({ baseURL })

  instance.interceptors.request.use(cfg => {
    const token = tokenStore.getAccess()
    if (token) cfg.headers.Authorization = `Bearer ${token}`
    return cfg
  })

  instance.interceptors.response.use(
    r => r,
    async err => {
      const orig = err.config
      if (err.response?.status === 401 && !orig._retry) {
        orig._retry = true
        const rt = tokenStore.getRefresh()
        if (!rt) {
          tokenStore.clear()
          window.dispatchEvent(new CustomEvent('opz:auth-expired'))
          return Promise.reject(err)
        }
        if (!refreshing) {
          refreshing = axios
            .post('/api/v1/auth/refresh', { refresh_token: rt })
            .then(r => {
              tokenStore.set(r.data.access_token, r.data.refresh_token)
            })
            .catch(e => {
              tokenStore.clear()
              window.dispatchEvent(new CustomEvent('opz:auth-expired'))
              throw e
            })
            .finally(() => { refreshing = null })
        }
        try {
          await refreshing
          orig.headers.Authorization = `Bearer ${tokenStore.getAccess()}`
          return instance(orig)
        } catch {
          return Promise.reject(err)
        }
      }
      return Promise.reject(err)
    },
  )

  return instance
}

export const authAxios   = createInstance('/api/v1/auth')
export const opzAxios    = createInstance('/api/v1/predict')
export const volAxios    = createInstance('/api/v1/volumes')
export const fieldsAxios = createInstance('/api/v1/fields')
