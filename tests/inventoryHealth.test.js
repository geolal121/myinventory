import assert from 'node:assert/strict'
import test from 'node:test'

import { analyzeInventoryHealth } from '../src/features/inventory/utils/inventoryHealth.js'

const createItem = ({
  id = '123456789__BOX 1',
  partNumber = '123-4567-89',
  location = 'Box 1',
  officialQuantity = 1,
  noiQuantity = 0,
} = {}) => ({
  id,
  partNumber,
  location,
  officialQuantity,
  noiQuantity,
})

test('inventory health reports an all-clear standard inventory', () => {
  const health = analyzeInventoryHealth({
    inventoryItems: [createItem()],
    partCatalog: [
      {
        id: '123456789',
        partNumber: '123-4567-89',
        description: 'Pressure valve',
      },
    ],
    savedLocations: ['Box 1'],
  })

  assert.equal(health.status, 'ALL_CLEAR')
  assert.equal(health.fixCount, 0)
  assert.equal(health.suggestionCount, 0)
})

test('inventory health separates real data problems from cleanup suggestions', () => {
  const duplicate = createItem({ id: 'duplicate' })
  const health = analyzeInventoryHealth({
    inventoryItems: [
      createItem(),
      duplicate,
      createItem({
        id: '222__BOX 2',
        partNumber: 'A123',
        location: 'Box 2',
        officialQuantity: -1,
      }),
    ],
    partCatalog: [
      { id: '123456789', partNumber: '123-4567-89', description: '' },
      { id: 'A123', partNumber: 'A123', description: 'Valid alternate style' },
    ],
    savedLocations: ['Box 1', 'Box 2', 'Box 3'],
  })

  assert.equal(health.status, 'FIX_NEEDED')
  assert.equal(health.duplicateRecords.length, 1)
  assert.equal(health.quantityIssues.length, 1)
  assert.deepEqual(health.emptyLocations, ['Box 2', 'Box 3'])
  assert.deepEqual(
    health.missingDescriptions.map((part) => part.partNumber),
    ['123-4567-89'],
  )
  assert.deepEqual(
    health.alternativePartFormats.map((part) => part.partNumber),
    ['A123'],
  )
})

test('inventory health compares stocked parts with the latest workbook', () => {
  const health = analyzeInventoryHealth({
    inventoryItems: [
      createItem(),
      createItem({
        id: '987654321__BOX 2',
        partNumber: '987-6543-21',
        location: 'Box 2',
      }),
    ],
    partCatalog: [
      {
        id: '123456789',
        partNumber: '123-4567-89',
        description: 'Pressure valve',
      },
      {
        id: '987654321',
        partNumber: '987-6543-21',
        description: 'Drive belt',
      },
    ],
    savedLocations: ['Box 1', 'Box 2'],
    workbookCheck: {
      fileName: 'Q3 INVENTORY.xlsx',
      sheetName: 'Heriberto',
      partNumbers: ['123-4567-89'],
    },
  })

  assert.deepEqual(
    health.inventoryPartsNotInWorkbook.map((part) => part.partNumber),
    ['987-6543-21'],
  )
  assert.equal(health.status, 'GOOD_WITH_SUGGESTIONS')
})
