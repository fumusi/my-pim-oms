import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { importPimProducts, getImportTemplate, type ImportSummary } from '../api/pim-products'
import { getApiError } from '../utils/format'

interface Props {
  onClose: () => void
  onImported: () => void
}

export function ImportModal({ onClose, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [result, setResult] = useState<ImportSummary | null>(null)
  const [errorsExpanded, setErrorsExpanded] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  function pickFile(f: File | null | undefined) {
    if (!f) return
    setFile(f)
    setResult(null)
  }

  async function handleDownloadTemplate() {
    setIsDownloading(true)
    try {
      const res = await getImportTemplate()
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'products-import-template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setIsDownloading(false)
    }
  }

  async function handleUpload() {
    if (!file) return
    setIsUploading(true)
    setResult(null)
    try {
      const res = await importPimProducts(file)
      const summary = res.data
      setResult(summary)
      const hasErrors = summary.errors.length > 0
      const msg = `Imported ${summary.imported}, Updated ${summary.updated}, Errors ${summary.errors.length}`
      if (hasErrors) {
        toast.warning(msg)
        setErrorsExpanded(true)
      } else {
        toast.success(msg)
        onImported()
      }
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box import-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="import-modal-header">
          <h3 className="modal-title" style={{ margin: 0 }}>Import Products</h3>
          <button className="drawer-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className="import-modal-hint">
          Upload a CSV file to import or update products. Download the template to see the expected format.
        </p>

        <button
          className="exact-btn exact-btn-outline import-template-btn"
          onClick={handleDownloadTemplate}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <div className="spinner-border spinner-border-sm" style={{ width: 12, height: 12, borderWidth: 2 }} />
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          Download template
        </button>

        {/* Drop zone */}
        <div
          className={`import-drop-zone${dragOver ? ' import-drop-zone--over' : ''}${file ? ' import-drop-zone--has-file' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            pickFile(e.dataTransfer.files[0])
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          {file ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="import-drop-filename">{file.name}</span>
              <span className="import-drop-hint">Click to change file</span>
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4e5068" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="import-drop-label">Drop CSV / Excel here or click to browse</span>
              <span className="import-drop-hint">.csv, .xlsx, .xls accepted</span>
            </>
          )}
        </div>

        {/* Result summary */}
        {result && (
          <div className="import-result">
            <div className="import-result-row">
              <span className="import-result-chip import-result-chip--ok">
                {result.imported} imported
              </span>
              <span className="import-result-chip import-result-chip--upd">
                {result.updated} updated
              </span>
              <span className={`import-result-chip${result.errors.length > 0 ? ' import-result-chip--err' : ' import-result-chip--ok'}`}>
                {result.errors.length} errors
              </span>
            </div>

            {result.errors.length > 0 && (
              <div className="import-errors">
                <button
                  className="import-errors-toggle"
                  onClick={() => setErrorsExpanded((v) => !v)}
                >
                  {errorsExpanded ? '▾' : '▸'} {result.errors.length} row error{result.errors.length === 1 ? '' : 's'}
                </button>
                {errorsExpanded && (
                  <div className="import-errors-list">
                    {result.errors.map((e, i) => (
                      <div key={i} className="import-error-row">
                        <span className="import-error-row-num">Row {e.row}</span>
                        <span className="import-error-reason">{e.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="modal-btn-cancel" onClick={onClose} disabled={isUploading}>
            {result ? 'Close' : 'Cancel'}
          </button>
          <button
            className="modal-btn-confirm"
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <>
                <div className="spinner-border spinner-border-sm" style={{ width: 13, height: 13, borderWidth: 2, marginRight: 6 }} />
                Importing…
              </>
            ) : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
