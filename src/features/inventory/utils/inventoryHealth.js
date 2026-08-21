import { normalizePartCatalogId } from './partCatalogHelpers.js'

const STANDARD_PART_NUMBER = /^[A-Z0-9]{3}-[A-Z0-9]{4}-[A-Z0-9]{2}$/

const normalizeLocation = (location = '') => String(location).trim().toUpperCase()

const sortByPartNumber = (first, second) =>
  String(first.partNumber || '').localeCompare(
    String(second.partNumber || ''),
    undefined,
    { numeric: true, sensitivity: 'base' },
  )

const getQuantityIssue = (item) => {
  const officialQuantity = Number(item.officialQuantity || 0)
  const noiQuantity = Number(item.noiQuantity || 0)
  const totalQuantity = officialQuantity + noiQuantity

  if (!Number.isFinite(officialQuantity) || !Number.isFinite(noiQuantity)) {
    return 'Quantity is not a valid number'
  }

  if (officialQuantity < 0 || noiQuantity < 0) {
    return 'Quantity cannot be negative'
  }

  if (!Number.isInteger(officialQuantity) || !Number.isInteger(noiQuantity)) {
    return 'Quantity should be a whole number'
  }

  if (totalQuantity === 0) {
    return 'Zero-quantity location record should be removed'
  }

  return ''
}

export const analyzeInventoryHealth = ({
  inventoryItems = [],
  partCatalog = [],
  savedLocations = [],
  workbookCheck = null,
} = {}) => {
  const missingDescriptions = partCatalog
    .filter((part) => !String(part.description || '').trim())
    .sort(sortByPartNumber)

  const recordsByPartAndLocation = new Map()

  inventoryItems.forEach((item) => {
    const key = `${normalizePartCatalogId(item.partNumber)}__${normalizeLocation(item.location)}`
    const matchingItems = recordsByPartAndLocation.get(key) || []

    matchingItems.push(item)
    recordsByPartAndLocation.set(key, matchingItems)
  })

  const duplicateRecords = Array.from(recordsByPartAndLocation.values())
    .filter((items) => items.length > 1)
    .map((items) => ({
      partNumber: items[0].partNumber,
      location: items[0].location,
      recordCount: items.length,
      items,
    }))
    .sort(sortByPartNumber)

  const quantityIssues = inventoryItems
    .map((item) => ({ ...item, issue: getQuantityIssue(item) }))
    .filter((item) => item.issue)
    .sort(sortByPartNumber)

  const stockedLocationNames = new Set(
    inventoryItems
      .filter(
        (item) =>
          Number(item.officialQuantity || 0) + Number(item.noiQuantity || 0) > 0,
      )
      .map((item) => normalizeLocation(item.location)),
  )
  const emptyLocations = savedLocations
    .filter((location) => !stockedLocationNames.has(normalizeLocation(location)))
    .sort((first, second) =>
      first.localeCompare(second, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    )

  const alternativePartFormats = partCatalog
    .filter((part) => !STANDARD_PART_NUMBER.test(String(part.partNumber || '')))
    .sort(sortByPartNumber)

  const stockedPartIds = new Set(
    inventoryItems
      .filter(
        (item) =>
          Number(item.officialQuantity || 0) + Number(item.noiQuantity || 0) > 0,
      )
      .map((item) => normalizePartCatalogId(item.partNumber)),
  )
  const workbookPartIds = new Set(
    (workbookCheck?.partNumbers || []).map(normalizePartCatalogId),
  )
  const inventoryPartsNotInWorkbook = workbookCheck
    ? partCatalog
        .filter(
          (part) =>
            stockedPartIds.has(normalizePartCatalogId(part.partNumber)) &&
            !workbookPartIds.has(normalizePartCatalogId(part.partNumber)),
        )
        .sort(sortByPartNumber)
    : []

  const fixCount = duplicateRecords.length + quantityIssues.length
  const suggestionCount =
    missingDescriptions.length +
    emptyLocations.length +
    inventoryPartsNotInWorkbook.length

  return {
    missingDescriptions,
    duplicateRecords,
    quantityIssues,
    emptyLocations,
    alternativePartFormats,
    inventoryPartsNotInWorkbook,
    workbookCheck,
    fixCount,
    suggestionCount,
    status:
      fixCount > 0
        ? 'FIX_NEEDED'
        : suggestionCount > 0
          ? 'GOOD_WITH_SUGGESTIONS'
          : 'ALL_CLEAR',
  }
}
