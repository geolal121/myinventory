import {
  AlertTriangle,
  BookOpenText,
  Boxes,
  CheckCircle2,
  FileSearch,
  MapPin,
  ScanSearch,
  ShieldCheck,
} from 'lucide-react'

import Button from '../../../shared/components/Button.jsx'
import Card from '../../../shared/components/Card.jsx'

const HEALTH_STATUS_COPY = {
  ALL_CLEAR: {
    title: 'Inventory looks healthy',
    description: 'No data problems or missing information were found.',
    label: 'All clear',
  },
  GOOD_WITH_SUGGESTIONS: {
    title: 'Inventory is in good shape',
    description: 'There are a few optional cleanup items worth reviewing.',
    label: 'Review suggested',
  },
  FIX_NEEDED: {
    title: 'Some records need attention',
    description: 'Review the items below so inventory totals stay reliable.',
    label: 'Fix needed',
  },
}

function InventoryHealthView({
  health,
  onEditDescription,
  onEditItem,
  onManageLocations,
  onCheckWorkbook,
}) {
  const statusCopy = HEALTH_STATUS_COPY[health.status]

  return (
    <div className="inventory-health">
      <Card className={`inventory-health__hero inventory-health__hero--${health.status.toLowerCase()}`}>
        <span className="inventory-health__hero-icon" aria-hidden="true">
          {health.status === 'FIX_NEEDED' ? (
            <AlertTriangle size={28} />
          ) : (
            <ShieldCheck size={28} />
          )}
        </span>
        <div>
          <span className="inventory-health__status">{statusCopy.label}</span>
          <h2>{statusCopy.title}</h2>
          <p>{statusCopy.description}</p>
        </div>
      </Card>

      <div className="inventory-health__metrics" aria-label="Inventory health summary">
        <Card>
          <span>Needs fixing</span>
          <strong>{health.fixCount}</strong>
        </Card>
        <Card>
          <span>Suggestions</span>
          <strong>{health.suggestionCount}</strong>
        </Card>
        <Card>
          <span>Format review</span>
          <strong>{health.alternativePartFormats.length}</strong>
        </Card>
      </div>

      <section className="inventory-health__section">
        <div className="inventory-health__section-heading">
          <div>
            <h3>Missing descriptions</h3>
            <p>Add descriptions to make parts easier to find.</p>
          </div>
          <span>{health.missingDescriptions.length}</span>
        </div>

        {health.missingDescriptions.length > 0 ? (
          <div className="inventory-health__list">
            {health.missingDescriptions.map((part) => (
              <Card key={part.id} className="inventory-health__issue">
                <BookOpenText size={20} aria-hidden="true" />
                <div>
                  <strong>{part.partNumber}</strong>
                  <p>No description saved</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onEditDescription(part)}
                >
                  Add
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="inventory-health__clear-row">
            <CheckCircle2 size={18} aria-hidden="true" />
            Every catalog part has a description.
          </div>
        )}
      </section>

      <section className="inventory-health__section">
        <div className="inventory-health__section-heading">
          <div>
            <h3>Record problems</h3>
            <p>Duplicates and unusual quantities can affect totals.</p>
          </div>
          <span>{health.duplicateRecords.length + health.quantityIssues.length}</span>
        </div>

        {health.duplicateRecords.length === 0 && health.quantityIssues.length === 0 ? (
          <div className="inventory-health__clear-row">
            <CheckCircle2 size={18} aria-hidden="true" />
            No duplicate or quantity problems found.
          </div>
        ) : (
          <div className="inventory-health__list">
            {health.duplicateRecords.map((duplicate) => (
              <Card
                key={`${duplicate.partNumber}-${duplicate.location}`}
                className="inventory-health__issue inventory-health__issue--danger"
              >
                <Boxes size={20} aria-hidden="true" />
                <div>
                  <strong>{duplicate.partNumber}</strong>
                  <p>{duplicate.recordCount} records in {duplicate.location}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onEditItem(duplicate.items[0])}
                >
                  Review
                </Button>
              </Card>
            ))}

            {health.quantityIssues.map((item) => (
              <Card key={item.id} className="inventory-health__issue inventory-health__issue--danger">
                <AlertTriangle size={20} aria-hidden="true" />
                <div>
                  <strong>{item.partNumber} · {item.location}</strong>
                  <p>{item.issue}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onEditItem(item)}
                >
                  Edit
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="inventory-health__section">
        <div className="inventory-health__section-heading">
          <div>
            <h3>Empty locations</h3>
            <p>These saved locations currently contain no parts.</p>
          </div>
          <span>{health.emptyLocations.length}</span>
        </div>

        {health.emptyLocations.length > 0 ? (
          <>
            <div className="inventory-health__tag-list">
              {health.emptyLocations.map((location) => (
                <span key={location}><MapPin size={15} aria-hidden="true" />{location}</span>
              ))}
            </div>
            <Button variant="secondary" onClick={onManageLocations}>
              <MapPin size={17} aria-hidden="true" />
              Manage Locations
            </Button>
          </>
        ) : (
          <div className="inventory-health__clear-row">
            <CheckCircle2 size={18} aria-hidden="true" />
            Every saved location contains inventory.
          </div>
        )}
      </section>

      <section className="inventory-health__section">
        <div className="inventory-health__section-heading">
          <div>
            <h3>Quarterly workbook check</h3>
            <p>Find stocked parts that are missing from your latest sheet.</p>
          </div>
          <span>{health.inventoryPartsNotInWorkbook.length}</span>
        </div>

        {health.workbookCheck ? (
          <>
            <div className="inventory-health__workbook-meta">
              <FileSearch size={19} aria-hidden="true" />
              <div>
                <strong>{health.workbookCheck.fileName}</strong>
                <p>{health.workbookCheck.sheetName} · Technician 72485</p>
              </div>
            </div>
            {health.inventoryPartsNotInWorkbook.length > 0 ? (
              <div className="inventory-health__part-list">
                {health.inventoryPartsNotInWorkbook.map((part) => (
                  <span key={part.id}>{part.partNumber}</span>
                ))}
              </div>
            ) : (
              <div className="inventory-health__clear-row">
                <CheckCircle2 size={18} aria-hidden="true" />
                Every stocked part appears on this workbook sheet.
              </div>
            )}
          </>
        ) : (
          <div className="inventory-health__empty-workbook">
            <FileSearch size={24} aria-hidden="true" />
            <div>
              <strong>No workbook checked yet</strong>
              <p>Upload the current quarterly workbook to compare it.</p>
            </div>
          </div>
        )}

        <Button variant="secondary" onClick={onCheckWorkbook}>
          <ScanSearch size={17} aria-hidden="true" />
          {health.workbookCheck ? 'Check Another Workbook' : 'Check Workbook'}
        </Button>
      </section>

      <section className="inventory-health__section inventory-health__section--informational">
        <div className="inventory-health__section-heading">
          <div>
            <h3>Alternative part-number styles</h3>
            <p>These are valid, but they do not use the usual XXX-XXXX-XX layout.</p>
          </div>
          <span>{health.alternativePartFormats.length}</span>
        </div>

        {health.alternativePartFormats.length > 0 ? (
          <div className="inventory-health__part-list">
            {health.alternativePartFormats.map((part) => (
              <span key={part.id}>{part.partNumber}</span>
            ))}
          </div>
        ) : (
          <div className="inventory-health__clear-row">
            <CheckCircle2 size={18} aria-hidden="true" />
            All part numbers use the usual layout.
          </div>
        )}
      </section>
    </div>
  )
}

export default InventoryHealthView
