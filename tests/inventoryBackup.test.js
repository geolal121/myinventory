import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createInventoryBackup,
  createInventoryBackupFileName,
  mergeInventoryBackup,
  parseInventoryBackup,
} from '../src/features/inventory/utils/inventoryBackup.js'

const emptyInventory = () => ({
  inventoryItems: [],
  partCatalog: [],
  inventoryHistory: [],
  savedLocations: [],
  removedLocations: [],
  archivedLocations: [],
})

test('inventory backups preserve every supported data group', () => {
  const backup = createInventoryBackup({
    ...emptyInventory(),
    inventoryItems: [{ id: '123__BOX 1', partNumber: '123', location: 'Box 1' }],
    exportedAt: '2026-08-20T12:00:00.000Z',
  })
  const parsed = parseInventoryBackup(JSON.stringify(backup))

  assert.equal(parsed.inventoryItems[0].partNumber, '123')
  assert.equal(createInventoryBackupFileName(parsed.exportedAt), 'myinventory-backup-2026-08-20.json')
})

test('backup parser rejects regular JSON files and incomplete backups', () => {
  assert.throws(
    () => parseInventoryBackup('{"hello":"world"}'),
    /created by MyInventory/,
  )
  assert.throws(
    () =>
      parseInventoryBackup(
        JSON.stringify({
          format: 'myinventory-backup',
          version: 1,
          inventoryItems: [],
        }),
      ),
    /incomplete or damaged/,
  )
})

test('safe restore adds missing data while keeping current records and descriptions', () => {
  const backup = createInventoryBackup({
    ...emptyInventory(),
    inventoryItems: [
      {
        id: '222__BOX 2',
        partNumber: '222',
        location: 'Box 2',
        officialQuantity: 3,
        noiQuantity: 0,
      },
    ],
    partCatalog: [
      { id: '111', partNumber: '111', description: 'Backup description' },
      { id: '222', partNumber: '222', description: 'Restored part' },
    ],
    savedLocations: ['Box 2'],
  })
  const merged = mergeInventoryBackup({
    current: {
      ...emptyInventory(),
      inventoryItems: [
        {
          id: '111__BOX 1',
          partNumber: '111',
          location: 'Box 1',
          officialQuantity: 5,
          noiQuantity: 0,
        },
      ],
      partCatalog: [
        { id: '111', partNumber: '111', description: 'Current description' },
      ],
      savedLocations: ['Box 1'],
      removedLocations: ['Box 2'],
      archivedLocations: [
        { location: 'Box 2', items: [], deletedAt: '2026-01-01' },
      ],
    },
    backup,
  })

  assert.deepEqual(
    merged.inventoryItems.map((item) => item.partNumber).sort(),
    ['111', '222'],
  )
  assert.equal(
    merged.partCatalog.find((part) => part.id === '111').description,
    'Current description',
  )
  assert.equal(
    merged.partCatalog.find((part) => part.id === '222').description,
    'Restored part',
  )
  assert.deepEqual(merged.savedLocations, ['Box 1', 'Box 2'])
  assert.deepEqual(merged.removedLocations, [])
  assert.deepEqual(merged.archivedLocations, [])
})
