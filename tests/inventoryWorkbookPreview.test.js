import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildWorkbookFillPreview,
  buildWorkbookReviewCsv,
  createWorkbookReviewFileName,
  WORKBOOK_QUANTITY_MODES,
} from '../src/features/inventory/services/inventoryWorkbookService.js'

const inspection = {
  suggestedSheetName: 'Heriberto',
  sheets: [
    {
      name: 'Heriberto',
      rows: [
        {
          rowNumber: 5,
          partNumber: '123-4567-89',
          normalizedPartNumber: '123456789',
          description: 'Pressure valve',
          existingQuantity: '2',
        },
        {
          rowNumber: 6,
          partNumber: 'ABC-1234-56',
          normalizedPartNumber: 'ABC123456',
          description: 'Out-of-stock catalog part',
          existingQuantity: '',
        },
        {
          rowNumber: 7,
          partNumber: 'NEW-0000-01',
          normalizedPartNumber: 'NEW000001',
          description: 'Workbook-only part',
          existingQuantity: '',
        },
        {
          rowNumber: 8,
          partNumber: '123-4567-89',
          normalizedPartNumber: '123456789',
          description: 'Duplicate row',
          existingQuantity: '',
        },
      ],
    },
  ],
}

test('workbook preview identifies every discrepancy category', () => {
  const preview = buildWorkbookFillPreview({
    inspection,
    sheetName: 'Heriberto',
    inventoryItems: [
      {
        partNumber: '123-4567-89',
        officialQuantity: 5,
        noiQuantity: 0,
      },
      {
        partNumber: '999-9999-99',
        officialQuantity: 2,
        noiQuantity: 0,
      },
    ],
    partCatalog: [
      { partNumber: '123-4567-89' },
      { partNumber: 'ABC-1234-56' },
      { partNumber: '999-9999-99' },
    ],
    quantityMode: WORKBOOK_QUANTITY_MODES.TOTAL,
  })

  assert.deepEqual(preview.inventoryPartsNotInSheet, ['999-9999-99'])
  assert.deepEqual(preview.workbookPartsNotInCatalog, ['NEW-0000-01'])
  assert.deepEqual(preview.duplicateSheetParts, [
    { partNumber: '123-4567-89', rowNumbers: [5, 8] },
  ])
  assert.deepEqual(
    preview.changedCountRows.map((row) => row.partNumber),
    ['123-4567-89'],
  )
  assert.equal(preview.reviewIssueCount, 4)
})

test('workbook review CSV includes row-level review notes and missing app parts', () => {
  const preview = buildWorkbookFillPreview({
    inspection,
    sheetName: 'Heriberto',
    inventoryItems: [
      {
        partNumber: '123-4567-89',
        officialQuantity: 5,
        noiQuantity: 0,
      },
      {
        partNumber: '999-9999-99',
        officialQuantity: 2,
        noiQuantity: 0,
      },
    ],
    partCatalog: [
      { partNumber: '123-4567-89' },
      { partNumber: 'ABC-1234-56' },
      { partNumber: '999-9999-99' },
    ],
  })
  const csv = buildWorkbookReviewCsv(preview)

  assert.match(csv, /Existing Workbook Quantity,MyInventory Quantity,Review/)
  assert.match(csv, /Duplicate workbook row/)
  assert.match(csv, /Not in MyInventory catalog/)
  assert.match(csv, /Stocked in MyInventory but missing from workbook/)
  assert.equal(
    createWorkbookReviewFileName('Q3 INVENTORY 2027.xlsx'),
    'Q3 INVENTORY 2027-review.csv',
  )
})
