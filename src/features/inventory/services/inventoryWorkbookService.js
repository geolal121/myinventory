import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

const WORKBOOK_PATH = 'xl/workbook.xml'
const WORKBOOK_RELATIONSHIPS_PATH = 'xl/_rels/workbook.xml.rels'
const SHARED_STRINGS_PATH = 'xl/sharedStrings.xml'

const PART_HEADERS = new Set([
  'part',
  'part#',
  'partno',
  'partnum',
  'partnumber',
])
const QUANTITY_HEADERS = new Set([
  'count',
  'onhand',
  'onhandquantity',
  'physicalcount',
  'qty',
  'quantity',
])
const LOCATION_HEADERS = new Set(['location', 'storagelocation'])

export const WORKBOOK_QUANTITY_MODES = {
  TOTAL: 'TOTAL',
  OFFICIAL: 'OFFICIAL',
  NOI: 'NOI',
}

const decodeXml = (value = '') => {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
}

const getAttribute = (attributes = '', attributeName) => {
  const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = attributes.match(
    new RegExp(`(?:^|\\s)${escapedName}="([^"]*)"`),
  )

  return match ? decodeXml(match[1]) : ''
}

const normalizeHeader = (value = '') => {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9#]/g, '')
}

export const normalizeWorkbookPartNumber = (value = '') => {
  return String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

const getColumnFromReference = (reference = '') => {
  return reference.match(/^[A-Z]+/)?.[0] || ''
}

const getColumnNumber = (column = '') => {
  return column.split('').reduce((value, character) => {
    return value * 26 + character.charCodeAt(0) - 64
  }, 0)
}

const readXmlEntry = (files, path, isRequired = true) => {
  const entry = files[path]

  if (!entry) {
    if (!isRequired) return ''
    throw new Error(`The workbook is missing ${path}.`)
  }

  return strFromU8(entry)
}

const parseSharedStrings = (xml = '') => {
  if (!xml) return []

  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(
    ([, sharedString]) =>
      decodeXml(
        [...sharedString.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
          .map(([, text]) => text)
          .join(''),
      ),
  )
}

const parseCellValue = ({ attributes, content = '', sharedStrings }) => {
  const type = getAttribute(attributes, 't')
  const rawValue = content.match(/<v>([\s\S]*?)<\/v>/)?.[1]
  const inlineValue = [
    ...content.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g),
  ]
    .map(([, text]) => text)
    .join('')

  if (type === 's' && rawValue !== undefined) {
    return sharedStrings[Number(rawValue)] || ''
  }

  if (type === 'inlineStr') {
    return decodeXml(inlineValue)
  }

  return rawValue === undefined ? '' : decodeXml(rawValue)
}

const parseSheetRows = (sheetXml, sharedStrings) => {
  const rows = []

  for (const rowMatch of sheetXml.matchAll(
    /<row\b([^>]*)>([\s\S]*?)<\/row>/g,
  )) {
    const rowNumber = Number(getAttribute(rowMatch[1], 'r'))
    const cells = new Map()

    for (const cellMatch of rowMatch[2].matchAll(
      /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const attributes = cellMatch[1]
      const reference = getAttribute(attributes, 'r')
      const column = getColumnFromReference(reference)

      if (!column) continue

      cells.set(column, {
        reference,
        styleId: getAttribute(attributes, 's'),
        value: parseCellValue({
          attributes,
          content: cellMatch[2] || '',
          sharedStrings,
        }),
      })
    }

    if (rowNumber && cells.size > 0) {
      rows.push({ rowNumber, cells })
    }
  }

  return rows
}

const findHeaderColumn = (cells, knownHeaders) => {
  for (const [column, cell] of cells) {
    if (knownHeaders.has(normalizeHeader(cell.value))) {
      return column
    }
  }

  return ''
}

const inspectSheet = ({ name, path, sheetXml, sharedStrings }) => {
  const parsedRows = parseSheetRows(sheetXml, sharedStrings)
  const headerRow = parsedRows.slice(0, 25).find((row) => {
    return (
      findHeaderColumn(row.cells, PART_HEADERS) &&
      findHeaderColumn(row.cells, QUANTITY_HEADERS)
    )
  })

  if (!headerRow) return null

  const partColumn = findHeaderColumn(headerRow.cells, PART_HEADERS)
  const quantityColumn = findHeaderColumn(headerRow.cells, QUANTITY_HEADERS)
  const locationColumn = findHeaderColumn(headerRow.cells, LOCATION_HEADERS)
  const rows = parsedRows
    .filter((row) => row.rowNumber > headerRow.rowNumber)
    .map((row) => {
      const partCell = row.cells.get(partColumn)
      const quantityCell = row.cells.get(quantityColumn)

      return {
        rowNumber: row.rowNumber,
        partNumber: String(partCell?.value || '').trim(),
        normalizedPartNumber: normalizeWorkbookPartNumber(partCell?.value),
        existingQuantity: String(quantityCell?.value || '').trim(),
        location: String(row.cells.get(locationColumn)?.value || '').trim(),
        styleId: quantityCell?.styleId || partCell?.styleId || '',
      }
    })
    .filter((row) => row.normalizedPartNumber)

  if (rows.length === 0) return null

  return {
    name,
    path,
    headerRowNumber: headerRow.rowNumber,
    partColumn,
    quantityColumn,
    locationColumn,
    rowCount: rows.length,
    filledRowCount: rows.filter((row) => row.existingQuantity !== '').length,
    rows,
  }
}

const normalizeRelationshipTarget = (target = '') => {
  const cleanTarget = target.replace(/^\//, '')

  if (cleanTarget.startsWith('xl/')) return cleanTarget
  if (cleanTarget.startsWith('worksheets/')) return `xl/${cleanTarget}`

  return `xl/${cleanTarget.replace(/^\.\//, '')}`
}

const openWorkbook = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer)
  const signature = strFromU8(bytes.slice(0, 16))

  if (signature.includes('MSMAMARPCRYPT')) {
    throw new Error(
      'This Excel file is protected by Microsoft Intune. Save an approved unprotected .xlsx copy in Excel, then upload that copy.',
    )
  }

  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error('Choose a standard, unprotected .xlsx Excel workbook.')
  }

  let files

  try {
    files = unzipSync(bytes)
  } catch {
    throw new Error('MyInventory could not open this Excel workbook.')
  }

  const workbookXml = readXmlEntry(files, WORKBOOK_PATH)
  const relationshipsXml = readXmlEntry(
    files,
    WORKBOOK_RELATIONSHIPS_PATH,
  )
  const sharedStrings = parseSharedStrings(
    readXmlEntry(files, SHARED_STRINGS_PATH, false),
  )
  const relationships = new Map()

  for (const relationship of relationshipsXml.matchAll(
    /<Relationship\b([^>]*)\/>/g,
  )) {
    const id = getAttribute(relationship[1], 'Id')
    const target = getAttribute(relationship[1], 'Target')

    if (id && target) {
      relationships.set(id, normalizeRelationshipTarget(target))
    }
  }

  const sheets = []

  for (const sheet of workbookXml.matchAll(/<sheet\b([^>]*)\/>/g)) {
    const name = getAttribute(sheet[1], 'name')
    const relationshipId = getAttribute(sheet[1], 'r:id')
    const path = relationships.get(relationshipId)

    if (name && path && files[path]) {
      sheets.push({ name, path })
    }
  }

  const activeSheetIndex = Number(
    workbookXml.match(/<workbookView\b[^>]*\bactiveTab="(\d+)"/)?.[1] || 0,
  )

  return { files, sharedStrings, sheets, activeSheetIndex }
}

