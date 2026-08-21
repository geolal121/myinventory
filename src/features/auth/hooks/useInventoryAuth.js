import { useContext } from 'react'

import InventoryAuthContext from '../context/InventoryAuthContext.js'

const useInventoryAuth = () => {
  const context = useContext(InventoryAuthContext)

  if (!context) {
    throw new Error('useInventoryAuth must be used inside InventoryAuthProvider.')
  }

  return context
}

export default useInventoryAuth
