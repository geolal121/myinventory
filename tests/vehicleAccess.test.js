import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  clearVehicleGasPin,
  loadVehicleGasPin,
  saveVehicleGasPin,
} from '../src/features/inventory/utils/inventoryStorage.js'

test('vehicle gas PIN stays a device-local string and can be forgotten', () => {
  const originalLocalStorage = globalThis.localStorage
  const values = new Map()

  globalThis.localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }

  try {
    assert.equal(saveVehicleGasPin('001234'), true)
    assert.equal(loadVehicleGasPin(), '001234')
    assert.equal(clearVehicleGasPin(), true)
    assert.equal(loadVehicleGasPin(), '')
  } finally {
    if (originalLocalStorage === undefined) {
      delete globalThis.localStorage
    } else {
      globalThis.localStorage = originalLocalStorage
    }
  }
})

test('a six-digit gas PIN is not embedded in the public vehicle window', async () => {
  const source = await readFile(
    new URL(
      '../src/features/inventory/components/modals/VehicleAccessModal.jsx',
      import.meta.url,
    ),
    'utf8',
  )

  assert.doesNotMatch(source, /['"]\d{6}['"]/)
})
