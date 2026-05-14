import { INVENTORY_ACTIONS } from '../data/inventoryActions.js'

export const INVENTORY_STATUS = {
  OFFICIAL: 'OFFICIAL',
  NOI: 'NOI',
}

export const normalizePartNumber = (partNumber = '') => {
  return partNumber.trim().toUpperCase()
}

export const normalizePartNumberSearch = (partNumber = '') => {
  return normalizePartNumber(partNumber).replace(/-/g, '')
}

export const formatPartNumberInput = (value = '') => {
  const cleanedValue = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 9)

  const firstSection = cleanedValue.slice(0, 3)
  const secondSection = cleanedValue.slice(3, 7)
  const thirdSection = cleanedValue.slice(7, 9)

  if (cleanedValue.length <= 3) {
    return firstSection
  }

  if (cleanedValue.length <= 7) {
    return `${firstSection}-${secondSection}`
  }

  return `${firstSection}-${secondSection}-${thirdSection}`
}

export const normalizeText = (text = '') => {
  return text.trim()
}

export const createInventoryItemId = ({ partNumber, location }) => {
  return `${normalizePartNumber(partNumber)}__${normalizeText(location).toUpperCase()}`
}

export const isOutOfStock = (item) => {
  return Number(item.officialQuantity || 0) + Number(item.noiQuantity || 0) === 0
}

export const getInventoryItem = ({ items, partNumber, location }) => {
  const itemId = createInventoryItemId({ partNumber, location })

  return items.find((item) => item.id === itemId)
}

export const getAvailableQuantity = ({
  items,
  partNumber,
  location,
  inventoryStatus = INVENTORY_STATUS.OFFICIAL,
}) => {
  const item = getInventoryItem({ items, partNumber, location })

  if (!item) return 0

  if (inventoryStatus === INVENTORY_STATUS.NOI) {
    return Number(item.noiQuantity || 0)
  }

  return Number(item.officialQuantity || 0)
}

export const validateInventoryTransaction = ({
  action,
  items,
  transaction,
}) => {
  const cleanPartNumber = normalizePartNumber(transaction.partNumber)
  const amount = Number(transaction.quantity)

  if (!cleanPartNumber) {
    return {
      isValid: false,
      message: 'Part number is required.',
    }
  }

  if (action === INVENTORY_ACTIONS.DELETE) {
    const cleanLocation = normalizeText(transaction.location)

    if (!cleanLocation) {
      return {
        isValid: false,
        message: 'Location is required.',
      }
    }

    const existingItem = getInventoryItem({
      items,
      partNumber: cleanPartNumber,
      location: cleanLocation,
    })

    if (!existingItem) {
      return {
        isValid: false,
        message: `${cleanPartNumber} was not found in ${cleanLocation}.`,
      }
    }

    return {
      isValid: true,
      message: '',
    }
  }

  if (action === INVENTORY_ACTIONS.EDIT) {
    const cleanLocation = normalizeText(transaction.location)
    const officialQuantity = Number(transaction.officialQuantity)
    const noiQuantity = Number(transaction.noiQuantity)

    if (!transaction.originalItem) {
      return {
        isValid: false,
        message: 'Original item is required.',
      }
    }

    if (!cleanLocation) {
      return {
        isValid: false,
        message: 'Location is required.',
      }
    }

    if (Number.isNaN(officialQuantity) || officialQuantity < 0) {
      return {
        isValid: false,
        message: 'Official quantity must be 0 or higher.',
      }
    }

    if (Number.isNaN(noiQuantity) || noiQuantity < 0) {
      return {
        isValid: false,
        message: 'NOI quantity must be 0 or higher.',
      }
    }

    return {
      isValid: true,
      message: '',
    }
  }

  if (!amount || amount <= 0) {
    return {
      isValid: false,
      message: 'Quantity must be greater than 0.',
    }
  }

  if (action === INVENTORY_ACTIONS.ADD) {
    if (!normalizeText(transaction.location)) {
      return {
        isValid: false,
        message: 'Location is required.',
      }
    }

    return {
      isValid: true,
      message: '',
    }
  }

  if (action === INVENTORY_ACTIONS.USE || action === INVENTORY_ACTIONS.GIVE) {
    const cleanLocation = normalizeText(transaction.location)

    if (!cleanLocation) {
      return {
        isValid: false,
        message: 'Location is required.',
      }
    }

    const availableQuantity = getAvailableQuantity({
      items,
      partNumber: cleanPartNumber,
      location: cleanLocation,
      inventoryStatus: transaction.inventoryStatus,
    })

    if (availableQuantity <= 0) {
      return {
        isValid: false,
        message: `${cleanPartNumber} is out of stock in ${cleanLocation}.`,
      }
    }

    if (amount > availableQuantity) {
      return {
        isValid: false,
        message: `You only have ${availableQuantity} available. Confirm the quantity before saving.`,
      }
    }

    return {
      isValid: true,
      message: '',
    }
  }

  if (action === INVENTORY_ACTIONS.MOVE) {
    const cleanFromLocation = normalizeText(transaction.fromLocation)
    const cleanToLocation = normalizeText(transaction.toLocation)

    if (!cleanFromLocation) {
      return {
        isValid: false,
        message: 'From location is required.',
      }
    }

    if (!cleanToLocation) {
      return {
        isValid: false,
        message: 'To location is required.',
      }
    }

    if (cleanFromLocation.toUpperCase() === cleanToLocation.toUpperCase()) {
      return {
        isValid: false,
        message: 'From location and to location cannot be the same.',
      }
    }

    const availableQuantity = getAvailableQuantity({
      items,
      partNumber: cleanPartNumber,
      location: cleanFromLocation,
      inventoryStatus: transaction.inventoryStatus,
    })

    if (availableQuantity <= 0) {
      return {
        isValid: false,
        message: `${cleanPartNumber} is out of stock in ${cleanFromLocation}.`,
      }
    }

    if (amount > availableQuantity) {
      return {
        isValid: false,
        message: `You only have ${availableQuantity} available in ${cleanFromLocation}. Confirm the quantity before moving.`,
      }
    }

    return {
      isValid: true,
      message: '',
    }
  }

  return {
    isValid: false,
    message: 'Unknown inventory action.',
  }
}

