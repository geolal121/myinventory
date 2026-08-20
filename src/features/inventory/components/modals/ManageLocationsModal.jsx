import { useState } from 'react'
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'

import Button from '../../../../shared/components/Button.jsx'
import Card from '../../../../shared/components/Card.jsx'
import Input from '../../../../shared/components/Input.jsx'
import Modal from '../../../../shared/components/Modal.jsx'

function ManageLocationsModal({
  isOpen,
  onClose,
  locations = [],
  locationGroups = [],
  deletedLocations = [],
  onAdd,
  onRename,
  onRestore,
  onDelete,
}) {
  const [newLocation, setNewLocation] = useState('')
  const [editingLocation, setEditingLocation] = useState('')
  const [editedLocationName, setEditedLocationName] = useState('')
  const [formError, setFormError] = useState('')

  const groupsByLocation = new Map(
    locationGroups.map((group) => [group.location.trim().toUpperCase(), group]),
  )

  const resetForms = () => {
    setNewLocation('')
    setEditingLocation('')
    setEditedLocationName('')
    setFormError('')
  }

  const handleClose = () => {
    resetForms()
    onClose()
  }

  const handleAdd = (event) => {
    event.preventDefault()

    const result = onAdd(newLocation)

    if (!result.isValid) {
      setFormError(result.errorMessage)
      return
    }

    setNewLocation('')
    setFormError('')
  }

  const startEditing = (location) => {
    setEditingLocation(location)
    setEditedLocationName(location)
    setFormError('')
  }

  const cancelEditing = () => {
    setEditingLocation('')
    setEditedLocationName('')
    setFormError('')
  }

  const handleRename = (event) => {
    event.preventDefault()

    const result = onRename(editingLocation, editedLocationName)

    if (!result.isValid) {
      setFormError(result.errorMessage)
      return
    }

    cancelEditing()
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Manage Locations"
      description="Add, rename, remove, or restore your truck locations."
      onClose={handleClose}
    >
      <form className="inventory-page__location-editor" onSubmit={handleAdd}>
        <Input
          name="newLocation"
          label="Add New Location"
          type="text"
          value={newLocation}
          onChange={(event) => setNewLocation(event.target.value)}
          placeholder="Example: Front Bin"
          autoComplete="off"
          required
        />

        <Button type="submit">
          <Plus size={18} aria-hidden="true" />
          Add Location
        </Button>
      </form>

      {formError && (
        <div className="inventory-form__error" role="alert">
          <strong>Check location</strong>
          <p>{formError}</p>
        </div>
      )}

      <div className="inventory-page__manage-location-heading">
        <h3>Active Locations</h3>
        <span>{locations.length}</span>
      </div>

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
                {editingLocation === location ? (
                  <form
                    className="inventory-page__rename-location-form"
                    onSubmit={handleRename}
                  >
                    <Input
                      name="editedLocationName"
                      label={`Rename ${location}`}
                      type="text"
                      value={editedLocationName}
                      onChange={(event) =>
                        setEditedLocationName(event.target.value)
                      }
                      autoComplete="off"
                      required
                    />

                    <div className="inventory-page__rename-location-actions">
                      <Button type="submit" size="sm">
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div>
                      <h3>{location}</h3>
                      <p>
                        {locationGroup?.partCount || 0} part
                        {locationGroup?.partCount === 1 ? '' : 's'} ·{' '}
                        {locationGroup?.totalQuantity || 0} total quantity
                      </p>
                    </div>

                    <div className="inventory-page__manage-location-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => startEditing(location)}
                      >
                        <Pencil size={16} aria-hidden="true" />
                        Rename
                      </Button>

                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => onDelete(location, locationGroup)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </>
                )}
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

      {deletedLocations.length > 0 && (
        <>
          <div className="inventory-page__manage-location-heading">
            <h3>Deleted Locations</h3>
            <span>{deletedLocations.length}</span>
          </div>

          <div className="inventory-page__manage-location-list">
            {deletedLocations.map((archive) => (
              <Card
                key={archive.location}
                className="inventory-page__manage-location-card"
              >
                <div>
                  <h3>{archive.location}</h3>
                  <p>
                    {archive.hasSnapshot
                      ? `${archive.items.length} part ${
                          archive.items.length === 1 ? 'record' : 'records'
                        } ready to restore`
                      : 'Location name only — no parts backup was saved'}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onRestore(archive)}
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  Restore
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}

export default ManageLocationsModal
