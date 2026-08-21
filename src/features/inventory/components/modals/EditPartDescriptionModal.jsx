import { useState } from 'react'

import Button from '../../../../shared/components/Button.jsx'
import Input from '../../../../shared/components/Input.jsx'
import Modal from '../../../../shared/components/Modal.jsx'

function EditPartDescriptionModal({
  isOpen,
  onClose,
  onSubmit,
  part = null,
}) {
  const [description, setDescription] = useState(part?.description || '')

  const handleSubmit = (event) => {
    event.preventDefault()

    const wasSaved = onSubmit({
      partNumber: part?.partNumber || '',
      description,
    })

    if (wasSaved) onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Edit Description"
      description={`Update the catalog description for ${
        part?.partNumber || 'this part'
      }.`}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-part-description-form">
            Save Description
          </Button>
        </>
      }
    >
      <form
        id="edit-part-description-form"
        className="inventory-form"
        onSubmit={handleSubmit}
      >
        <Input
          id="part-catalog-description"
          label="Description"
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Example: Pressure valve"
          helperText="Leave this blank if the part does not have a description yet."
          autoFocus
        />
      </form>
    </Modal>
  )
}

export default EditPartDescriptionModal
