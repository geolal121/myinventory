import { useState } from 'react'
import { Eye, EyeOff, Fuel, ShieldCheck, Trash2 } from 'lucide-react'

import Button from '../../../../shared/components/Button.jsx'
import Input from '../../../../shared/components/Input.jsx'
import Modal from '../../../../shared/components/Modal.jsx'
import {
  clearVehicleGasPin,
  loadVehicleGasPin,
  saveVehicleGasPin,
} from '../../utils/inventoryStorage.js'

function VehicleAccessModal({ isOpen, onClose, vehicleNumber }) {
  const [savedPin, setSavedPin] = useState(() => loadVehicleGasPin())
  const [draftPin, setDraftPin] = useState(() => loadVehicleGasPin())
  const [isEditing, setIsEditing] = useState(() => !loadVehicleGasPin())
  const [isVisible, setIsVisible] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleClose = () => {
    setIsVisible(false)
    setErrorMessage('')
    onClose()
  }

  const handleSave = (event) => {
    event.preventDefault()

    if (!draftPin) {
      setErrorMessage('Enter the gas PIN before saving.')
      return
    }

    if (!saveVehicleGasPin(draftPin)) {
      setErrorMessage('This browser could not save the PIN.')
      return
    }

    setSavedPin(draftPin)
    setIsEditing(false)
    setIsVisible(false)
    setErrorMessage('')
  }

  const handleForget = () => {
    clearVehicleGasPin()
    setSavedPin('')
    setDraftPin('')
    setIsEditing(true)
    setIsVisible(false)
    setErrorMessage('')
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Vehicle Access"
      description={`Vehicle ${vehicleNumber}`}
      onClose={handleClose}
      className="vehicle-access-modal"
      footer={
        <Button type="button" variant="secondary" onClick={handleClose}>
          Done
        </Button>
      }
    >
      <div className="vehicle-access">
        <div className="vehicle-access__vehicle">
          <span className="vehicle-access__icon" aria-hidden="true">
            <Fuel size={22} />
          </span>
          <div>
            <span>Vehicle number</span>
            <strong>{vehicleNumber}</strong>
          </div>
        </div>

        {isEditing ? (
          <form className="vehicle-access__form" onSubmit={handleSave}>
            <Input
              id="vehicle-gas-pin"
              label="Gas PIN"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              value={draftPin}
              onChange={(event) => {
                setDraftPin(event.target.value.replace(/\D/g, ''))
                setErrorMessage('')
              }}
              placeholder="Enter PIN"
              error={errorMessage}
            />

            <Button type="submit" fullWidth>
              Save on This Device
            </Button>
          </form>
        ) : (
          <>
            <div className="vehicle-access__pin-row">
              <div>
                <span>Gas PIN</span>
                <strong>{isVisible ? savedPin : '•'.repeat(savedPin.length)}</strong>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsVisible((currentValue) => !currentValue)}
                aria-label={isVisible ? 'Hide gas PIN' : 'Show gas PIN'}
              >
                {isVisible ? (
                  <EyeOff size={17} aria-hidden="true" />
                ) : (
                  <Eye size={17} aria-hidden="true" />
                )}
                {isVisible ? 'Hide' : 'Show'}
              </Button>
            </div>

            <div className="vehicle-access__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDraftPin(savedPin)
                  setIsEditing(true)
                  setIsVisible(false)
                }}
              >
                Change PIN
              </Button>
              <Button type="button" variant="ghost" onClick={handleForget}>
                <Trash2 size={17} aria-hidden="true" />
                Forget PIN
              </Button>
            </div>
          </>
        )}

        <div className="vehicle-access__privacy-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <p>The PIN is saved only in this browser on this device.</p>
        </div>
      </div>
    </Modal>
  )
}

export default VehicleAccessModal
