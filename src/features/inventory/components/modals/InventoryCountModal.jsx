import { useMemo, useState } from 'react'
import {
  Check,
  ClipboardCheck,
  Download,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react'

import Button from '../../../../shared/components/Button.jsx'
import Card from '../../../../shared/components/Card.jsx'
import Input from '../../../../shared/components/Input.jsx'
import Modal from '../../../../shared/components/Modal.jsx'
import Select from '../../../../shared/components/Select.jsx'
import {
  buildInventoryCountCsv,
  createInventoryCountFileName,
  reviewInventoryCount,
} from '../../utils/inventoryCountHelpers.js'

const COUNT_STEPS = {
  COUNT: 'COUNT',
  REVIEW: 'REVIEW',
}

function InventoryCountModal({
  isOpen,
  onClose,
  locationGroups = [],
  onSubmit,
}) {
  const [selectedLocation, setSelectedLocation] = useState('')
  const [counts, setCounts] = useState({})
  const [step, setStep] = useState(COUNT_STEPS.COUNT)
  const [errorMessage, setErrorMessage] = useState('')

  const countableLocationGroups = useMemo(
    () => locationGroups.filter((locationGroup) => locationGroup.items.length > 0),
    [locationGroups],
  )
  const selectedLocationGroup = useMemo(
    () =>
      countableLocationGroups.find(
        (locationGroup) => locationGroup.location === selectedLocation,
      ),
    [countableLocationGroups, selectedLocation],
  )
  const selectedItems = useMemo(
    () => selectedLocationGroup?.items || [],
    [selectedLocationGroup],
  )
  const review = useMemo(
    () =>
      reviewInventoryCount({
        items: selectedItems,
        location: selectedLocation,
        counts,
      }),
    [counts, selectedItems, selectedLocation],
  )
  const progressPercentage = review.totalParts
    ? Math.round((review.countedParts / review.totalParts) * 100)
    : 0
  const locationOptions = countableLocationGroups.map((locationGroup) => ({
    value: locationGroup.location,
    label: `${locationGroup.location} · ${locationGroup.partCount} part${
      locationGroup.partCount === 1 ? '' : 's'
    }`,
  }))

  const resetModal = () => {
    setSelectedLocation('')
    setCounts({})
    setStep(COUNT_STEPS.COUNT)
    setErrorMessage('')
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const handleLocationChange = (event) => {
    setSelectedLocation(event.target.value)
    setCounts({})
    setStep(COUNT_STEPS.COUNT)
    setErrorMessage('')
  }

  const updateCount = (itemId, field, value) => {
    setCounts((currentCounts) => ({
      ...currentCounts,
      [itemId]: {
        ...(currentCounts[itemId] || {}),
        [field]: value,
      },
    }))
    setErrorMessage('')
  }

  const markAsMatching = (item) => {
    setCounts((currentCounts) => ({
      ...currentCounts,
      [item.id]: {
        officialQuantity: String(Number(item.officialQuantity || 0)),
        noiQuantity: String(Number(item.noiQuantity || 0)),
      },
    }))
    setErrorMessage('')
  }

  const handleReview = () => {
    if (!review.isComplete) {
      setErrorMessage(
        `Count the remaining ${review.remainingParts} part${
          review.remainingParts === 1 ? '' : 's'
        } before reviewing.`,
      )
      return
    }

    setErrorMessage('')
    setStep(COUNT_STEPS.REVIEW)
  }

  const handleSave = () => {
    const result = onSubmit({
      location: selectedLocation,
      counts,
    })

    if (!result?.isValid) {
      setErrorMessage(result?.errorMessage || 'The count could not be saved.')
      return
    }

    handleClose()
  }

  const handleDownload = () => {
    const csv = buildInventoryCountCsv({
      location: selectedLocation,
      review,
    })
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    })
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = downloadUrl
    link.download = createInventoryCountFileName({
      location: selectedLocation,
    })
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
  }

  const footer = selectedItems.length > 0 ? (
    step === COUNT_STEPS.REVIEW ? (
      <>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setStep(COUNT_STEPS.COUNT)
            setErrorMessage('')
          }}
        >
          Back to Count
        </Button>
        <Button type="button" onClick={handleSave}>
          <ClipboardCheck size={18} aria-hidden="true" />
          {review.discrepancyCount > 0 ? 'Save Corrections' : 'Finish Count'}
        </Button>
      </>
    ) : (
      <>
        <Button type="button" variant="secondary" onClick={handleClose}>
          Close
        </Button>
        <Button
          type="button"
          onClick={handleReview}
          disabled={!review.isComplete}
        >
          Review Count
        </Button>
      </>
    )
  ) : (
    <Button type="button" variant="secondary" onClick={handleClose}>
      Close
    </Button>
  )

  return (
    <Modal
      isOpen={isOpen}
      title="Count Inventory"
      description="Verify one truck location at a time before saving any corrections."
      onClose={handleClose}
      footer={footer}
      className="inventory-count-modal"
    >
      {countableLocationGroups.length > 0 ? (
        <div className="inventory-count">
          <Select
            id="inventory-count-location"
            label="Location to Count"
            value={selectedLocation}
            onChange={handleLocationChange}
            options={locationOptions}
            placeholder="Choose a location"
          />

          {selectedItems.length > 0 && (
            <>
              <section className="inventory-count__progress" aria-live="polite">
                <div className="inventory-count__progress-heading">
                  <div>
                    <strong>
                      {review.countedParts} of {review.totalParts} parts counted
                    </strong>
                    <span>
                      {review.remainingParts > 0
                        ? `${review.remainingParts} remaining`
                        : 'Ready to review'}
                    </span>
                  </div>
                  <strong>{progressPercentage}%</strong>
                </div>
                <div
                  className="inventory-count__progress-track"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax={review.totalParts}
                  aria-valuenow={review.countedParts}
                >
                  <span style={{ width: `${progressPercentage}%` }} />
                </div>
              </section>

              {errorMessage && (
                <div className="inventory-form__error" role="alert">
                  <strong>Count not complete</strong>
                  <p>{errorMessage}</p>
                </div>
              )}

              {step === COUNT_STEPS.COUNT ? (
                <div className="inventory-count__list">
                  {review.rows.map((row) => {
                    const item = selectedItems.find(
                      (selectedItem) => selectedItem.id === row.id,
                    )
                    const entry = counts[row.id] || {}

                    return (
                      <Card key={row.id} className="inventory-count__card">
                        <div className="inventory-count__card-heading">
                          <div>
                            <h3>{row.partNumber}</h3>
                            {row.description && <p>{row.description}</p>}
                          </div>
                          <span
                            className={`inventory-count__status ${
                              row.isCounted
                                ? row.hasDifference
                                  ? 'inventory-count__status--different'
                                  : 'inventory-count__status--matched'
                                : ''
                            }`}
                          >
                            {row.isCounted
                              ? row.hasDifference
                                ? 'Different'
                                : 'Matched'
                              : 'Not counted'}
                          </span>
                        </div>

                        <div className="inventory-count__expected">
                          <span>
                            Expected Official
                            <strong>{row.previousOfficialQuantity}</strong>
                          </span>
                          <span>
                            Expected NOI
                            <strong>{row.previousNoiQuantity}</strong>
                          </span>
                        </div>

                        <div className="inventory-count__inputs">
                          <Input
                            id={`count-official-${row.id}`}
                            label="Official Count"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            step="1"
                            value={entry.officialQuantity ?? ''}
                            onChange={(event) =>
                              updateCount(
                                row.id,
                                'officialQuantity',
                                event.target.value,
                              )
                            }
                            placeholder={String(row.previousOfficialQuantity)}
                          />
                          <Input
                            id={`count-noi-${row.id}`}
                            label="NOI Count"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            step="1"
                            value={entry.noiQuantity ?? ''}
                            onChange={(event) =>
                              updateCount(
                                row.id,
                                'noiQuantity',
                                event.target.value,
                              )
                            }
                            placeholder={String(row.previousNoiQuantity)}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => markAsMatching(item)}
                        >
                          <Check size={16} aria-hidden="true" />
                          Counts Match
                        </Button>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="inventory-count__review">
                  <div className="inventory-count__review-summary">
                    <Card>
                      <span>Parts Counted</span>
                      <strong>{review.totalParts}</strong>
                    </Card>
                    <Card>
                      <span>Corrections</span>
                      <strong>{review.discrepancyCount}</strong>
                    </Card>
                    <Card>
                      <span>Counted Units</span>
                      <strong>{review.countedTotalQuantity}</strong>
                    </Card>
                  </div>

                  {review.differences.length > 0 ? (
                    <div className="inventory-count__differences">
                      <div className="inventory-count__review-heading">
                        <div>
                          <TriangleAlert size={20} aria-hidden="true" />
                          <div>
                            <h3>Review corrections</h3>
                            <p>Only these parts will change when you save.</p>
                          </div>
                        </div>
                      </div>
                      {review.differences.map((difference) => (
                        <Card key={difference.id} className="inventory-count__difference">
                          <h3>{difference.partNumber}</h3>
                          {difference.description && <p>{difference.description}</p>}
                          <div>
                            <span>
                              Official: {difference.previousOfficialQuantity} →{' '}
                              <strong>{difference.countedOfficialQuantity}</strong>
                            </span>
                            <span>
                              NOI: {difference.previousNoiQuantity} →{' '}
                              <strong>{difference.countedNoiQuantity}</strong>
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="inventory-count__all-clear">
                      <Check size={22} aria-hidden="true" />
                      <div>
                        <h3>Everything matches</h3>
                        <p>No inventory quantities will be changed.</p>
                      </div>
                    </div>
                  )}

                  <Button type="button" variant="secondary" onClick={handleDownload}>
                    <Download size={17} aria-hidden="true" />
                    Download Count CSV
                  </Button>

                  <div className="inventory-count__save-note">
                    <RotateCcw size={17} aria-hidden="true" />
                    <p>You can undo the saved count from the confirmation bar.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="inventory-count__empty">
          <ClipboardCheck size={28} aria-hidden="true" />
          <h3>No stocked locations yet</h3>
          <p>Add inventory to a location before starting a guided count.</p>
        </div>
      )}
    </Modal>
  )
}

export default InventoryCountModal
