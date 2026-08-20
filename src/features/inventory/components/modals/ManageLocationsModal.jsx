import Button from '../../../../shared/components/Button.jsx'
import Card from '../../../../shared/components/Card.jsx'
import Modal from '../../../../shared/components/Modal.jsx'

function ManageLocationsModal({
  isOpen,
  onClose,
  locations = [],
  locationGroups = [],
  onDelete,
}) {
  const groupsByLocation = new Map(
    locationGroups.map((group) => [group.location.trim().toUpperCase(), group]),
  )

  return (
    <Modal
      isOpen={isOpen}
      title="Manage Locations"
      description="Remove boxes and other locations that are no longer on your truck."
      onClose={onClose}
    >
      {locations.length > 0 ? (
        <div className="inventory-page__manage-location-list">
          {locations.map((location) => {
            const locationGroup = groupsByLocation.get(
              location.trim().toUpperCase(),
            )

            return (
              <Card
                key={location}
                className="inventory-page__manage-location-card"
              >
                <div>
                  <h3>{location}</h3>
                  <p>
                    {locationGroup?.partCount || 0} part
                    {locationGroup?.partCount === 1 ? '' : 's'} ·{' '}
                    {locationGroup?.totalQuantity || 0} total quantity
                  </p>
                </div>

                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => onDelete(location, locationGroup)}
                >
                  Delete
                </Button>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="inventory-page__empty-state">
          <h3>No saved locations</h3>
          <p>Add a part to create a new location.</p>
        </Card>
      )}
    </Modal>
  )
}

export default ManageLocationsModal
