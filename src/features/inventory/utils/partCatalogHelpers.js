import {
  normalizeInventoryDescription,
  normalizePartNumber,
} from './inventoryHelpers.js'

export const normalizePartCatalogId = (partNumber = '') => {
  return normalizePartNumber(String(partNumber)).replace(/[^A-Z0-9]/g, '')
}

const sortPartCatalog = (catalog = []) => {
  return [...catalog].sort((firstPart, secondPart) =>
    firstPart.partNumber.localeCompare(secondPart.partNumber, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  )
}

export const buildPartCatalog = ({
  catalog = [],
  inventoryItems = [],
} = {}) => {
  const catalogById = new Map()
  const savedCatalogIds = new Set(
    catalog.map((part) => normalizePartCatalogId(part.partNumber)),
  )

  const mergePart = ({ partNumber = '', description = '', ...metadata }) => {
    const id = normalizePartCatalogId(partNumber)

    if (!id) return

    const existingPart = catalogById.get(id)
    const cleanPartNumber = normalizePartNumber(String(partNumber))
    const cleanDescription = normalizeInventoryDescription(description)

    catalogById.set(id, {
      ...metadata,
      ...existingPart,
      id,
      partNumber: existingPart?.partNumber || cleanPartNumber,
      description:
        existingPart && savedCatalogIds.has(id)
          ? normalizeInventoryDescription(existingPart.description)
          : existingPart?.description || cleanDescription,
    })
  }

  catalog.forEach(mergePart)
  inventoryItems.forEach(mergePart)

  return sortPartCatalog(Array.from(catalogById.values()))
}

export const upsertPartCatalogEntry = ({
  catalog = [],
  partNumber = '',
  description = '',
  replaceDescription = false,
} = {}) => {
  const id = normalizePartCatalogId(partNumber)

  if (!id) {
    return { catalog, entry: null, didChange: false }
  }

  const cleanPartNumber = normalizePartNumber(String(partNumber))
  const cleanDescription = normalizeInventoryDescription(description)
  const existingPart = catalog.find((part) => part.id === id)
  const nextDescription = replaceDescription
    ? cleanDescription
    : existingPart?.description || cleanDescription
  const nextEntry = {
    ...existingPart,
    id,
    partNumber: cleanPartNumber || existingPart?.partNumber || '',
    description: nextDescription,
  }
  const didChange =
    !existingPart ||
    existingPart.partNumber !== nextEntry.partNumber ||
    existingPart.description !== nextEntry.description

  if (!didChange) {
    return { catalog, entry: existingPart, didChange: false }
  }

  return {
    catalog: sortPartCatalog([
      ...catalog.filter((part) => part.id !== id),
      nextEntry,
    ]),
    entry: nextEntry,
    didChange: true,
  }
}

export const applyWorkbookDescriptionsToPartCatalog = ({
  catalog = [],
  inventoryItems = [],
  descriptions = [],
} = {}) => {
  let nextCatalog = buildPartCatalog({ catalog, inventoryItems })
  const updatedEntries = []

  descriptions.forEach((workbookPart) => {
    const workbookPartId = normalizePartCatalogId(
      workbookPart.partNumber || workbookPart.normalizedPartNumber || '',
    )

    if (!nextCatalog.some((part) => part.id === workbookPartId)) return

    const result = upsertPartCatalogEntry({
      catalog: nextCatalog,
      partNumber:
        workbookPart.partNumber || workbookPart.normalizedPartNumber || '',
      description: workbookPart.description,
      replaceDescription: false,
    })

    nextCatalog = result.catalog

    if (result.didChange && result.entry?.description) {
      updatedEntries.push(result.entry)
    }
  })

  return {
    catalog: nextCatalog,
    updatedEntries,
    updatedPartNumbers: updatedEntries.map((entry) => entry.partNumber),
  }
}

export const enrichInventoryItemsWithCatalog = ({
  items = [],
  catalog = [],
} = {}) => {
  const catalogById = new Map(catalog.map((part) => [part.id, part]))

  return items.map((item) => {
    const catalogPart = catalogById.get(normalizePartCatalogId(item.partNumber))
    const description = catalogPart
      ? catalogPart.description
      : normalizeInventoryDescription(item.description)

    return item.description === description
      ? item
      : { ...item, description: description || '' }
  })
}

export const filterPartCatalog = ({
  catalog = [],
  searchTerm = '',
  searchByDescription = false,
} = {}) => {
  const query = String(searchTerm).trim().toLowerCase()

  if (!query) return catalog

  if (searchByDescription) {
    return catalog.filter((part) =>
      String(part.description || '').toLowerCase().includes(query),
    )
  }

  const normalizedQuery = normalizePartCatalogId(searchTerm).toLowerCase()

  return catalog.filter((part) =>
    part.id.toLowerCase().includes(normalizedQuery),
  )
}
