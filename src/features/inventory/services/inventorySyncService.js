import {
  deleteArchivedLocationFromFirebase,
  deleteInventoryItemFromFirebase,
  deleteLocationFromFirebase,
  deleteRemovedLocationFromFirebase,
  getInventoryHistoryFromFirebase,
  getInventoryItemsFromFirebase,
  getArchivedLocationsFromFirebase,
  getSavedLocationsFromFirebase,
  getRemovedLocationsFromFirebase,
  saveInventoryHistoryToFirebase,
  saveInventoryItemToFirebase,
  saveArchivedLocationToFirebase,
  saveLocationToFirebase,
  saveRemovedLocationToFirebase,
} from './inventoryService.js'

export const loadInventoryCloudData = async () => {
  const [
    inventoryItems,
    inventoryHistory,
    savedLocations,
    removedLocations,
    archivedLocations,
  ] = await Promise.all([
    getInventoryItemsFromFirebase(),
    getInventoryHistoryFromFirebase(),
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

export const syncInventoryTransactionToCloud = async ({
  items = [],
  historyRecord = null,
  locations = [],
  deletedItemIds = [],
  restoredLocations = [],
}) => {
  await syncInventoryItemsToCloud(items)

  if (historyRecord) {
    await saveInventoryHistoryToFirebase(historyRecord)
  }

  if (locations.length > 0) {
    await syncSavedLocationsToCloud(locations)
  }

  if (deletedItemIds.length > 0) {
    await Promise.all(
      deletedItemIds.map((itemId) => deleteInventoryItemFromFirebase(itemId)),
    )
  }

  if (restoredLocations.length > 0) {
    await Promise.all(
      restoredLocations.map((location) =>
        deleteRemovedLocationFromFirebase(location),
      ),
    )
  }
}

export const deleteInventoryLocationFromCloud = async ({
  location,
  items = [],
  deletedAt = '',
}) => {
  await saveArchivedLocationToFirebase({
    location,
    items,
    deletedAt,
  })

  await Promise.all([
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
