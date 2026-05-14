import { useEffect, useMemo, useState } from 'react'

import Button from '../../../../shared/components/Button.jsx'
import Input from '../../../../shared/components/Input.jsx'
import Modal from '../../../../shared/components/Modal.jsx'

import { getLocationOptions } from '../../data/inventoryLocations.js'
import { formatPartNumberInput } from '../../utils/inventoryHelpers.js'

const getInitialFormData = () => ({
  partNumber: '',
  location: '',
  officialQuantity: '',
  noiQuantity: '',
  notes: '',
})

function EditPartModal({
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
    if (!isOpen || !selectedItem) return

    setFormData({
      partNumber: selectedItem.partNumber || '',
      location: selectedItem.location || '',
      officialQuantity: String(selectedItem.officialQuantity ?? 0),
      noiQuantity: String(selectedItem.noiQuantity ?? 0),
      notes: selectedItem.notes || '',
    })
  }, [isOpen, selectedItem])

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

  const resetForm = () => {
    setFormData(getInitialFormData())
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const wasSaved = onSubmit({
      originalItem: selectedItem,
      partNumber: formData.partNumber,
      location: formData.location,
      officialQuantity: Number(formData.officialQuantity),
      noiQuantity: Number(formData.noiQuantity),
      notes: formData.notes,
    })

    if (!wasSaved) return

    resetForm()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Edit Part"
      description="Correct the part number, location, quantity, or notes."
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button type="submit" form="edit-part-form">
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-part-form" className="inventory-form" onSubmit={handleSubmit}>
        {errorMessage && (
          <div className="inventory-form__error">
            <strong>Check edit</strong>
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
          name="location"
          label="Location"
          value={formData.location}
          onChange={handleChange}
          placeholder="Box 1, Box 2, Slide Box..."
          list="edit-part-location-options"
          required
        />

        <datalist id="edit-part-location-options">
          {locationOptions.map((location) => (
            <option key={location.value} value={location.value} />
          ))}
        </datalist>

        <div className="inventory-form__row">
          <Input
            name="officialQuantity"
            label="Official Quantity"
            type="number"
            min="0"
            value={formData.officialQuantity}
            onChange={handleChange}
            placeholder="0"
            required
          />

          <Input
            name="noiQuantity"
            label="NOI / Ghost Quantity"
            type="number"
            min="0"
            value={formData.noiQuantity}
            onChange={handleChange}
            placeholder="0"
            required
          />
        </div>

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

export default EditPartModal