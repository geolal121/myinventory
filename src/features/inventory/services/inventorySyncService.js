import {
  deleteInventoryItemFromFirebase,
  getInventoryHistoryFromFirebase,
  getInventoryItemsFromFirebase,
  getSavedLocationsFromFirebase,
  saveInventoryHistoryToFirebase,
  saveInventoryItemToFirebase,
  saveLocationToFirebase,
} from './inventoryService.js'

export const loadInventoryCloudData = async () => {
  const [
    inventoryItems,
    inventoryHistory,
    savedLocations,
  ] = await Promise.all([
    getInventoryItemsFromFirebase(),
    getInventoryHistoryFromFirebase(),
    getSavedLocationsFromFirebase(),
  ])

  return {
    inventoryItems,
    inventoryHistory,
    savedLocations,
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
  deletedItemId = '',
}) => {
  await syncInventoryItemsToCloud(items)

  if (historyRecord) {
    await saveInventoryHistoryToFirebase(historyRecord)
  }

  if (locations.length > 0) {
    await syncSavedLocationsToCloud(locations)
  }

  if (deletedItemId) {
    await deleteInventoryItemFromFirebase(deletedItemId)
  }
}