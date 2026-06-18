import { useEffect } from 'react'
import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
  useNavigate,
} from '@tanstack/react-router'
import { toast } from 'sonner'
import { useSelector } from 'react-redux'
import { store } from './store'
import { selectIsAuthenticated, clearAccessToken } from './store/authSlice'
import type { RootState } from './store'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProductsPage } from './pages/ProductsPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProfilePage } from './pages/ProfilePage'
import { UsersPage } from './pages/UsersPage'
import { OAuthCallbackPage } from './pages/OAuthCallbackPage'

function getToken() {
  return store.getState().auth.accessToken
}

function IndexRedirect() {
  const navigate = useNavigate()
  const token = useSelector((s: RootState) => s.auth.accessToken)
  useEffect(() => {
    navigate({ to: selectIsAuthenticated(token) ? '/dashboard' : '/login', replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — intentional one-shot redirect on mount
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

// ── Protected layout — wraps all authenticated pages ──────────────────────────
const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: () => {
    if (!selectIsAuthenticated(getToken())) {
      store.dispatch(clearAccessToken())
      throw redirect({ to: '/login' })
    }
  },
  component: AppLayout,
})

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dashboard',
  staticData: { title: 'Dashboard' },
  component: DashboardPage,
})

const productsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/products',
  staticData: { title: 'Products' },
  component: ProductsPage,
})

const ordersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/orders',
  staticData: { title: 'Orders' },
  component: OrdersPage,
})

const profileRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/profile',
  staticData: { title: 'Profile' },
  component: ProfilePage,
})

const usersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/users',
  staticData: { title: 'User Management' },
  beforeLoad: () => {
    if (store.getState().auth.user?.role !== 'admin') {
      toast.error('Access denied')
      throw redirect({ to: '/dashboard' })
    }
  },
  component: UsersPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  oauthCallbackRoute,
  appLayoutRoute.addChildren([
    dashboardRoute,
    productsRoute,
    ordersRoute,
    profileRoute,
    usersRoute,
  ]),
])

export const router = createRouter({
  routeTree,
  defaultErrorComponent: ({ error }) =>
    import.meta.env.DEV ? (
      <pre style={{ color: 'red', padding: '2rem', whiteSpace: 'pre-wrap' }}>
        {error instanceof Error ? error.stack : String(error)}
      </pre>
    ) : (
      <div style={{ padding: '2rem', color: '#e0e2f0', textAlign: 'center' }}>
        Something went wrong. Please try again.
      </div>
    ),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
  interface StaticDataRouteOption {
    title?: string
  }
}
