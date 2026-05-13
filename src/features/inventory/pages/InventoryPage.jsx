import { useEffect, useMemo, useState } from 'react'

import Button from '../../../shared/components/Button.jsx'
import Card from '../../../shared/components/Card.jsx'
import Input from '../../../shared/components/Input.jsx'

import InventoryItemCard from '../components/InventoryItemCard.jsx'
import AddPartModal from '../components/modals/AddPartModal.jsx'
import GivePartModal from '../components/modals/GivePartModal.jsx'
import HistoryModal from '../components/modals/HistoryModal.jsx'
import MovePartModal from '../components/modals/MovePartModal.jsx'
import UsePartModal from '../components/modals/UsePartModal.jsx'

import { INVENTORY_ACTIONS } from '../data/inventoryActions.js'
import {
  buildInventoryTransaction,
  getInventorySummary,
  searchInventory,
} from '../utils/inventoryHelpers.js'
import {
  loadInventoryHistory,
  loadInventoryItems,
  loadSavedLocations,
  saveInventoryHistory,
  saveInventoryItems,
  saveSavedLocations,
} from '../utils/inventoryStorage.js'

import '../styles/inventory-page.css'
import '../styles/inventory-forms.css'
import '../styles/inventory-history.css'

function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState(() => loadInventoryItems())
  const [inventoryHistory, setInventoryHistory] = useState(() => loadInventoryHistory())
  const [savedLocations, setSavedLocations] = useState(() => loadSavedLocations())
  const [searchTerm, setSearchTerm] = useState('')
  const [activeModal, setActiveModal] = useState(null)
  const [transactionError, setTransactionError] = useState('')
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null)

  const inventorySummary = useMemo(() => {
    return getInventorySummary(inventoryItems)
  }, [inventoryItems])

  const filteredInventoryItems = useMemo(() => {
    return searchInventory(inventoryItems, searchTerm)
  }, [inventoryItems, searchTerm])

  useEffect(() => {
    saveInventoryItems(inventoryItems)
  }, [inventoryItems])

  useEffect(() => {
    saveInventoryHistory(inventoryHistory)
  }, [inventoryHistory])

  useEffect(() => {
    saveSavedLocations(savedLocations)
  }, [savedLocations])

  const closeModal = () => {
    setActiveModal(null)
    setTransactionError('')
    setSelectedInventoryItem(null)
  }

  const openModal = (modalName) => {
    setTransactionError('')
    setSelectedInventoryItem(null)
    setActiveModal(modalName)
  }

  const openModalWithItem = (modalName, item) => {
    setTransactionError('')
    setSelectedInventoryItem(item)
    setActiveModal(modalName)
  }

  const saveNewLocation = (location) => {
    if (!location || savedLocations.includes(location)) return

    setSavedLocations((currentLocations) => [...currentLocations, location])
  }

  const runInventoryTransaction = (action, formData) => {
    const transactionResult = buildInventoryTransaction({
      action,
      items: inventoryItems,
      history: inventoryHistory,
      transaction: formData,
    })

    if (!transactionResult.isValid) {
      setTransactionError(transactionResult.errorMessage)
      return false
    }

    setInventoryItems(transactionResult.items)
    setInventoryHistory(transactionResult.history)

    saveNewLocation(formData.location)
    saveNewLocation(formData.fromLocation)
    saveNewLocation(formData.toLocation)

    setTransactionError('')
    return true
  }

  const handleAddPart = (formData) => {
    return runInventoryTransaction(INVENTORY_ACTIONS.ADD, formData)
  }

  const handleUsePart = (formData) => {
    return runInventoryTransaction(INVENTORY_ACTIONS.USE, formData)
  }

  const handleGivePart = (formData) => {
    return runInventoryTransaction(INVENTORY_ACTIONS.GIVE, formData)
  }

  const handleMovePart = (formData) => {
    return runInventoryTransaction(INVENTORY_ACTIONS.MOVE, formData)
  }

  const openUseFromCard = (item) => {
    openModalWithItem('use', item)
  }

  const openGiveFromCard = (item) => {
    openModalWithItem('give', item)
  }

  const openMoveFromCard = (item) => {
    openModalWithItem('move', item)
  }

  return (
    <main className="inventory-page page-shell">
      <div className="inventory-page__container site-container">
        <header className="inventory-page__header">
          <div>
            <p className="inventory-page__eyebrow">Truck Inventory</p>
            <h1>My Inventory</h1>
            <p className="inventory-page__subtitle">
              Track parts, boxes, tickets, machines, customers, and history.
            </p>
          </div>

          <div className="inventory-page__sync-status">
            <span className="inventory-page__sync-dot"></span>
            <span>Offline Ready</span>
          </div>
        </header>

        {transactionError && (
          <Card className="inventory-page__error-card">
            <strong>Check quantity</strong>
            <p>{transactionError}</p>
          </Card>
        )}

        <section className="inventory-page__search-section">
          <Input
            id="inventory-search"
            label="Search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Part, machine, customer, ticket, box..."
          />
        </section>

        <section className="inventory-page__actions" aria-label="Inventory actions">
          <Button fullWidth onClick={() => openModal('add')}>
            Add Part
          </Button>

          <Button fullWidth onClick={() => openModal('use')}>
            Use Part
          </Button>

          <Button fullWidth onClick={() => openModal('give')}>
            Give Part
          </Button>

          <Button fullWidth onClick={() => openModal('move')}>
            Move Part
          </Button>
        </section>

        <section className="inventory-page__summary" aria-label="Inventory summary">
          <Card as="article" className="inventory-page__summary-card">
            <span>Total Parts</span>
            <strong>{inventorySummary.totalParts}</strong>
          </Card>

          <Card as="article" className="inventory-page__summary-card">
            <span>Official</span>
            <strong>{inventorySummary.officialQuantity}</strong>
          </Card>

          <Card as="article" className="inventory-page__summary-card">
            <span>NOI / Ghost</span>
            <strong>{inventorySummary.noiQuantity}</strong>
          </Card>

          <Card as="article" className="inventory-page__summary-card">
            <span>Out of Stock</span>
            <strong>{inventorySummary.outOfStock}</strong>
          </Card>
        </section>

        <section className="inventory-page__content">
          <div className="inventory-page__section-heading">
            <h2>Inventory</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openModal('history')}
            >
              History
            </Button>
          </div>

          {filteredInventoryItems.length > 0 ? (
            <div className="inventory-page__inventory-list">
              {filteredInventoryItems.map((item) => (
                <InventoryItemCard
                  key={item.id}
                  item={item}
                  onUse={openUseFromCard}
                  onGive={openGiveFromCard}
                  onMove={openMoveFromCard}
                />
              ))}
            </div>
          ) : (
            <Card className="inventory-page__empty-state">
              <h3>No parts found</h3>
              <p>Add your first part or adjust your search.</p>
            </Card>
          )}
        </section>
      </div>

      <AddPartModal
        isOpen={activeModal === 'add'}
        onClose={closeModal}
        onSubmit={handleAddPart}
        savedLocations={savedLocations}
        errorMessage={transactionError}
      />

      <UsePartModal
        isOpen={activeModal === 'use'}
        onClose={closeModal}
        onSubmit={handleUsePart}
        savedLocations={savedLocations}
        selectedItem={selectedInventoryItem}
        errorMessage={transactionError}
      />

      <GivePartModal
        isOpen={activeModal === 'give'}
        onClose={closeModal}
        onSubmit={handleGivePart}
        savedLocations={savedLocations}
        selectedItem={selectedInventoryItem}
        errorMessage={transactionError}
      />

      <MovePartModal
        isOpen={activeModal === 'move'}
        onClose={closeModal}
        onSubmit={handleMovePart}
        savedLocations={savedLocations}
        selectedItem={selectedInventoryItem}
        errorMessage={transactionError}
      />

      <HistoryModal
        isOpen={activeModal === 'history'}
        onClose={closeModal}
        history={inventoryHistory}
      />
    </main>
  )
}

export default InventoryPage