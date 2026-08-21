const HISTORY_ACTION_LABELS = {
  ADD: 'Add Part',
  USE: 'Use Part',
  GIVE: 'Give Part',
  MOVE: 'Move Part',
  EDIT: 'Edit Part',
  DELETE: 'Delete Part',
}

export const HISTORY_DATE_FILTERS = {
  LAST_7_DAYS: 'LAST_7_DAYS',
  LAST_30_DAYS: 'LAST_30_DAYS',
  LAST_90_DAYS: 'LAST_90_DAYS',
  THIS_YEAR: 'THIS_YEAR',
}

export const HISTORY_DATE_OPTIONS = [
  { label: 'Last 7 days', value: HISTORY_DATE_FILTERS.LAST_7_DAYS },
  { label: 'Last 30 days', value: HISTORY_DATE_FILTERS.LAST_30_DAYS },
  { label: 'Last 90 days', value: HISTORY_DATE_FILTERS.LAST_90_DAYS },
  { label: 'This year', value: HISTORY_DATE_FILTERS.THIS_YEAR },
]

export const getInventoryHistoryActionLabel = (action = '') => {
  return HISTORY_ACTION_LABELS[action] || action || 'Inventory Action'
}

export const getInventoryHistoryDate = (createdAt) => {
  if (!createdAt) return null

  if (typeof createdAt?.toDate === 'function') {
    return createdAt.toDate()
  }

  if (typeof createdAt?.seconds === 'number') {
    return new Date(createdAt.seconds * 1000)
  }

  const date = new Date(createdAt)

  return Number.isNaN(date.getTime()) ? null : date
}

export const formatInventoryHistoryDate = (createdAt) => {
  const date = getInventoryHistoryDate(createdAt)

  if (!date) return 'No date'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const getDateCutoff = (dateFilter, referenceDate) => {
  const cutoff = new Date(referenceDate)

  if (dateFilter === HISTORY_DATE_FILTERS.THIS_YEAR) {
    return new Date(cutoff.getFullYear(), 0, 1)
  }

  const daysByFilter = {
    [HISTORY_DATE_FILTERS.LAST_7_DAYS]: 7,
    [HISTORY_DATE_FILTERS.LAST_30_DAYS]: 30,
    [HISTORY_DATE_FILTERS.LAST_90_DAYS]: 90,
  }
  const days = daysByFilter[dateFilter]

  if (!days) return null

  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - days + 1)

  return cutoff
}

export const filterInventoryHistory = ({
  history = [],
  searchTerm = '',
  actionFilter = '',
  dateFilter = '',
  referenceDate = new Date(),
} = {}) => {
  const query = searchTerm.trim().toLowerCase()
  const cutoff = getDateCutoff(dateFilter, referenceDate)

  return history
    .filter((record) => {
      if (actionFilter && record.action !== actionFilter) return false

      if (cutoff) {
        const recordDate = getInventoryHistoryDate(record.createdAt)
        if (!recordDate || recordDate < cutoff) return false
      }

      if (!query) return true

      const searchableText = [
        getInventoryHistoryActionLabel(record.action),
        record.action,
        record.partNumber,
        record.quantity,
        record.location,
        record.fromLocation,
        record.toLocation,
        record.inventoryStatus,
        record.person,
        record.coworker,
        record.machine,
        record.customer,
        record.ticketNumber,
        record.notes,
        record.originalPartNumber,
        record.originalLocation,
        formatInventoryHistoryDate(record.createdAt),
      ]
        .filter((value) => value !== undefined && value !== null && value !== '')
        .join(' ')
        .toLowerCase()

      return searchableText.includes(query)
    })
    .sort((first, second) => {
      const firstTime = getInventoryHistoryDate(first.createdAt)?.getTime() || 0
      const secondTime = getInventoryHistoryDate(second.createdAt)?.getTime() || 0

      return secondTime - firstTime
    })
}

export const getInventoryHistorySummary = (history = []) => ({
  recordCount: history.length,
  uniqueParts: new Set(
    history.map((record) => String(record.partNumber || '').trim()).filter(Boolean),
  ).size,
  actionTypes: new Set(
    history.map((record) => String(record.action || '').trim()).filter(Boolean),
  ).size,
})

const escapeCsvValue = (value = '') => {
  const cleanValue = String(value ?? '')

  if (!/[",\n\r]/.test(cleanValue)) return cleanValue

  return `"${cleanValue.replace(/"/g, '""')}"`
}

export const buildInventoryHistoryCsv = (history = []) => {
  const headers = [
    'Date',
    'Action',
    'Part Number',
    'Quantity',
    'Location',
    'From Location',
    'To Location',
    'Inventory Type',
    'Used By',
    'Coworker',
    'Machine',
    'Customer',
    'Ticket',
    'Original Part',
    'Original Location',
    'Notes',
  ]
  const rows = history.map((record) => [
    formatInventoryHistoryDate(record.createdAt),
    getInventoryHistoryActionLabel(record.action),
    record.partNumber,
    record.quantity,
    record.location,
    record.fromLocation,
    record.toLocation,
    record.inventoryStatus,
    record.person,
    record.coworker,
    record.machine,
    record.customer,
    record.ticketNumber,
    record.originalPartNumber,
    record.originalLocation,
    record.notes,
  ])

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n')
}

export const createInventoryHistoryFileName = (date = new Date()) => {
  const fileDate = date instanceof Date ? date : new Date(date)
  const dateLabel = Number.isNaN(fileDate.getTime())
    ? new Date().toISOString().slice(0, 10)
    : fileDate.toISOString().slice(0, 10)

  return `myinventory-history-${dateLabel}.csv`
}
