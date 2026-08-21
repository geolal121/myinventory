import {
  deleteArchivedLocationFromFirebase,
  deleteInventoryHistoryFromFirebase,
  deleteInventoryItemFromFirebase,
  deletePartCatalogEntryFromFirebase,
  deleteLocationFromFirebase,
  deleteRemovedLocationFromFirebase,
  getInventoryHistoryFromFirebase,
  getInventoryItemsFromFirebase,
  getPartCatalogFromFirebase,
  getArchivedLocationsFromFirebase,
  getSavedLocationsFromFirebase,
  getRemovedLocationsFromFirebase,
  saveInventoryHistoryToFirebase,
  saveInventoryItemToFirebase,
  savePartCatalogEntryToFirebase,
  saveArchivedLocationToFirebase,
  saveLocationToFirebase,
  saveRemovedLocationToFirebase,
  waitForInventoryWritesToSync,
} from './inventoryService.js'

export { waitForInventoryWritesToSync }

export const loadInventoryCloudData = async () => {
  const [
    inventoryItems,
    inventoryHistory,
    partCatalog,
    savedLocations,
    removedLocations,
    archivedLocations,
  ] = await Promise.all([
    getInventoryItemsFromFirebase(),
    getInventoryHistoryFromFirebase(),
    getPartCatalogFromFirebase().catch((error) => {
      console.warn('Failed to load inventory part catalog:', error)
      return []
    }),
    getSavedLocationsFromFirebase(),
    getRemovedLocationsFromFirebase().catch((error) => {
      console.warn('Failed to load removed inventory locations:', error)
      return []
    }),
    getArchivedLocationsFromFirebase().catch((error) => {
      console.warn('Failed to load archived inventory locations:', error)
      return []
    }),
  ])

  return {
    inventoryItems,
    inventoryHistory,
    partCatalog,
    savedLocations,
    removedLocations,
    archivedLocations,
  }
}

export const syncInventoryItemsToCloud = async (items = []) => {
  await Promise.all(
    items.map((item) => saveInventoryItemToFirebase(item)),
  )
}

export const syncPartCatalogToCloud = async (entries = []) => {
  await Promise.all(
    entries.map((entry) => savePartCatalogEntryToFirebase(entry)),
  )
}

export const deletePartCatalogEntriesFromCloud = async (entryIds = []) => {
  await Promise.all(
    entryIds.map((entryId) => deletePartCatalogEntryFromFirebase(entryId)),
  )
}

export const syncInventoryHistoryToCloud = async (history = []) => {
  await Promise.all(
    history.map((historyRecord) => saveInventoryHistoryToFirebase(historyRecord)),
  )
}

export const syncSavedLocationsToCloud = async (locations = []) => {
  await Promise.all(
    locations.map((location) => saveLocationToFirebase(location)),
  )
}

export const syncRemovedLocationsToCloud = async (locations = []) => {
  await Promise.all(
    locations.map((location) => saveRemovedLocationToFirebase(location)),
  )
}

export const syncArchivedLocationsToCloud = async (archives = []) => {
  await Promise.all(
    archives.map((archive) =>
      saveArchivedLocationToFirebase({
        location: archive.location,
        items: archive.items,
        deletedAt: archive.deletedAt,
      }),
    ),
  )
}

export const mergeInventoryBackupToCloud = async ({
  inventoryItems = [],
  partCatalog = [],
  inventoryHistory = [],
  savedLocations = [],
  removedLocations = [],
  archivedLocations = [],
}) => {
  await Promise.all([
    syncInventoryItemsToCloud(inventoryItems),
    syncPartCatalogToCloud(partCatalog),
    syncInventoryHistoryToCloud(inventoryHistory),
    syncSavedLocationsToCloud(savedLocations),
    syncRemovedLocationsToCloud(removedLocations),
    syncArchivedLocationsToCloud(archivedLocations),
    ...savedLocations.map((location) =>
      deleteRemovedLocationFromFirebase(location),
    ),
    ...savedLocations.map((location) =>
      deleteArchivedLocationFromFirebase(location),
    ),
  ])
}

