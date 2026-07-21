import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './features/auth/AuthProvider.tsx'

const reloadWhenSessionIsSafe = () => {
  if (document.body.dataset.onurSessionRunning === 'true') {
    window.setTimeout(reloadWhenSessionIsSafe, 5_000)
    return
  }
  window.location.reload()
}

if ('serviceWorker' in navigator) {
  let updateReloadScheduled = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updateReloadScheduled) return
    updateReloadScheduled = true
    reloadWhenSessionIsSafe()
  })
}

registerSW({
  immediate: true,
  onNeedReload: reloadWhenSessionIsSafe,
  onRegisteredSW: (_serviceWorkerUrl, registration) => {
    if (registration) window.setInterval(() => void registration.update(), 60 * 60 * 1_000)
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
