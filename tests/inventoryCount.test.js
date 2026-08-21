import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyInventoryCount,
  buildInventoryCountCsv,
  createInventoryCountFileName,
  reviewInventoryCount,
} from '../src/features/inventory/utils/inventoryCountHelpers.js'
import {
  deleteInventoryCountDraft,
  loadInventoryCountDrafts,
  saveInventoryCountDraft,
} from '../src/features/inventory/utils/inventoryStorage.js'

const inventoryItems = [
  {
    id: 'A123__BOX 1',
    partNumber: 'A123',
    description: 'Pressure valve',
    location: 'Box 1',
    officialQuantity: 5,
    noiQuantity: 1,
  },
  {
    id: '200__BOX 1',
    partNumber: '200',
    description: 'Fuse, slow blow',
    location: 'Box 1',
    officialQuantity: 2,
    noiQuantity: 0,
  },
  {
    id: 'A123__BOX 2',
    partNumber: 'A123',
    description: 'Pressure valve',
    location: 'Box 2',
    officialQuantity: 9,
    noiQuantity: 0,
  },
]

const completedCounts = {
  'A123__BOX 1': { officialQuantity: '3', noiQuantity: '1' },
  '200__BOX 1': { officialQuantity: '0', noiQuantity: '0' },
}

test('guided count progress treats zero as a valid completed quantity', () => {
  const review = reviewInventoryCount({
    items: inventoryItems,
    location: 'box 1',
    counts: completedCounts,
  })

  assert.equal(review.totalParts, 2)
  assert.equal(review.countedParts, 2)
  assert.equal(review.remainingParts, 0)
  assert.equal(review.discrepancyCount, 2)
  assert.equal(review.previousTotalQuantity, 8)
  assert.equal(review.countedTotalQuantity, 4)
  assert.equal(review.isComplete, true)
})

test('guided count requires whole nonnegative values for every part', () => {
  const partialReview = reviewInventoryCount({
    items: inventoryItems,
    location: 'Box 1',
    counts: {
      'A123__BOX 1': { officialQuantity: '2.5', noiQuantity: '1' },
      '200__BOX 1': { officialQuantity: '2', noiQuantity: '' },
    },
  })
  const result = applyInventoryCount({
    items: inventoryItems,
    location: 'Box 1',
    counts: {},
  })

  assert.equal(partialReview.isComplete, false)
  assert.equal(partialReview.remainingParts, 2)
  assert.equal(result.isValid, false)
  assert.match(result.errorMessage, /remaining 2 parts/)
})

test('saving a count updates differences, removes zero locations, and preserves other boxes', () => {
  const result = applyInventoryCount({
    items: inventoryItems,
    history: [],
    location: 'Box 1',
    counts: completedCounts,
    now: new Date('2026-08-20T12:00:00.000Z'),
    createId: () => 'count-history-1',
  })

  assert.equal(result.isValid, true)
  assert.deepEqual(result.deletedItemIds, ['200__BOX 1'])
  assert.equal(result.changedItems.length, 1)
  assert.equal(
    result.items.find((item) => item.id === 'A123__BOX 1').officialQuantity,
    3,
  )
  assert.equal(result.items.some((item) => item.id === '200__BOX 1'), false)
  assert.equal(
    result.items.find((item) => item.id === 'A123__BOX 2').officialQuantity,
    9,
  )
})

test('each completed location count creates one detailed audit record', () => {
  const result = applyInventoryCount({
    items: inventoryItems,
    history: [{ id: 'older-record' }],
    location: 'Box 1',
    counts: completedCounts,
    now: new Date('2026-08-20T12:00:00.000Z'),
    createId: () => 'count-history-1',
  })

  assert.equal(result.historyRecord.action, 'COUNT')
  assert.equal(result.historyRecord.location, 'Box 1')
  assert.equal(result.historyRecord.countedPartCount, 2)
  assert.equal(result.historyRecord.discrepancyCount, 2)
  assert.equal(result.historyRecord.adjustments.length, 2)
  assert.deepEqual(
    result.history.map((record) => record.id),
    ['count-history-1', 'older-record'],
  )
})

test('count reports preserve descriptions and create location-specific filenames', () => {
  const review = reviewInventoryCount({
    items: inventoryItems,
    location: 'Box 1',
    counts: completedCounts,
  })
  const csv = buildInventoryCountCsv({
    location: 'Box 1',
    completedAt: new Date('2026-08-20T12:00:00.000Z'),
    review,
  })

  assert.match(csv, /A123,Pressure valve,5,3,1,1,Yes/)
  assert.match(csv, /200,"Fuse, slow blow",2,0,0,0,Yes/)
  assert.equal(
    createInventoryCountFileName({
      location: 'Box 1',
      date: new Date('2026-08-20T12:00:00.000Z'),
    }),
    'inventory-count-box-1-2026-08-20.csv',
  )
})

test('unfinished counts save by location and can be resumed or discarded', () => {
  const storedValues = new Map()
  const originalLocalStorage = globalThis.localStorage

  globalThis.localStorage = {
    getItem: (key) => storedValues.get(key) ?? null,
    setItem: (key, value) => storedValues.set(key, value),
    removeItem: (key) => storedValues.delete(key),
  }

  try {
    saveInventoryCountDraft({
      location: 'Box 1',
      counts: {
        'A123__BOX 1': { officialQuantity: '3', noiQuantity: '1' },
      },
      step: 'COUNT',
      savedAt: '2026-08-20T12:00:00.000Z',
    })
    saveInventoryCountDraft({
      location: 'Box 2',
      counts: {
        'A123__BOX 2': { officialQuantity: '9', noiQuantity: '0' },
      },
      step: 'REVIEW',
      savedAt: '2026-08-20T13:00:00.000Z',
    })

    const savedDrafts = loadInventoryCountDrafts()

    assert.deepEqual(
      savedDrafts.map((draft) => draft.location),
      ['Box 2', 'Box 1'],
    )
    assert.equal(
      savedDrafts[1].counts['A123__BOX 1'].officialQuantity,
      '3',
    )
    assert.equal(savedDrafts[0].step, 'REVIEW')

    deleteInventoryCountDraft('box 2')

    assert.deepEqual(
      loadInventoryCountDrafts().map((draft) => draft.location),
      ['Box 1'],
    )
  } finally {
    if (originalLocalStorage === undefined) {
      delete globalThis.localStorage
    } else {
      globalThis.localStorage = originalLocalStorage
    }
  }
})
