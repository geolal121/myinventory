import Modal from '../../../../shared/components/Modal.jsx'
import Button from '../../../../shared/components/Button.jsx'

function HistoryModal({ isOpen, onClose, history = [] }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'No date'

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString))
  }

  return (
    <Modal
      isOpen={isOpen}
      title="History"
      description="Review every inventory action saved on this device."
      onClose={onClose}
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {history.length > 0 ? (
        <div className="inventory-history-list">
          {history.map((record) => (
            <article key={record.id} className="inventory-history-card">
              <div className="inventory-history-card__header">
                <strong>{record.action}</strong>
                <span>{formatDate(record.createdAt)}</span>
              </div>

              <div className="inventory-history-card__body">
                <p>
                  <strong>Part:</strong> {record.partNumber}
                </p>

                <p>
                  <strong>Qty:</strong> {record.quantity}
                </p>

                {record.location && (
                  <p>
                    <strong>Location:</strong> {record.location}
                  </p>
                )}

                {record.fromLocation && (
                  <p>
                    <strong>From:</strong> {record.fromLocation}
                  </p>
                )}

                {record.toLocation && (
                  <p>
                    <strong>To:</strong> {record.toLocation}
                  </p>
                )}

                {record.inventoryStatus && (
                  <p>
                    <strong>Type:</strong> {record.inventoryStatus}
                  </p>
                )}

                {record.person && (
                  <p>
                    <strong>Used By:</strong> {record.person}
                  </p>
                )}

                {record.coworker && (
                  <p>
                    <strong>Coworker:</strong> {record.coworker}
                  </p>
                )}

                {record.machine && (
                  <p>
                    <strong>Machine:</strong> {record.machine}
                  </p>
                )}

                {record.customer && (
                  <p>
                    <strong>Customer:</strong> {record.customer}
                  </p>
                )}

                {record.ticketNumber && (
                  <p>
                    <strong>Ticket:</strong> {record.ticketNumber}
                  </p>
                )}

                {record.notes && (
                  <p>
                    <strong>Notes:</strong> {record.notes}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="inventory-history-empty">
          <h3>No history yet</h3>
          <p>Inventory actions will show here after you add, use, give, or move parts.</p>
        </div>
      )}
    </Modal>
  )
}

export default HistoryModal