import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './features/auth/AuthProvider.tsx'

registerSW({
  // Las actualizaciones quedan listas en segundo plano y se activan cuando el
  // usuario cierra la app. Nunca recargamos un formulario o una sesión activa.
  immediate: false,
  onRegisteredSW: (_serviceWorkerUrl, registration) => {
    if (registration) {
      void registration.update()
      window.setInterval(() => void registration.update(), 60 * 60 * 1_000)
    }
  },
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider><App /></AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
