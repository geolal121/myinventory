import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRightLeft,
  Boxes,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Ghost,
  HandHelping,
  Hash,
  History as HistoryIcon,
  LogOut,
  MapPin,
  Package,
  PackageMinus,
  PackagePlus,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  TextSearch,
  TriangleAlert,
  Upload,
  Wrench,
  X,
} from 'lucide-react'

import Button from '../../../shared/components/Button.jsx'
import Card from '../../../shared/components/Card.jsx'
import Input from '../../../shared/components/Input.jsx'
import useInventoryAuth from '../../auth/hooks/useInventoryAuth.js'

import InventoryLocationCard from '../components/InventoryLocationCard.jsx'
import InventoryHealthView from '../components/InventoryHealthView.jsx'
import InstallAppPrompt from '../components/InstallAppPrompt.jsx'
import InventorySearchResults from '../components/InventorySearchResults.jsx'
import AddPartModal from '../components/modals/AddPartModal.jsx'
import BoxInventoryModal from '../components/modals/BoxInventoryModal.jsx'
import DeleteLocationModal from '../components/modals/DeleteLocationModal.jsx'
import DeletePartModal from '../components/modals/DeletePartModal.jsx'
import DuplicatePartModal from '../components/modals/DuplicatePartModal.jsx'
import EditPartModal from '../components/modals/EditPartModal.jsx'
import EditPartDescriptionModal from '../components/modals/EditPartDescriptionModal.jsx'
import GivePartModal from '../components/modals/GivePartModal.jsx'
import HistoryModal from '../components/modals/HistoryModal.jsx'
import InventoryBackupModal from '../components/modals/InventoryBackupModal.jsx'
import InventoryCountModal from '../components/modals/InventoryCountModal.jsx'
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
  formatPartNumberSearchInput,
  getInventorySummary,
  getMostUsedParts,
  groupInventoryByLocation,
  groupInventoryByPartNumber,
  removeRedundantZeroLocationItems,
  renameInventoryLocation,
} from '../utils/inventoryHelpers.js'
import {
  createInventoryBackup,
  createInventoryBackupFileName,
  mergeInventoryBackup,
} from '../utils/inventoryBackup.js'
import { analyzeInventoryHealth } from '../utils/inventoryHealth.js'
import { applyInventoryCount } from '../utils/inventoryCountHelpers.js'
import {
  applyWorkbookDescriptionsToPartCatalog,
  buildPartCatalog,
  enrichInventoryItemsWithCatalog,
  filterPartCatalog,
  normalizePartCatalogId,
  upsertPartCatalogEntry,
} from '../utils/partCatalogHelpers.js'
import {
  loadArchivedLocations,
  loadInventoryHistory,
  loadInventoryItems,
  loadPartCatalog,
  loadRemovedLocations,
  loadSavedLocations,
  saveArchivedLocations,
  saveInventoryHistory,
  saveInventoryItems,
  savePartCatalog,
  saveRemovedLocations,
  saveSavedLocations,
} from '../utils/inventoryStorage.js'
import {
  addInventoryLocationToCloud,
  deleteInventoryLocationFromCloud,
  loadInventoryCloudData,
  mergeInventoryBackupToCloud,
  renameInventoryLocationInCloud,
  restoreInventoryLocationToCloud,
  syncInventoryTransactionToCloud,
  syncPartCatalogToCloud,
  undoInventoryTransactionInCloud,
  waitForInventoryWritesToSync,
} from '../services/inventorySyncService.js'

import '../styles/inventory-page.css'
import '../styles/inventory-forms.css'
import '../styles/inventory-history.css'
import '../styles/inventory-count.css'

const INVENTORY_VIEW_TABS = {
  BOXES: 'BOXES',
  MOST_USED: 'MOST_USED',
  EXPORT: 'EXPORT',
  HEALTH: 'HEALTH',
}

const INVENTORY_SEARCH_MODES = {
  PART_NUMBER: 'PART_NUMBER',
  DESCRIPTION: 'DESCRIPTION',
}

const InventoryWorkbookModal = lazy(() =>
  import('../components/modals/InventoryWorkbookModal.jsx'),
)

const getOnlineSyncStatus = (onlineStatus = 'Syncing...') => {
  if (typeof navigator === 'undefined') return onlineStatus

  return navigator.onLine ? onlineStatus : 'Saved Offline'
}

const INVENTORY_ACTION_LABELS = {
  [INVENTORY_ACTIONS.ADD]: 'Part added',
  [INVENTORY_ACTIONS.USE]: 'Part usage saved',
  [INVENTORY_ACTIONS.GIVE]: 'Part transfer saved',
  [INVENTORY_ACTIONS.MOVE]: 'Part moved',
  [INVENTORY_ACTIONS.COUNT]: 'Inventory count saved',
  [INVENTORY_ACTIONS.EDIT]: 'Part updated',
  [INVENTORY_ACTIONS.DELETE]: 'Part deleted',
}

