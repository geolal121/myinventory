import { useEffect, useMemo, useState } from 'react'

import InventoryAuthContext from '../context/InventoryAuthContext.js'
import {
  observeInventoryUser,
  signOutOfInventory,
} from '../services/inventoryAuthService.js'
import { INVENTORY_OWNER } from '../utils/inventoryAuthIdentity.js'
import InventoryLogin from './InventoryLogin.jsx'

import '../styles/inventory-auth.css'

function InventoryAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    return observeInventoryUser((nextUser) => {
      if (nextUser?.email && nextUser.email !== INVENTORY_OWNER.email) {
        signOutOfInventory().catch((error) => {
          console.error('Failed to sign out unauthorized inventory user:', error)
        })
        setUser(null)
        setIsCheckingAuth(false)
        return
      }

      setUser(nextUser)
      setIsCheckingAuth(false)
    })
  }, [])

  const authValue = useMemo(
    () => ({
      user,
      signOut: signOutOfInventory,
    }),
    [user],
  )

  if (isCheckingAuth) {
    return (
      <main className="inventory-auth inventory-auth--loading page-shell">
        <div className="inventory-auth__loader" role="status">
          <span aria-hidden="true"></span>
          Checking secure access…
        </div>
      </main>
    )
  }

  if (!user) return <InventoryLogin />

  return (
    <InventoryAuthContext.Provider value={authValue}>
      {children}
    </InventoryAuthContext.Provider>
  )
}

export default InventoryAuthProvider
