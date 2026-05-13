import { useState } from 'react'

import Button from '../../../shared/components/Button.jsx'
import Card from '../../../shared/components/Card.jsx'

const SWIPE_DELETE_THRESHOLD = -72

function InventoryItemCard({ item, onUse, onGive, onMove, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [touchStartX, setTouchStartX] = useState(null)
  const [translateX, setTranslateX] = useState(0)
  const [isDeleteRevealed, setIsDeleteRevealed] = useState(false)

  const physicalTotal =
    Number(item.officialQuantity || 0) + Number(item.noiQuantity || 0)

  const handleTouchStart = (event) => {
    setTouchStartX(event.touches[0].clientX)
  }

  const handleTouchMove = (event) => {
    if (touchStartX === null) return

    const currentX = event.touches[0].clientX
    const deltaX = currentX - touchStartX

    if (deltaX < 0) {
      setTranslateX(Math.max(deltaX, SWIPE_DELETE_THRESHOLD))
    }
  }

  const handleTouchEnd = () => {
    if (translateX <= SWIPE_DELETE_THRESHOLD / 2) {
      setTranslateX(SWIPE_DELETE_THRESHOLD)
      setIsDeleteRevealed(true)
    } else {
      setTranslateX(0)
      setIsDeleteRevealed(false)
    }

    setTouchStartX(null)
  }

  const handleMainClick = () => {
    if (isDeleteRevealed) {
      setTranslateX(0)
      setIsDeleteRevealed(false)
      return
    }

    setIsExpanded((currentValue) => !currentValue)
  }

  const handleDeleteClick = () => {
    onDelete(item)
  }

  return (
    <div className="inventory-page__swipe-shell">
      <button
        type="button"
        className="inventory-page__swipe-delete"
        onClick={handleDeleteClick}
        aria-label={`Delete ${item.partNumber}`}
      >
        Delete
      </button>

      <Card
        className="inventory-page__inventory-card"
        style={{ transform: `translateX(${translateX}px)` }}
      >
        <button
          type="button"
          className="inventory-page__inventory-card-main"
          onClick={handleMainClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
    </div>
  )
}

export default InventoryItemCard