function InventoryPage() {
  const { signOut } = useInventoryAuth()
  const [inventoryItems, setInventoryItems] = useState(() =>
    removeRedundantZeroLocationItems(loadInventoryItems()),
  )
  const [partCatalog, setPartCatalog] = useState(() =>
    buildPartCatalog({
      catalog: loadPartCatalog(),
      inventoryItems: loadInventoryItems(),
    }),
  )
  const [inventoryHistory, setInventoryHistory] = useState(() => loadInventoryHistory())
  const [savedLocations, setSavedLocations] = useState(() => loadSavedLocations())
  const [removedLocations, setRemovedLocations] = useState(() =>
    loadRemovedLocations(),
  )
  const [archivedLocations, setArchivedLocations] = useState(() =>
    loadArchivedLocations(),
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [searchMode, setSearchMode] = useState(
    INVENTORY_SEARCH_MODES.PART_NUMBER,
  )
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false)
  const [activeInventoryView, setActiveInventoryView] = useState(
    INVENTORY_VIEW_TABS.BOXES,
  )
  const [activeModal, setActiveModal] = useState(null)
  const [transactionError, setTransactionError] = useState('')
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null)
  const [selectedCatalogPart, setSelectedCatalogPart] = useState(null)
  const [selectedLocationGroup, setSelectedLocationGroup] = useState(null)
  const [pendingDuplicatePart, setPendingDuplicatePart] = useState(null)
  const [duplicateExistingItems, setDuplicateExistingItems] = useState([])
  const [selectedSummaryView, setSelectedSummaryView] = useState(
    INVENTORY_SUMMARY_VIEWS.TOTAL,
  )
  const [syncStatus, setSyncStatus] = useState(() =>
    getOnlineSyncStatus('Checking Sync...'),
  )
  const [workbookHealthCheck, setWorkbookHealthCheck] = useState(null)
  const [undoAction, setUndoAction] = useState(null)
  const returnToLocationAfterAction = useRef(true)
  const undoTimeout = useRef(null)
  const catalogDescriptionReturnModal = useRef(null)

  const isSearching = searchTerm.trim().length > 0

  const inventoryItemsWithCatalogDescriptions = useMemo(() => {
    return enrichInventoryItemsWithCatalog({
      items: inventoryItems,
      catalog: partCatalog,
    })
  }, [inventoryItems, partCatalog])

  const inventorySummary = useMemo(() => {
    return getInventorySummary(inventoryItems, partCatalog)
  }, [inventoryItems, partCatalog])

  const mostUsedParts = useMemo(() => {
    return getMostUsedParts({
      history: inventoryHistory,
      items: inventoryItemsWithCatalogDescriptions,
      catalog: partCatalog,
      limit: 10,
    })
  }, [inventoryHistory, inventoryItemsWithCatalogDescriptions, partCatalog])

  const inventoryHealth = useMemo(
    () =>
      analyzeInventoryHealth({
        inventoryItems,
        partCatalog,
        savedLocations,
        workbookCheck: workbookHealthCheck,
      }),
    [inventoryItems, partCatalog, savedLocations, workbookHealthCheck],
  )

  const matchingPartCatalog = useMemo(() => {
    if (!isSearching) return partCatalog

    return filterPartCatalog({
      catalog: partCatalog,
      searchTerm,
      searchByDescription:
        searchMode === INVENTORY_SEARCH_MODES.DESCRIPTION,
    })
  }, [isSearching, partCatalog, searchMode, searchTerm])

  const filteredInventoryItems = useMemo(() => {
    if (!isSearching) return inventoryItemsWithCatalogDescriptions

    const matchingPartIds = new Set(
      matchingPartCatalog.map((part) => part.id),
    )

    return inventoryItemsWithCatalogDescriptions.filter((item) =>
      matchingPartIds.has(normalizePartCatalogId(item.partNumber)),
    )
  }, [
    inventoryItemsWithCatalogDescriptions,
    isSearching,
    matchingPartCatalog,
  ])

  const searchResultParts = useMemo(() => {
    if (!isSearching) return []

    return groupInventoryByPartNumber(
      filteredInventoryItems,
      matchingPartCatalog,
    )
  }, [filteredInventoryItems, isSearching, matchingPartCatalog])

  const inventoryLocationGroups = useMemo(() => {
    return groupInventoryByLocation(filteredInventoryItems)
  }, [filteredInventoryItems])

  const allInventoryLocationGroups = useMemo(() => {
    return groupInventoryByLocation(inventoryItemsWithCatalogDescriptions)
  }, [inventoryItemsWithCatalogDescriptions])

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

  const activeLocationGroups = useMemo(() => {
    const groupsByLocation = new Map(
      allInventoryLocationGroups.map((locationGroup) => [
        locationGroup.location.trim().toUpperCase(),
        locationGroup,
      ]),
    )

    availableLocations.forEach((location) => {
      const normalizedLocation = location.trim().toUpperCase()

      if (!groupsByLocation.has(normalizedLocation)) {
        groupsByLocation.set(normalizedLocation, {
          id: normalizedLocation,
          location,
          items: [],
          partCount: 0,
          totalQuantity: 0,
          officialQuantity: 0,
          noiQuantity: 0,
          outOfStockCount: 0,
        })
      }
    })

    return Array.from(groupsByLocation.values()).sort((first, second) =>
      first.location.localeCompare(second.location, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    )
  }, [allInventoryLocationGroups, availableLocations])

  const visibleLocationGroups = isSearching
    ? inventoryLocationGroups
    : activeLocationGroups

  const deletedLocations = useMemo(() => {
    const archivesByLocation = new Map(
      archivedLocations.map((archive) => [
        archive.location.trim().toUpperCase(),
        archive,
      ]),
    )

    return removedLocations
      .map((location) => {
        const archive = archivesByLocation.get(location.trim().toUpperCase())

        return archive
          ? { ...archive, hasSnapshot: true }
          : {
              location,
              items: [],
              deletedAt: '',
              hasSnapshot: false,
            }
      })
      .sort((first, second) =>
        first.location.localeCompare(second.location, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      )
  }, [archivedLocations, removedLocations])

  const selectedLocationGroupWithCurrentItems = useMemo(() => {
    if (!selectedLocationGroup) return null

    const currentLocationGroups = isSearching
      ? inventoryLocationGroups
      : activeLocationGroups

    return (
      currentLocationGroups.find(
        (locationGroup) => locationGroup.id === selectedLocationGroup.id,
      ) || selectedLocationGroup
    )
  }, [
    activeLocationGroups,
    inventoryLocationGroups,
    isSearching,
    selectedLocationGroup,
  ])

  useEffect(() => {
    const loadCloudData = async () => {
      try {
        setSyncStatus(getOnlineSyncStatus())

        const cloudData = await loadInventoryCloudData()
        const localRemovedLocations = loadRemovedLocations()
        const localArchivedLocations = loadArchivedLocations()
        const removedLocationMap = new Map(
          [...localRemovedLocations, ...cloudData.removedLocations].map(
            (location) => [location.trim().toUpperCase(), location],
          ),
        )
        const combinedRemovedLocations = Array.from(
          removedLocationMap.values(),
        )
        const archivedLocationMap = new Map(
          [...localArchivedLocations, ...cloudData.archivedLocations].map(
            (archive) => [archive.location.trim().toUpperCase(), archive],
          ),
        )
        const mergedPartCatalog = buildPartCatalog({
          catalog: [
            ...cloudData.partCatalog,
            ...loadPartCatalog(),
          ],
          inventoryItems:
            cloudData.inventoryItems.length > 0
              ? cloudData.inventoryItems
              : loadInventoryItems(),
        })
        const cloudCatalogById = new Map(
          cloudData.partCatalog.map((part) => [part.id, part]),
        )
        const catalogEntriesToSync = mergedPartCatalog.filter((part) => {
          const cloudPart = cloudCatalogById.get(part.id)

          return (
            !cloudPart ||
            cloudPart.partNumber !== part.partNumber ||
            cloudPart.description !== part.description
          )
        })

        setPartCatalog(mergedPartCatalog)

        if (catalogEntriesToSync.length > 0) {
          await syncPartCatalogToCloud(catalogEntriesToSync)
        }

        if (cloudData.inventoryItems.length > 0) {
          const removedLocationNames = new Set(
            combinedRemovedLocations.map((location) =>
              location.trim().toUpperCase(),
            ),
          )

          const activeCloudItems = cloudData.inventoryItems.filter(
            (item) =>
              !removedLocationNames.has(item.location.trim().toUpperCase()),
          )
          const cleanedCloudItems = removeRedundantZeroLocationItems(
            activeCloudItems,
          )
          const cleanedItemIds = new Set(
            cleanedCloudItems.map((item) => item.id),
          )
          const originalItemsById = new Map(
            activeCloudItems.map((item) => [item.id, item]),
          )
          const deletedItemIds = activeCloudItems
            .filter((item) => !cleanedItemIds.has(item.id))
            .map((item) => item.id)
          const updatedItems = cleanedCloudItems.filter(
            (item) => item !== originalItemsById.get(item.id),
          )

          setInventoryItems(cleanedCloudItems)

          if (deletedItemIds.length > 0 || updatedItems.length > 0) {
            await syncInventoryTransactionToCloud({
              items: updatedItems,
              deletedItemIds,
            })
          }
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

        if (archivedLocationMap.size > 0) {
          setArchivedLocations(Array.from(archivedLocationMap.values()))
        }

        setSyncStatus(getOnlineSyncStatus('Cloud Synced'))
      } catch (error) {
        console.error('Failed to load cloud inventory data:', error)
        setSyncStatus(getOnlineSyncStatus('Offline Ready'))
      }
    }

    loadCloudData()
  }, [])

  useEffect(() => {
    const handleOffline = () => setSyncStatus('Saved Offline')
    const handleOnline = () => {
      setSyncStatus('Syncing...')

      waitForInventoryWritesToSync()
        .then(() => setSyncStatus('Cloud Synced'))
        .catch(() => setSyncStatus('Offline Ready'))
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  useEffect(() => {
    return () => window.clearTimeout(undoTimeout.current)
  }, [])

  useEffect(() => {
    saveInventoryItems(inventoryItems)
  }, [inventoryItems])

  useEffect(() => {
    savePartCatalog(partCatalog)
  }, [partCatalog])

  useEffect(() => {
    saveInventoryHistory(inventoryHistory)
  }, [inventoryHistory])

  useEffect(() => {
    saveSavedLocations(savedLocations)
  }, [savedLocations])

  useEffect(() => {
    saveRemovedLocations(removedLocations)
  }, [removedLocations])

  useEffect(() => {
    saveArchivedLocations(archivedLocations)
  }, [archivedLocations])

  const closeModal = () => {
    returnToLocationAfterAction.current = true
    setActiveModal(null)
    setTransactionError('')
    setSelectedInventoryItem(null)
    setSelectedCatalogPart(null)
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

  const openCatalogDescriptionModal = (part, returnModal = null) => {
    catalogDescriptionReturnModal.current = returnModal
    setSelectedCatalogPart(part)
    setActiveModal('editDescription')
  }

  const closeCatalogDescriptionModal = () => {
    setSelectedCatalogPart(null)
    setActiveModal(catalogDescriptionReturnModal.current)
    catalogDescriptionReturnModal.current = null
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

    if (value.trim()) {
      setActiveInventoryView(INVENTORY_VIEW_TABS.BOXES)
    }

    if (searchMode === INVENTORY_SEARCH_MODES.DESCRIPTION) {
      setSearchTerm(value)
      return
    }

    setSearchTerm(
      formatPartNumberSearchInput(value, {
        appendTrailingSeparator: value.length > searchTerm.length,
      }),
    )
  }

  const handleSearchModeChange = (nextSearchMode) => {
    if (nextSearchMode === searchMode) return

    setSearchMode(nextSearchMode)
    setSearchTerm('')
  }

  const getNewLocations = (formData) => {
    return [
      formData.location,
      formData.fromLocation,
      formData.toLocation,
    ].filter((location) => location && !savedLocations.includes(location))
  }

  const getLocationsWithAdditions = (locations = []) => {
    return [
      ...new Set([
        ...savedLocations,
        ...locations,
      ]),
    ]
  }

  const showUndoAction = (nextUndoAction) => {
    window.clearTimeout(undoTimeout.current)
    setUndoAction(nextUndoAction)

    undoTimeout.current = window.setTimeout(() => {
      setUndoAction(null)
    }, 10000)
  }

  const dismissUndoAction = () => {
    window.clearTimeout(undoTimeout.current)
    setUndoAction(null)
  }

  const removeLocationsFromDeletedList = (locations = []) => {
    if (locations.length === 0) return removedLocations

    const newLocationNames = new Set(
      locations.map((location) => location.trim().toUpperCase()),
    )

    return removedLocations.filter(
      (location) => !newLocationNames.has(location.trim().toUpperCase()),
    )
  }

  const runInventoryTransaction = (action, formData) => {
    const removedLocationNames = new Set(
      removedLocations.map((location) => location.trim().toUpperCase()),
    )
    const requestedDestination = [formData.location, formData.toLocation]
      .filter(Boolean)
      .find((location) =>
        removedLocationNames.has(location.trim().toUpperCase()),
      )

    if (requestedDestination) {
      setTransactionError(
        `${requestedDestination} is deleted. Restore it in Manage Locations first.`,
      )
      return false
    }

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

    const catalogResult = upsertPartCatalogEntry({
      catalog: partCatalog,
      partNumber: formData.partNumber,
      description: formData.description || '',
      replaceDescription: action === INVENTORY_ACTIONS.EDIT,
    })

    const newLocations = getNewLocations(formData)
    const nextSavedLocations = getLocationsWithAdditions(newLocations)
    const nextRemovedLocations = removeLocationsFromDeletedList(newLocations)
    const nextItemIds = new Set(
      transactionResult.items.map((item) => item.id),
    )
    const deletedItemIds = inventoryItems
      .filter((item) => !nextItemIds.has(item.id))
      .map((item) => item.id)
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
    setPartCatalog(catalogResult.catalog)
    setSavedLocations(nextSavedLocations)
    setRemovedLocations(nextRemovedLocations)

    showUndoAction({
      type: 'inventory',
      message: INVENTORY_ACTION_LABELS[action] || 'Inventory updated',
      previousItems: inventoryItems,
      currentItems: transactionResult.items,
      previousHistory: inventoryHistory,
      previousCatalog: partCatalog,
      currentCatalog: catalogResult.catalog,
      previousLocations: savedLocations,
      currentLocations: nextSavedLocations,
      previousRemovedLocations: removedLocations,
      historyRecordId: transactionResult.historyRecord?.id || '',
    })

    setTransactionError('')
    setSyncStatus(getOnlineSyncStatus())

    Promise.all([
      syncInventoryTransactionToCloud({
        items: transactionResult.items,
        historyRecord: transactionResult.historyRecord,
        locations: newLocations,
        deletedItemIds,
        restoredLocations,
      }),
      catalogResult.didChange
        ? syncPartCatalogToCloud([catalogResult.entry])
        : Promise.resolve(),
    ])
      .then(() => {
        setSyncStatus(getOnlineSyncStatus('Cloud Synced'))
      })
      .catch((error) => {
        console.error('Failed to sync inventory transaction:', error)
        setSyncStatus(getOnlineSyncStatus('Offline Ready'))
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

  const handleInventoryCount = ({ location, counts }) => {
    const countResult = applyInventoryCount({
      items: inventoryItems,
      history: inventoryHistory,
      location,
      counts,
    })

    if (!countResult.isValid) return countResult

    setInventoryItems(countResult.items)
    setInventoryHistory(countResult.history)
    showUndoAction({
      type: 'inventory',
      message:
        countResult.review.discrepancyCount > 0
          ? `${location} count saved · ${countResult.review.discrepancyCount} corrected`
          : `${location} count complete`,
      previousItems: inventoryItems,
      currentItems: countResult.items,
      previousHistory: inventoryHistory,
      previousCatalog: partCatalog,
      currentCatalog: partCatalog,
      previousLocations: savedLocations,
      currentLocations: savedLocations,
      previousRemovedLocations: removedLocations,
      historyRecordId: countResult.historyRecord.id,
    })
    setSyncStatus(getOnlineSyncStatus())

    syncInventoryTransactionToCloud({
      items: countResult.changedItems,
      historyRecord: countResult.historyRecord,
      deletedItemIds: countResult.deletedItemIds,
    })
      .then(() => {
        setSyncStatus(getOnlineSyncStatus('Cloud Synced'))
      })
      .catch((error) => {
        console.error('Failed to sync inventory count:', error)
        setSyncStatus(getOnlineSyncStatus('Offline Ready'))
      })

    return countResult
  }

  const handleAddLocation = (locationName) => {
    const cleanLocation = locationName.trim()
    const normalizedLocation = cleanLocation.toUpperCase()

    if (!cleanLocation) {
      return {
        isValid: false,
        errorMessage: 'Location name is required.',
      }
    }

    if (
      availableLocations.some(
        (location) => location.trim().toUpperCase() === normalizedLocation,
      )
    ) {
      return {
        isValid: false,
        errorMessage: `${cleanLocation} already exists.`,
      }
    }

    if (
      removedLocations.some(
        (location) => location.trim().toUpperCase() === normalizedLocation,
      )
    ) {
      return {
        isValid: false,
        errorMessage: `${cleanLocation} is deleted. Restore it instead of adding it again.`,
      }
    }

    setSavedLocations((currentLocations) => [
      ...currentLocations,
      cleanLocation,
    ])
    setSyncStatus(getOnlineSyncStatus())

    addInventoryLocationToCloud(cleanLocation)
      .then(() => {
        setSyncStatus(getOnlineSyncStatus('Cloud Synced'))
      })
      .catch((error) => {
        console.error('Failed to add inventory location:', error)
        setSyncStatus(getOnlineSyncStatus('Offline Ready'))
      })

    return { isValid: true, errorMessage: '' }
  }

  const handleRenameLocation = (fromLocation, toLocation) => {
    const cleanFromLocation = fromLocation.trim()
    const cleanToLocation = toLocation.trim()
    const normalizedFromLocation = cleanFromLocation.toUpperCase()
    const normalizedToLocation = cleanToLocation.toUpperCase()

    if (!cleanToLocation) {
      return {
        isValid: false,
        errorMessage: 'New location name is required.',
      }
    }

    if (cleanFromLocation === cleanToLocation) {
      return { isValid: true, errorMessage: '' }
    }

    if (
      availableLocations.some(
        (location) =>
          location.trim().toUpperCase() === normalizedToLocation &&
          location.trim().toUpperCase() !== normalizedFromLocation,
      )
    ) {
      return {
        isValid: false,
        errorMessage: `${cleanToLocation} already exists.`,
      }
    }

    if (
      removedLocations.some(
        (location) => location.trim().toUpperCase() === normalizedToLocation,
      )
    ) {
      return {
        isValid: false,
        errorMessage: `${cleanToLocation} is deleted. Restore it before renaming another location to that name.`,
      }
    }

    const renamedItems = renameInventoryLocation({
      items: inventoryItems,
      fromLocation: cleanFromLocation,
      toLocation: cleanToLocation,
    })
    const originalItemIds = inventoryItems
      .filter(
        (item) =>
          item.location.trim().toUpperCase() === normalizedFromLocation,
      )
      .map((item) => item.id)
    const renamedLocationItems = renamedItems.filter(
      (item) => item.location.trim().toUpperCase() === normalizedToLocation,
    )
    const renamedItemIds = new Set(renamedLocationItems.map((item) => item.id))
    const deletedItemIds = originalItemIds.filter(
      (itemId) => !renamedItemIds.has(itemId),
    )

    setInventoryItems(renamedItems)
    setSavedLocations((currentLocations) => [
      ...currentLocations.filter(
        (location) =>
          location.trim().toUpperCase() !== normalizedFromLocation &&
          location.trim().toUpperCase() !== normalizedToLocation,
      ),
      cleanToLocation,
    ])
    setRemovedLocations((currentLocations) => {
      const nextLocations = currentLocations.filter(
        (location) =>
          location.trim().toUpperCase() !== normalizedToLocation &&
          location.trim().toUpperCase() !== normalizedFromLocation,
      )

      return normalizedFromLocation === normalizedToLocation
        ? nextLocations
        : [...nextLocations, cleanFromLocation]
    })

    setSyncStatus(getOnlineSyncStatus())

    renameInventoryLocationInCloud({
      fromLocation: cleanFromLocation,
      toLocation: cleanToLocation,
      items: renamedLocationItems,
      deletedItemIds,
    })
      .then(() => {
        setSyncStatus(getOnlineSyncStatus('Cloud Synced'))
      })
      .catch((error) => {
        console.error('Failed to rename inventory location:', error)
        setSyncStatus(getOnlineSyncStatus('Offline Ready'))
      })

    return { isValid: true, errorMessage: '' }
  }

  const handleRestoreLocation = (archive) => {
    if (!archive?.location) return

    const normalizedLocation = archive.location.trim().toUpperCase()
    const restoredItemsById = new Map(
      inventoryItems.map((item) => [item.id, item]),
    )

    archive.items.forEach((item) => {
      restoredItemsById.set(item.id, item)
    })

    const combinedItems = Array.from(restoredItemsById.values())
    const restoredPartCatalog = buildPartCatalog({
      catalog: partCatalog,
      inventoryItems: archive.items,
    })
    const currentCatalogById = new Map(
      partCatalog.map((part) => [part.id, part]),
    )
    const restoredCatalogEntries = restoredPartCatalog.filter((part) => {
      const currentPart = currentCatalogById.get(part.id)

      return (
        !currentPart ||
        currentPart.partNumber !== part.partNumber ||
        currentPart.description !== part.description
      )
    })
    const restoredItems = removeRedundantZeroLocationItems(combinedItems)
    const restoredItemsByCleanId = new Map(
      restoredItems.map((item) => [item.id, item]),
    )
    const cleanedItemIds = new Set(restoredItemsByCleanId.keys())
    const deletedItemIds = combinedItems
      .filter((item) => !cleanedItemIds.has(item.id))
      .map((item) => item.id)
    const updatedItems = restoredItems.filter(
      (item) => item !== restoredItemsById.get(item.id),
    )
    const archiveItemsToRestore = archive.items
      .filter((item) => cleanedItemIds.has(item.id))
      .map((item) => restoredItemsByCleanId.get(item.id))

    setInventoryItems(restoredItems)
    setPartCatalog(restoredPartCatalog)
    setSavedLocations((currentLocations) => [
      ...currentLocations.filter(
        (location) => location.trim().toUpperCase() !== normalizedLocation,
      ),
      archive.location,
    ])
    setRemovedLocations((currentLocations) =>
      currentLocations.filter(
        (location) => location.trim().toUpperCase() !== normalizedLocation,
      ),
    )
    setArchivedLocations((currentArchives) =>
      currentArchives.filter(
        (currentArchive) =>
          currentArchive.location.trim().toUpperCase() !== normalizedLocation,
      ),
    )

    setSyncStatus(getOnlineSyncStatus())

    restoreInventoryLocationToCloud({
      location: archive.location,
      items: archiveItemsToRestore,
    })
      .then(() =>
        Promise.all([
          syncInventoryTransactionToCloud({
            items: updatedItems,
            deletedItemIds,
          }),
          syncPartCatalogToCloud(restoredCatalogEntries),
        ]),
      )
      .then(() => {
        setSyncStatus(getOnlineSyncStatus('Cloud Synced'))
      })
      .catch((error) => {
        console.error('Failed to restore inventory location:', error)
        setSyncStatus(getOnlineSyncStatus('Offline Ready'))
      })
  }

  const handleDeleteLocation = (locationGroup) => {
    if (!locationGroup?.location) return

    const normalizedLocation = locationGroup.location.trim().toUpperCase()
    const deletedItems = inventoryItems.filter(
      (item) => item.location.trim().toUpperCase() === normalizedLocation,
    )
    const deletedAt = new Date().toISOString()
    const archivedLocation = {
      location: locationGroup.location,
      items: deletedItems,
      deletedAt,
    }

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
    setArchivedLocations((currentArchives) => [
      ...currentArchives.filter(
        (archive) =>
          archive.location.trim().toUpperCase() !== normalizedLocation,
      ),
      archivedLocation,
    ])

    showUndoAction({
      type: 'location',
      message: `${locationGroup.location} removed`,
      archive: archivedLocation,
    })

    setSyncStatus(getOnlineSyncStatus())

    deleteInventoryLocationFromCloud({
      location: locationGroup.location,
      items: deletedItems,
      deletedAt,
    })
      .then(() => {
        setSyncStatus(getOnlineSyncStatus('Cloud Synced'))
      })
      .catch((error) => {
        console.error('Failed to delete inventory location:', error)
        setSyncStatus(getOnlineSyncStatus('Offline Ready'))
      })

  }

  const handleUndo = () => {
    if (!undoAction) return

    const actionToUndo = undoAction
    dismissUndoAction()

    if (actionToUndo.type === 'location') {
      handleRestoreLocation(actionToUndo.archive)
      return
    }

    setInventoryItems(actionToUndo.previousItems)
    setInventoryHistory(actionToUndo.previousHistory)
    setPartCatalog(actionToUndo.previousCatalog)
    setSavedLocations(actionToUndo.previousLocations)
    setRemovedLocations(actionToUndo.previousRemovedLocations)
    setSyncStatus(getOnlineSyncStatus())

    undoInventoryTransactionInCloud({
      previousItems: actionToUndo.previousItems,
      currentItems: actionToUndo.currentItems,
      previousCatalog: actionToUndo.previousCatalog,
      currentCatalog: actionToUndo.currentCatalog,
      previousLocations: actionToUndo.previousLocations,
      currentLocations: actionToUndo.currentLocations,
      historyRecordId: actionToUndo.historyRecordId,
    })
      .then(() => {
        setSyncStatus(getOnlineSyncStatus('Cloud Synced'))
      })
      .catch((error) => {
        console.error('Failed to sync inventory undo:', error)
        setSyncStatus(getOnlineSyncStatus('Offline Ready'))
      })
  }

  const handleImportWorkbookDescriptions = (descriptions = []) => {
    const result = applyWorkbookDescriptionsToPartCatalog({
      catalog: partCatalog,
      inventoryItems,
      descriptions,
    })

    if (result.updatedEntries.length > 0) {
      setPartCatalog(result.catalog)
      setSyncStatus(getOnlineSyncStatus())

      syncPartCatalogToCloud(result.updatedEntries)
        .then(() => {
          setSyncStatus(getOnlineSyncStatus('Cloud Synced'))
        })
        .catch((error) => {
          console.error('Failed to sync inventory descriptions:', error)
          setSyncStatus(getOnlineSyncStatus('Offline Ready'))
        })
    }

    return {
      workbookDescriptionCount: descriptions.length,
      updatedPartCount: result.updatedPartNumbers.length,
      updatedRecordCount: result.updatedEntries.length,
    }
  }

  const handleEditCatalogDescription = ({ partNumber, description }) => {
    const result = upsertPartCatalogEntry({
      catalog: partCatalog,
      partNumber,
      description,
      replaceDescription: true,
    })

    if (!result.didChange) return true

    setPartCatalog(result.catalog)
    showUndoAction({
      type: 'inventory',
      message: 'Description updated',
      previousItems: inventoryItems,
      currentItems: inventoryItems,
      previousHistory: inventoryHistory,
      previousCatalog: partCatalog,
      currentCatalog: result.catalog,
      previousLocations: savedLocations,
      currentLocations: savedLocations,
      previousRemovedLocations: removedLocations,
      historyRecordId: '',
    })
    setSyncStatus(getOnlineSyncStatus())

    syncPartCatalogToCloud([result.entry])
      .then(() => setSyncStatus(getOnlineSyncStatus('Cloud Synced')))
      .catch((error) => {
        console.error('Failed to sync part description:', error)
        setSyncStatus(getOnlineSyncStatus('Offline Ready'))
      })

    return true
  }

  const handleExportInventory = () => {
    downloadInventoryCsv(inventoryItemsWithCatalogDescriptions, partCatalog)
  }

  const handleDownloadInventoryBackup = () => {
    const backup = createInventoryBackup({
      inventoryItems,
      partCatalog,
      inventoryHistory,
      savedLocations,
      removedLocations,
      archivedLocations,
    })
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    })
    const downloadUrl = URL.createObjectURL(blob)
    const downloadLink = document.createElement('a')

    downloadLink.href = downloadUrl
    downloadLink.download = createInventoryBackupFileName(backup.exportedAt)
    document.body.appendChild(downloadLink)
    downloadLink.click()
    downloadLink.remove()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
  }

  const handleRestoreInventoryBackup = async (backup) => {
    const mergedInventory = mergeInventoryBackup({
      current: {
        inventoryItems,
        partCatalog,
        inventoryHistory,
        savedLocations,
        removedLocations,
        archivedLocations,
      },
      backup,
    })

    setInventoryItems(mergedInventory.inventoryItems)
    setPartCatalog(mergedInventory.partCatalog)
    setInventoryHistory(mergedInventory.inventoryHistory)
    setSavedLocations(mergedInventory.savedLocations)
    setRemovedLocations(mergedInventory.removedLocations)
    setArchivedLocations(mergedInventory.archivedLocations)
    setSyncStatus(getOnlineSyncStatus())

    try {
      await mergeInventoryBackupToCloud(mergedInventory)
      setSyncStatus(getOnlineSyncStatus('Cloud Synced'))
    } catch (error) {
      console.error('Failed to sync restored inventory backup:', error)
      setSyncStatus(getOnlineSyncStatus('Offline Ready'))
    }
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

  const openInventoryAction = (modalName) => {
    setMobileToolsOpen(false)
    openModal(modalName)
  }

  return (
    <main className="inventory-page page-shell">
      <div
        className={`inventory-page__container site-container ${
          isSearching ? 'inventory-page__container--searching' : ''
        }`}
      >
        <header className="inventory-page__header">
          <div className="inventory-page__header-toolbar">
            <div
              className={`inventory-page__sync-status ${
                syncStatus === 'Saved Offline' || syncStatus === 'Offline Ready'
                  ? 'inventory-page__sync-status--offline'
                  : syncStatus.includes('Syncing') || syncStatus.includes('Checking')
                    ? 'inventory-page__sync-status--syncing'
                  : ''
              }`}
              aria-label={`Cloud status: ${syncStatus}`}
            >
              <span className="inventory-page__sync-dot"></span>
              <span>{syncStatus}</span>
            </div>

            <div className="inventory-page__history-button-wrapper">
              <Button
                className="inventory-page__history-button"
                variant="secondary"
                size="sm"
                onClick={() => openModal('history')}
              >
                <HistoryIcon size={17} aria-hidden="true" />
                <span>History</span>
              </Button>

              <Button
                className="inventory-page__sign-out-button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  signOut().catch((error) => {
                    console.error('Failed to sign out of inventory:', error)
                  })
                }}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={17} aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="inventory-page__header-copy">
            <p className="inventory-page__eyebrow">Truck Inventory</p>
            <h1>My Inventory</h1>
            <p className="inventory-page__subtitle">
              Track parts, boxes, tickets, machines, customers, and history.
            </p>
          </div>
        </header>

        <InstallAppPrompt />

        {transactionError && (
          <Card className="inventory-page__error-card">
            <strong>Check quantity</strong>
            <p>{transactionError}</p>
          </Card>
        )}

        <section className="inventory-page__search-section">
          <div
            className="inventory-page__search-mode"
            role="group"
            aria-label="Choose how to search inventory"
          >
            <button
              type="button"
              className={`inventory-page__search-mode-button ${
                searchMode === INVENTORY_SEARCH_MODES.PART_NUMBER
                  ? 'inventory-page__search-mode-button--active'
                  : ''
              }`}
              onClick={() =>
                handleSearchModeChange(INVENTORY_SEARCH_MODES.PART_NUMBER)
              }
              aria-pressed={
                searchMode === INVENTORY_SEARCH_MODES.PART_NUMBER
              }
            >
              <Hash size={17} aria-hidden="true" />
              Part Number
            </button>

            <button
              type="button"
              className={`inventory-page__search-mode-button ${
                searchMode === INVENTORY_SEARCH_MODES.DESCRIPTION
                  ? 'inventory-page__search-mode-button--active'
                  : ''
              }`}
              onClick={() =>
                handleSearchModeChange(INVENTORY_SEARCH_MODES.DESCRIPTION)
              }
              aria-pressed={
                searchMode === INVENTORY_SEARCH_MODES.DESCRIPTION
              }
            >
              <TextSearch size={17} aria-hidden="true" />
              Description
            </button>
          </div>

          <Input
            id="inventory-search"
            label={
              searchMode === INVENTORY_SEARCH_MODES.DESCRIPTION
                ? 'Search Description'
                : 'Search Part Number'
            }
            type="search"
            value={searchTerm}
            onChange={handleSearchChange}
            onClear={() => setSearchTerm('')}
            clearLabel={
              searchMode === INVENTORY_SEARCH_MODES.DESCRIPTION
                ? 'Clear description search'
                : 'Clear part number search'
            }
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize={
              searchMode === INVENTORY_SEARCH_MODES.DESCRIPTION
                ? 'sentences'
                : 'characters'
            }
            spellCheck={
              searchMode === INVENTORY_SEARCH_MODES.DESCRIPTION
            }
            placeholder={
              searchMode === INVENTORY_SEARCH_MODES.DESCRIPTION
                ? 'Example: pressure valve'
                : 'Example: 123-4567-89'
            }
            helperText={
              searchMode === INVENTORY_SEARCH_MODES.DESCRIPTION
                ? 'Search any word from the saved part description.'
                : 'Numeric parts are formatted automatically. Letters still work.'
            }
          />
        </section>

        {mobileToolsOpen && (
          <button
            type="button"
            className="inventory-page__mobile-action-backdrop"
            onClick={() => setMobileToolsOpen(false)}
            aria-label="Close inventory actions"
          />
        )}

        <section
          className={`inventory-page__actions ${
            mobileToolsOpen ? 'inventory-page__actions--open' : ''
          }`}
          aria-label="Inventory actions"
        >
          <button
            type="button"
            className="inventory-page__mobile-section-toggle"
            onClick={() => setMobileToolsOpen((isOpen) => !isOpen)}
            aria-expanded={mobileToolsOpen}
          >
            <span>
              <Wrench size={18} aria-hidden="true" />
              {mobileToolsOpen ? 'Part Actions' : 'Actions'}
            </span>
            {mobileToolsOpen && <X size={19} aria-hidden="true" />}
          </button>

          <h2 className="inventory-page__panel-title">Quick Actions</h2>

          <Button fullWidth onClick={() => openInventoryAction('add')}>
            <PackagePlus size={19} aria-hidden="true" />
            Add Part
          </Button>

          <Button fullWidth onClick={() => openInventoryAction('use')}>
            <PackageMinus size={19} aria-hidden="true" />
            Use Part
          </Button>

          <Button fullWidth onClick={() => openInventoryAction('give')}>
            <HandHelping size={19} aria-hidden="true" />
            Give Part
          </Button>

          <Button fullWidth onClick={() => openInventoryAction('move')}>
            <ArrowRightLeft size={19} aria-hidden="true" />
            Move Part
          </Button>

          <Button
            variant="secondary"
            className="inventory-count-launch"
            onClick={() => openInventoryAction('count')}
          >
            <span className="inventory-count-launch__icon">
              <ClipboardCheck size={22} aria-hidden="true" />
            </span>
            <span className="inventory-count-launch__copy">
              <strong>Count Inventory</strong>
              <small>Verify a location and save corrections.</small>
            </span>
            <ChevronRight
              className="inventory-count-launch__arrow"
              size={20}
              aria-hidden="true"
            />
          </Button>
        </section>

        <section
          className="inventory-page__summary"
          aria-label="Inventory summary"
        >
          <h2 className="inventory-page__panel-title">Inventory Snapshot</h2>

          <Card
            as="button"
            type="button"
            className="inventory-page__summary-card inventory-page__summary-card--total"
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
            className="inventory-page__summary-card inventory-page__summary-card--official"
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
            className="inventory-page__summary-card inventory-page__summary-card--noi"
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
            className="inventory-page__summary-card inventory-page__summary-card--out-of-stock"
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
              activeInventoryView === INVENTORY_VIEW_TABS.HEALTH
                ? 'inventory-page__tab--active'
                : ''
            }`}
            onClick={() => setActiveInventoryView(INVENTORY_VIEW_TABS.HEALTH)}
          >
            <ShieldCheck
              className="inventory-page__tab-icon"
              size={18}
              aria-hidden="true"
            />
            <span>Health</span>
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
                <h2>
                  {isSearching
                    ? searchMode === INVENTORY_SEARCH_MODES.DESCRIPTION
                      ? 'Description Matches'
                      : 'Part Locations'
                    : 'Locations'}
                </h2>

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

              {isSearching && searchResultParts.length > 0 ? (
                <InventorySearchResults
                  parts={searchResultParts}
                  items={filteredInventoryItems}
                  onUse={openUseFromItem}
                  onMove={openMoveFromItem}
                  onEdit={openEditFromItem}
                  onEditDescription={(part) =>
                    openCatalogDescriptionModal(part)
                  }
                />
              ) : !isSearching && visibleLocationGroups.length > 0 ? (
                <div className="inventory-page__location-list">
                  {visibleLocationGroups.map((locationGroup) => (
                    <InventoryLocationCard
                      key={locationGroup.id}
                      locationGroup={locationGroup}
                      onOpen={openLocationModal}
                    />
                  ))}
                </div>
              ) : (
                <Card className="inventory-page__empty-state">
                  <h3>
                    {isSearching
                      ? searchMode === INVENTORY_SEARCH_MODES.DESCRIPTION
                        ? 'No description found'
                        : 'No part found'
                      : 'No boxes found'}
                  </h3>
                  <p>
                    {isSearching
                      ? searchMode === INVENTORY_SEARCH_MODES.DESCRIPTION
                        ? 'Try another word from the part description.'
                        : 'No box contains that part number.'
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
                        {part.description && (
                          <p className="inventory-page__part-description">
                            {part.description}
                          </p>
                        )}
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

          {activeInventoryView === INVENTORY_VIEW_TABS.HEALTH && (
            <InventoryHealthView
              health={inventoryHealth}
              onEditDescription={(part) =>
                openCatalogDescriptionModal(part)
              }
              onEditItem={openEditFromItem}
              onManageLocations={() => openModal('manageLocations')}
              onCheckWorkbook={() => openModal('workbook')}
            />
          )}

          {activeInventoryView === INVENTORY_VIEW_TABS.EXPORT && (
            <>
              <div className="inventory-page__section-heading">
                <h2>Export</h2>
              </div>

              <div className="inventory-page__export-list">
                <Card className="inventory-page__export-card">
                  <div className="inventory-page__export-card-icon">
                    <FileSpreadsheet size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <h3>Fill Quarterly Excel Sheet</h3>
                    <p>
                      Upload your count workbook and download a copy filled
                      with the quantities currently on your truck.
                    </p>
                  </div>

                  <Button onClick={() => openModal('workbook')}>
                    <FileSpreadsheet size={18} aria-hidden="true" />
                    Fill Excel Sheet
                  </Button>
                </Card>

                <Card className="inventory-page__export-card">
                  <div className="inventory-page__export-card-icon">
                    <Download size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <h3>Export Inventory CSV</h3>
                    <p>
                      Download your current inventory sorted by part number and
                      location.
                    </p>
                  </div>

                  <Button variant="secondary" onClick={handleExportInventory}>
                    <Download size={18} aria-hidden="true" />
                    Export CSV
                  </Button>
                </Card>

                <Card className="inventory-page__export-card">
                  <div className="inventory-page__export-card-icon">
                    <ShieldCheck size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <h3>Backup &amp; Restore</h3>
                    <p>
                      Save parts, descriptions, locations, deleted-location
                      archives, and history in one backup file.
                    </p>
                  </div>

                  <div className="inventory-page__backup-actions">
                    <Button
                      variant="secondary"
                      onClick={handleDownloadInventoryBackup}
                    >
                      <Download size={18} aria-hidden="true" />
                      Download Backup
                    </Button>
                    <Button onClick={() => openModal('backup')}>
                      <Upload size={18} aria-hidden="true" />
                      Restore Backup
                    </Button>
                  </div>
                </Card>
              </div>
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
        locationGroups={activeLocationGroups}
        deletedLocations={deletedLocations}
        onAdd={handleAddLocation}
        onRename={handleRenameLocation}
        onRestore={handleRestoreLocation}
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
        items={inventoryItemsWithCatalogDescriptions}
        partCatalog={partCatalog}
        summaryView={selectedSummaryView}
        onEditDescription={(part) =>
          openCatalogDescriptionModal(part, 'summary')
        }
      />

      <InventoryCountModal
        isOpen={activeModal === 'count'}
        onClose={closeModal}
        locationGroups={activeLocationGroups}
        onSubmit={handleInventoryCount}
      />

      <EditPartDescriptionModal
        key={`description-${selectedCatalogPart?.id || 'none'}`}
        isOpen={activeModal === 'editDescription'}
        onClose={closeCatalogDescriptionModal}
        onSubmit={handleEditCatalogDescription}
        part={selectedCatalogPart}
      />

      {activeModal === 'workbook' && (
        <Suspense
          fallback={
            <div className="inventory-page__feature-loading" role="status">
              Opening Excel tools…
            </div>
          }
        >
          <InventoryWorkbookModal
            isOpen
            onClose={closeModal}
            inventoryItems={inventoryItems}
            partCatalog={partCatalog}
            onImportDescriptions={handleImportWorkbookDescriptions}
            onWorkbookInspected={setWorkbookHealthCheck}
          />
        </Suspense>
      )}

      <InventoryBackupModal
        isOpen={activeModal === 'backup'}
        onClose={closeModal}
        onRestore={handleRestoreInventoryBackup}
      />

      <HistoryModal
        isOpen={activeModal === 'history'}
        onClose={closeModal}
        history={inventoryHistory}
      />

      {undoAction && (
        <div className="inventory-page__undo" role="status">
          <span>{undoAction.message}</span>
          <Button
            className="inventory-page__undo-button"
            variant="secondary"
            size="sm"
            onClick={handleUndo}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Undo
          </Button>
          <button
            type="button"
            className="inventory-page__undo-dismiss"
            aria-label="Dismiss undo message"
            onClick={dismissUndoAction}
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
      )}
    </main>
  )
}

export default InventoryPage
