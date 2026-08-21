import AppRoutes from './routes.jsx'
import InventoryAuthProvider from './features/auth/components/InventoryAuthProvider.jsx'

function App() {
  return (
    <InventoryAuthProvider>
      <AppRoutes />
    </InventoryAuthProvider>
  )
}

export default App
