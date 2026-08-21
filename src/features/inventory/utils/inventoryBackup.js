import { removeRedundantZeroLocationItems } from './inventoryHelpers.js'
import {
  buildPartCatalog,
  normalizePartCatalogId,
} from './partCatalogHelpers.js'

export const INVENTORY_BACKUP_FORMAT = 'myinventory-backup'
export const INVENTORY_BACKUP_VERSION = 1

const BACKUP_ARRAY_FIELDS = [
  'inventoryItems',
  'partCatalog',
  'inventoryHistory',
  'savedLocations',
  'removedLocations',
  'archivedLocations',
]

const normalizeLocation = (location = '') => String(location).trim().toUpperCase()

const mergeRecordsByKey = ({ imported = [], current = [], getKey }) => {
  const recordsByKey = new Map()

  imported.forEach((record) => {
    const key = getKey(record)
    if (key) recordsByKey.set(key, record)
  })

  current.forEach((record) => {
    const key = getKey(record)
    if (key) recordsByKey.set(key, record)
  })

  return Array.from(recordsByKey.values())
}

const mergeLocations = (...locationGroups) => {
  const locationsByName = new Map()

  locationGroups.flat().forEach((location) => {
    const cleanLocation = String(location || '').trim()
    const key = normalizeLocation(cleanLocation)

    if (key) locationsByName.set(key, cleanLocation)
  })

  return Array.from(locationsByName.values()).sort((first, second) =>
    first.localeCompare(second, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  )
}

const mergeCatalog = ({ imported = [], current = [], inventoryItems = [] }) => {
  const catalogById = new Map()

  imported.forEach((entry) => {
    const id = entry?.id || normalizePartCatalogId(entry?.partNumber)
    if (id) catalogById.set(id, { ...entry, id })
  })

  current.forEach((entry) => {
    const id = entry?.id || normalizePartCatalogId(entry?.partNumber)
    if (!id) return

    const importedEntry = catalogById.get(id)
    catalogById.set(id, {
      ...importedEntry,
      ...entry,
      id,
      description:
        String(entry?.description || '').trim() ||
        String(importedEntry?.description || '').trim(),
    })
  })

  return buildPartCatalog({
    catalog: Array.from(catalogById.values()),
    inventoryItems,
  })
}

export const createInventoryBackup = ({
  inventoryItems = [],
  partCatalog = [],
  inventoryHistory = [],
  savedLocations = [],
  removedLocations = [],
  archivedLocations = [],
  exportedAt = new Date().toISOString(),
} = {}) => ({
  format: INVENTORY_BACKUP_FORMAT,
  version: INVENTORY_BACKUP_VERSION,
  exportedAt,
  inventoryItems,
  partCatalog,
  inventoryHistory,
  savedLocations,
  removedLocations,
  archivedLocations,
})

export const createInventoryBackupFileName = (exportedAt = new Date()) => {
  const date = exportedAt instanceof Date ? exportedAt : new Date(exportedAt)
  const dateLabel = Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10)

  return `myinventory-backup-${dateLabel}.json`
}

export const parseInventoryBackup = (backupText = '') => {
  let backup

  try {
    backup = JSON.parse(backupText)
  } catch {
    throw new Error('This is not a valid MyInventory backup file.')
  }

  if (
    !backup ||
    backup.format !== INVENTORY_BACKUP_FORMAT ||
    backup.version !== INVENTORY_BACKUP_VERSION
  ) {
    throw new Error('Choose a backup file created by MyInventory.')
  }

  const invalidField = BACKUP_ARRAY_FIELDS.find(
    (fieldName) => !Array.isArray(backup[fieldName]),
  )

  if (invalidField) {
    throw new Error('This MyInventory backup is incomplete or damaged.')
  }

  return backup
}

export const getInventoryBackupSummary = (backup) => ({
  parts: backup.partCatalog.length,
  stockedLocations: backup.inventoryItems.length,
  history: backup.inventoryHistory.length,
  locations: backup.savedLocations.length,
  deletedLocations: backup.removedLocations.length,
})

export const mergeInventoryBackup = ({ current, backup }) => {
  const inventoryItems = removeRedundantZeroLocationItems(
    mergeRecordsByKey({
      imported: backup.inventoryItems,
      current: current.inventoryItems,
      getKey: (item) => item?.id,
    }),
  )
  const itemLocations = inventoryItems.map((item) => item.location)
  const savedLocations = mergeLocations(
    backup.savedLocations,
    current.savedLocations,
    itemLocations,
  )
  const activeLocationNames = new Set(savedLocations.map(normalizeLocation))
  const removedLocations = mergeLocations(
    backup.removedLocations,
    current.removedLocations,
  ).filter((location) => !activeLocationNames.has(normalizeLocation(location)))
  const archivedLocations = mergeRecordsByKey({
    imported: backup.archivedLocations,
    current: current.archivedLocations,
    getKey: (archive) => normalizeLocation(archive?.location),
  }).filter(
    (archive) => !activeLocationNames.has(normalizeLocation(archive.location)),
  )
  const partCatalog = mergeCatalog({
    imported: backup.partCatalog,
    current: current.partCatalog,
    inventoryItems,
  })
  const inventoryHistory = mergeRecordsByKey({
    imported: backup.inventoryHistory,
    current: current.inventoryHistory,
    getKey: (record) => record?.id,
  }).sort((first, second) =>
    String(second.createdAt || '').localeCompare(String(first.createdAt || '')),
  )

  return {
    inventoryItems,
    partCatalog,
    inventoryHistory,
    savedLocations,
    removedLocations,
    archivedLocations,
  }
}
