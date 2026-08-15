import { CheckCircle2, Download, Loader2, Upload, XCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { parseListInput, toListInput } from '../../utils/formFields'
import { SHEET_FILE_ACCEPT } from '../../utils/sheetFile'
import {
  SAMPLE_TOPICS,
  TOPIC_SHEET_HEADER,
  downloadSampleTopicSheet,
  readTopicSheet,
} from '../../utils/topicSheet'

// Three rows of the sample, so what the file should look like reads at a glance and
// the download is for filling in rather than for finding out.
const PREVIEW_TOPICS = SAMPLE_TOPICS.slice(0, 3)

const sampleButtonClass = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:text-indigo-300 dark:disabled:text-slate-600'

// A syllabus already lives in a spreadsheet, so it is uploaded rather than retyped. What
// is read is added to whatever the box already holds rather than replacing it: uploading
// the wrong sheet then costs a deletion in a textarea that is right there, instead of
// the list somebody had already typed.
const AdminTopicSheetUpload = ({ disabled, onChange, topics }) => {
  const [status, setStatus] = useState(null)
  const [reading, setReading] = useState(false)
  const [isDropTarget, setIsDropTarget] = useState(false)
  const fileInputRef = useRef(null)

  const loadFile = async (file) => {
    if (!file) {
      return
    }

    setReading(true)
    setStatus(null)

    try {
      const uploaded = await readTopicSheet(file)
      const current = parseListInput(topics)
      const merged = [...new Set([...current, ...uploaded])]
      const added = merged.length - current.length
      const alreadyListed = uploaded.length - added

      onChange(toListInput(merged))
      setStatus({
        tone: 'success',
        message: `${added} topic${added === 1 ? '' : 's'} added from ${file.name}`
          + (alreadyListed ? ` · ${alreadyListed} already listed` : ''),
      })
    } catch (readError) {
      setStatus({
        tone: 'error',
        message: readError?.message || 'Unable to read that file. Upload a .csv or .xlsx sheet.',
      })
    } finally {
      setReading(false)

      // Cleared so choosing the same file twice still counts as a change.
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Or upload a sheet
          <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
            one topic per row
          </span>
        </p>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => downloadSampleTopicSheet('xlsx')}
            disabled={disabled}
            className={sampleButtonClass}
          >
            <Download className="h-3 w-3" />
            Sample Excel
          </button>
          <button
            type="button"
            onClick={() => downloadSampleTopicSheet('csv')}
            disabled={disabled}
            className={sampleButtonClass}
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
        </div>
      </div>

      <div aria-hidden="true" className="mt-2.5 overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
        <p className="bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          {TOPIC_SHEET_HEADER}
        </p>
        {PREVIEW_TOPICS.map((topic) => (
          <p
            key={topic}
            className="truncate border-t border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          >
            {topic}
          </p>
        ))}
        <p className="border-t border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500">
          ...
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={SHEET_FILE_ACCEPT}
        onChange={(event) => loadFile(event.target.files?.[0])}
        disabled={disabled || reading}
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
        onDrop={(event) => {
          event.preventDefault()
          setIsDropTarget(false)
          loadFile(event.dataTransfer.files?.[0])
        }}
        disabled={disabled || reading}
        className={`mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-3 text-xs font-semibold text-slate-600 transition disabled:cursor-not-allowed disabled:text-slate-400 dark:text-slate-300 dark:disabled:text-slate-600 ${
          isDropTarget
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
            : 'border-slate-300 hover:border-indigo-400 dark:border-slate-700 dark:hover:border-indigo-700'
        }`}
      >
        {reading ? <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> : <Upload className="h-4 w-4" />}
        {reading ? 'Reading the sheet...' : 'Drop a .csv or .xlsx here, or click to choose one'}
      </button>

      {status ? (
        <p className={`mt-2 flex items-start gap-1.5 text-[11px] font-semibold ${
          status.tone === 'error'
            ? 'text-red-700 dark:text-red-300'
            : 'text-emerald-700 dark:text-emerald-300'
        }`}
        >
          {status.tone === 'error'
            ? <XCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            : <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />}
          {status.message}
        </p>
      ) : null}
    </div>
  )
}

export default AdminTopicSheetUpload
