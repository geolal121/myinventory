import Card from '../../../shared/components/Card.jsx'

function InventoryLocationCard({ locationGroup, onOpen }) {
  return (
    <Card
      as="button"
      type="button"
      className="inventory-page__location-card"
      onClick={() => onOpen(locationGroup)}
    >
      <div>
        <h3>{locationGroup.location}</h3>
        <p>
          {locationGroup.partCount} part
          {locationGroup.partCount === 1 ? '' : 's'}
        </p>
      </div>

      <div className="inventory-page__location-card-stats">
        <span>Total Qty: {locationGroup.totalQuantity}</span>
        <span>Official: {locationGroup.officialQuantity}</span>
        <span>NOI: {locationGroup.noiQuantity}</span>
      </div>
    </Card>
  )
}

export default InventoryLocationCard