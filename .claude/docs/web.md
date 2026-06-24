# Frontend Context — apps/web

## Stack
React 19, Vite 8, TypeScript ~6, TanStack Router (file-based routing), TanStack Query (server state), Redux Toolkit (global client state), Bootstrap 5 + custom SCSS, react-hook-form + zod (forms), sonner (toasts)

## Directory Structure
```
src/
  pages/          — One file per route page component
  components/     — Reusable UI components (modals, drawers, badges)
  hooks/          — Custom React hooks
  services/       — Axios API client wrappers per domain
  store/          — Redux slices (authSlice, langSlice) + store config
  layouts/        — Layout wrappers (auth layout, app layout)
  utils/          — Pure utility functions
  router.tsx      — TanStack Router route tree
  main.tsx        — App entry, providers setup
```

## Pages
| Page | Path | Role |
|---|---|---|
| LoginPage | /login | public |
| RegisterPage | /register | public |
| ForgotPasswordPage | /forgot-password | public |
| ResetPasswordPage | /reset-password | public |
| OAuthCallbackPage | /oauth/callback | public |
| DashboardPage | / | buyer+admin |
| ProductsPage | /products | buyer+admin |
| ProductDetailPage | /products/:id | buyer+admin |
| CategoriesPage | /categories | admin |
| CategoryDetailPage | /categories/:id | admin |
| OrdersPage | /orders | buyer+admin |
| UsersPage | /users | admin |
| ProfilePage | /profile | buyer+admin |

## State Management Pattern
- **Server state** (products, categories, users, orders) → TanStack Query (`useQuery`, `useMutation`)
- **Client state** (auth user, language/locale) → Redux Toolkit slices
- Auth state in `store/authSlice.ts`: `{ user, accessToken, isAuthenticated }`
- No Redux for server data — TanStack Query handles caching/invalidation

## Components
| Component | Purpose |
|---|---|
| ProductDrawer | Create/edit product — slide-in drawer with form |
| CategoryDrawer | Create/edit category |
| AssignProductsModal | Assign products to a category |
| EditUserModal | Edit user role/details |
| ImportModal | Upload xlsx for product import |
| ConfirmModal | Generic confirmation dialog |
| RoleBadge | Visual role indicator chip |
| TemplateEditor | PIM template editing UI |

## Forms Pattern
```tsx
// react-hook-form + zod resolver
const schema = z.object({ name: z.string().min(1) });
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
});
```

## API Service Pattern
```tsx
// services/products.service.ts — axios instance with interceptors
// Interceptor auto-attaches cookie credentials (withCredentials: true)
// 401 → triggers token refresh → retry
```

## Routing
TanStack Router with file-based routes. Protected routes wrapped in auth guard layout. `router.tsx` is the central route tree definition.

## Styling
Bootstrap 5 utility classes + custom SCSS in `src/styles/`. Component-level styles co-located or in `index.css`/`App.css`.
