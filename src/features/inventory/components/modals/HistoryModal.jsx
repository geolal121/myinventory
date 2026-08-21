import { useMemo, useState } from 'react'
import { Download, RotateCcw } from 'lucide-react'

import Button from '../../../../shared/components/Button.jsx'
import Input from '../../../../shared/components/Input.jsx'
import Modal from '../../../../shared/components/Modal.jsx'
import Select from '../../../../shared/components/Select.jsx'
import {
  INVENTORY_ACTION_OPTIONS,
  INVENTORY_ACTIONS,
} from '../../data/inventoryActions.js'
import {
  buildInventoryHistoryCsv,
  createInventoryHistoryFileName,
  filterInventoryHistory,
  formatInventoryHistoryDate,
  getInventoryHistoryActionLabel,
  getInventoryHistorySummary,
  HISTORY_DATE_OPTIONS,
} from '../../utils/inventoryHistoryHelpers.js'

function HistoryModal({ isOpen, onClose, history = [] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const filteredHistory = useMemo(
    () =>
      filterInventoryHistory({
        history,
        searchTerm,
        actionFilter,
        dateFilter,
      }),
    [history, searchTerm, actionFilter, dateFilter],
  )
  const summary = useMemo(
    () => getInventoryHistorySummary(filteredHistory),
    [filteredHistory],
  )
  const hasFilters = Boolean(searchTerm || actionFilter || dateFilter)

  const clearFilters = () => {
    setSearchTerm('')
    setActionFilter('')
    setDateFilter('')
  }

  const handleClose = () => {
    clearFilters()
    onClose()
  }

  const handleExport = () => {
    const csv = buildInventoryHistoryCsv(filteredHistory)
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    })
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = downloadUrl
    link.download = createInventoryHistoryFileName()
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(downloadUrl)
  }

  return (
    <Modal
      isOpen={isOpen}
      title="History"
      description="Filter, review, and export your synced inventory activity."
      onClose={handleClose}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={handleExport}
            disabled={filteredHistory.length === 0}
          >
            <Download size={18} aria-hidden="true" />
            Export Shown
          </Button>

          <Button type="button" variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="inventory-history-controls">
        <Input
          id="inventory-history-search"
          label="Search History"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onClear={() => setSearchTerm('')}
          clearLabel="Clear history search"
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck="false"
          placeholder="Part, box, customer, machine, ticket, notes..."
        />

        <div className="inventory-history-filters">
          <Select
            id="inventory-history-action"
            label="Action"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            options={INVENTORY_ACTION_OPTIONS}
            placeholder="All actions"
          />

          <Select
            id="inventory-history-date"
            label="Date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            options={HISTORY_DATE_OPTIONS}
            placeholder="All dates"
          />
        </div>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="inventory-history-clear"
            onClick={clearFilters}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Clear filters
          </Button>
        )}
      </div>

      <div className="inventory-history-summary" aria-label="Shown history summary">
        <div>
          <span>Shown</span>
          <strong>{summary.recordCount}</strong>
        </div>
        <div>
          <span>Parts</span>
          <strong>{summary.uniqueParts}</strong>
        </div>
        <div>
          <span>Action types</span>
          <strong>{summary.actionTypes}</strong>
        </div>
      </div>

      {filteredHistory.length > 0 ? (
        <div className="inventory-history-list">
          {filteredHistory.map((record) => (
            <article
              key={record.id}
              className={`inventory-history-card inventory-history-card--${String(
                record.action || 'other',
              ).toLowerCase()}`}
            >
              <div className="inventory-history-card__header">
                <strong>{getInventoryHistoryActionLabel(record.action)}</strong>
                <span>{formatInventoryHistoryDate(record.createdAt)}</span>
              </div>

              <div className="inventory-history-card__body">
                {record.action === INVENTORY_ACTIONS.COUNT ? (
                  <>
                    <p>
                      <strong>Parts Checked:</strong>{' '}
                      {record.countedPartCount || 0}
                    </p>
                    <p>
                      <strong>Corrections:</strong>{' '}
                      {record.discrepancyCount || 0}
                    </p>
                    <p>
                      <strong>Previous Total:</strong>{' '}
                      {record.previousTotalQuantity || 0}
                    </p>
                    <p>
                      <strong>Counted Total:</strong>{' '}
                      {record.countedTotalQuantity || 0}
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      <strong>Part:</strong> {record.partNumber}
                    </p>
                    <p>
                      <strong>Qty:</strong> {record.quantity}
                    </p>
                  </>
                )}
                {record.location && (
                  <p>
                    <strong>Location:</strong> {record.location}
                  </p>
                )}
                {record.fromLocation && (
                  <p>
                    <strong>From:</strong> {record.fromLocation}
                  </p>
                )}
                {record.toLocation && (
                  <p>
                    <strong>To:</strong> {record.toLocation}
                  </p>
                )}
                {record.inventoryStatus && (
                  <p>
                    <strong>Type:</strong> {record.inventoryStatus}
                  </p>
                )}
                {record.person && (
                  <p>
                    <strong>Used By:</strong> {record.person}
                  </p>
                )}
                {record.coworker && (
                  <p>
                    <strong>Coworker:</strong> {record.coworker}
                  </p>
                )}
                {record.machine && (
                  <p>
                    <strong>Machine:</strong> {record.machine}
                  </p>
                )}
                {record.customer && (
                  <p>
                    <strong>Customer:</strong> {record.customer}
                  </p>
                )}
                {record.ticketNumber && (
                  <p>
                    <strong>Ticket:</strong> {record.ticketNumber}
                  </p>
                )}
                {record.originalPartNumber && (
                  <p>
                    <strong>Original Part:</strong> {record.originalPartNumber}
                  </p>
                )}
                {record.originalLocation && (
                  <p>
                    <strong>Original Location:</strong> {record.originalLocation}
                  </p>
                )}
                {record.notes && (
                  <p>
                    <strong>Notes:</strong> {record.notes}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="inventory-history-empty">
          <h3>{hasFilters ? 'No history found' : 'No history yet'}</h3>
          <p>
            {hasFilters
              ? 'Try changing or clearing the search and filters.'
              : 'Inventory actions will show here after you add, use, give, or move parts.'}
          </p>
        </div>
      )}
    </Modal>
  )
}

export default HistoryModal
