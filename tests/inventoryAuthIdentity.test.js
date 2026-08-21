import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  buildInventoryLoginEmail,
  INVENTORY_OWNER,
  isInventoryOwnerIdentity,
  normalizeBranchKey,
  normalizeTechnicianId,
} from '../src/features/auth/utils/inventoryAuthIdentity.js'

test('Los Angeles branch names normalize to one secure login identity', () => {
  assert.equal(normalizeBranchKey('LOS ANGELES BRANCH'), 'los-angeles')
  assert.equal(normalizeBranchKey(' Los Angeles '), 'los-angeles')
  assert.equal(normalizeTechnicianId('72-485'), '72485')
  assert.equal(
    buildInventoryLoginEmail({
      branch: 'LOS ANGELES BRANCH',
      technicianId: '72485',
    }),
    INVENTORY_OWNER.email,
  )
})

test('only the configured branch and technician identity is accepted', () => {
  assert.equal(
    isInventoryOwnerIdentity({
      branch: 'Los Angeles',
      technicianId: '72485',
    }),
    true,
  )
  assert.equal(
    isInventoryOwnerIdentity({ branch: 'San Diego', technicianId: '72485' }),
    false,
  )
  assert.equal(
    isInventoryOwnerIdentity({
      branch: 'Los Angeles',
      technicianId: '10000',
    }),
    false,
  )
})

test('Firestore rules require the configured authenticated owner', async () => {
  const rules = await readFile(
    new URL('../firestore.rules', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(rules, /allow\s+read,\s*write:\s*if\s+true/)
  assert.match(rules, /request\.auth\s*!=\s*null/)
  assert.match(rules, new RegExp(INVENTORY_OWNER.email.replace('.', '\\.')))
})
