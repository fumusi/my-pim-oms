import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { jwtDecode } from 'jwt-decode'

interface JwtPayload {
  sub: string
  email: string
  role: string
  exp: number
}

export interface AuthUser {
  sub: string
  email: string
  role: string
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
}

function tryDecode(token: string): AuthUser | null {
  try {
    const { sub, email, role } = jwtDecode<JwtPayload>(token)
    return { sub, email, role }
  } catch {
    return null
  }
}

function isExpired(token: string): boolean {
  try {
    const { exp } = jwtDecode<JwtPayload>(token)
    return Date.now() / 1000 >= exp
  } catch {
    return true
  }
}

// Access token stored in localStorage so it survives page refresh.
// It is short-lived (1 h) and the refresh token (HttpOnly cookie) extends the
// session silently. Storing in localStorage is an acceptable trade-off here
// because the refresh token never touches JS land.
const stored = localStorage.getItem('access_token')
const validStored = stored && !isExpired(stored) ? stored : null
if (stored && !validStored) localStorage.removeItem('access_token')

const initialState: AuthState = {
  accessToken: validStored,
  user: validStored ? tryDecode(validStored) : null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload
      state.user = tryDecode(action.payload)
      localStorage.setItem('access_token', action.payload)
    },
    clearAccessToken(state) {
      state.accessToken = null
      state.user = null
      localStorage.removeItem('access_token')
    },
  },
})

export function selectIsAuthenticated(token: string | null): boolean {
  return !!token && !isExpired(token)
}

export const { setAccessToken, clearAccessToken } = authSlice.actions
export default authSlice.reducer
