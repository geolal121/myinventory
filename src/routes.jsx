import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import InventoryPage from './features/inventory/pages/InventoryPage.jsx'

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InventoryPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes