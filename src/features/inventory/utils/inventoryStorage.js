const INVENTORY_STORAGE_KEYS = {
  inventory: 'truck_inventory_items',
  partCatalog: 'truck_inventory_part_catalog',
  history: 'truck_inventory_history',
  locations: 'truck_inventory_locations',
  removedLocations: 'truck_inventory_removed_locations',
  archivedLocations: 'truck_inventory_archived_locations',
  pendingSync: 'truck_inventory_pending_sync',
  inventoryCountDrafts: 'truck_inventory_count_drafts',
}

const readStorage = (key, fallbackValue = []) => {
  try {
    const storedValue = localStorage.getItem(key)

    if (!storedValue) {
      return fallbackValue
    }

    return JSON.parse(storedValue)
  } catch (error) {
    console.error(`Failed to read localStorage key: ${key}`, error)
    return fallbackValue
  }
}

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Failed to write localStorage key: ${key}`, error)
    return false
  }
}

export const loadInventoryItems = () => {
  return readStorage(INVENTORY_STORAGE_KEYS.inventory, [])
}

export const saveInventoryItems = (items) => {
  return writeStorage(INVENTORY_STORAGE_KEYS.inventory, items)
}

export const loadPartCatalog = () => {
  return readStorage(INVENTORY_STORAGE_KEYS.partCatalog, [])
}

export const savePartCatalog = (catalog) => {
  return writeStorage(INVENTORY_STORAGE_KEYS.partCatalog, catalog)
}

export const loadInventoryHistory = () => {
  return readStorage(INVENTORY_STORAGE_KEYS.history, [])
}

export const saveInventoryHistory = (history) => {
  return writeStorage(INVENTORY_STORAGE_KEYS.history, history)
}

export const loadSavedLocations = () => {
  return readStorage(INVENTORY_STORAGE_KEYS.locations, [])
}

export const saveSavedLocations = (locations) => {
  return writeStorage(INVENTORY_STORAGE_KEYS.locations, locations)
}

export const loadRemovedLocations = () => {
  return readStorage(INVENTORY_STORAGE_KEYS.removedLocations, [])
}

export const saveRemovedLocations = (locations) => {
  return writeStorage(INVENTORY_STORAGE_KEYS.removedLocations, locations)
}

export const loadArchivedLocations = () => {
  return readStorage(INVENTORY_STORAGE_KEYS.archivedLocations, [])
}

export const saveArchivedLocations = (locations) => {
  return writeStorage(INVENTORY_STORAGE_KEYS.archivedLocations, locations)
}

export const loadPendingSync = () => {
  return readStorage(INVENTORY_STORAGE_KEYS.pendingSync, [])
}

export const savePendingSync = (pendingSyncItems) => {
  return writeStorage(INVENTORY_STORAGE_KEYS.pendingSync, pendingSyncItems)
}

const normalizeInventoryCountDraft = (draft = {}) => {
  const location = String(draft?.location || '').trim()

  if (!location) return null

  const counts = Object.entries(draft?.counts || {}).reduce(
    (cleanCounts, [itemId, entry]) => {
      if (!itemId || !entry || typeof entry !== 'object') return cleanCounts

      const cleanEntry = {}

      if (entry.officialQuantity !== undefined) {
        cleanEntry.officialQuantity = String(entry.officialQuantity)
      }

      if (entry.noiQuantity !== undefined) {
        cleanEntry.noiQuantity = String(entry.noiQuantity)
      }

      if (Object.keys(cleanEntry).length > 0) {
        cleanCounts[itemId] = cleanEntry
      }

      return cleanCounts
    },
    {},
  )
  const savedDate = new Date(draft.savedAt || '')

  return {
    version: 1,
    location,
    counts,
    step: draft.step === 'REVIEW' ? 'REVIEW' : 'COUNT',
    savedAt: Number.isNaN(savedDate.getTime())
      ? new Date().toISOString()
      : savedDate.toISOString(),
  }
}

const getInventoryCountDraftKey = (location = '') => {
  return String(location).trim().toUpperCase()
}

export const loadInventoryCountDrafts = () => {
  const storedDrafts = readStorage(INVENTORY_STORAGE_KEYS.inventoryCountDrafts, [])

  if (!Array.isArray(storedDrafts)) return []

  return storedDrafts
    .map(normalizeInventoryCountDraft)
    .filter(Boolean)
    .sort((first, second) => second.savedAt.localeCompare(first.savedAt))
}

export const saveInventoryCountDraft = (draft) => {
  const cleanDraft = normalizeInventoryCountDraft(draft)
  const currentDrafts = loadInventoryCountDrafts()

  if (!cleanDraft) return currentDrafts

  const draftKey = getInventoryCountDraftKey(cleanDraft.location)
  const nextDrafts = [
    cleanDraft,
    ...currentDrafts.filter(
      (currentDraft) =>
        getInventoryCountDraftKey(currentDraft.location) !== draftKey,
    ),
  ]

  writeStorage(INVENTORY_STORAGE_KEYS.inventoryCountDrafts, nextDrafts)

  return nextDrafts
}

export const deleteInventoryCountDraft = (location) => {
  const draftKey = getInventoryCountDraftKey(location)
  const nextDrafts = loadInventoryCountDrafts().filter(
    (draft) => getInventoryCountDraftKey(draft.location) !== draftKey,
  )

  writeStorage(INVENTORY_STORAGE_KEYS.inventoryCountDrafts, nextDrafts)

  return nextDrafts
}

export const clearInventoryStorage = () => {
  Object.values(INVENTORY_STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
}