export const inspectInventoryWorkbook = (arrayBuffer) => {
  const workbook = openWorkbook(arrayBuffer)
  const countSheets = workbook.sheets
    .map((sheet) =>
      inspectSheet({
        ...sheet,
        sheetXml: readXmlEntry(workbook.files, sheet.path),
        sharedStrings: workbook.sharedStrings,
      }),
    )
    .filter(Boolean)

  if (countSheets.length === 0) {
    throw new Error(
      'No worksheet with Part Number and Physical Count columns was found.',
    )
  }

  const activeSheetName = workbook.sheets[workbook.activeSheetIndex]?.name
  const suggestedSheet =
    countSheets.find((sheet) => sheet.name === activeSheetName) ||
    countSheets.find((sheet) => sheet.filledRowCount === 0) ||
    countSheets[0]

  return {
    sheets: countSheets,
    suggestedSheetName: suggestedSheet.name,
  }
}

const aggregateInventoryByPart = (items = []) => {
  const parts = new Map()

  items.forEach((item) => {
    const normalizedPartNumber = normalizeWorkbookPartNumber(item.partNumber)

    if (!normalizedPartNumber) return

    const existingPart = parts.get(normalizedPartNumber) || {
      partNumber: item.partNumber,
      officialQuantity: 0,
      noiQuantity: 0,
      totalQuantity: 0,
    }
    const officialQuantity = Number(item.officialQuantity || 0)
    const noiQuantity = Number(item.noiQuantity || 0)

    existingPart.officialQuantity += officialQuantity
    existingPart.noiQuantity += noiQuantity
    existingPart.totalQuantity += officialQuantity + noiQuantity
    parts.set(normalizedPartNumber, existingPart)
  })

  return parts
}

const getQuantityForMode = (part, quantityMode) => {
  if (!part) return 0
  if (quantityMode === WORKBOOK_QUANTITY_MODES.OFFICIAL) {
    return part.officialQuantity
  }
  if (quantityMode === WORKBOOK_QUANTITY_MODES.NOI) {
    return part.noiQuantity
  }

  return part.totalQuantity
}