export const createHistoryRecord = ({
  action,
  partNumber,
  quantity = 0,
  location = '',
  fromLocation = '',
  toLocation = '',
  inventoryStatus = INVENTORY_STATUS.OFFICIAL,
  person = '',
  coworker = '',
  machine = '',
  customer = '',
  ticketNumber = '',
  notes = '',
  originalItem = null,
}) => {
  const now = new Date()

  return {
    id: crypto.randomUUID(),
    createdAt: now.toISOString(),
    action,
    partNumber: normalizePartNumber(partNumber),
    quantity: Number(quantity),
    location: normalizeText(location),
    fromLocation: normalizeText(fromLocation),
    toLocation: normalizeText(toLocation),
    inventoryStatus,
    person: normalizeText(person),
    coworker: normalizeText(coworker),
    machine: normalizeText(machine),
    customer: normalizeText(customer),
    ticketNumber: normalizeText(ticketNumber),
    notes: normalizeText(notes),
    originalPartNumber: originalItem?.partNumber || '',
    originalLocation: originalItem?.location || '',
    synced: false,
  }
}

export const addInventoryQuantity = ({
  items,
  partNumber,
  quantity,
  location,
  inventoryStatus = INVENTORY_STATUS.OFFICIAL,
  notes = '',
}) => {
  const cleanPartNumber = normalizePartNumber(partNumber)
  const cleanLocation = normalizeText(location)
  const amount = Number(quantity)

  if (!cleanPartNumber || !cleanLocation || amount <= 0) {
    return items
  }

  const itemId = createInventoryItemId({
    partNumber: cleanPartNumber,
    location: cleanLocation,
  })

  const existingItem = items.find((item) => item.id === itemId)

  if (!existingItem) {
    return [
      ...items,
      {
        id: itemId,
        partNumber: cleanPartNumber,
        location: cleanLocation,
        officialQuantity:
          inventoryStatus === INVENTORY_STATUS.OFFICIAL ? amount : 0,
        noiQuantity:
          inventoryStatus === INVENTORY_STATUS.NOI ? amount : 0,
        knownMachines: [],
        knownCustomers: [],
        notes: normalizeText(notes),
      },
    ]
  }

  return items.map((item) => {
    if (item.id !== itemId) return item

    return {
      ...item,
      officialQuantity:
        inventoryStatus === INVENTORY_STATUS.OFFICIAL
          ? Number(item.officialQuantity || 0) + amount
          : Number(item.officialQuantity || 0),
      noiQuantity:
        inventoryStatus === INVENTORY_STATUS.NOI
          ? Number(item.noiQuantity || 0) + amount
          : Number(item.noiQuantity || 0),
      notes: normalizeText(notes) || item.notes,
    }
  })
}

