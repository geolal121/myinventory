import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildInventoryCsv,
  formatPartNumberInput,
  formatPartNumberSearchInput,
  getPartNumberInputMode,
  getInventorySummary,
  groupInventoryByPartNumber,
  INVENTORY_STATUS,
  moveInventoryQuantity,
  removeRedundantZeroLocationItems,
} from '../src/features/inventory/utils/inventoryHelpers.js'
import {
  applyWorkbookDescriptionsToPartCatalog,
  buildPartCatalog,
  filterPartCatalog,
  upsertPartCatalogEntry,
} from '../src/features/inventory/utils/partCatalogHelpers.js'

test('part entry keeps numeric, alphabetic, mixed, and pasted values as text', () => {
  assert.equal(formatPartNumberInput('12345'), '12345')
  assert.equal(formatPartNumberInput('8472A'), '8472A')
  assert.equal(formatPartNumberInput('12B45'), '12B45')
  assert.equal(formatPartNumberInput('A123'), 'A123')
  assert.equal(formatPartNumberInput('123-ABC'), '123-ABC')
})

test('numeric part searches add standard dashes while letters remain allowed', () => {
  assert.equal(formatPartNumberSearchInput('123456789'), '123-4567-89')
  assert.equal(formatPartNumberSearchInput('123-4567-89'), '123-4567-89')
  assert.equal(formatPartNumberSearchInput('1234567890'), '123-4567-890')
  assert.equal(formatPartNumberSearchInput('A123'), 'A123')
  assert.equal(formatPartNumberSearchInput('123-ABC'), '123-ABC')
  assert.equal(formatPartNumberSearchInput('12b45'), '12B45')
})

test('part number keyboard hint uses number-first iOS input without locking Android', () => {
  assert.equal(
    getPartNumberInputMode({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      platform: 'iPhone',
      maxTouchPoints: 5,
    }),
    'numeric',
  )
  assert.equal(
    getPartNumberInputMode({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    }),
    'numeric',
  )
  assert.equal(
    getPartNumberInputMode({
      userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel)',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    }),
    'text',
  )
  assert.equal(
    getPartNumberInputMode({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      platform: 'MacIntel',
      maxTouchPoints: 0,
    }),
    'text',
  )
})

const createItem = ({
  partNumber = '8472A',
  location = 'Box 1',
  officialQuantity = 0,
  noiQuantity = 0,
  description = '',
} = {}) => ({
  id: `${partNumber}__${location.toUpperCase()}`,
  partNumber,
  location,
  officialQuantity,
  noiQuantity,
  description,
  knownMachines: [],
  knownCustomers: [],
  notes: '',
})

test('a full move removes the source while a partial move keeps both locations', () => {
  const items = [createItem({ officialQuantity: 10 })]
  const partialMove = moveInventoryQuantity({
    items,
    partNumber: '8472A',
    quantity: 3,
    fromLocation: 'Box 1',
    toLocation: 'Box 2',
    inventoryStatus: INVENTORY_STATUS.OFFICIAL,
  })

  assert.equal(partialMove.length, 2)
  assert.equal(
    partialMove.find((item) => item.location === 'Box 1').officialQuantity,
    7,
  )
  assert.equal(
    partialMove.find((item) => item.location === 'Box 2').officialQuantity,
    3,
  )

  const fullMove = moveInventoryQuantity({
    items,
    partNumber: '8472A',
    quantity: 10,
    fromLocation: 'Box 1',
    toLocation: 'Box 2',
    inventoryStatus: INVENTORY_STATUS.OFFICIAL,
  })

  assert.deepEqual(
    fullMove.map((item) => [item.location, item.officialQuantity]),
    [['Box 2', 10]],
  )
})

test('zero inventory records are removed while the catalog preserves out-of-stock parts', () => {
  const rawItems = [
    createItem({
      partNumber: '123-ABC',
      officialQuantity: 0,
      description: 'Pressure valve',
    }),
  ]
  const catalog = buildPartCatalog({ inventoryItems: rawItems })
  const inventoryItems = removeRedundantZeroLocationItems(rawItems)
  const summary = getInventorySummary(inventoryItems, catalog)
  const parts = groupInventoryByPartNumber(inventoryItems, catalog)

  assert.equal(inventoryItems.length, 0)
  assert.equal(summary.totalParts, 1)
  assert.equal(summary.outOfStock, 1)
  assert.equal(parts[0].locations.length, 0)
  assert.equal(parts[0].description, 'Pressure valve')
})

test('catalog descriptions can be edited and workbook imports only fill blanks', () => {
  const initial = upsertPartCatalogEntry({
    catalog: [],
    partNumber: '123-ABC',
    description: 'Manual description',
    replaceDescription: true,
  }).catalog
  const withBlankPart = upsertPartCatalogEntry({
    catalog: initial,
    partNumber: '8472A',
    description: '',
  }).catalog
  const result = applyWorkbookDescriptionsToPartCatalog({
    catalog: withBlankPart,
    descriptions: [
      { partNumber: '123ABC', description: 'Do not overwrite' },
      { partNumber: '8472A', description: 'Workbook description' },
      { partNumber: 'UNLISTED', description: 'Do not create' },
    ],
  })

  assert.equal(
    result.catalog.find((part) => part.id === '123ABC').description,
    'Manual description',
  )
  assert.equal(
    result.catalog.find((part) => part.id === '8472A').description,
    'Workbook description',
  )
  assert.equal(result.catalog.some((part) => part.id === 'UNLISTED'), false)

  const clearedCatalog = upsertPartCatalogEntry({
    catalog: initial,
    partNumber: '123-ABC',
    description: '',
    replaceDescription: true,
  }).catalog
  const rebuiltCatalog = buildPartCatalog({
    catalog: clearedCatalog,
    inventoryItems: [
      createItem({
        partNumber: '123-ABC',
        officialQuantity: 1,
        description: 'Old inventory copy',
      }),
    ],
  })

  assert.equal(rebuiltCatalog[0].description, '')
})

test('part catalog search supports part numbers and description words', () => {
  const catalog = buildPartCatalog({
    catalog: [
      { partNumber: '123-ABC', description: 'Pressure valve assembly' },
      { partNumber: '8472A', description: 'Drive belt' },
    ],
  })

  assert.deepEqual(
    filterPartCatalog({ catalog, searchTerm: '123A' }).map(
      (part) => part.partNumber,
    ),
    ['123-ABC'],
  )
  assert.deepEqual(
    filterPartCatalog({
      catalog,
      searchTerm: 'valve',
      searchByDescription: true,
    }).map((part) => part.partNumber),
    ['123-ABC'],
  )
})

test('CSV export includes catalog-only out-of-stock parts', () => {
  const csv = buildInventoryCsv([], [
    { id: '123ABC', partNumber: '123-ABC', description: 'Pressure valve' },
  ])

  assert.match(csv, /Part Number,Description,Location/)
  assert.match(csv, /123-ABC,Pressure valve,,0,0,0/)
})
