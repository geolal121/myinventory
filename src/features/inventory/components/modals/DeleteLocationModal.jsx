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
      title="Remove Location"
      description="Removed locations can be restored later from Manage Locations."
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button type="button" variant="danger" onClick={handleConfirmDelete}>
            Remove Location
          </Button>
        </>
      }
    >
      <div className="inventory-form">
        <div className="inventory-form__error">
          <strong>Remove {locationGroup?.location || 'this location'}?</strong>
          <p>
            This hides the location from your choices
            {itemCount > 0
              ? ` and archives its ${itemCount} part ${
                  itemCount === 1 ? 'record' : 'records'
                } so you can restore them later.`
              : '. You can restore the location later.'}
          </p>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteLocationModal
