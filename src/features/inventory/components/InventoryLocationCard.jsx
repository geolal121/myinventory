import Card from '../../../shared/components/Card.jsx'

function InventoryLocationCard({ locationGroup, onOpen }) {
  return (
    <Card
      as="button"
      type="button"
      className="inventory-page__location-card"
      onClick={() => onOpen(locationGroup)}
    >
      <div className="inventory-page__location-card-header">
        <div>
          <h3>{locationGroup.location}</h3>
          <p>
            {locationGroup.partCount} part
            {locationGroup.partCount === 1 ? '' : 's'}
          </p>
        </div>

        <span className="inventory-page__location-card-icon" aria-hidden="true">
          ▢
        </span>
      </div>

      <div className="inventory-page__location-card-divider" />

      <div className="inventory-page__location-card-stats">
        <div className="inventory-page__location-card-stat">
          <span className="inventory-page__location-card-stat-icon" aria-hidden="true">
            □
          </span>
          <span>Total Qty</span>
          <strong>{locationGroup.totalQuantity}</strong>
        </div>

        <div className="inventory-page__location-card-stat">
          <span className="inventory-page__location-card-stat-icon" aria-hidden="true">
            ✓
          </span>
          <span>Official</span>
          <strong>{locationGroup.officialQuantity}</strong>
        </div>

        <div className="inventory-page__location-card-stat">
          <span className="inventory-page__location-card-stat-icon" aria-hidden="true">
            !
          </span>
          <span>NOI</span>
          <strong>{locationGroup.noiQuantity}</strong>
        </div>
      </div>
    </Card>
  )
}

export default InventoryLocationCard