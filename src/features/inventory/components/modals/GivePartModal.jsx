import { useEffect, useMemo, useState } from 'react'

import Button from '../../../../shared/components/Button.jsx'
import Input from '../../../../shared/components/Input.jsx'
import Modal from '../../../../shared/components/Modal.jsx'
import Select from '../../../../shared/components/Select.jsx'

import { getLocationOptions } from '../../data/inventoryLocations.js'
import { INVENTORY_STATUS } from '../../utils/inventoryHelpers.js'

const INVENTORY_STATUS_OPTIONS = [
  {
    label: 'Official Inventory',
    value: INVENTORY_STATUS.OFFICIAL,
  },
  {
    label: 'NOI / Ghost Part',
    value: INVENTORY_STATUS.NOI,
  },
]

const getInitialFormData = () => ({
  partNumber: '',
  quantity: '',
  location: '',
  inventoryStatus: INVENTORY_STATUS.OFFICIAL,
  coworker: '',
  machine: '',
  customer: '',
  ticketNumber: '',
  notes: '',
})

function GivePartModal({
  isOpen,
  onClose,
  onSubmit,
  savedLocations = [],
  selectedItem = null,
  errorMessage = '',
}) {
  const [formData, setFormData] = useState(getInitialFormData)

  const locationOptions = useMemo(() => {
    return getLocationOptions(savedLocations)
  }, [savedLocations])

  useEffect(() => {
    if (!isOpen) return

    setFormData((currentFormData) => ({
      ...currentFormData,
      partNumber: selectedItem?.partNumber || '',
      location: selectedItem?.location || '',
    }))
  }, [isOpen, selectedItem])

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }))
  }

  const resetForm = () => {
    setFormData(getInitialFormData())
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const wasSaved = onSubmit({
      ...formData,
      quantity: Number(formData.quantity),
    })

    if (!wasSaved) return

    resetForm()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Give Part"
      description="Subtract a part from your truck and record who took it."
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button type="submit" form="give-part-form">
            Save Give
          </Button>
        </>
      }
    >
      <form id="give-part-form" className="inventory-form" onSubmit={handleSubmit}>
        {errorMessage && (
          <div className="inventory-form__error">
            <strong>Check quantity</strong>
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="inventory-form__row">
          <Input
            name="partNumber"
            label="Part Number"
            value={formData.partNumber}
            onChange={handleChange}
            placeholder="Example: 123456"
            required
          />

          <Input
            name="quantity"
            label="Quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={handleChange}
            placeholder="Example: 1"
            required
          />
        </div>

        <Input
          name="location"
          label="Location"
          value={formData.location}
          onChange={handleChange}
          placeholder="Box 1, Slide Box, Inside Backpack..."
          list="give-part-location-options"
          required
        />

        <datalist id="give-part-location-options">
          {locationOptions.map((location) => (
            <option key={location.value} value={location.value} />
          ))}
        </datalist>

        <Select
          name="inventoryStatus"
          label="Inventory Type"
          value={formData.inventoryStatus}
          onChange={handleChange}
          options={INVENTORY_STATUS_OPTIONS}
          required
        />

        <Input
          name="coworker"
          label="Coworker Name"
          value={formData.coworker}
          onChange={handleChange}
          placeholder="Example: Mike"
          required
        />

        <div className="inventory-form__row">
          <Input
            name="machine"
            label="Machine"
            value={formData.machine}
            onChange={handleChange}
            placeholder="Example: JetScan iFX"
          />

          <Input
            name="customer"
            label="Customer"
            value={formData.customer}
            onChange={handleChange}
            placeholder="Example: Wells Fargo"
          />
        </div>

        <Input
          name="ticketNumber"
          label="Ticket Number"
          value={formData.ticketNumber}
          onChange={handleChange}
          placeholder="Example: WO-12345"
        />

        <Input
          name="notes"
          label="Notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Optional"
        />
      </form>
    </Modal>
  )
}

export default GivePartModal