export const syncInventoryTransactionToCloud = async ({
  items = [],
  historyRecord = null,
  locations = [],
  deletedItemIds = [],
  restoredLocations = [],
}) => {
  await Promise.all([
    ...items.map((item) => saveInventoryItemToFirebase(item)),
    ...(historyRecord
      ? [saveInventoryHistoryToFirebase(historyRecord)]
      : []),
    ...locations.map((location) => saveLocationToFirebase(location)),
    ...deletedItemIds.map((itemId) =>
      deleteInventoryItemFromFirebase(itemId),
    ),
    ...restoredLocations.map((location) =>
      deleteRemovedLocationFromFirebase(location),
    ),
  ])
}

export const undoInventoryTransactionInCloud = async ({
  previousItems = [],
  currentItems = [],
  previousCatalog = [],
  currentCatalog = [],
  previousLocations = [],
  currentLocations = [],
  historyRecordId = '',
}) => {
  const previousItemIds = new Set(previousItems.map((item) => item.id))
  const previousCatalogIds = new Set(previousCatalog.map((entry) => entry.id))
  const previousLocationNames = new Set(
    previousLocations.map((location) => location.trim().toUpperCase()),
  )

  await Promise.all([
    syncInventoryItemsToCloud(previousItems),
    syncPartCatalogToCloud(previousCatalog),
    syncSavedLocationsToCloud(previousLocations),
    ...currentItems
      .filter((item) => !previousItemIds.has(item.id))
      .map((item) => deleteInventoryItemFromFirebase(item.id)),
    ...currentCatalog
      .filter((entry) => !previousCatalogIds.has(entry.id))
      .map((entry) => deletePartCatalogEntryFromFirebase(entry.id)),
    ...currentLocations
      .filter(
        (location) =>
          !previousLocationNames.has(location.trim().toUpperCase()),
      )
      .map((location) => deleteLocationFromFirebase(location)),
    deleteInventoryHistoryFromFirebase(historyRecordId),
  ])
}

export const deleteInventoryLocationFromCloud = async ({
  location,
  items = [],
  deletedAt = '',
}) => {
  await Promise.all([
    saveArchivedLocationToFirebase({
      location,
      items,
      deletedAt,
    }),
    ...items.map((item) => deleteInventoryItemFromFirebase(item.id)),
    deleteLocationFromFirebase(location),
    saveRemovedLocationToFirebase(location),
  ])
}

export const addInventoryLocationToCloud = async (location) => {
  await Promise.all([
    saveLocationToFirebase(location),
    deleteRemovedLocationFromFirebase(location),
  ])
}

export const restoreInventoryLocationToCloud = async ({
  location,
  items = [],
}) => {
  await Promise.all([
    ...items.map((item) => saveInventoryItemToFirebase(item)),
    saveLocationToFirebase(location),
    deleteRemovedLocationFromFirebase(location),
    deleteArchivedLocationFromFirebase(location),
  ])
}

export const renameInventoryLocationInCloud = async ({
  fromLocation,
  toLocation,
  items = [],
  deletedItemIds = [],
}) => {
  const isDifferentLocation =
    fromLocation.trim().toUpperCase() !== toLocation.trim().toUpperCase()
  const syncTasks = [
    ...items.map((item) => saveInventoryItemToFirebase(item)),
    ...deletedItemIds.map((itemId) => deleteInventoryItemFromFirebase(itemId)),
    saveLocationToFirebase(toLocation),
    deleteLocationFromFirebase(fromLocation),
    deleteRemovedLocationFromFirebase(toLocation),
  ]

  if (isDifferentLocation) {
    syncTasks.push(saveRemovedLocationToFirebase(fromLocation))
  } else {
    syncTasks.push(deleteRemovedLocationFromFirebase(fromLocation))
  }

  await Promise.all(syncTasks)
}
