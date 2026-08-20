import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRightLeft,
  Boxes,
  CircleCheck,
  Download,
  Ghost,
  HandHelping,
  History as HistoryIcon,
  MapPin,
  Package,
  PackageMinus,
  PackagePlus,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'

import Button from '../../../shared/components/Button.jsx'
import Card from '../../../shared/components/Card.jsx'
import Input from '../../../shared/components/Input.jsx'

import InventoryLocationCard from '../components/InventoryLocationCard.jsx'
import AddPartModal from '../components/modals/AddPartModal.jsx'
import BoxInventoryModal from '../components/modals/BoxInventoryModal.jsx'
import DeleteLocationModal from '../components/modals/DeleteLocationModal.jsx'
import DeletePartModal from '../components/modals/DeletePartModal.jsx'
import DuplicatePartModal from '../components/modals/DuplicatePartModal.jsx'
import EditPartModal from '../components/modals/EditPartModal.jsx'
import GivePartModal from '../components/modals/GivePartModal.jsx'
import HistoryModal from '../components/modals/HistoryModal.jsx'
import InventorySummaryModal from '../components/modals/InventorySummaryModal.jsx'
import ManageLocationsModal from '../components/modals/ManageLocationsModal.jsx'
import MovePartModal from '../components/modals/MovePartModal.jsx'
import UsePartModal from '../components/modals/UsePartModal.jsx'

import { INVENTORY_ACTIONS } from '../data/inventoryActions.js'
import { getLocationOptions } from '../data/inventoryLocations.js'
import { INVENTORY_SUMMARY_VIEWS } from '../data/inventorySummaryViews.js'
import {
  buildInventoryTransaction,
  downloadInventoryCsv,
  findInventoryItemsByPartNumber,
  formatPartNumberInput,
  getInventorySummary,
  getMostUsedParts,
  groupInventoryByLocation,
  normalizePartNumberSearch,
} from '../utils/inventoryHelpers.js'
import {
  loadInventoryHistory,
  loadInventoryItems,
  loadRemovedLocations,
  loadSavedLocations,
  saveInventoryHistory,
  saveInventoryItems,
  saveRemovedLocations,
  saveSavedLocations,
} from '../utils/inventoryStorage.js'
import {
  deleteInventoryLocationFromCloud,
  loadInventoryCloudData,
  syncInventoryTransactionToCloud,
} from '../services/inventorySyncService.js'

import '../styles/inventory-page.css'
import '../styles/inventory-forms.css'
import '../styles/inventory-history.css'

const INVENTORY_VIEW_TABS = {
  BOXES: 'BOXES',
  MOST_USED: 'MOST_USED',
  EXPORT: 'EXPORT',
}

