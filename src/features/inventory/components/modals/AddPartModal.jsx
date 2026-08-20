import { useMemo, useState } from 'react'

import Button from '../../../../shared/components/Button.jsx'
import Input from '../../../../shared/components/Input.jsx'
import Modal from '../../../../shared/components/Modal.jsx'
import Select from '../../../../shared/components/Select.jsx'

import { getLocationOptions } from '../../data/inventoryLocations.js'
import {
  formatPartNumberInput,
  INVENTORY_STATUS,
} from '../../utils/inventoryHelpers.js'

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
  notes: '',
})

function AddPartModal({
  isOpen,
  onClose,
  onSubmit,
  savedLocations = [],
  removedLocations = [],
  errorMessage = '',
}) {
  const [formData, setFormData] = useState(getInitialFormData)

  const locationOptions = useMemo(() => {
    return getLocationOptions(savedLocations, removedLocations)
  }, [removedLocations, savedLocations])

  const resetForm = () => {
    setFormData(getInitialFormData())
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    if (name === 'partNumber') {
      setFormData((currentFormData) => ({
        ...currentFormData,
        partNumber: formatPartNumberInput(value),
      }))

      return
    }

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }))
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
      title="Add Part"
      description="Add official inventory or NOI / ghost parts to your truck stock."
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button type="submit" form="add-part-form">
            Save Part
          </Button>
        </>
      }
    >
      <form id="add-part-form" className="inventory-form" onSubmit={handleSubmit}>
        {errorMessage && (
          <div className="inventory-form__error">
            <strong>Check entry</strong>
            <p>{errorMessage}</p>
          </div>
        )}

        <Input
          name="partNumber"
          label="Part Number"
          value={formData.partNumber}
          onChange={handleChange}
          placeholder="Example: 123-4567-89"
          required
        />

        <Input
          name="quantity"
          label="Quantity"
          type="number"
          min="1"
          value={formData.quantity}
          onChange={handleChange}
          placeholder="Example: 4"
          required
        />

        <Input
          name="location"
          label="Location"
          value={formData.location}
          onChange={handleChange}
          placeholder="Box 1, Slide Box, Inside Backpack..."
          list="inventory-location-options"
          required
        />

        <datalist id="inventory-location-options">
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

export default AddPartModal
