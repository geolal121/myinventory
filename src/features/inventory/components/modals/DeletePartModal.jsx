import Button from '../../../../shared/components/Button.jsx'
import Modal from '../../../../shared/components/Modal.jsx'

function DeletePartModal({ isOpen, onClose, onConfirm, selectedItem = null }) {
  const handleConfirmDelete = () => {
    onConfirm(selectedItem)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Delete Part"
      description="Confirm before removing this inventory item."
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button type="button" variant="danger" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </>
      }
    >
      <div className="inventory-form">
        <div className="inventory-form__error">
          <strong>Delete inventory item?</strong>
          <p>This removes the part from your inventory list.</p>
        </div>

        {selectedItem && (
          <div className="inventory-form__section">
            <div>
              <strong>Part Number</strong>
              <p>{selectedItem.partNumber}</p>
            </div>

            <div>
              <strong>Location</strong>
              <p>{selectedItem.location}</p>
            </div>

            <div>
              <strong>Official Quantity</strong>
              <p>{selectedItem.officialQuantity}</p>
            </div>

            <div>
              <strong>NOI / Ghost Quantity</strong>
              <p>{selectedItem.noiQuantity}</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default DeletePartModal