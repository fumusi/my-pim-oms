import axios from 'axios'
import { store } from '../store'
import { setAccessToken, clearAccessToken } from '../store/authSlice'

export const api = axios.create({ baseURL: '/api' })

let isRefreshing = false
let queue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function drainQueue(err: unknown, token: string | null) {
  queue.forEach(p => (err ? p.reject(err) : p.resolve(token!)))
  queue = []
}

// Attach access token to every outgoing request
api.interceptors.request.use(config => {
  const token = store.getState().auth.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 — attempt one silent refresh, then retry or redirect to /login
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config as typeof err.config & { _retry?: boolean }

    if (err.response?.status !== 401 || original._retry) throw err

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        queue.push({ resolve, reject })
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post<{ accessToken: string }>('/api/auth/refresh')
      store.dispatch(setAccessToken(data.accessToken))
      drainQueue(null, data.accessToken)
      original.headers.Authorization = `Bearer ${data.accessToken}`
      return api(original)
    } catch (refreshErr) {
      store.dispatch(clearAccessToken())
      drainQueue(refreshErr, null)
      window.location.href = '/login'
      throw refreshErr
    } finally {
      isRefreshing = false
    }
  },
)