export const subtractInventoryQuantity = ({
  items,
  partNumber,
  quantity,
  location,
  inventoryStatus = INVENTORY_STATUS.OFFICIAL,
  machine = '',
  customer = '',
}) => {
  const cleanPartNumber = normalizePartNumber(partNumber)
  const cleanLocation = normalizeText(location)
  const amount = Number(quantity)

  if (!cleanPartNumber || !cleanLocation || amount <= 0) {
    return items
  }

  const itemId = createInventoryItemId({
    partNumber: cleanPartNumber,
    location: cleanLocation,
  })

  return items.map((item) => {
    if (item.id !== itemId) return item

    const currentOfficialQuantity = Number(item.officialQuantity || 0)
    const currentNoiQuantity = Number(item.noiQuantity || 0)

    const nextOfficialQuantity =
      inventoryStatus === INVENTORY_STATUS.OFFICIAL
        ? currentOfficialQuantity - amount
        : currentOfficialQuantity

    const nextNoiQuantity =
      inventoryStatus === INVENTORY_STATUS.NOI
        ? currentNoiQuantity - amount
        : currentNoiQuantity

    const cleanMachine = normalizeText(machine)
    const cleanCustomer = normalizeText(customer)

    return {
      ...item,
      officialQuantity: Math.max(nextOfficialQuantity, 0),
      noiQuantity: Math.max(nextNoiQuantity, 0),
      knownMachines: cleanMachine
        ? [...new Set([...(item.knownMachines || []), cleanMachine])]
        : item.knownMachines || [],
      knownCustomers: cleanCustomer
        ? [...new Set([...(item.knownCustomers || []), cleanCustomer])]
        : item.knownCustomers || [],
    }
  })
}

export const moveInventoryQuantity = ({
  items,
  partNumber,
  quantity,
  fromLocation,
  toLocation,
  inventoryStatus = INVENTORY_STATUS.OFFICIAL,
}) => {
  const afterSubtract = subtractInventoryQuantity({
    items,
    partNumber,
    quantity,
    location: fromLocation,
    inventoryStatus,
  })

  return addInventoryQuantity({
    items: afterSubtract,
    partNumber,
    quantity,
    location: toLocation,
    inventoryStatus,
  })
}

export const deleteInventoryItem = ({
  items,
  partNumber,
  location,
}) => {
  const itemId = createInventoryItemId({
    partNumber,
    location,
  })

  return items.filter((item) => item.id !== itemId)
}

export const editInventoryItem = ({
  items,
  originalItem,
  partNumber,
  location,
  officialQuantity = 0,
  noiQuantity = 0,
  notes = '',
}) => {
  if (!originalItem) return items

  const originalItemId = originalItem.id

  const cleanPartNumber = normalizePartNumber(partNumber)
  const cleanLocation = normalizeText(location)

  const nextItemId = createInventoryItemId({
    partNumber: cleanPartNumber,
    location: cleanLocation,
  })

  const officialAmount = Number(officialQuantity || 0)
  const noiAmount = Number(noiQuantity || 0)

  const itemsWithoutOriginal = items.filter((item) => item.id !== originalItemId)

  const matchingItem = itemsWithoutOriginal.find((item) => item.id === nextItemId)

  if (matchingItem) {
    return itemsWithoutOriginal.map((item) => {
      if (item.id !== nextItemId) return item

      return {
        ...item,
        officialQuantity: Number(item.officialQuantity || 0) + officialAmount,
        noiQuantity: Number(item.noiQuantity || 0) + noiAmount,
        knownMachines: [
          ...new Set([
            ...(item.knownMachines || []),
            ...(originalItem.knownMachines || []),
          ]),
        ],
        knownCustomers: [
          ...new Set([
            ...(item.knownCustomers || []),
            ...(originalItem.knownCustomers || []),
          ]),
        ],
        notes: normalizeText(notes) || item.notes || originalItem.notes || '',
      }
    })
  }

  return [
    ...itemsWithoutOriginal,
    {
      ...originalItem,
      id: nextItemId,
      partNumber: cleanPartNumber,
      location: cleanLocation,
      officialQuantity: officialAmount,
      noiQuantity: noiAmount,
      notes: normalizeText(notes),
    },
  ]
}

