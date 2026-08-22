import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const readProjectFile = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8')

test('inventory workbench has distinct native-style phone and desktop navigation', async () => {
  const [component, styles, colors] = await Promise.all([
    readProjectFile('src/features/inventory/pages/InventoryPage.jsx'),
    readProjectFile('src/features/inventory/styles/inventory-rebuild.css'),
    readProjectFile('src/shared/tokens/colors.css'),
  ])

  assert.match(component, /stock-app__rail/)
  assert.match(component, /stock-app__mobile-nav/)
  assert.match(component, /MyInventory \/ 72485/)
  assert.match(
    styles,
    /\.stock-app \.stock-app__mobile-nav\s*\{[\s\S]*?position: fixed;[\s\S]*?bottom: 0;/,
  )
  assert.match(
    styles,
    /@media \(min-width: 900px\) and \(orientation: landscape\), \(min-width: 1120px\)[\s\S]*?grid-template-columns: 17rem minmax\(0, 1fr\)/,
  )
  assert.match(colors, /--color-brand-deep:\s*#162a3e;/)
  assert.match(colors, /--color-utility:\s*#dbe7f3;/)
  assert.match(colors, /--gradient-page:\s*var\(--color-background\);/)
})

test('inventory workbench protects narrow phones and keeps desktop location rows aligned', async () => {
  const styles = await readProjectFile(
    'src/features/inventory/styles/inventory-rebuild.css',
  )

  assert.match(
    styles,
    /@media \(max-width: 420px\)[\s\S]*?\.stock-app \.stock-app__finder,[\s\S]*?margin-right: var\(--spacing-3\);[\s\S]*?margin-left: var\(--spacing-3\);/,
  )
  assert.match(
    styles,
    /@media \(max-width: 420px\)[\s\S]*?\.inventory-page__section-heading \.ui-button\s*\{\s*width: 100%;/,
  )
  assert.match(
    styles,
    /@media \(min-width: 900px\) and \(orientation: landscape\), \(min-width: 1120px\)[\s\S]*?\.inventory-page__location-card-stats\s*\{[\s\S]*?grid-column: 2;[\s\S]*?border-top: 0;/,
  )
})

test('tablet layout uses an inline navigation bar and compact action row', async () => {
  const styles = await readProjectFile(
    'src/features/inventory/styles/inventory-rebuild.css',
  )

  assert.match(
    styles,
    /@media \(min-width: 768px\) and \(max-width: 1119px\)[\s\S]*?\.stock-app \.stock-app__mobile-nav\s*\{[\s\S]*?position: static;[\s\S]*?background: var\(--color-surface\);/,
  )
  assert.match(
    styles,
    /@media \(min-width: 768px\) and \(max-width: 1119px\)[\s\S]*?\.stock-app \.stock-app__task-strip\s*\{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/,
  )
  assert.match(
    styles,
    /@media \(min-width: 900px\) and \(max-width: 1119px\) and \(orientation: landscape\)[\s\S]*?grid-template-columns: 13rem minmax\(0, 1fr\);/,
  )
})

test('inventory summary cards use the responsive summary modal layout', async () => {
  const [component, styles] = await Promise.all([
    readProjectFile(
      'src/features/inventory/components/modals/InventorySummaryModal.jsx',
    ),
    readProjectFile('src/features/inventory/styles/inventory-page.css'),
  ])

  assert.match(component, /className="inventory-page__summary-modal"/)
  assert.match(
    styles,
    /@media \(max-width: 767px\)[\s\S]*?\.inventory-page__summary-modal-card-heading\s*\{\s*flex-direction: column;/,
  )
  assert.match(
    styles,
    /\.inventory-page__summary-modal-heading-actions\s*\{[\s\S]*?width: 100%;[\s\S]*?flex-wrap: wrap;/,
  )
})

test('phone dialogs use the dynamic viewport and keep the body scrollable', async () => {
  const styles = await readProjectFile(
    'src/shared/styles/components/modal.css',
  )

  assert.match(
    styles,
    /@media \(max-width: 767px\) and \(orientation: portrait\)[\s\S]*?height: 100dvh;[\s\S]*?max-height: 100dvh;/,
  )
  assert.match(styles, /\.ui-modal__body\s*\{[\s\S]*?overflow-y: auto;/)
  assert.match(styles, /padding-bottom: max\([^;]+safe-area-inset-bottom\)/)
})

test('tablet and laptop layouts retain bounded modals and flexible columns', async () => {
  const styles = await readProjectFile(
    'src/features/inventory/styles/inventory-page.css',
  )

  assert.match(
    styles,
    /@media \(min-width: 768px\) and \(max-width: 1099px\)[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
  )
  assert.match(
    styles,
    /@media \(min-width: 1200px\) and \(max-width: 1439px\)[\s\S]*?\.inventory-page__summary-modal\s*\{\s*max-width: 960px;/,
  )
  assert.match(
    styles,
    /\.inventory-page__summary-modal-list\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
  )
})

test('part-number fields leave mobile keyboard selection at the browser default', async () => {
  const partNumberEntryFiles = await Promise.all(
    [
      'src/features/inventory/pages/InventoryPage.jsx',
      'src/features/inventory/components/modals/AddPartModal.jsx',
      'src/features/inventory/components/modals/UsePartModal.jsx',
      'src/features/inventory/components/modals/GivePartModal.jsx',
      'src/features/inventory/components/modals/MovePartModal.jsx',
      'src/features/inventory/components/modals/EditPartModal.jsx',
    ].map(readProjectFile),
  )

  partNumberEntryFiles.forEach((source) => {
    assert.doesNotMatch(source, /inputMode="numeric"/)
    assert.doesNotMatch(source, /inputMode="text"/)
  })
})
