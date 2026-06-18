import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import { store } from './store'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </Provider>
  </StrictMode>,
)
