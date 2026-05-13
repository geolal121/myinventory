import { useState } from 'react'

import Button from '../../../shared/components/Button.jsx'
import Card from '../../../shared/components/Card.jsx'

function InventoryItemCard({ item, onUse, onGive, onMove }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const physicalTotal =
    Number(item.officialQuantity || 0) + Number(item.noiQuantity || 0)

  return (
    <Card className="inventory-page__inventory-card">
      <button
        type="button"
        className="inventory-page__inventory-card-main"
        onClick={() => setIsExpanded((currentValue) => !currentValue)}
      >
        <div>
          <h3>{item.partNumber}</h3>
          <p>{item.location}</p>
        </div>

        <div className="inventory-page__inventory-quantities">
          <span>Total: {physicalTotal}</span>
          <span>Official: {item.officialQuantity}</span>
          <span>NOI: {item.noiQuantity}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="inventory-page__inventory-details">
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

          {item.notes && (
            <div>
              <strong>Notes</strong>
              <p>{item.notes}</p>
            </div>
          )}

          <div className="inventory-page__inventory-card-actions">
            <Button size="sm" onClick={() => onUse(item)}>
              Use
            </Button>

            <Button size="sm" variant="secondary" onClick={() => onGive(item)}>
              Give
            </Button>

            <Button size="sm" variant="secondary" onClick={() => onMove(item)}>
              Move
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

export default InventoryItemCard