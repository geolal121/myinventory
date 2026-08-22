import { Box, ChevronRight, CircleCheck, Ghost, Package } from 'lucide-react'

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
          <Box size={21} strokeWidth={2} />
        </span>
      </div>

      <div className="inventory-page__location-card-divider" />

      <div className="inventory-page__location-card-stats">
        <div className="inventory-page__location-card-stat">
          <span className="inventory-page__location-card-stat-icon" aria-hidden="true">
            <Package size={17} />
          </span>
          <span>Total Qty</span>
          <strong>{locationGroup.totalQuantity}</strong>
        </div>

        <div className="inventory-page__location-card-stat">
          <span className="inventory-page__location-card-stat-icon" aria-hidden="true">
            <CircleCheck size={17} />
          </span>
          <span>Official</span>
          <strong>{locationGroup.officialQuantity}</strong>
        </div>

        <div className="inventory-page__location-card-stat">
          <span className="inventory-page__location-card-stat-icon" aria-hidden="true">
            <Ghost size={17} />
          </span>
          <span>NOI</span>
          <strong>{locationGroup.noiQuantity}</strong>
        </div>
      </div>

      <ChevronRight
        className="inventory-page__location-card-arrow"
        size={19}
        aria-hidden="true"
      />
    </Card>
  )
}

export default InventoryLocationCard
