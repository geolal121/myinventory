import { INVENTORY_ACTIONS } from '../data/inventoryActions.js'

export const INVENTORY_STATUS = {
  OFFICIAL: 'OFFICIAL',
  NOI: 'NOI',
}

export const normalizePartNumber = (partNumber = '') => {
  return partNumber.trim().toUpperCase()
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

export const searchInventory = (items = [], searchTerm = '') => {
  const query = normalizeText(searchTerm).toLowerCase()

  if (!query) return items

  return items.filter((item) => {
    const searchableText = [
      item.partNumber,
      item.location,
      item.notes,
      ...(item.knownMachines || []),
      ...(item.knownCustomers || []),
    ]
      .join(' ')
      .toLowerCase()

    return searchableText.includes(query)
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