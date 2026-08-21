import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildInventoryHistoryCsv,
  createInventoryHistoryFileName,
  filterInventoryHistory,
  getInventoryHistorySummary,
  HISTORY_DATE_FILTERS,
} from '../src/features/inventory/utils/inventoryHistoryHelpers.js'

const history = [
  {
    id: 'recent-use',
    action: 'USE',
    partNumber: '8472A',
    quantity: 2,
    customer: 'Harbor Foods',
    ticketNumber: 'T-101',
    createdAt: '2026-08-19T12:00:00',
  },
  {
    id: 'recent-move',
    action: 'MOVE',
    partNumber: '123-ABC',
    quantity: 3,
    fromLocation: 'Box 2',
    toLocation: 'Box 8',
    createdAt: '2026-08-10T12:00:00',
  },
  {
    id: 'old-use',
    action: 'USE',
    partNumber: '12345',
    quantity: 1,
    createdAt: '2026-07-01T12:00:00',
  },
]

test('history filters combine action and date without changing mixed part numbers', () => {
  const result = filterInventoryHistory({
    history,
    actionFilter: 'USE',
    dateFilter: HISTORY_DATE_FILTERS.LAST_30_DAYS,
    referenceDate: new Date('2026-08-20T12:00:00'),
  })

  assert.deepEqual(result.map((record) => record.id), ['recent-use'])
  assert.equal(result[0].partNumber, '8472A')
})

test('history search includes customer, ticket, part, and Firestore timestamps', () => {
  const firestoreRecord = {
    id: 'firestore-record',
    action: 'GIVE',
    partNumber: '12B45',
    coworker: 'Maya',
    ticketNumber: 'T-202',
    createdAt: { seconds: Date.parse('2026-08-20T12:00:00Z') / 1000 },
  }
  const allHistory = [...history, firestoreRecord]

  assert.equal(
    filterInventoryHistory({ history: allHistory, searchTerm: 'harbor' })[0].id,
    'recent-use',
  )
  assert.equal(
    filterInventoryHistory({ history: allHistory, searchTerm: 'T-202' })[0].id,
    'firestore-record',
  )
  assert.equal(
    filterInventoryHistory({ history: allHistory, searchTerm: '12B45' })[0]
      .partNumber,
    '12B45',
  )
})

test('history summary counts shown records, unique parts, and action types', () => {
  assert.deepEqual(getInventoryHistorySummary(history), {
    recordCount: 3,
    uniqueParts: 3,
    actionTypes: 2,
  })
})

test('history CSV uses friendly labels, escapes values, and keeps strings unchanged', () => {
  const csv = buildInventoryHistoryCsv([
    {
      action: 'USE',
      partNumber: '123-ABC',
      quantity: '02',
      notes: 'Needs, review',
      createdAt: '2026-08-20T12:00:00',
    },
  ])

  assert.match(csv, /Use Part,123-ABC,02/)
  assert.match(csv, /"Needs, review"/)
  assert.equal(
    createInventoryHistoryFileName(new Date('2026-08-20T12:00:00Z')),
    'myinventory-history-2026-08-20.csv',
  )
})
