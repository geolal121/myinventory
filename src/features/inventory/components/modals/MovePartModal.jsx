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
  inventoryStatus: INVENTORY_STATUS.OFFICIAL,
  fromLocation: '',
  toLocation: '',
  notes: '',
})

function MovePartModal({
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
      fromLocation: selectedItem?.location || '',
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
      title="Move Part"
      description="Move inventory from one truck location to another."
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button type="submit" form="move-part-form">
            Save Move
          </Button>
        </>
      }
    >
      <form id="move-part-form" className="inventory-form" onSubmit={handleSubmit}>
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
            placeholder="Example: 2"
            required
          />
        </div>

        <Select
          name="inventoryStatus"
          label="Inventory Type"
          value={formData.inventoryStatus}
          onChange={handleChange}
          options={INVENTORY_STATUS_OPTIONS}
          required
        />

        <Input
          name="fromLocation"
          label="From Location"
          value={formData.fromLocation}
          onChange={handleChange}
          placeholder="Box 1, Slide Box, Inside Backpack..."
          list="move-part-location-options"
          required
        />

        <Input
          name="toLocation"
          label="To Location"
          value={formData.toLocation}
          onChange={handleChange}
          placeholder="Box 2, Tool Bag, Backpack..."
          list="move-part-location-options"
          required
        />

        <datalist id="move-part-location-options">
          {locationOptions.map((location) => (
            <option key={location.value} value={location.value} />
          ))}
        </datalist>

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

export default MovePartModal