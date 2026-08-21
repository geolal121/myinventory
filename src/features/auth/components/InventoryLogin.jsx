import { useState } from 'react'
import { KeyRound, PackageCheck, ShieldCheck } from 'lucide-react'

import Button from '../../../shared/components/Button.jsx'
import Card from '../../../shared/components/Card.jsx'
import Input from '../../../shared/components/Input.jsx'

import { signInToInventory } from '../services/inventoryAuthService.js'
import { INVENTORY_OWNER } from '../utils/inventoryAuthIdentity.js'

function InventoryLogin() {
  const [formData, setFormData] = useState({
    branch: INVENTORY_OWNER.branch,
    technicianId: INVENTORY_OWNER.technicianId,
    password: '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }))
    setErrorMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSigningIn(true)

    try {
      await signInToInventory(formData)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'MyInventory could not sign you in.',
      )
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <main className="inventory-auth page-shell">
      <Card as="section" className="inventory-auth__card" padding="lg">
        <div className="inventory-auth__brand" aria-hidden="true">
          <PackageCheck size={29} />
        </div>

        <header className="inventory-auth__header">
          <p className="inventory-auth__eyebrow">Truck Inventory</p>
          <h1>Welcome Back</h1>
          <p>Enter your work identity and private password.</p>
        </header>

        <form className="inventory-auth__form" onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="inventory-auth__error" role="alert">
              <strong>Could not sign in</strong>
              <p>{errorMessage}</p>
            </div>
          )}

          <Input
            name="branch"
            label="Branch"
            type="text"
            value={formData.branch}
            onChange={handleChange}
            autoComplete="organization"
            autoCapitalize="words"
            required
          />

          <Input
            name="technicianId"
            label="Tech ID"
            type="text"
            inputMode="numeric"
            value={formData.technicianId}
            onChange={handleChange}
            autoComplete="username"
            required
          />

          <Input
            name="password"
            label="Private Password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            minLength="6"
            required
          />

          <Button type="submit" fullWidth disabled={isSigningIn}>
            <KeyRound size={18} aria-hidden="true" />
            {isSigningIn ? 'Signing In…' : 'Open My Inventory'}
          </Button>
        </form>

        <div className="inventory-auth__security-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <p>
            Your password is verified securely by Firebase and is never stored
            in this app.
          </p>
        </div>
      </Card>
    </main>
  )
}

export default InventoryLogin
