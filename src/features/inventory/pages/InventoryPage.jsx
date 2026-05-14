import { useEffect, useMemo, useState } from 'react'

import Button from '../../../shared/components/Button.jsx'
import Card from '../../../shared/components/Card.jsx'
import Input from '../../../shared/components/Input.jsx'

import InventoryLocationCard from '../components/InventoryLocationCard.jsx'
import AddPartModal from '../components/modals/AddPartModal.jsx'
import BoxInventoryModal from '../components/modals/BoxInventoryModal.jsx'
import DeletePartModal from '../components/modals/DeletePartModal.jsx'
import DuplicatePartModal from '../components/modals/DuplicatePartModal.jsx'
import EditPartModal from '../components/modals/EditPartModal.jsx'
import GivePartModal from '../components/modals/GivePartModal.jsx'
import HistoryModal from '../components/modals/HistoryModal.jsx'
import MovePartModal from '../components/modals/MovePartModal.jsx'
import UsePartModal from '../components/modals/UsePartModal.jsx'

import { INVENTORY_ACTIONS } from '../data/inventoryActions.js'
import {
  buildInventoryTransaction,
  findInventoryItemsByPartNumber,
  formatPartNumberInput,
  getInventorySummary,
  groupInventoryByLocation,
  normalizePartNumberSearch,
} from '../utils/inventoryHelpers.js'
import {
  loadInventoryHistory,
  loadInventoryItems,
  loadSavedLocations,
  saveInventoryHistory,
  saveInventoryItems,
  saveSavedLocations,
} from '../utils/inventoryStorage.js'
import {
  loadInventoryCloudData,
  syncInventoryTransactionToCloud,
} from '../services/inventorySyncService.js'

import '../styles/inventory-page.css'
import '../styles/inventory-forms.css'
import '../styles/inventory-history.css'