export const buildWorkbookFillPreview = ({
  inspection,
  sheetName,
  inventoryItems = [],
  quantityMode = WORKBOOK_QUANTITY_MODES.TOTAL,
}) => {
  const sheet = inspection.sheets.find((candidate) => candidate.name === sheetName)

  if (!sheet) {
    throw new Error('Select a count worksheet before downloading.')
  }

  const inventoryByPart = aggregateInventoryByPart(inventoryItems)
  const sheetPartNumbers = new Set(
    sheet.rows.map((row) => row.normalizedPartNumber),
  )
  const matchedPartNumbers = new Set()
  let totalQuantity = 0
  let zeroCountRows = 0

  const rows = sheet.rows.map((row) => {
    const inventoryPart = inventoryByPart.get(row.normalizedPartNumber)
    const quantity = getQuantityForMode(inventoryPart, quantityMode)

    if (inventoryPart) matchedPartNumbers.add(row.normalizedPartNumber)
    if (quantity === 0) zeroCountRows += 1
    totalQuantity += quantity

    return { ...row, quantity }
  })

  const inventoryPartsNotInSheet = Array.from(inventoryByPart.entries())
    .filter(
      ([normalizedPartNumber, part]) =>
        !sheetPartNumbers.has(normalizedPartNumber) &&
        getQuantityForMode(part, quantityMode) > 0,
    )
    .map(([, part]) => part.partNumber)
    .sort((first, second) =>
      first.localeCompare(second, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    )

  return {
    sheet,
    rows,
    totalRows: rows.length,
    matchedParts: matchedPartNumbers.size,
    zeroCountRows,
    totalQuantity,
    inventoryPartsNotInSheet,
  }
}

const replaceCellValue = ({
  sheetXml,
  rowNumber,
  column,
  quantity,
  styleId,
}) => {
  const rowPattern = new RegExp(
    `(<row\\b[^>]*\\br="${rowNumber}"[^>]*>)([\\s\\S]*?)(<\\/row>)`,
  )
  const rowMatch = sheetXml.match(rowPattern)

  if (!rowMatch) return sheetXml

  const reference = `${column}${rowNumber}`
  const cellPattern = new RegExp(
    `<c\\b([^>]*\\br="${reference}"[^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/c>)`,
  )
  const existingCell = rowMatch[2].match(cellPattern)
  let nextRowContent = rowMatch[2]

  if (existingCell) {
    const cleanAttributes = existingCell[1].replace(/\s+t="[^"]*"/g, '')
    const nextCell = `<c${cleanAttributes}><v>${quantity}</v></c>`

    nextRowContent = nextRowContent.replace(cellPattern, nextCell)
  } else {
    const styleAttribute = styleId ? ` s="${styleId}"` : ''
    const nextCell = `<c r="${reference}"${styleAttribute}><v>${quantity}</v></c>`
    const targetColumnNumber = getColumnNumber(column)
    let insertAt = nextRowContent.length

    for (const cellMatch of nextRowContent.matchAll(
      /<c\b([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g,
    )) {
      const cellReference = getAttribute(cellMatch[1], 'r')
      const cellColumnNumber = getColumnNumber(
        getColumnFromReference(cellReference),
      )

      if (cellColumnNumber > targetColumnNumber) {
        insertAt = cellMatch.index
        break
      }
    }

    nextRowContent = `${nextRowContent.slice(0, insertAt)}${nextCell}${nextRowContent.slice(insertAt)}`
  }

  return sheetXml.replace(
    rowPattern,
    `${rowMatch[1]}${nextRowContent}${rowMatch[3]}`,
  )
}

export const fillInventoryWorkbook = ({
  arrayBuffer,
  inspection,
  sheetName,
  inventoryItems = [],
  quantityMode = WORKBOOK_QUANTITY_MODES.TOTAL,
}) => {
  const preview = buildWorkbookFillPreview({
    inspection,
    sheetName,
    inventoryItems,
    quantityMode,
  })
  const workbook = openWorkbook(arrayBuffer)
  let sheetXml = readXmlEntry(workbook.files, preview.sheet.path)

  preview.rows.forEach((row) => {
    sheetXml = replaceCellValue({
      sheetXml,
      rowNumber: row.rowNumber,
      column: preview.sheet.quantityColumn,
      quantity: row.quantity,
      styleId: row.styleId,
    })
  })

  workbook.files[preview.sheet.path] = strToU8(sheetXml)

  return {
    bytes: zipSync(workbook.files, { level: 6 }),
    preview,
  }
}

export const createFilledWorkbookFileName = (fileName = 'inventory.xlsx') => {
  const cleanFileName = fileName.trim() || 'inventory.xlsx'

  return /\.xlsx$/i.test(cleanFileName)
    ? cleanFileName.replace(/\.xlsx$/i, '-filled.xlsx')
    : `${cleanFileName}-filled.xlsx`
}
