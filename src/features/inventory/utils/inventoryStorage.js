const INVENTORY_STORAGE_KEYS = {
  inventory: 'truck_inventory_items',
  history: 'truck_inventory_history',
  locations: 'truck_inventory_locations',
  pendingSync: 'truck_inventory_pending_sync',
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

export const loadPendingSync = () => {
  return readStorage(INVENTORY_STORAGE_KEYS.pendingSync, [])
}

export const savePendingSync = (pendingSyncItems) => {
  return writeStorage(INVENTORY_STORAGE_KEYS.pendingSync, pendingSyncItems)
}

export const clearInventoryStorage = () => {
  Object.values(INVENTORY_STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
}