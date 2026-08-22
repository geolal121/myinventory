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
    /@media \(min-width: 1120px\) and \(hover: hover\) and \(pointer: fine\)[\s\S]*?grid-template-columns: 17rem minmax\(0, 1fr\)/,
  )
  assert.match(colors, /--color-background:\s*#f5f5f2;/)
  assert.match(colors, /--color-brand-deep:\s*#20231f;/)
  assert.match(colors, /--color-utility:\s*#e3e7e1;/)
  assert.match(colors, /--gradient-page:\s*var\(--color-background\);/)
})

test('phone layout uses compact four-column summaries and actions', async () => {
  const [component, styles] = await Promise.all([
    readProjectFile('src/features/inventory/pages/InventoryPage.jsx'),
    readProjectFile('src/features/inventory/styles/inventory-rebuild.css'),
  ])

  assert.match(component, /data-active-view=\{activeInventoryView\}/)
  assert.match(
    styles,
    /\/\* SIMPLE PHONE WORKSPACE \*\/[\s\S]*?\.stock-app \.stock-app__task-strip\s*\{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/,
  )
  assert.match(
    styles,
    /\/\* SIMPLE PHONE WORKSPACE \*\/[\s\S]*?\.stock-app \.stock-app__snapshot\s*\{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/,
  )
  assert.match(
    styles,
    /:not\(\[data-active-view='BOXES'\]\)[\s\S]*?\.stock-app__task-strip,[\s\S]*?\.inventory-count-launch,[\s\S]*?\.stock-app__snapshot\s*\{\s*display: none;/,
  )
})

test('phone content scrolls in a viewport that ends above the fixed tab bar', async () => {
  const styles = await readProjectFile(
    'src/features/inventory/styles/inventory-rebuild.css',
  )

  assert.match(styles, /--mobile-tabbar-height:/)
  assert.match(
    styles,
    /@media \(max-width: 767px\)[\s\S]*?\.stock-app\.page-shell\s*\{[\s\S]*?height: 100dvh;[\s\S]*?padding-bottom: var\(--mobile-tabbar-height\);[\s\S]*?overflow: hidden;/,
  )
  assert.match(
    styles,
    /@media \(max-width: 767px\)[\s\S]*?\.stock-app__shell\.site-container\s*\{[\s\S]*?height: 100%;[\s\S]*?min-height: 0;[\s\S]*?overflow-y: auto;/,
  )
  assert.doesNotMatch(styles, /mobile-tabbar-clearance/)
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
    /@media \(min-width: 1120px\) and \(hover: hover\) and \(pointer: fine\)[\s\S]*?\.inventory-page__location-card-stats\s*\{[\s\S]*?grid-column: 2;[\s\S]*?border-top: 0;/,
  )
})

test('tablet layout uses an inline navigation bar and compact action row', async () => {
  const styles = await readProjectFile(
    'src/features/inventory/styles/inventory-rebuild.css',
  )

  assert.match(
    styles,
    /@media \(min-width: 768px\) and \(max-width: 1119px\),[\s\S]*?\.stock-app \.stock-app__mobile-nav\s*\{[\s\S]*?position: static;[\s\S]*?background: var\(--color-surface\);/,
  )
  assert.match(
    styles,
    /@media \(min-width: 768px\) and \(max-width: 1119px\),[\s\S]*?\.stock-app \.stock-app__task-strip\s*\{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/,
  )
  assert.match(
    styles,
    /\(min-width: 1120px\) and \(hover: none\),[\s\S]*?\(min-width: 1120px\) and \(pointer: coarse\)/,
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