function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState(() => loadInventoryItems())
  const [inventoryHistory, setInventoryHistory] = useState(() => loadInventoryHistory())
  const [savedLocations, setSavedLocations] = useState(() => loadSavedLocations())
  const [removedLocations, setRemovedLocations] = useState(() =>
    loadRemovedLocations(),
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [activeInventoryView, setActiveInventoryView] = useState(
    INVENTORY_VIEW_TABS.BOXES,
  )
  const [activeModal, setActiveModal] = useState(null)
  const [transactionError, setTransactionError] = useState('')
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null)
  const [selectedLocationGroup, setSelectedLocationGroup] = useState(null)
  const [pendingDuplicatePart, setPendingDuplicatePart] = useState(null)
  const [duplicateExistingItems, setDuplicateExistingItems] = useState([])
  const [selectedSummaryView, setSelectedSummaryView] = useState(
    INVENTORY_SUMMARY_VIEWS.TOTAL,
  )
  const [syncStatus, setSyncStatus] = useState('Offline Ready')
  const returnToLocationAfterAction = useRef(true)

  const isSearching = searchTerm.trim().length > 0

  const inventorySummary = useMemo(() => {
    return getInventorySummary(inventoryItems)
  }, [inventoryItems])

  const mostUsedParts = useMemo(() => {
    return getMostUsedParts({
      history: inventoryHistory,
      items: inventoryItems,
      limit: 10,
    })
  }, [inventoryHistory, inventoryItems])

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

  const allInventoryLocationGroups = useMemo(() => {
    return groupInventoryByLocation(inventoryItems)
  }, [inventoryItems])

  const availableLocations = useMemo(() => {
    const activeLocations = getLocationOptions(
      savedLocations,
      removedLocations,
    ).map((location) => location.value)

    const locationsByName = new Map(
      activeLocations.map((location) => [location.trim().toUpperCase(), location]),
    )

    allInventoryLocationGroups.forEach((locationGroup) => {
      const normalizedLocation = locationGroup.location.trim().toUpperCase()

      if (!locationsByName.has(normalizedLocation)) {
        locationsByName.set(normalizedLocation, locationGroup.location)
      }
    })

    return Array.from(locationsByName.values()).sort((first, second) =>
      first.localeCompare(second, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    )
  }, [allInventoryLocationGroups, removedLocations, savedLocations])

  const selectedLocationGroupWithCurrentItems = useMemo(() => {
    if (!selectedLocationGroup) return null

    return allInventoryLocationGroups.find(
      (locationGroup) => locationGroup.id === selectedLocationGroup.id,
    ) || null
  }, [allInventoryLocationGroups, selectedLocationGroup])

  useEffect(() => {
    const loadCloudData = async () => {
      try {
        setSyncStatus('Syncing...')

        const cloudData = await loadInventoryCloudData()
        const localRemovedLocations = loadRemovedLocations()
        const removedLocationMap = new Map(
          [...localRemovedLocations, ...cloudData.removedLocations].map(
            (location) => [location.trim().toUpperCase(), location],
          ),
        )
        const combinedRemovedLocations = Array.from(
          removedLocationMap.values(),
        )

        if (cloudData.inventoryItems.length > 0) {
          const removedLocationNames = new Set(
            combinedRemovedLocations.map((location) =>
              location.trim().toUpperCase(),
            ),
          )

          setInventoryItems(
            cloudData.inventoryItems.filter(
              (item) =>
                !removedLocationNames.has(item.location.trim().toUpperCase()),
            ),
          )
        }

        if (cloudData.inventoryHistory.length > 0) {
          setInventoryHistory(cloudData.inventoryHistory)
        }

        if (cloudData.savedLocations.length > 0) {
          setSavedLocations(cloudData.savedLocations)
        }

        if (combinedRemovedLocations.length > 0) {
          setRemovedLocations(combinedRemovedLocations)
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

  useEffect(() => {
    saveRemovedLocations(removedLocations)
  }, [removedLocations])

  const closeModal = () => {
    returnToLocationAfterAction.current = true
    setActiveModal(null)
    setTransactionError('')
    setSelectedInventoryItem(null)
    setSelectedLocationGroup(null)
    setPendingDuplicatePart(null)
    setDuplicateExistingItems([])
    setSelectedSummaryView(INVENTORY_SUMMARY_VIEWS.TOTAL)
  }

  const closeActionModal = () => {
    setActiveModal(returnToLocationAfterAction.current ? 'box' : null)
    setTransactionError('')
    setSelectedInventoryItem(null)

    if (!returnToLocationAfterAction.current) {
      setSelectedLocationGroup(null)
    }

    returnToLocationAfterAction.current = true
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
    returnToLocationAfterAction.current = true
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

  const openSummaryModal = (summaryView) => {
    setSelectedSummaryView(summaryView)
    setActiveModal('summary')
  }

  const openDeleteLocationModal = (location, locationGroup = null) => {
    const normalizedLocation = location.trim().toUpperCase()
    const currentLocationGroup =
      allInventoryLocationGroups.find(
        (group) => group.location.trim().toUpperCase() === normalizedLocation,
      ) ||
      locationGroup || {
        id: normalizedLocation,
        location,
        items: [],
        partCount: 0,
        totalQuantity: 0,
      }

    setSelectedLocationGroup(currentLocationGroup)
    setActiveModal('deleteLocation')
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

    const newLocationNames = new Set(
      locations.map((location) => location.trim().toUpperCase()),
    )

    setRemovedLocations((currentLocations) =>
      currentLocations.filter(
        (location) => !newLocationNames.has(location.trim().toUpperCase()),
      ),
    )
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
    const nextItemIds = new Set(
      transactionResult.items.map((item) => item.id),
    )
    const deletedItemIds = inventoryItems
      .filter((item) => !nextItemIds.has(item.id))
      .map((item) => item.id)
    const removedLocationNames = new Set(
      removedLocations.map((location) => location.trim().toUpperCase()),
    )
    const restoredLocations = newLocations.filter((location) =>
      removedLocationNames.has(location.trim().toUpperCase()),
    )

    if (selectedLocationGroup) {
      const selectedLocationName = selectedLocationGroup.location
        .trim()
        .toUpperCase()

      returnToLocationAfterAction.current = transactionResult.items.some(
        (item) =>
          item.location.trim().toUpperCase() === selectedLocationName,
      )
    }

    setInventoryItems(transactionResult.items)
    setInventoryHistory(transactionResult.history)
    saveNewLocations(newLocations)

    setTransactionError('')
    setSyncStatus('Syncing...')

    syncInventoryTransactionToCloud({
      items: transactionResult.items,
      historyRecord: transactionResult.historyRecord,
      locations: newLocations,
      deletedItemIds,
      restoredLocations,
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

  const handleDeleteLocation = (locationGroup) => {
    if (!locationGroup?.location) return

    const normalizedLocation = locationGroup.location.trim().toUpperCase()
    const deletedItems = inventoryItems.filter(
      (item) => item.location.trim().toUpperCase() === normalizedLocation,
    )

    setInventoryItems((currentItems) =>
      currentItems.filter(
        (item) => item.location.trim().toUpperCase() !== normalizedLocation,
      ),
    )
    setSavedLocations((currentLocations) =>
      currentLocations.filter(
        (location) => location.trim().toUpperCase() !== normalizedLocation,
      ),
    )
    setRemovedLocations((currentLocations) => [
      ...currentLocations.filter(
        (location) => location.trim().toUpperCase() !== normalizedLocation,
      ),
      locationGroup.location,
    ])

    setSyncStatus('Syncing...')

    deleteInventoryLocationFromCloud({
      location: locationGroup.location,
      itemIds: deletedItems.map((item) => item.id),
    })
      .then(() => {
        setSyncStatus('Cloud Synced')
      })
      .catch((error) => {
        console.error('Failed to delete inventory location:', error)
        setSyncStatus('Offline Ready')
      })
  }

  const handleExportInventory = () => {
    downloadInventoryCsv(inventoryItems)
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
        <div className="inventory-page__history-button-wrapper">
          <Button
            className="inventory-page__history-button"
            variant="secondary"
            size="sm"
            onClick={() => openModal('history')}
          >
            <HistoryIcon size={17} aria-hidden="true" />
            History
          </Button>
        </div>

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
            onClear={() => setSearchTerm('')}
            clearLabel="Clear part number search"
            inputMode="text"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            placeholder="Example: 123-4567-89"
          />
        </section>

        <section className="inventory-page__actions" aria-label="Inventory actions">
          <Button fullWidth onClick={() => openModal('add')}>
            <PackagePlus size={19} aria-hidden="true" />
            Add Part
          </Button>

          <Button fullWidth onClick={() => openModal('use')}>
            <PackageMinus size={19} aria-hidden="true" />
            Use Part
          </Button>

          <Button fullWidth onClick={() => openModal('give')}>
            <HandHelping size={19} aria-hidden="true" />
            Give Part
          </Button>

          <Button fullWidth onClick={() => openModal('move')}>
            <ArrowRightLeft size={19} aria-hidden="true" />
            Move Part
          </Button>
        </section>

        <section className="inventory-page__summary" aria-label="Inventory summary">
          <Card
            as="button"
            type="button"
            className="inventory-page__summary-card"
            onClick={() => openSummaryModal(INVENTORY_SUMMARY_VIEWS.TOTAL)}
            aria-haspopup="dialog"
          >
            <span className="inventory-page__summary-card-heading">
              <span>Total Parts</span>
              <Package size={18} aria-hidden="true" />
            </span>
            <strong>{inventorySummary.totalParts}</strong>
          </Card>

          <Card
            as="button"
            type="button"
            className="inventory-page__summary-card"
            onClick={() => openSummaryModal(INVENTORY_SUMMARY_VIEWS.OFFICIAL)}
            aria-haspopup="dialog"
          >
            <span className="inventory-page__summary-card-heading">
              <span>Official</span>
              <CircleCheck size={18} aria-hidden="true" />
            </span>
            <strong>{inventorySummary.officialQuantity}</strong>
          </Card>

          <Card
            as="button"
            type="button"
            className="inventory-page__summary-card"
            onClick={() => openSummaryModal(INVENTORY_SUMMARY_VIEWS.NOI)}
            aria-haspopup="dialog"
          >
            <span className="inventory-page__summary-card-heading">
              <span>NOI / Ghost</span>
              <Ghost size={18} aria-hidden="true" />
            </span>
            <strong>{inventorySummary.noiQuantity}</strong>
          </Card>

          <Card
            as="button"
            type="button"
            className="inventory-page__summary-card"
            onClick={() =>
              openSummaryModal(INVENTORY_SUMMARY_VIEWS.OUT_OF_STOCK)
            }
            aria-haspopup="dialog"
          >
            <span className="inventory-page__summary-card-heading">
              <span>Out of Stock</span>
              <TriangleAlert size={18} aria-hidden="true" />
            </span>
            <strong>{inventorySummary.outOfStock}</strong>
          </Card>
        </section>

        <section className="inventory-page__tabs" aria-label="Inventory views">
          <button
            type="button"
            className={`inventory-page__tab ${
              activeInventoryView === INVENTORY_VIEW_TABS.BOXES
                ? 'inventory-page__tab--active'
                : ''
            }`}
            onClick={() => setActiveInventoryView(INVENTORY_VIEW_TABS.BOXES)}
          >
            <Boxes
              className="inventory-page__tab-icon"
              size={18}
              aria-hidden="true"
            />
            <span>Locations</span>
          </button>

          <button
            type="button"
            className={`inventory-page__tab ${
              activeInventoryView === INVENTORY_VIEW_TABS.MOST_USED
                ? 'inventory-page__tab--active'
                : ''
            }`}
            onClick={() => setActiveInventoryView(INVENTORY_VIEW_TABS.MOST_USED)}
          >
            <TrendingUp
              className="inventory-page__tab-icon"
              size={18}
              aria-hidden="true"
            />
            <span>Most Used</span>
          </button>

          <button
            type="button"
            className={`inventory-page__tab ${
              activeInventoryView === INVENTORY_VIEW_TABS.EXPORT
                ? 'inventory-page__tab--active'
                : ''
            }`}
            onClick={() => setActiveInventoryView(INVENTORY_VIEW_TABS.EXPORT)}
          >
            <Download
              className="inventory-page__tab-icon"
              size={18}
              aria-hidden="true"
            />
            <span>Export</span>
          </button>
        </section>

        <section className="inventory-page__content">
          {activeInventoryView === INVENTORY_VIEW_TABS.BOXES && (
            <>
              <div className="inventory-page__section-heading">
                <h2>{isSearching ? 'Part Location' : 'Boxes'}</h2>

                {!isSearching && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openModal('manageLocations')}
                  >
                    <MapPin size={16} aria-hidden="true" />
                    Manage Locations
                  </Button>
                )}
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
            </>
          )}

          {activeInventoryView === INVENTORY_VIEW_TABS.MOST_USED && (
            <>
              <div className="inventory-page__section-heading">
                <h2>Most Used</h2>
              </div>

              {mostUsedParts.length > 0 ? (
                <div className="inventory-page__most-used-list">
                  {mostUsedParts.map((part, index) => (
                    <Card
                      key={part.partNumber}
                      as="article"
                      className="inventory-page__most-used-card"
                    >
                      <div className="inventory-page__most-used-rank">
                        #{index + 1}
                      </div>

                      <div className="inventory-page__most-used-content">
                        <h3>{part.partNumber}</h3>
                        <p>Last used: {part.lastUsedAt || 'No date'}</p>
                      </div>

                      <div className="inventory-page__most-used-stats">
                        <span>
                          Used <strong>{part.usedQuantity}</strong>
                        </span>
                        <span>
                          Stock <strong>{part.currentStock}</strong>
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="inventory-page__empty-state">
                  <h3>No used parts yet</h3>
                  <p>
                    Parts will appear here after you save Use Part transactions.
                  </p>
                </Card>
              )}
            </>
          )}

          {activeInventoryView === INVENTORY_VIEW_TABS.EXPORT && (
            <>
              <div className="inventory-page__section-heading">
                <h2>Export</h2>
              </div>

              <Card className="inventory-page__export-card">
                <div>
                  <h3>Export Inventory CSV</h3>
                  <p>
                    Download your current inventory sorted by part number and
                    location.
                  </p>
                </div>

                <Button onClick={handleExportInventory}>
                  <Download size={18} aria-hidden="true" />
                  Export CSV
                </Button>
              </Card>
            </>
          )}
        </section>
      </div>

      <AddPartModal
        isOpen={activeModal === 'add'}
        onClose={closeModal}
        onSubmit={handleAddPart}
        savedLocations={savedLocations}
        removedLocations={removedLocations}
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
        key={`use-${selectedInventoryItem?.id || 'new'}`}
        isOpen={activeModal === 'use'}
        onClose={selectedLocationGroup ? closeActionModal : closeModal}
        onSubmit={handleUsePart}
        savedLocations={savedLocations}
        removedLocations={removedLocations}
        selectedItem={selectedInventoryItem}
        errorMessage={transactionError}
      />

      <GivePartModal
        key={`give-${selectedInventoryItem?.id || 'new'}`}
        isOpen={activeModal === 'give'}
        onClose={selectedLocationGroup ? closeActionModal : closeModal}
        onSubmit={handleGivePart}
        savedLocations={savedLocations}
        removedLocations={removedLocations}
        selectedItem={selectedInventoryItem}
        errorMessage={transactionError}
      />

      <MovePartModal
        key={`move-${selectedInventoryItem?.id || 'new'}`}
        isOpen={activeModal === 'move'}
        onClose={selectedLocationGroup ? closeActionModal : closeModal}
        onSubmit={handleMovePart}
        items={inventoryItems}
        savedLocations={savedLocations}
        removedLocations={removedLocations}
        selectedItem={selectedInventoryItem}
        errorMessage={transactionError}
      />

      <EditPartModal
        key={`edit-${selectedInventoryItem?.id || 'new'}`}
        isOpen={activeModal === 'edit'}
        onClose={selectedLocationGroup ? closeActionModal : closeModal}
        onSubmit={handleEditPart}
        savedLocations={savedLocations}
        removedLocations={removedLocations}
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
        onDeleteLocation={(locationGroup) =>
          openDeleteLocationModal(locationGroup.location, locationGroup)
        }
      />

      <ManageLocationsModal
        isOpen={activeModal === 'manageLocations'}
        onClose={closeModal}
        locations={availableLocations}
        locationGroups={allInventoryLocationGroups}
        onDelete={openDeleteLocationModal}
      />

      <DeleteLocationModal
        isOpen={activeModal === 'deleteLocation'}
        onClose={closeModal}
        onConfirm={handleDeleteLocation}
        locationGroup={selectedLocationGroup}
      />

      <InventorySummaryModal
        isOpen={activeModal === 'summary'}
        onClose={closeModal}
        items={inventoryItems}
        summaryView={selectedSummaryView}
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
