import { useMemo, useState } from 'react'
import { ArchiveRestore, FileJson, ShieldCheck, Upload } from 'lucide-react'

import Button from '../../../../shared/components/Button.jsx'
import Modal from '../../../../shared/components/Modal.jsx'
import {
  getInventoryBackupSummary,
  parseInventoryBackup,
} from '../../utils/inventoryBackup.js'

const MAX_BACKUP_SIZE = 20 * 1024 * 1024

function InventoryBackupModal({ isOpen, onClose, onRestore }) {
  const [fileName, setFileName] = useState('')
  const [backup, setBackup] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isReading, setIsReading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const summary = useMemo(
    () => (backup ? getInventoryBackupSummary(backup) : null),
    [backup],
  )

  const reset = () => {
    setFileName('')
    setBackup(null)
    setErrorMessage('')
    setIsReading(false)
    setIsRestoring(false)
  }

  const handleClose = () => {
    if (isRestoring) return
    reset()
    onClose()
  }

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0]

    setFileName(selectedFile?.name || '')
    setBackup(null)
    setErrorMessage('')

    if (!selectedFile) return

    if (!/\.json$/i.test(selectedFile.name)) {
      setErrorMessage('Choose a MyInventory backup ending in .json.')
      return
    }

    if (selectedFile.size > MAX_BACKUP_SIZE) {
      setErrorMessage('Choose a backup file smaller than 20 MB.')
      return
    }

    setIsReading(true)

    try {
      setBackup(parseInventoryBackup(await selectedFile.text()))
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'MyInventory could not read this backup.',
      )
    } finally {
      setIsReading(false)
    }
  }

  const handleRestore = async () => {
    if (!backup || isRestoring) return

    setErrorMessage('')
    setIsRestoring(true)

    try {
      await onRestore(backup)
      handleClose()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'MyInventory could not restore this backup.',
      )
      setIsRestoring(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Restore MyInventory Backup"
      description="Add missing records from a previous backup without erasing your current inventory."
      onClose={handleClose}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isRestoring}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleRestore}
            disabled={!backup || isReading || isRestoring}
          >
            <ArchiveRestore size={18} aria-hidden="true" />
            {isRestoring ? 'Restoring…' : 'Restore Backup'}
          </Button>
        </>
      }
    >
      <div className="inventory-backup">
        <label className="inventory-backup__upload">
          <span className="inventory-backup__upload-icon" aria-hidden="true">
            {backup ? <FileJson size={24} /> : <Upload size={24} />}
          </span>
          <span>
            <strong>{fileName || 'Choose MyInventory backup'}</strong>
            <small>
              {isReading ? 'Checking backup…' : 'Tap to select a .json backup'}
            </small>
          </span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            disabled={isReading || isRestoring}
          />
        </label>

        <div className="inventory-backup__safety-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <p>
            Safe merge restore keeps your current records and adds anything
            missing from the backup.
          </p>
        </div>

        {errorMessage && (
          <div className="inventory-form__error" role="alert">
            <strong>Backup could not be restored</strong>
            <p>{errorMessage}</p>
          </div>
        )}

        {summary && (
          <div className="inventory-backup__summary" aria-label="Backup contents">
            <span><strong>{summary.parts}</strong> parts</span>
            <span><strong>{summary.stockedLocations}</strong> stock records</span>
            <span><strong>{summary.locations}</strong> locations</span>
            <span><strong>{summary.history}</strong> history records</span>
            <span><strong>{summary.deletedLocations}</strong> deleted locations</span>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default InventoryBackupModal
