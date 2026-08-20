import Card from '../../../../shared/components/Card.jsx'
import Modal from '../../../../shared/components/Modal.jsx'

import { isOutOfStock } from '../../utils/inventoryHelpers.js'
import { INVENTORY_SUMMARY_VIEWS } from '../../data/inventorySummaryViews.js'

const SUMMARY_VIEW_DETAILS = {
  [INVENTORY_SUMMARY_VIEWS.TOTAL]: {
    title: 'All Parts',
    description: 'Every part in your truck inventory, grouped by location.',
    filter: () => true,
  },
  [INVENTORY_SUMMARY_VIEWS.OFFICIAL]: {
    title: 'Official Inventory',
    description: 'Parts with official inventory available.',
    filter: (item) => Number(item.officialQuantity || 0) > 0,
  },
  [INVENTORY_SUMMARY_VIEWS.NOI]: {
    title: 'NOI / Ghost Parts',
    description: 'Parts with NOI or ghost inventory available.',
    filter: (item) => Number(item.noiQuantity || 0) > 0,
  },
  [INVENTORY_SUMMARY_VIEWS.OUT_OF_STOCK]: {
    title: 'Out of Stock Parts',
    description: 'Parts with no official or NOI quantity remaining.',
    filter: isOutOfStock,
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

  const visibleItems = items
    .filter(viewDetails.filter)
    .sort((firstItem, secondItem) => {
      const partComparison = firstItem.partNumber.localeCompare(
        secondItem.partNumber,
        undefined,
        { numeric: true, sensitivity: 'base' },
      )

      if (partComparison !== 0) return partComparison

      return firstItem.location.localeCompare(secondItem.location, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    })

  return (
    <Modal
      isOpen={isOpen}
      title={viewDetails.title}
      description={`${viewDetails.description} ${visibleItems.length} result${
        visibleItems.length === 1 ? '' : 's'
      }.`}
      onClose={onClose}
    >
      {visibleItems.length > 0 ? (
        <div className="inventory-page__summary-modal-list">
          {visibleItems.map((item) => {
            const officialQuantity = Number(item.officialQuantity || 0)
            const noiQuantity = Number(item.noiQuantity || 0)
            const totalQuantity = officialQuantity + noiQuantity

            return (
              <Card key={item.id} className="inventory-page__summary-modal-card">
                <div className="inventory-page__summary-modal-card-heading">
                  <div>
                    <h3>{item.partNumber}</h3>
                    <p>{item.location}</p>
                  </div>

                  {totalQuantity === 0 && (
                    <span className="inventory-page__stock-badge">
                      Out of Stock
                    </span>
                  )}
                </div>

                <div className="inventory-page__summary-modal-quantities">
                  <span>
                    Total <strong>{totalQuantity}</strong>
                  </span>
                  <span>
                    Official <strong>{officialQuantity}</strong>
                  </span>
                  <span>
                    NOI <strong>{noiQuantity}</strong>
                  </span>
                </div>

                {item.notes && <p className="inventory-page__part-notes">{item.notes}</p>}
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
