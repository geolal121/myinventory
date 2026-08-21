import { INVENTORY_ACTIONS } from '../data/inventoryActions.js'

const normalizeLocation = (location = '') => String(location).trim()

const isSameLocation = (first = '', second = '') => {
  return normalizeLocation(first).toUpperCase() === normalizeLocation(second).toUpperCase()
}

const parseCountValue = (value) => {
  if (value === '' || value === null || value === undefined) return null

  const quantity = Number(value)

  if (!Number.isInteger(quantity) || quantity < 0) return null

  return quantity
}

const getCountEntry = (counts, itemId) => counts?.[itemId] || {}

export const getInventoryCountItems = (items = [], location = '') => {
  if (!normalizeLocation(location)) return []

  return items
    .filter((item) => isSameLocation(item.location, location))
    .sort((first, second) =>
      String(first.partNumber || '').localeCompare(
        String(second.partNumber || ''),
        undefined,
        { numeric: true, sensitivity: 'base' },
      ),
    )
}

export const reviewInventoryCount = ({ items = [], location = '', counts = {} } = {}) => {
  const locationItems = getInventoryCountItems(items, location)
  const rows = locationItems.map((item) => {
    const entry = getCountEntry(counts, item.id)
    const countedOfficialQuantity = parseCountValue(entry.officialQuantity)
    const countedNoiQuantity = parseCountValue(entry.noiQuantity)
    const previousOfficialQuantity = Number(item.officialQuantity || 0)
    const previousNoiQuantity = Number(item.noiQuantity || 0)
    const isCounted =
      countedOfficialQuantity !== null && countedNoiQuantity !== null

    return {
      id: item.id,
      partNumber: item.partNumber,
      description: item.description || '',
      previousOfficialQuantity,
      previousNoiQuantity,
      previousTotalQuantity:
        previousOfficialQuantity + previousNoiQuantity,
      countedOfficialQuantity,
      countedNoiQuantity,
      countedTotalQuantity: isCounted
        ? countedOfficialQuantity + countedNoiQuantity
        : null,
      isCounted,
      hasDifference:
        isCounted &&
        (countedOfficialQuantity !== previousOfficialQuantity ||
          countedNoiQuantity !== previousNoiQuantity),
    }
  })
  const countedRows = rows.filter((row) => row.isCounted)
  const differences = rows.filter((row) => row.hasDifference)

  return {
    rows,
    differences,
    totalParts: rows.length,
    countedParts: countedRows.length,
    remainingParts: rows.length - countedRows.length,
    discrepancyCount: differences.length,
    isComplete: rows.length > 0 && countedRows.length === rows.length,
    previousTotalQuantity: rows.reduce(
      (total, row) => total + row.previousTotalQuantity,
      0,
    ),
    countedTotalQuantity: countedRows.reduce(
      (total, row) => total + row.countedTotalQuantity,
      0,
    ),
  }
}

const createCountNotes = ({ totalParts, differences }) => {
  if (differences.length === 0) {
    return `Completed count of ${totalParts} parts. All quantities matched.`
  }

  const corrections = differences.map(
    (row) =>
      `${row.partNumber}: Official ${row.previousOfficialQuantity} to ${row.countedOfficialQuantity}, NOI ${row.previousNoiQuantity} to ${row.countedNoiQuantity}`,
  )

  return `Completed count of ${totalParts} parts. Corrected ${differences.length}: ${corrections.join('; ')}.`
}

export const applyInventoryCount = ({
  items = [],
  history = [],
  location = '',
  counts = {},
  now = new Date(),
  createId = () => crypto.randomUUID(),
} = {}) => {
  const cleanLocation = normalizeLocation(location)

  if (!cleanLocation) {
    return {
      isValid: false,
      errorMessage: 'Choose a location before starting the count.',
    }
  }

  const review = reviewInventoryCount({ items, location: cleanLocation, counts })

  if (review.totalParts === 0) {
    return {
      isValid: false,
      errorMessage: `${cleanLocation} does not have any stocked parts to count.`,
    }
  }

  if (!review.isComplete) {
    return {
      isValid: false,
      errorMessage: `Count the remaining ${review.remainingParts} part${
        review.remainingParts === 1 ? '' : 's'
      } before saving.`,
    }
  }

  const differencesById = new Map(
    review.differences.map((difference) => [difference.id, difference]),
  )
  const changedItems = []
  const deletedItemIds = []
  const nextItems = items.flatMap((item) => {
    const difference = differencesById.get(item.id)

    if (!difference) return [item]

    if (difference.countedTotalQuantity === 0) {
      deletedItemIds.push(item.id)
      return []
    }

    const nextItem = {
      ...item,
      officialQuantity: difference.countedOfficialQuantity,
      noiQuantity: difference.countedNoiQuantity,
    }

    changedItems.push(nextItem)

    return [nextItem]
  })
  const createdAt = now instanceof Date ? now : new Date(now)
  const historyRecord = {
    id: createId(),
    createdAt: createdAt.toISOString(),
    action: INVENTORY_ACTIONS.COUNT,
    partNumber: '',
    quantity: review.countedTotalQuantity,
    location: cleanLocation,
    fromLocation: '',
    toLocation: '',
    inventoryStatus: '',
    person: '',
    coworker: '',
    machine: '',
    customer: '',
    ticketNumber: '',
    notes: createCountNotes(review),
    originalPartNumber: '',
    originalLocation: '',
    countedPartCount: review.totalParts,
    discrepancyCount: review.discrepancyCount,
    previousTotalQuantity: review.previousTotalQuantity,
    countedTotalQuantity: review.countedTotalQuantity,
    adjustments: review.differences.map((difference) => ({
      partNumber: difference.partNumber,
      previousOfficialQuantity: difference.previousOfficialQuantity,
      countedOfficialQuantity: difference.countedOfficialQuantity,
      previousNoiQuantity: difference.previousNoiQuantity,
      countedNoiQuantity: difference.countedNoiQuantity,
    })),
    synced: false,
  }

  return {
    isValid: true,
    errorMessage: '',
    items: nextItems,
    history: [historyRecord, ...history],
    historyRecord,
    changedItems,
    deletedItemIds,
    review,
  }
}

export const buildInventoryCountCsv = ({
  location = '',
  completedAt = new Date(),
  review,
} = {}) => {
  const escapeCsvValue = (value = '') => {
    const cleanValue = String(value ?? '')

    return /[",\n\r]/.test(cleanValue)
      ? `"${cleanValue.replace(/"/g, '""')}"`
      : cleanValue
  }
  const headers = [
    'Location',
    'Part Number',
    'Description',
    'Previous Official',
    'Counted Official',
    'Previous NOI',
    'Counted NOI',
    'Difference',
    'Completed At',
  ]
  const completedDate =
    completedAt instanceof Date ? completedAt : new Date(completedAt)
  const rows = (review?.rows || []).map((row) => [
    location,
    row.partNumber,
    row.description,
    row.previousOfficialQuantity,
    row.countedOfficialQuantity,
    row.previousNoiQuantity,
    row.countedNoiQuantity,
    row.hasDifference ? 'Yes' : 'No',
    completedDate.toISOString(),
  ])

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n')
}

export const createInventoryCountFileName = ({
  location = 'location',
  date = new Date(),
} = {}) => {
  const fileDate = date instanceof Date ? date : new Date(date)
  const dateLabel = fileDate.toISOString().slice(0, 10)
  const locationLabel = normalizeLocation(location)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `inventory-count-${locationLabel || 'location'}-${dateLabel}.csv`
}