function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState(() => loadInventoryItems())
  const [inventoryHistory, setInventoryHistory] = useState(() => loadInventoryHistory())
  const [savedLocations, setSavedLocations] = useState(() => loadSavedLocations())
  const [searchTerm, setSearchTerm] = useState('')
  const [activeModal, setActiveModal] = useState(null)
  const [transactionError, setTransactionError] = useState('')
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null)
  const [selectedLocationGroup, setSelectedLocationGroup] = useState(null)
  const [pendingDuplicatePart, setPendingDuplicatePart] = useState(null)
  const [duplicateExistingItems, setDuplicateExistingItems] = useState([])
  const [syncStatus, setSyncStatus] = useState('Offline Ready')

  const isSearching = searchTerm.trim().length > 0

  const inventorySummary = useMemo(() => {
    return getInventorySummary(inventoryItems)
  }, [inventoryItems])

  const filteredInventoryItems = useMemo(() => {
    if (!isSearching) return inventoryItems

    const normalizedSearchTerm = normalizePartNumberSearch(searchTerm).toLowerCase()

    return inventoryItems.filter((item) => {
      const normalizedPartNumber = normalizePartNumberSearch(
        item.partNumber,
      ).toLowerCase()

      return normalizedPartNumber.includes(normalizedSearchTerm)
    })
  }, [inventoryItems, isSearching, searchTerm])

  const inventoryLocationGroups = useMemo(() => {
    return groupInventoryByLocation(filteredInventoryItems)
  }, [filteredInventoryItems])

  const selectedLocationGroupWithCurrentItems = useMemo(() => {
    if (!selectedLocationGroup) return null

    return inventoryLocationGroups.find(
      (locationGroup) => locationGroup.id === selectedLocationGroup.id,
    ) || selectedLocationGroup
  }, [inventoryLocationGroups, selectedLocationGroup])

  useEffect(() => {
    const loadCloudData = async () => {
      try {
        setSyncStatus('Syncing...')

        const cloudData = await loadInventoryCloudData()

        if (cloudData.inventoryItems.length > 0) {
          setInventoryItems(cloudData.inventoryItems)
        }

        if (cloudData.inventoryHistory.length > 0) {
          setInventoryHistory(cloudData.inventoryHistory)
        }

        if (cloudData.savedLocations.length > 0) {
          setSavedLocations(cloudData.savedLocations)
        }

        setSyncStatus('Cloud Synced')
      } catch (error) {
        console.error('Failed to load cloud inventory data:', error)
        setSyncStatus('Offline Ready')
      }
    }

    loadCloudData()
  }, [])

  useEffect(() => {
    saveInventoryItems(inventoryItems)
  }, [inventoryItems])

  useEffect(() => {
    saveInventoryHistory(inventoryHistory)
  }, [inventoryHistory])

  useEffect(() => {
    saveSavedLocations(savedLocations)
  }, [savedLocations])

  const closeModal = () => {
    setActiveModal(null)
    setTransactionError('')
    setSelectedInventoryItem(null)
    setSelectedLocationGroup(null)
    setPendingDuplicatePart(null)
    setDuplicateExistingItems([])
  }

  const closeActionModal = () => {
    setActiveModal('box')
    setTransactionError('')
    setSelectedInventoryItem(null)
  }

  const openModal = (modalName) => {
    setTransactionError('')
    setSelectedInventoryItem(null)
    setSelectedLocationGroup(null)
    setPendingDuplicatePart(null)
    setDuplicateExistingItems([])
    setActiveModal(modalName)
  }

  const openLocationModal = (locationGroup) => {
    setTransactionError('')
    setSelectedInventoryItem(null)
    setSelectedLocationGroup(locationGroup)
    setActiveModal('box')
  }

  const openModalWithItem = (modalName, item) => {
    setTransactionError('')
    setSelectedInventoryItem(item)
    setActiveModal(modalName)
  }

  const handleSearchChange = (event) => {
    const { value } = event.target
    const isPartNumberSearch = /^[a-zA-Z0-9-]*$/.test(value)

    setSearchTerm(isPartNumberSearch ? formatPartNumberInput(value) : value)
  }

  const getNewLocations = (formData) => {
    return [
      formData.location,
      formData.fromLocation,
      formData.toLocation,
    ].filter((location) => location && !savedLocations.includes(location))
  }

  const saveNewLocations = (locations = []) => {
    if (locations.length === 0) return

    setSavedLocations((currentLocations) => [
      ...new Set([
        ...currentLocations,
        ...locations,
      ]),
    ])
  }

  const runInventoryTransaction = (action, formData) => {
    const transactionResult = buildInventoryTransaction({
      action,
      items: inventoryItems,
      history: inventoryHistory,
      transaction: formData,
    })

    if (!transactionResult.isValid) {
      setTransactionError(transactionResult.errorMessage)
      return false
    }

    const newLocations = getNewLocations(formData)

    const deletedItemId =
      (action === INVENTORY_ACTIONS.DELETE ||
        action === INVENTORY_ACTIONS.EDIT) &&
      selectedInventoryItem
        ? selectedInventoryItem.id
        : ''

    setInventoryItems(transactionResult.items)
    setInventoryHistory(transactionResult.history)
    saveNewLocations(newLocations)

    setTransactionError('')
    setSyncStatus('Syncing...')

    syncInventoryTransactionToCloud({
      items: transactionResult.items,
      historyRecord: transactionResult.historyRecord,
      locations: newLocations,
      deletedItemId,
    })
      .then(() => {
        setSyncStatus('Cloud Synced')
      })
      .catch((error) => {
        console.error('Failed to sync inventory transaction:', error)
        setSyncStatus('Offline Ready')
      })

    return true
  }

  const handleAddPart = (formData) => {
    const existingItems = findInventoryItemsByPartNumber({
      items: inventoryItems,
      partNumber: formData.partNumber,
    })

    const existingDifferentLocations = existingItems.filter((item) => {
      return item.location.toUpperCase() !== formData.location.toUpperCase()
    })

    if (existingDifferentLocations.length > 0) {
      setPendingDuplicatePart(formData)
      setDuplicateExistingItems(existingDifferentLocations)
      setActiveModal('duplicate')
      return false
    }

    return runInventoryTransaction(INVENTORY_ACTIONS.ADD, formData)
  }

  const handleAddDuplicateToExistingLocation = () => {
    if (!pendingDuplicatePart || duplicateExistingItems.length === 0) return

    const existingItem = duplicateExistingItems[0]

    const wasSaved = runInventoryTransaction(INVENTORY_ACTIONS.ADD, {
      ...pendingDuplicatePart,
      location: existingItem.location,
    })

    if (!wasSaved) return

    setPendingDuplicatePart(null)
    setDuplicateExistingItems([])
    closeModal()
  }

  const handleKeepDuplicateNewLocation = () => {
    if (!pendingDuplicatePart) return

    const wasSaved = runInventoryTransaction(
      INVENTORY_ACTIONS.ADD,
      pendingDuplicatePart,
    )

    if (!wasSaved) return

    setPendingDuplicatePart(null)
    setDuplicateExistingItems([])
    closeModal()
  }

  const handleCancelDuplicatePart = () => {
    setActiveModal('add')
    setPendingDuplicatePart(null)
    setDuplicateExistingItems([])
  }

  const handleUsePart = (formData) => {
    return runInventoryTransaction(INVENTORY_ACTIONS.USE, formData)
  }

  const handleGivePart = (formData) => {
    return runInventoryTransaction(INVENTORY_ACTIONS.GIVE, formData)
  }

  const handleMovePart = (formData) => {
    return runInventoryTransaction(INVENTORY_ACTIONS.MOVE, formData)
  }

  const handleEditPart = (formData) => {
    return runInventoryTransaction(INVENTORY_ACTIONS.EDIT, formData)
  }

  const handleDeletePart = (item) => {
    if (!item) return false

    return runInventoryTransaction(INVENTORY_ACTIONS.DELETE, {
      partNumber: item.partNumber,
      location: item.location,
      quantity:
        Number(item.officialQuantity || 0) + Number(item.noiQuantity || 0),
      notes: 'Inventory item deleted.',
    })
  }

  const openUseFromItem = (item) => {
    openModalWithItem('use', item)
  }

  const openGiveFromItem = (item) => {
    openModalWithItem('give', item)
  }

  const openMoveFromItem = (item) => {
    openModalWithItem('move', item)
  }

  const openEditFromItem = (item) => {
    openModalWithItem('edit', item)
  }

  const openDeleteFromItem = (item) => {
    openModalWithItem('delete', item)
  }

  return (
    <main className="inventory-page page-shell">
      <div className="inventory-page__container site-container">
        <header className="inventory-page__header">
          <div>
            <p className="inventory-page__eyebrow">Truck Inventory</p>
            <h1>My Inventory</h1>
            <p className="inventory-page__subtitle">
              Track parts, boxes, tickets, machines, customers, and history.
            </p>
          </div>

          <div className="inventory-page__sync-status">
            <span className="inventory-page__sync-dot"></span>
            <span>{syncStatus}</span>
          </div>
        </header>

        {transactionError && (
          <Card className="inventory-page__error-card">
            <strong>Check quantity</strong>
            <p>{transactionError}</p>
          </Card>
        )}

        <section className="inventory-page__search-section">
          <Input
            id="inventory-search"
            label="Search Part Number"
            type="search"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Example: 123-4567-89"
          />
        </section>

        <section className="inventory-page__actions" aria-label="Inventory actions">
          <Button fullWidth onClick={() => openModal('add')}>
            Add Part
          </Button>

          <Button fullWidth onClick={() => openModal('use')}>
            Use Part
          </Button>

          <Button fullWidth onClick={() => openModal('give')}>
            Give Part
          </Button>

          <Button fullWidth onClick={() => openModal('move')}>
            Move Part
          </Button>
        </section>

        <section className="inventory-page__summary" aria-label="Inventory summary">
          <Card as="article" className="inventory-page__summary-card">
            <span>Total Parts</span>
            <strong>{inventorySummary.totalParts}</strong>
          </Card>

          <Card as="article" className="inventory-page__summary-card">
            <span>Official</span>
            <strong>{inventorySummary.officialQuantity}</strong>
          </Card>

          <Card as="article" className="inventory-page__summary-card">
            <span>NOI / Ghost</span>
            <strong>{inventorySummary.noiQuantity}</strong>
          </Card>

          <Card as="article" className="inventory-page__summary-card">
            <span>Out of Stock</span>
            <strong>{inventorySummary.outOfStock}</strong>
          </Card>
        </section>

        <section className="inventory-page__content">
          <div className="inventory-page__section-heading">
            <h2>{isSearching ? 'Part Location' : 'Boxes'}</h2>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => openModal('history')}
            >
              History
            </Button>
          </div>

          {inventoryLocationGroups.length > 0 ? (
            <div className="inventory-page__location-list">
              {inventoryLocationGroups.map((locationGroup) => (
                <InventoryLocationCard
                  key={locationGroup.id}
                  locationGroup={locationGroup}
                  onOpen={openLocationModal}
                />
              ))}
            </div>
          ) : (
            <Card className="inventory-page__empty-state">
              <h3>{isSearching ? 'No part found' : 'No boxes found'}</h3>
              <p>
                {isSearching
                  ? 'No box contains that part number.'
                  : 'Add your first part or adjust your search.'}
              </p>
            </Card>
          )}
        </section>
      </div>

      <AddPartModal
        isOpen={activeModal === 'add'}
        onClose={closeModal}
        onSubmit={handleAddPart}
        savedLocations={savedLocations}
        errorMessage={transactionError}
      />

      <DuplicatePartModal
        isOpen={activeModal === 'duplicate'}
        onClose={handleCancelDuplicatePart}
        pendingPart={pendingDuplicatePart}
        existingItems={duplicateExistingItems}
        onAddToExistingLocation={handleAddDuplicateToExistingLocation}
        onKeepNewLocation={handleKeepDuplicateNewLocation}
      />

      <UsePartModal
        isOpen={activeModal === 'use'}
        onClose={selectedLocationGroup ? closeActionModal : closeModal}
        onSubmit={handleUsePart}
        savedLocations={savedLocations}
        selectedItem={selectedInventoryItem}
        errorMessage={transactionError}
      />

      <GivePartModal
        isOpen={activeModal === 'give'}
        onClose={selectedLocationGroup ? closeActionModal : closeModal}
        onSubmit={handleGivePart}
        savedLocations={savedLocations}
        selectedItem={selectedInventoryItem}
        errorMessage={transactionError}
      />

      <MovePartModal
        isOpen={activeModal === 'move'}
        onClose={selectedLocationGroup ? closeActionModal : closeModal}
        onSubmit={handleMovePart}
        savedLocations={savedLocations}
        selectedItem={selectedInventoryItem}
        errorMessage={transactionError}
      />

      <EditPartModal
        isOpen={activeModal === 'edit'}
        onClose={selectedLocationGroup ? closeActionModal : closeModal}
        onSubmit={handleEditPart}
        savedLocations={savedLocations}
        selectedItem={selectedInventoryItem}
        errorMessage={transactionError}
      />

      <DeletePartModal
        isOpen={activeModal === 'delete'}
        onClose={selectedLocationGroup ? closeActionModal : closeModal}
        onConfirm={handleDeletePart}
        selectedItem={selectedInventoryItem}
      />

      <BoxInventoryModal
        isOpen={activeModal === 'box'}
        onClose={closeModal}
        locationGroup={selectedLocationGroupWithCurrentItems}
        onUse={openUseFromItem}
        onGive={openGiveFromItem}
        onMove={openMoveFromItem}
        onEdit={openEditFromItem}
        onDelete={openDeleteFromItem}
      />

      <HistoryModal
        isOpen={activeModal === 'history'}
        onClose={closeModal}
        history={inventoryHistory}
      />
    </main>
  )
}

export default InventoryPage