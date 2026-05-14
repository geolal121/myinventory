import Button from '../../../../shared/components/Button.jsx'
import Card from '../../../../shared/components/Card.jsx'
import Modal from '../../../../shared/components/Modal.jsx'

function BoxInventoryModal({
  isOpen,
  onClose,
  locationGroup,
  onUse,
  onGive,
  onMove,
  onEdit,
  onDelete,
}) {
  if (!locationGroup) return null

  return (
    <Modal
      isOpen={isOpen}
      title={locationGroup.location}
      description={`${locationGroup.partCount} parts inside this location`}
      onClose={onClose}
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="inventory-page__box-modal-list">
        {locationGroup.items.map((item) => {
          const totalQuantity =
            Number(item.officialQuantity || 0) +
            Number(item.noiQuantity || 0)

          return (
            <Card
              key={item.id}
              className="inventory-page__box-modal-card"
            >
              <div className="inventory-page__box-modal-card-header">
                <div>
                  <h3>{item.partNumber}</h3>

                  {item.notes && (
                    <p>{item.notes}</p>
                  )}
                </div>

                <div className="inventory-page__box-modal-quantities">
                  <span>Total: {totalQuantity}</span>
                  <span>Official: {item.officialQuantity}</span>
                  <span>NOI: {item.noiQuantity}</span>
                </div>
              </div>

              {(item.knownMachines?.length > 0 ||
                item.knownCustomers?.length > 0) && (
                <div className="inventory-page__box-modal-meta">
                  {item.knownMachines?.length > 0 && (
                    <div>
                      <strong>Machines</strong>
                      <p>{item.knownMachines.join(', ')}</p>
                    </div>
                  )}

                  {item.knownCustomers?.length > 0 && (
                    <div>
                      <strong>Customers</strong>
                      <p>{item.knownCustomers.join(', ')}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="inventory-page__box-modal-actions">
                <Button
                  size="sm"
                  onClick={() => onUse(item)}
                >
                  Use
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onGive(item)}
                >
                  Give
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onMove(item)}
                >
                  Move
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onEdit(item)}
                >
                  Edit
                </Button>

                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onDelete(item)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </Modal>
  )
}

export default BoxInventoryModal