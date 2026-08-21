import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createServiceWorkerSource } from '../src/pwa/createServiceWorkerSource.js'

test('offline service worker precaches the app shell and generated assets', () => {
  const source = createServiceWorkerSource([
    '/assets/index-ABC.js',
    '/assets/index-XYZ.css',
  ])

  assert.match(source, /myinventory-shell-/)
  assert.match(source, /\/manifest\.webmanifest/)
  assert.match(source, /\/assets\/index-ABC\.js/)
  assert.match(source, /request\.mode === 'navigate'/)
  assert.match(source, /requestUrl\.origin !== self\.location\.origin/)
})

test('web app manifest supports standalone installation', async () => {
  const manifestText = await readFile(
    new URL('../public/manifest.webmanifest', import.meta.url),
    'utf8',
  )
  const manifest = JSON.parse(manifestText)

  assert.equal(manifest.id, '/')
  assert.equal(manifest.scope, '/')
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.icons.some((icon) => icon.sizes === '192x192'), true)
  assert.equal(manifest.icons.some((icon) => icon.sizes === '512x512'), true)
})
