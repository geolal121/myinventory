import {
  deleteInventoryItemFromFirebase,
  deleteLocationFromFirebase,
  deleteRemovedLocationFromFirebase,
  getInventoryHistoryFromFirebase,
  getInventoryItemsFromFirebase,
  getSavedLocationsFromFirebase,
  getRemovedLocationsFromFirebase,
  saveInventoryHistoryToFirebase,
  saveInventoryItemToFirebase,
  saveLocationToFirebase,
  saveRemovedLocationToFirebase,
} from './inventoryService.js'

export const loadInventoryCloudData = async () => {
  const [
    inventoryItems,
    inventoryHistory,
    savedLocations,
    removedLocations,
  ] = await Promise.all([
    getInventoryItemsFromFirebase(),
    getInventoryHistoryFromFirebase(),
    getSavedLocationsFromFirebase(),
    getRemovedLocationsFromFirebase().catch((error) => {
      console.warn('Failed to load removed inventory locations:', error)
      return []
    }),
  ])

  return {
    inventoryItems,
    inventoryHistory,
    savedLocations,
    removedLocations,
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
  itemIds = [],
}) => {
  await Promise.all([
    ...itemIds.map((itemId) => deleteInventoryItemFromFirebase(itemId)),
    deleteLocationFromFirebase(location),
    saveRemovedLocationToFirebase(location),
  ])
}