export const groupInventoryByLocation = (items = []) => {
  const locationMap = new Map()

  items.forEach((item) => {
    const location = normalizeText(item.location) || 'No Location'
    const officialQuantity = Number(item.officialQuantity || 0)
    const noiQuantity = Number(item.noiQuantity || 0)
    const totalQuantity = officialQuantity + noiQuantity

    if (!locationMap.has(location)) {
      locationMap.set(location, {
        id: location.toUpperCase(),
        location,
        items: [],
        partCount: 0,
        totalQuantity: 0,
        officialQuantity: 0,
        noiQuantity: 0,
        outOfStockCount: 0,
      })
    }

    const locationGroup = locationMap.get(location)

    locationGroup.items.push(item)
    locationGroup.partCount += 1
    locationGroup.totalQuantity += totalQuantity
    locationGroup.officialQuantity += officialQuantity
    locationGroup.noiQuantity += noiQuantity

    if (isOutOfStock(item)) {
      locationGroup.outOfStockCount += 1
    }
  })

  return Array.from(locationMap.values()).sort((firstLocation, secondLocation) => {
    return firstLocation.location.localeCompare(secondLocation.location, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  })
}

export const searchInventory = (items = [], searchTerm = '') => {
  const query = normalizeText(searchTerm).toLowerCase()
  const normalizedQuery = normalizePartNumberSearch(searchTerm).toLowerCase()

  if (!query) return items

  return items.filter((item) => {
    const searchableText = [
      item.partNumber,
      normalizePartNumberSearch(item.partNumber),
      item.location,
      item.notes,
      ...(item.knownMachines || []),
      ...(item.knownCustomers || []),
    ]
      .join(' ')
      .toLowerCase()

    return (
      searchableText.includes(query) ||
      searchableText.includes(normalizedQuery)
    )
  })
}

export const getInventorySummary = (items = []) => {
  return {
    totalParts: items.length,
    officialQuantity: items.reduce(
      (total, item) => total + Number(item.officialQuantity || 0),
      0,
    ),
    noiQuantity: items.reduce(
      (total, item) => total + Number(item.noiQuantity || 0),
      0,
    ),
    outOfStock: items.filter(isOutOfStock).length,
  }
}

export const buildInventoryTransaction = ({
  action,
  items,
  history,
  transaction,
}) => {
  const validation = validateInventoryTransaction({
    action,
    items,
    transaction,
  })

  if (!validation.isValid) {
    return {
      isValid: false,
      errorMessage: validation.message,
      items,
      history,
      historyRecord: null,
    }
  }

  const historyRecord = createHistoryRecord({
    action,
    ...transaction,
  })

  let nextItems = items

  if (action === INVENTORY_ACTIONS.ADD) {
    nextItems = addInventoryQuantity({
      items,
      ...transaction,
    })
  }

  if (action === INVENTORY_ACTIONS.USE || action === INVENTORY_ACTIONS.GIVE) {
    nextItems = subtractInventoryQuantity({
      items,
      ...transaction,
    })
  }

  if (action === INVENTORY_ACTIONS.MOVE) {
    nextItems = moveInventoryQuantity({
      items,
      ...transaction,
    })
  }

  if (action === INVENTORY_ACTIONS.EDIT) {
    nextItems = editInventoryItem({
      items,
      ...transaction,
    })
  }

  if (action === INVENTORY_ACTIONS.DELETE) {
    nextItems = deleteInventoryItem({
      items,
      ...transaction,
    })
  }

  return {
    isValid: true,
    errorMessage: '',
    items: nextItems,
    history: [historyRecord, ...history],
    historyRecord,
  }
}
export const findInventoryItemsByPartNumber = ({
  items = [],
  partNumber = '',
}) => {
  const cleanPartNumber = normalizePartNumber(partNumber)

  if (!cleanPartNumber) return []

  return items.filter((item) => {
    return normalizePartNumber(item.partNumber) === cleanPartNumber
  })
}