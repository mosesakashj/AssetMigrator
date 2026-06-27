import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AssetsListPage } from './pages/AssetsListPage'
import { Step1ClassifyPage } from './pages/AddFlow/Step1ClassifyPage'
import { Step2CapturePage } from './pages/AddFlow/Step2CapturePage'
import { ExportPage } from './pages/ExportPage'

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#FDF4F9] flex justify-center">
        <div className="w-full max-w-md relative min-h-screen overflow-hidden">
          <Routes>
            <Route path="/" element={<AssetsListPage />} />
            <Route path="/add/step1" element={<Step1ClassifyPage />} />
            <Route path="/add/step2" element={<Step2CapturePage />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
