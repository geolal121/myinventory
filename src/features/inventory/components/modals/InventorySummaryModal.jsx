import Card from '../../../../shared/components/Card.jsx'
import Modal from '../../../../shared/components/Modal.jsx'

import { INVENTORY_SUMMARY_VIEWS } from '../../data/inventorySummaryViews.js'
import { groupInventoryByPartNumber } from '../../utils/inventoryHelpers.js'

const SUMMARY_VIEW_DETAILS = {
  [INVENTORY_SUMMARY_VIEWS.TOTAL]: {
    title: 'All Parts',
    description: 'Every part in your truck, combined across all locations.',
    filter: () => true,
  },
  [INVENTORY_SUMMARY_VIEWS.OFFICIAL]: {
    title: 'Official Inventory',
    description: 'Parts with official inventory available.',
    filter: (part) => part.officialQuantity > 0,
  },
  [INVENTORY_SUMMARY_VIEWS.NOI]: {
    title: 'NOI / Ghost Parts',
    description: 'Parts with NOI or ghost inventory available.',
    filter: (part) => part.noiQuantity > 0,
  },
  [INVENTORY_SUMMARY_VIEWS.OUT_OF_STOCK]: {
    title: 'Out of Stock Parts',
    description: 'Parts with no official or NOI quantity remaining.',
    filter: (part) => part.totalQuantity === 0,
  },
}

function InventorySummaryModal({
  isOpen,
  onClose,
  items = [],
  summaryView = INVENTORY_SUMMARY_VIEWS.TOTAL,
}) {
  const viewDetails =
    SUMMARY_VIEW_DETAILS[summaryView] ||
    SUMMARY_VIEW_DETAILS[INVENTORY_SUMMARY_VIEWS.TOTAL]

  const visibleParts = groupInventoryByPartNumber(items).filter(
    viewDetails.filter,
  )

  return (
    <Modal
      isOpen={isOpen}
      title={viewDetails.title}
      description={`${viewDetails.description} ${visibleParts.length} result${
        visibleParts.length === 1 ? '' : 's'
      }.`}
      onClose={onClose}
    >
      {visibleParts.length > 0 ? (
        <div className="inventory-page__summary-modal-list">
          {visibleParts.map((part) => {
            return (
              <Card
                key={part.partNumber}
                className="inventory-page__summary-modal-card"
              >
                <div className="inventory-page__summary-modal-card-heading">
                  <div>
                    <h3>{part.partNumber}</h3>

                    {part.description && (
                      <p className="inventory-page__part-description">
                        {part.description}
                      </p>
                    )}

                    <p className="inventory-page__part-summary-meta">
                      {part.locations.length > 0
                        ? `${part.locations.length} stocked location${
                            part.locations.length === 1 ? '' : 's'
                          }`
                        : 'Not stocked in any location'}
                    </p>
                  </div>

                  {part.totalQuantity === 0 && (
                    <span className="inventory-page__stock-badge">
                      Out of Stock
                    </span>
                  )}
                </div>

                <div className="inventory-page__summary-modal-quantities">
                  <span>
                    Total <strong>{part.totalQuantity}</strong>
                  </span>
                  <span>
                    Official <strong>{part.officialQuantity}</strong>
                  </span>
                  <span>
                    NOI <strong>{part.noiQuantity}</strong>
                  </span>
                </div>

                {part.locations.length > 0 && (
                  <div className="inventory-page__part-location-list">
                    {part.locations.map((location) => (
                      <div
                        key={location.id}
                        className="inventory-page__part-location-row"
                      >
                        <span>{location.location}</span>
                        <strong>{location.totalQuantity}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="inventory-page__empty-state">
          <h3>No matching parts</h3>
          <p>There are no parts in this inventory category right now.</p>
        </Card>
      )}
    </Modal>
  )
}

export default InventorySummaryModal
