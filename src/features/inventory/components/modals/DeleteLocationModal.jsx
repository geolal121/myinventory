import Button from '../../../../shared/components/Button.jsx'
import Modal from '../../../../shared/components/Modal.jsx'

function DeleteLocationModal({
  isOpen,
  onClose,
  onConfirm,
  locationGroup = null,
}) {
  const itemCount = locationGroup?.partCount || 0

  const handleConfirmDelete = () => {
    if (!locationGroup) return

    onConfirm(locationGroup)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Delete Location"
      description="Confirm before removing this location from your truck."
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button type="button" variant="danger" onClick={handleConfirmDelete}>
            Delete Location
          </Button>
        </>
      }
    >
      <div className="inventory-form">
        <div className="inventory-form__error">
          <strong>Delete {locationGroup?.location || 'this location'}?</strong>
          <p>
            This removes the location from your choices
            {itemCount > 0
              ? ` and permanently deletes its ${itemCount} part ${
                  itemCount === 1 ? 'record' : 'records'
                }.`
              : '.'}
          </p>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteLocationModal
