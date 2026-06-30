import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ClientHomeView } from './view/ClientHomeView'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ClientHomeView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
