import axios from 'axios'
import { motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SAMPLE_USERS, SHEET_COLUMNS, downloadSampleSheet, readUserSheet } from '../../utils/bulkUserSheet'
import { SHEET_FILE_ACCEPT } from '../../utils/sheetFile'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const CELL_INTERVAL_MS = 340
const RESTART_DELAY_MS = 1800
const DEMO_CELL_COUNT = SAMPLE_USERS.length * SHEET_COLUMNS.length

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

// What the site will pick for a row that left the password empty. It is spelled out
// only to be shown off in the demo below — the account's real password is decided by
// the server, and every created row reports the one it was actually given.
const getDemoPassword = (user) => `${user.firstName.toLowerCase()}123`

// The sheet being asked for, filling itself in. It runs on a timer rather than on hover
// so the point lands without being looked for, and the two empty password cells answer
// themselves so the rule reads before anybody has to be told it.
const SheetFillDemo = () => {
  const shouldReduceMotion = useReducedMotion()
  const [tickedCells, setTickedCells] = useState(0)
  // A reader who asked for less movement is shown the finished sheet instead, which
  // says the same thing without the clock behind it.
  const filledCells = shouldReduceMotion ? DEMO_CELL_COUNT : tickedCells

  useEffect(() => {
    if (shouldReduceMotion) {
      return undefined
    }

    // One cell per tick, then a pause on the finished sheet before it starts over.
    const timer = window.setTimeout(
      () => setTickedCells((current) => (current > DEMO_CELL_COUNT ? 0 : current + 1)),
      tickedCells > DEMO_CELL_COUNT ? RESTART_DELAY_MS : CELL_INTERVAL_MS,
    )

    return () => window.clearTimeout(timer)
  }, [shouldReduceMotion, tickedCells])

  return (
    <div aria-hidden="true" className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <div
        style={{ gridTemplateColumns: `repeat(${SHEET_COLUMNS.length}, minmax(0, 1fr))` }}
        className="grid gap-px bg-slate-200 dark:bg-slate-800"
      >
        {SHEET_COLUMNS.map((column) => (
          <div
            key={column.key}
            className="bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400"
          >
            {column.header}
          </div>
        ))}

        {SAMPLE_USERS.map((user, rowIndex) => SHEET_COLUMNS.map((column, columnIndex) => {
          const cellIndex = rowIndex * SHEET_COLUMNS.length + columnIndex
          const isGenerated = column.key === 'password' && !user[column.key]
          const value = isGenerated ? getDemoPassword(user) : user[column.key]

          return (
            <div
              key={`${user.phone}-${column.key}`}
              className="relative flex h-7 items-center bg-white px-2.5 dark:bg-slate-900"
            >
              {cellIndex < filledCells ? (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={`truncate text-[11px] ${
                    isGenerated
                      ? 'font-semibold italic text-indigo-500 dark:text-indigo-400'
                      : 'font-semibold text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {value}
                </motion.span>
              ) : null}

              {cellIndex === filledCells ? (
                <motion.span
                  animate={{ opacity: [1, 0.15, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="h-3.5 w-0.5 bg-indigo-500"
                />
              ) : null}
            </div>
          )
        }))}
      </div>
    </div>
  )
}

// A whole sheet of accounts at once. The file is read here rather than uploaded, so the
// admin sees the rows the site read out of it before anything is created, and the
// server answers row by row so a bad row never costs the rest of the file.
const AdminBulkImportUsers = ({ onClose, onImported }) => {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [results, setResults] = useState([])
  const [counts, setCounts] = useState(null)
  const [reading, setReading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [isDropTarget, setIsDropTarget] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  // Whatever the sheet did not fill in is named before the upload, so a row is fixed in
  // the spreadsheet rather than explained by a refusal afterwards.
  const incompleteRowCount = useMemo(() => rows.filter((row) => (
    SHEET_COLUMNS.some((column) => column.required && !row[column.key])
  )).length, [rows])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const loadFile = useCallback(async (file) => {
    if (!file) {
      return
    }

    setReading(true)
    setError('')
    setResults([])
    setCounts(null)
    setRows([])
    setFileName(file.name)

    try {
      setRows(await readUserSheet(file))
    } catch (readError) {
      setFileName('')
      setError(getErrorMessage(readError, 'Unable to read that file. Upload a .csv or .xlsx sheet.'))
    } finally {
      setReading(false)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [])

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDropTarget(false)
    loadFile(event.dataTransfer.files?.[0])
  }

  const importUsers = async () => {
    setImporting(true)
    setError('')

    try {
      const response = await axios.post(`${API_BASE_URL}/admin/users/bulk`, {
        // Only the columns the sheet describes are sent, so the row number the preview
        // counts in is not mistaken for something the account is made from.
        users: rows.map((row) => Object.fromEntries(
          SHEET_COLUMNS.map((column) => [column.key, row[column.key]]),
        )),
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to import users')
      }

      setResults(response.data?.data?.results || [])
      setCounts(response.data?.data?.counts || null)
      onImported(response.data?.data?.users || [])
    } catch (importError) {
      setError(getErrorMessage(importError, 'Unable to import users. Please try again.'))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close bulk import"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-import-title"
        className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id="bulk-import-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Bulk Import Users
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Upload one sheet and every row in it becomes an account.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Step 1 · Start from the sample
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {SHEET_COLUMNS.filter((column) => column.required).map((column) => column.header).join(', ')}
                  {' are required. Leave '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">password</span>
                  {' empty and the account gets the first name with 123 after it.'}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => downloadSampleSheet('xlsx')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
                >
                  <Download className="h-3.5 w-3.5" />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => downloadSampleSheet('csv')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </button>
              </div>
            </div>

            <div className="mt-3">
              <SheetFillDemo />
            </div>
          </section>

          <section>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Step 2 · Upload the filled sheet</p>

            <input
              ref={fileInputRef}
              type="file"
              accept={SHEET_FILE_ACCEPT}
              onChange={(event) => loadFile(event.target.files?.[0])}
              disabled={reading || importing}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault()
                setIsDropTarget(true)
              }}
              onDragLeave={() => setIsDropTarget(false)}
              onDrop={handleDrop}
              disabled={reading || importing}
              className={`mt-2 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition disabled:cursor-not-allowed ${
                isDropTarget
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-slate-300 hover:border-indigo-400 dark:border-slate-700 dark:hover:border-indigo-700'
              }`}
            >
              {reading ? (
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              ) : (
                <Upload className="h-6 w-6 text-slate-400" />
              )}
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {fileName || 'Drop a .csv or .xlsx file here, or click to choose one'}
              </span>
              {rows.length ? (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {rows.length} row{rows.length === 1 ? '' : 's'} read
                  {incompleteRowCount ? ` · ${incompleteRowCount} missing required details` : ''}
                </span>
              ) : null}
            </button>
          </section>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}

          {rows.length ? (
            <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/50">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {counts ? 'Step 3 · What happened' : 'Step 3 · Check the rows'}
                </p>
                {counts ? (
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {counts.created} created · {counts.failed} refused
                  </span>
                ) : null}
              </div>

              <div className="max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Row
                      </th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Phone
                      </th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {counts ? 'Outcome' : 'Password'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {rows.map((row, index) => {
                      // The server answers in the order the rows were sent, so a row
                      // and its outcome are the same line on screen as in the file.
                      const result = results[index]
                      const isCreated = result?.status === 'created'
                      const isIncomplete = SHEET_COLUMNS.some((column) => column.required && !row[column.key])

                      return (
                        <tr key={row.rowNumber} className={result && !isCreated ? 'bg-red-50/60 dark:bg-red-950/20' : undefined}>
                          <td className="px-4 py-2 align-top text-xs font-semibold text-slate-400 dark:text-slate-500">
                            {row.rowNumber}
                          </td>
                          <td className="px-4 py-2 align-top text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}
                          </td>
                          <td className="px-4 py-2 align-top text-sm text-slate-600 dark:text-slate-300">
                            {row.phone || '—'}
                          </td>
                          <td className="px-4 py-2 align-top text-sm">
                            {result ? (
                              <span className={`inline-flex items-start gap-1.5 font-semibold ${
                                isCreated
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-red-700 dark:text-red-300'
                              }`}
                              >
                                {isCreated
                                  ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                  : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                                <span className="min-w-0">
                                  {isCreated ? result.password : result.message}
                                  {isCreated && result.isPasswordGenerated ? (
                                    <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                      (generated)
                                    </span>
                                  ) : null}
                                </span>
                              </span>
                            ) : isIncomplete ? (
                              <span className="font-semibold text-amber-600 dark:text-amber-400">
                                Missing required details
                              </span>
                            ) : (
                              <span className={row.password ? 'text-slate-600 dark:text-slate-300' : 'font-semibold italic text-indigo-500 dark:text-indigo-400'}>
                                {row.password || 'Generated'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/50">
          <p className="min-w-0 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
            {counts
              ? `${counts.created} account${counts.created === 1 ? '' : 's'} added to the table behind this.`
              : 'Nothing is created until you import.'}
          </p>

          <button
            type="button"
            onClick={importUsers}
            disabled={!rows.length || reading || importing || Boolean(counts)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 dark:disabled:bg-indigo-900"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {importing ? 'Importing...' : `Import ${rows.length || ''} user${rows.length === 1 ? '' : 's'}`.trim()}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminBulkImportUsers
