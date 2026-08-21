import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

const readProjectFile = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8')

const readCssFiles = async (directory = new URL('../src/', import.meta.url)) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const url = new URL(entry.name, directory)

      if (entry.isDirectory()) {
        return readCssFiles(new URL(`${entry.name}/`, directory))
      }

      return entry.name.endsWith('.css') ? readFile(url, 'utf8') : []
    }),
  )

  return files.flat()
}

test('the app theme uses solid surfaces instead of decorative gradients', async () => {
  const [styles, colors, buttons, cards] = await Promise.all([
    readCssFiles(),
    readProjectFile('src/shared/tokens/colors.css'),
    readProjectFile('src/shared/styles/components/button.css'),
    readProjectFile('src/shared/styles/components/card.css'),
  ])

  styles.forEach((source) => {
    assert.doesNotMatch(source, /(?:linear|radial)-gradient\s*\(/)
  })
  assert.match(colors, /--color-background:\s*#f3f1ec;/)
  assert.match(colors, /--color-brand:\s*#17364a;/)
  assert.match(colors, /--color-utility:\s*#d58a25;/)
  assert.match(buttons, /\.ui-button--primary\s*\{[\s\S]*?background: var\(--color-accent\);/)
  assert.match(cards, /\.ui-card\s*\{[\s\S]*?background: var\(--color-surface\);/)
})

test('the inventory dashboard groups search, quick actions, and snapshot panels', async () => {
  const [component, styles] = await Promise.all([
    readProjectFile('src/features/inventory/pages/InventoryPage.jsx'),
    readProjectFile('src/features/inventory/styles/inventory-page.css'),
  ])

  assert.match(component, /inventory-page__panel-title">Quick Actions</)
  assert.match(component, /inventory-page__panel-title">Inventory Snapshot</)
  assert.match(
    component,
    /<section className="inventory-page__actions"[\s\S]*?className="inventory-count-launch"[\s\S]*?<\/section>/,
  )
  assert.match(
    styles,
    /@media \(min-width: 1200px\)[\s\S]*?\.inventory-page__container\s*\{[\s\S]*?grid-template-columns: repeat\(12, minmax\(0, 1fr\)\)/,
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
