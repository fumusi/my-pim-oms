import { useEffect } from 'react'
import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
  useNavigate,
} from '@tanstack/react-router'
import { useSelector } from 'react-redux'
import { store } from './store'
import { selectIsAuthenticated, clearAccessToken } from './store/authSlice'
import type { RootState } from './store'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { OAuthCallbackPage } from './pages/OAuthCallbackPage'

function getToken() {
  return store.getState().auth.accessToken
}

function IndexRedirect() {
  const navigate = useNavigate()
  const token = useSelector((s: RootState) => s.auth.accessToken)
  useEffect(() => {
    navigate({ to: selectIsAuthenticated(token) ? '/dashboard' : '/login', replace: true })
  }, [])
  return null
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => <div>404</div>,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexRedirect,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (selectIsAuthenticated(getToken())) throw redirect({ to: '/dashboard' })
  },
  component: LoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === 'string' ? s.token : undefined,
  }),
  component: ResetPasswordPage,
})

const oauthCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === 'string' ? s.code : undefined,
  }),
  component: OAuthCallbackPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: () => {
    if (!selectIsAuthenticated(getToken())) {
      store.dispatch(clearAccessToken())
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  oauthCallbackRoute,
  dashboardRoute,
])

export const router = createRouter({
  routeTree,
  defaultErrorComponent: ({ error }) => (
    <pre style={{ color: 'red', padding: '2rem', whiteSpace: 'pre-wrap' }}>
      {error instanceof Error ? error.stack : String(error)}
    </pre>
  ),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
