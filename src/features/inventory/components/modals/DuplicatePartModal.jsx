import Button from '../../../../shared/components/Button.jsx'
import Card from '../../../../shared/components/Card.jsx'
import Modal from '../../../../shared/components/Modal.jsx'

function DuplicatePartModal({
  isOpen,
  onClose,
  pendingPart = null,
  existingItems = [],
  onAddToExistingLocation,
  onKeepNewLocation,
}) {
  if (!pendingPart) return null

  const primaryExistingItem = existingItems[0]

  return (
    <Modal
      isOpen={isOpen}
      title="Part Already Exists"
      description="This part number is already saved in another location."
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button type="button" variant="secondary" onClick={onKeepNewLocation}>
            Keep New Location
          </Button>

          <Button type="button" onClick={onAddToExistingLocation}>
            Add To Existing Box
          </Button>
        </>
      }
    >
      <div className="inventory-form">
        <Card className="inventory-form__warning-card">
          <strong>{pendingPart.partNumber}</strong>

          <p>
            You entered <strong>{pendingPart.location}</strong>, but this part
            already exists in:
          </p>

          <div className="inventory-form__duplicate-list">
            {existingItems.map((item) => (
              <div key={item.id} className="inventory-form__duplicate-item">
                <span>{item.location}</span>
                <small>
                  Official: {item.officialQuantity} / NOI: {item.noiQuantity}
                </small>
              </div>
            ))}
          </div>

          {primaryExistingItem && (
            <p>
              Recommended: add this quantity to{' '}
              <strong>{primaryExistingItem.location}</strong>.
            </p>
          )}
        </Card>
      </div>
    </Modal>
  )
}

export default DuplicatePartModal