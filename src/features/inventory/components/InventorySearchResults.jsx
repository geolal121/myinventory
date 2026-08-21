import { ArrowRightLeft, MapPin, PackageMinus, Pencil } from 'lucide-react'

import Button from '../../../shared/components/Button.jsx'
import Card from '../../../shared/components/Card.jsx'

function InventorySearchResults({
  parts = [],
  items = [],
  onUse,
  onMove,
  onEdit,
  onEditDescription = () => {},
}) {
  const itemsById = new Map(items.map((item) => [item.id, item]))

  return (
    <div className="inventory-page__search-results">
      {parts.map((part) => (
        <Card
          key={part.partNumber}
          as="article"
          className="inventory-page__search-result-card"
        >
          <div className="inventory-page__search-result-heading">
            <div>
              <h3>{part.partNumber}</h3>
              <p>
                {part.description || 'No description saved yet'}
              </p>
            </div>

            <div className="inventory-page__search-result-heading-actions">
              <span
                className={`inventory-page__search-result-stock ${
                  part.totalQuantity === 0
                    ? 'inventory-page__search-result-stock--empty'
                    : ''
                }`}
              >
                {part.totalQuantity === 0
                  ? 'Out of Stock'
                  : `${part.totalQuantity} total`}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onEditDescription(part)}
              >
                <Pencil size={15} aria-hidden="true" />
                Description
              </Button>
            </div>
          </div>

          {part.locations.length > 0 ? (
            <div className="inventory-page__search-result-locations">
              {part.locations.map((location) => {
                const item = itemsById.get(location.id)

                if (!item) return null

                return (
                  <div
                    key={location.id}
                    className="inventory-page__search-result-location"
                  >
                    <div className="inventory-page__search-result-location-main">
                      <span>
                        <MapPin size={15} aria-hidden="true" />
                        {location.location}
                      </span>
                      <strong>{location.totalQuantity}</strong>
                    </div>

                    <div className="inventory-page__search-result-actions">
                      <Button size="sm" onClick={() => onUse(item)}>
                        <PackageMinus size={15} aria-hidden="true" />
                        Use
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onMove(item)}
                      >
                        <ArrowRightLeft size={15} aria-hidden="true" />
                        Move
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onEdit(item)}
                      >
                        <Pencil size={15} aria-hidden="true" />
                        Edit
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="inventory-page__search-result-empty">
              This part is still in your catalog but is not stocked in a
              location.
            </p>
          )}
        </Card>
      ))}
    </div>
  )
}

export default InventorySearchResults
