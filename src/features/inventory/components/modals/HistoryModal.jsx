import { useMemo, useState } from 'react'

import Button from '../../../../shared/components/Button.jsx'
import Input from '../../../../shared/components/Input.jsx'
import Modal from '../../../../shared/components/Modal.jsx'

function HistoryModal({ isOpen, onClose, history = [] }) {
  const [searchTerm, setSearchTerm] = useState('')

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

  const filteredHistory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) return history

    return history.filter((record) => {
      const searchableText = [
        record.action,
        record.partNumber,
        record.quantity,
        record.location,
        record.fromLocation,
        record.toLocation,
        record.inventoryStatus,
        record.person,
        record.coworker,
        record.machine,
        record.customer,
        record.ticketNumber,
        record.notes,
        record.originalPartNumber,
        record.originalLocation,
        formatDate(record.createdAt),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchableText.includes(query)
    })
  }, [history, searchTerm])

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
      <div className="inventory-history-search">
        <Input
          id="inventory-history-search"
          label="Search History"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Part, box, customer, machine, ticket, notes..."
        />
      </div>

      {filteredHistory.length > 0 ? (
        <div className="inventory-history-list">
          {filteredHistory.map((record) => (
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

                {record.originalPartNumber && (
                  <p>
                    <strong>Original Part:</strong> {record.originalPartNumber}
                  </p>
                )}

                {record.originalLocation && (
                  <p>
                    <strong>Original Location:</strong> {record.originalLocation}
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
          <h3>{searchTerm ? 'No history found' : 'No history yet'}</h3>
          <p>
            {searchTerm
              ? 'Try a different part number, box, customer, machine, or ticket.'
              : 'Inventory actions will show here after you add, use, give, or move parts.'}
          </p>
        </div>
      )}
    </Modal>
  )
}

export default HistoryModal