import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { importUsers, getUsersImportTemplate, type ImportUsersResult } from '../api/admin'
import { getApiError } from '../utils/format'

interface Props {
  onClose: () => void
  onImported: () => void
}

export function ImportUsersModal({ onClose, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [result, setResult] = useState<ImportUsersResult | null>(null)
  const [errorsExpanded, setErrorsExpanded] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    modalRef.current?.focus()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      prev?.focus()
    }
  }, [onClose])

  function pickFile(f: File | null | undefined) {
    if (!f) return
    setFile(f)
    setResult(null)
    setApiError(null)
  }

  async function handleDownloadTemplate() {
    setIsDownloading(true)
    try {
      const res = await getUsersImportTemplate()
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'users-import-template.csv'
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
    setApiError(null)
    try {
      const res = await importUsers(file)
      const summary = res.data
      setResult(summary)
      if (summary.errors.length > 0) {
        toast.warning(
          `${summary.imported} imported, ${summary.skipped} skipped, ${summary.errors.length} error${summary.errors.length === 1 ? '' : 's'}`,
        )
        setErrorsExpanded(true)
        if (summary.imported > 0) onImported()
      } else {
        toast.success(`${summary.imported} users imported, ${summary.skipped} skipped`)
        onImported()
        onClose()
      }
    } catch (err) {
      setApiError(getApiError(err))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="import-users-title" onClick={onClose}>
      <div
        className="modal-box import-modal-box"
        ref={modalRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="import-modal-header">
          <h3 className="modal-title" id="import-users-title" style={{ margin: 0 }}>Import Users</h3>
          <button className="drawer-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className="import-modal-hint">
          Upload a CSV file to bulk-import users. Download the sample to see the expected format.
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
          Download sample CSV
        </button>

        <div
          className={`import-drop-zone${dragOver ? ' import-drop-zone--over' : ''}${file ? ' import-drop-zone--has-file' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Upload CSV file"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() }
          }}
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
            accept=".csv"
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
              <span className="import-drop-label">Drop CSV here or click to browse</span>
              <span className="import-drop-hint">.csv accepted</span>
            </>
          )}
        </div>

        {apiError && (
          <div className="import-api-error" role="alert">{apiError}</div>
        )}

        {result && (
          <div className="import-result">
            <div className="import-result-row">
              <span className="import-result-chip import-result-chip--ok">{result.imported} imported</span>
              <span className="import-result-chip import-result-chip--upd">{result.skipped} skipped</span>
              <span className={`import-result-chip${result.errors.length > 0 ? ' import-result-chip--err' : ' import-result-chip--ok'}`}>
                {result.errors.length} errors
              </span>
            </div>

            {result.errors.length > 0 && (
              <div className="import-errors">
                <button className="import-errors-toggle" onClick={() => setErrorsExpanded((v) => !v)}>
                  {errorsExpanded ? '▾' : '▸'} {result.errors.length} row error{result.errors.length === 1 ? '' : 's'}
                </button>
                {errorsExpanded && (
                  <div className="import-errors-list">
                    <table className="import-errors-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Email</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((e, i) => (
                          <tr key={i}>
                            <td className="import-error-row-num">#{e.row}</td>
                            <td className="import-error-email">{e.email || '—'}</td>
                            <td className="import-error-reason">{e.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
          <button className="modal-btn-confirm" onClick={handleUpload} disabled={!file || isUploading}>
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
