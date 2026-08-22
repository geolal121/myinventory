import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const readProjectFile = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8')

test('inventory workbench uses one clear navigation system across devices', async () => {
  const [component, styles, colors] = await Promise.all([
    readProjectFile('src/features/inventory/pages/InventoryPage.jsx'),
    readProjectFile('src/features/inventory/styles/inventory-clean.css'),
    readProjectFile('src/shared/tokens/colors.css'),
  ])

  assert.match(component, /stock-app__mobile-nav/)
  assert.match(component, /Tech 72485 · Vehicle/)
  assert.match(
    styles,
    /\.stock-app \.stock-app__mobile-nav\s*\{[\s\S]*?position: static;[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/,
  )
  assert.match(styles, /\.stock-app__rail\s*\{\s*display: none !important;/)
  assert.match(colors, /--color-background:\s*#f5f7fa;/)
  assert.match(colors, /--color-accent:\s*#365f8d;/)
  assert.match(colors, /--color-brand-deep:\s*#20364f;/)
  assert.match(colors, /--color-utility:\s*#e1e8f0;/)
  assert.match(colors, /--gradient-page:\s*var\(--color-background\);/)
  assert.doesNotMatch(
    styles,
    /\.stock-app \.stock-app__task-strip \.ui-button:nth-child\(2\)\s*\{\s*border-color:/,
  )
})

test('phone layout uses readable two-column summaries and actions', async () => {
  const [component, styles] = await Promise.all([
    readProjectFile('src/features/inventory/pages/InventoryPage.jsx'),
    readProjectFile('src/features/inventory/styles/inventory-clean.css'),
  ])

  assert.match(component, /data-active-view=\{activeInventoryView\}/)
  assert.match(
    styles,
    /\.stock-app \.stock-app__task-strip\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
  )
  assert.match(
    styles,
    /\.stock-app \.stock-app__snapshot\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
  )
  assert.match(
    styles,
    /:not\(\[data-active-view='BOXES'\]\)[\s\S]*?\.stock-app__task-strip,[\s\S]*?\.inventory-count-launch,[\s\S]*?\.stock-app__snapshot\s*\{\s*display: none;/,
  )
})

test('phone navigation stays in normal page flow and never overlays content', async () => {
  const [component, styles] = await Promise.all([
    readProjectFile('src/features/inventory/pages/InventoryPage.jsx'),
    readProjectFile('src/features/inventory/styles/inventory-clean.css'),
  ])

  assert.match(
    styles,
    /\.stock-app \.stock-app__mobile-nav\s*\{[\s\S]*?position: static;[\s\S]*?margin-top: var\(--spacing-3\);/,
  )
  assert.doesNotMatch(styles, /mobile-tabbar-height/)
  assert.doesNotMatch(styles, /stock-app__mobile-nav\s*\{[^}]*position: fixed;/)
  assert.match(component, /className="stock-app__bottom-space"/)
  assert.match(
    styles,
    /\.stock-app \.stock-app__bottom-space\s*\{[\s\S]*?height: calc\(var\(--spacing-16\) \+ env\(safe-area-inset-bottom\)\);[\s\S]*?min-height: calc\(var\(--spacing-16\) \+ env\(safe-area-inset-bottom\)\);/,
  )
})

test('inventory workbench protects narrow phones and keeps desktop location rows aligned', async () => {
  const styles = await readProjectFile(
    'src/features/inventory/styles/inventory-clean.css',
  )

  assert.match(
    styles,
    /@media \(max-width: 767px\)[\s\S]*?\.stock-app \.stock-app__finder,[\s\S]*?width: calc\(100% - 1\.5rem\);/,
  )
  assert.match(
    styles,
    /@media \(max-width: 390px\)[\s\S]*?\.inventory-page__section-heading \.ui-button\s*\{\s*width: 100%;/,
  )
  assert.match(
    styles,
    /@media \(min-width: 1024px\)[\s\S]*?\.inventory-page__location-list\s*\{\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/,
  )
})

test('tablet layout keeps inline navigation and a balanced action row', async () => {
  const styles = await readProjectFile(
    'src/features/inventory/styles/inventory-clean.css',
  )

  assert.match(
    styles,
    /@media \(min-width: 768px\)[\s\S]*?\.stock-app \.stock-app__mobile-nav \.inventory-page__tab\s*\{[\s\S]*?flex-direction: row;/,
  )
  assert.match(
    styles,
    /@media \(min-width: 768px\)[\s\S]*?\.stock-app \.stock-app__task-strip\s*\{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/,
  )
  assert.match(
    styles,
    /@media \(min-width: 768px\)[\s\S]*?\.inventory-page__location-list\s*\{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
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
