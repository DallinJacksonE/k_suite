import { ToastProvider } from '@k_suite/shared/toast'
import { AdminDashboardView } from './views/AdminDashboardView'

function App() {
  return <ToastProvider><AdminDashboardView /></ToastProvider>
}

export default App
