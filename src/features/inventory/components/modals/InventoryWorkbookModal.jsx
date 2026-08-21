import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  CircleCheck,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Upload,
} from 'lucide-react'

import Button from '../../../../shared/components/Button.jsx'
import Select from '../../../../shared/components/Select.jsx'
import Modal from '../../../../shared/components/Modal.jsx'

import {
  buildWorkbookFillPreview,
  createFilledWorkbookFileName,
  fillInventoryWorkbook,
  inspectInventoryWorkbook,
  WORKBOOK_QUANTITY_MODES,
} from '../../services/inventoryWorkbookService.js'

const EXCEL_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const MAX_WORKBOOK_SIZE = 25 * 1024 * 1024

function InventoryWorkbookModal({
  isOpen,
  onClose,
  inventoryItems = [],
  onImportDescriptions,
  onWorkbookInspected,
}) {
  const [file, setFile] = useState(null)
  const [arrayBuffer, setArrayBuffer] = useState(null)
  const [inspection, setInspection] = useState(null)
  const [quantityMode, setQuantityMode] = useState(
    WORKBOOK_QUANTITY_MODES.TOTAL,
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [descriptionImportResult, setDescriptionImportResult] = useState(null)
  const [isReading, setIsReading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const preview = useMemo(() => {
    if (!inspection) return null

    return buildWorkbookFillPreview({
      inspection,
      sheetName: inspection.suggestedSheetName,
      inventoryItems,
      quantityMode,
    })
  }, [inspection, inventoryItems, quantityMode])

  const resetWorkbook = () => {
    setFile(null)
    setArrayBuffer(null)
    setInspection(null)
    setQuantityMode(WORKBOOK_QUANTITY_MODES.TOTAL)
    setErrorMessage('')
    setDescriptionImportResult(null)
    setIsReading(false)
    setIsDownloading(false)
  }

  const handleClose = () => {
    resetWorkbook()
    onClose()
  }

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0]

    setErrorMessage('')
    setDescriptionImportResult(null)
    setInspection(null)
    setArrayBuffer(null)
    setFile(selectedFile || null)

    if (!selectedFile) return

    if (!/\.xlsx$/i.test(selectedFile.name)) {
      setErrorMessage('Choose an Excel workbook ending in .xlsx.')
      return
    }

    if (selectedFile.size > MAX_WORKBOOK_SIZE) {
      setErrorMessage('Choose an Excel workbook smaller than 25 MB.')
      return
    }

    setIsReading(true)

    try {
      const nextArrayBuffer = await selectedFile.arrayBuffer()

      await new Promise((resolve) => window.requestAnimationFrame(resolve))

      const nextInspection = inspectInventoryWorkbook(nextArrayBuffer)
      const inspectedSheet = nextInspection.sheets[0]

      onWorkbookInspected?.({
        fileName: selectedFile.name,
        sheetName: nextInspection.suggestedSheetName,
        checkedAt: new Date().toISOString(),
        partNumbers: inspectedSheet.rows.map((row) => row.partNumber),
      })
      const nextDescriptionImportResult = onImportDescriptions?.(
        nextInspection.descriptions || [],
      ) || {
        workbookDescriptionCount: nextInspection.descriptions?.length || 0,
        updatedPartCount: 0,
        updatedRecordCount: 0,
      }

      setArrayBuffer(nextArrayBuffer)
      setInspection(nextInspection)
      setDescriptionImportResult(nextDescriptionImportResult)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'MyInventory could not read this workbook.',
      )
    } finally {
      setIsReading(false)
    }
  }

  const handleDownload = () => {
    if (!file || !arrayBuffer || !inspection) return

    setErrorMessage('')
    setIsDownloading(true)

    try {
      const result = fillInventoryWorkbook({
        arrayBuffer,
        inspection,
        sheetName: inspection.suggestedSheetName,
        inventoryItems,
        quantityMode,
      })
      const blob = new Blob([result.bytes], { type: EXCEL_MIME_TYPE })
      const downloadUrl = URL.createObjectURL(blob)
      const downloadLink = document.createElement('a')

      downloadLink.href = downloadUrl
      downloadLink.download = createFilledWorkbookFileName(file.name)
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'MyInventory could not fill this workbook.',
      )
    } finally {
      setIsDownloading(false)
    }
  }

  const quantityOptions = [
    {
      value: WORKBOOK_QUANTITY_MODES.TOTAL,
      label: 'Total physical count (Official + NOI)',
    },
    {
      value: WORKBOOK_QUANTITY_MODES.OFFICIAL,
      label: 'Official quantity only',
    },
    {
      value: WORKBOOK_QUANTITY_MODES.NOI,
      label: 'NOI / Ghost quantity only',
    },
  ]

  return (
    <Modal
      isOpen={isOpen}
      title="Fill Excel Count Sheet"
      description="Upload your quarterly workbook and download a filled copy."
      onClose={handleClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Close
          </Button>

          <Button
            type="button"
            onClick={handleDownload}
            disabled={!preview || isReading || isDownloading}
          >
            <Download size={18} aria-hidden="true" />
            {isDownloading ? 'Preparing…' : 'Download Filled Excel'}
          </Button>
        </>
      }
    >
      <div className="inventory-workbook">
        <label className="inventory-workbook__upload">
          <span className="inventory-workbook__upload-icon" aria-hidden="true">
            {file ? <FileSpreadsheet size={24} /> : <Upload size={24} />}
          </span>
          <span>
            <strong>{file?.name || 'Choose quarterly Excel file'}</strong>
            <small>
              {isReading
                ? 'Checking workbook…'
                : 'Tap to select a standard .xlsx workbook'}
            </small>
          </span>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
            disabled={isReading || isDownloading}
          />
        </label>

        <div className="inventory-workbook__privacy-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <p>The workbook is processed on this device and is not uploaded.</p>
        </div>

        {errorMessage && (
          <div className="inventory-form__error" role="alert">
            <strong>Workbook could not be prepared</strong>
            <p>{errorMessage}</p>
          </div>
        )}

        {inspection && (
          <>
            <div className="inventory-workbook__technician">
              <BadgeCheck size={20} aria-hidden="true" />
              <div>
                <strong>
                  {inspection.technician.name} · ID {inspection.technician.id}
                </strong>
                <p>
                  {inspection.suggestedSheetName} ·{' '}
                  {inspection.sheets[0].rowCount} assigned parts
                </p>
              </div>
            </div>

            {descriptionImportResult && (
              <div className="inventory-workbook__description-result">
                <CircleCheck size={19} aria-hidden="true" />
                <div>
                  <strong>
                    {descriptionImportResult.updatedPartCount > 0
                      ? `${descriptionImportResult.updatedPartCount} part description${
                          descriptionImportResult.updatedPartCount === 1
                            ? ''
                            : 's'
                        } added to MyInventory`
                      : descriptionImportResult.workbookDescriptionCount > 0
                        ? 'Part descriptions are already up to date'
                        : 'No usable part descriptions were found'}
                  </strong>
                  <p>
                    {descriptionImportResult.updatedPartCount > 0
                      ? `${descriptionImportResult.updatedRecordCount} inventory record${
                          descriptionImportResult.updatedRecordCount === 1
                            ? ''
                            : 's'
                        } updated in the parts catalog. Existing descriptions were not changed.`
                      : 'Existing descriptions were not changed.'}
                  </p>
                </div>
              </div>
            )}

            <div>
              <Select
                name="workbookQuantityMode"
                label="Quantity to Use"
                value={quantityMode}
                onChange={(event) => setQuantityMode(event.target.value)}
                options={quantityOptions}
                placeholder="Select quantity"
              />
            </div>

            {preview && (
              <>
                <div className="inventory-workbook__success">
                  <CircleCheck size={19} aria-hidden="true" />
                  <div>
                    <strong>{preview.sheet.name} is ready</strong>
                    <p>
                      Only Physical Count rows assigned to technician ID{' '}
                      {inspection.technician.id} will be filled. Every other
                      technician stays unchanged.
                    </p>
                  </div>
                </div>

                <div
                  className="inventory-workbook__summary"
                  aria-label="Workbook fill summary"
                >
                  <div>
                    <span>Rows filled</span>
                    <strong>{preview.totalRows}</strong>
                  </div>
                  <div>
                    <span>Parts matched</span>
                    <strong>{preview.matchedParts}</strong>
                  </div>
                  <div>
                    <span>Zero counts</span>
                    <strong>{preview.zeroCountRows}</strong>
                  </div>
                  <div>
                    <span>Total quantity</span>
                    <strong>{preview.totalQuantity}</strong>
                  </div>
                </div>

                {preview.sheet.filledRowCount > 0 && (
                  <div className="inventory-workbook__notice">
                    This worksheet already has{' '}
                    {preview.sheet.filledRowCount} filled count rows. The
                    downloaded copy will replace those counts.
                  </div>
                )}

                {preview.inventoryPartsNotInSheet.length > 0 && (
                  <div className="inventory-workbook__unmatched">
                    <strong>
                      {preview.inventoryPartsNotInSheet.length} stocked part
                      {preview.inventoryPartsNotInSheet.length === 1
                        ? ''
                        : 's'}{' '}
                      not listed on this worksheet
                    </strong>
                    <p>
                      {preview.inventoryPartsNotInSheet.slice(0, 8).join(', ')}
                      {preview.inventoryPartsNotInSheet.length > 8
                        ? ` and ${preview.inventoryPartsNotInSheet.length - 8} more`
                        : ''}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

export default InventoryWorkbookModal
