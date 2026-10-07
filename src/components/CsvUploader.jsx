import { useCallback, useRef, useState } from 'react'
import { UploadCloud, FileSpreadsheet, LoaderCircle, AlertCircle, CircleCheck, RotateCcw } from 'lucide-react'
import { parseCsvFile } from '../lib/csv'
import { BORDER, INK, MUTED, fmtInt } from '../theme'

const MAX_MB = 150

/** Client-only CSV uploader with drag-and-drop, validation, and progress state. */
export default function CsvUploader({ data, onParsed, onReset }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const generationRef = useRef(0)

  const processFile = useCallback(async (file) => {
    setError('')
    if (!file) return
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      setError('Pilih file berformat .csv.')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Ukuran file maksimal ${MAX_MB} MB.`)
      return
    }
    const token = ++generationRef.current // stale uploads must never win
    setBusy(true)
    setProgress(4)

    // Smooth progress while PapaParse streams the File.
    const timer = setInterval(() => setProgress((p) => Math.min(93, p + (p < 50 ? 7 : 2))), 180)
    try {
      const parsed = await parseCsvFile(file)
      if (token !== generationRef.current) return // a newer upload superseded this one
      clearInterval(timer)
      setProgress(100)
      if (parsed.error) setError(parsed.error)
      else if (!parsed.headers.length) setError('CSV tidak memiliki header yang dapat dibaca.')
      else onParsed(parsed)
    } catch (e) {
      if (token === generationRef.current) {
        clearInterval(timer)
        setError(`Gagal membaca file: ${e?.message || 'kesalahan tidak diketahui'}`)
      }
    } finally {
      clearInterval(timer)
      if (token === generationRef.current) {
        setBusy(false)
        setTimeout(() => setProgress(0), 500)
      }
    }
    if (inputRef.current) inputRef.current.value = ''
  }, [onParsed])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files?.[0])
  }

  const handleReset = () => {
    setError('')
    setProgress(0)
    setBusy(false)
    onReset()
  }

  return (
    <div className="w-full">
      {data ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm" style={{ borderColor: BORDER }}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><FileSpreadsheet size={20} /></span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ color: INK }} title={data.fileName}>{data.fileName}</p>
              <p className="text-xs" style={{ color: MUTED }}>{fmtInt(data.rowCount)} baris · {data.headers.length} kolom · diproses lokal</p>
            </div>
            <CircleCheck size={17} className="hidden shrink-0 text-emerald-600 sm:block" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => inputRef.current?.click()} disabled={busy} className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50" style={{ borderColor: BORDER, color: '#52514e' }}>
              Ganti file
            </button>
            <button onClick={handleReset} title="Hapus data" className="grid h-9 w-9 place-items-center rounded-lg border transition hover:bg-red-50 hover:text-red-700" style={{ borderColor: BORDER, color: MUTED }}>
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !busy && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
          onDrop={onDrop}
          disabled={busy}
          className={`relative flex w-full flex-col items-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition sm:py-10 ${busy ? 'cursor-wait' : 'cursor-pointer'} ${dragging ? 'scale-[1.005] bg-blue-50' : 'bg-white hover:bg-slate-50'}`}
          style={{ borderColor: dragging ? '#2a78d6' : '#cbd5e1' }}
          aria-label="Pilih atau seret file CSV"
        >
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700">
            {busy ? <LoaderCircle size={23} className="animate-spin" /> : <UploadCloud size={23} />}
          </span>
          <span className="text-sm font-semibold" style={{ color: INK }}>{busy ? 'Memproses file…' : dragging ? 'Lepaskan file CSV di sini' : 'Pilih atau seret file CSV Anda'}</span>
          <span className="mt-1 text-xs" style={{ color: MUTED }}>{busy ? 'Seluruh proses dilakukan di peramban' : 'Delimiter ; atau , · maksimal 150 MB · data tidak diunggah ke server'}</span>
          {busy && <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all duration-200" style={{ width: `${progress}%` }} /></div>}
          {!busy && <span className="mt-4 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Jelajahi file</span>}
        </button>
      )}
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => processFile(e.target.files?.[0])} />
      {error && <div role="alert" className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
      {data?.errors?.length > 0 && <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{data.errors.length} peringatan saat membaca CSV. Sebagian baris mungkin tidak lengkap: {data.errors.join('; ')}</span></div>}
    </div>
  )
}
